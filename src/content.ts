/**
 * JobFill Content Script – Smart Job Application Form Filler
 * Compiled as IIFE (no ES module imports). Fully self-contained.
 */
(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // Types (inlined — no imports allowed in IIFE content scripts)
  // ─────────────────────────────────────────────────────────────
  interface WorkExperience {
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }

  interface Profile {
    firstName: string; lastName: string; fullName: string;
    email: string; phone: string; dateOfBirth: string;
    linkedIn: string; github: string; portfolio: string;
    address: string; city: string; state: string; zipCode: string; country: string;
    currentTitle: string; desiredTitle: string; yearsExperience: string;
    currentSalary: string; desiredSalary: string; workAuthorization: string;
    willingToRelocate: string; remotePreference: string; summary: string;
    degree: string; fieldOfStudy: string; university: string;
    graduationYear: string; gpa: string;
    experiences: WorkExperience[];
    skills: string; programmingLanguages: string; frameworks: string;
    resumeUrl: string; coverLetterUrl: string;
    gender: string; ethnicity: string; veteranStatus: string; disabilityStatus: string;
    customKeywords?: Record<string, string>;
    customFields?: CustomField[];
  }

  interface CustomField {
    id: string;
    label: string;
    value: string;
    keywords: string;
  }

  // ─────────────────────────────────────────────────────────────
  // Field matching rules
  // Each rule maps a Profile key to arrays of:
  //   patterns  – normalized name/id/placeholder substrings
  //   labels    – normalized label/aria-label text substrings
  // ─────────────────────────────────────────────────────────────
  const RULES: Array<{ field: keyof Profile; patterns: string[]; labels: string[] }> = [
    // ── Personal ──────────────────────────────────────────────────────────────
    {
      field: 'firstName',
      patterns: [
        // Common
        'firstname', 'fname', 'first_name', 'givenname', 'given_name', 'forename',
        // Autocomplete tokens
        'givenname',
        // ATS-specific
        'applicantfirstname', 'candidatefirstname', 'contactfirstname',
        'firstnameinput', 'first', 'applicant_first_name', 'candidate_first_name',
        // Greenhouse
        'job_application[first_name]',
        // Lever
        'name[first]',
        // SmartRecruiters
        'firstName', 'first-name',
        // Workday (aria-label based – covered by labels array)
        // iCIMS
        'applicant.firstName',
      ],
      labels: [
        'first name', 'given name', 'forename', 'first', 'legal first name',
        'preferred first name', 'applicant first name', 'candidate first name',
      ],
    },
    {
      field: 'lastName',
      patterns: [
        'lastname', 'lname', 'last_name', 'familyname', 'family_name', 'surname',
        'applicantlastname', 'candidatelastname', 'contactlastname',
        'lastnameinput', 'last', 'applicant_last_name', 'candidate_last_name',
        'job_application[last_name]',
        'name[last]',
        'lastName', 'last-name',
        'applicant.lastName',
      ],
      labels: [
        'last name', 'family name', 'surname', 'last', 'legal last name',
        'applicant last name', 'candidate last name',
      ],
    },
    {
      field: 'fullName',
      patterns: [
        'fullname', 'full_name', 'yourname', 'your_name', 'applicantname',
        'candidatename', 'contactname', 'name', 'fullnameinput',
        'candidate_name', 'applicant_name', 'full-name',
        'job_application[name]',
      ],
      labels: [
        'full name', 'your name', 'name', 'legal name', 'full legal name',
        'applicant name', 'candidate name', 'contact name',
      ],
    },
    {
      field: 'email',
      patterns: [
        'email', 'emailaddress', 'email_address', 'e-mail', 'youremail',
        'emailinput', 'applicantemail', 'candidateemail', 'user_email',
        'email-address', 'applicant_email', 'candidate_email',
        'job_application[email]', 'contact_email', 'contactemail',
        'email1', 'primary_email', 'primaryemail',
      ],
      labels: [
        'email', 'e-mail', 'email address', 'your email', 'applicant email',
        'candidate email', 'email id', 'primary email', 'contact email',
        'work email', 'personal email',
      ],
    },
    {
      field: 'phone',
      patterns: [
        'phone', 'phonenumber', 'phone_number', 'telephone', 'tel', 'mobile',
        'cellphone', 'cell', 'mobilenumber', 'mobile_number', 'phone-number',
        'applicantphone', 'candidatephone', 'contactphone',
        'applicant_phone', 'candidate_phone', 'phone1', 'primaryphone',
        'primary_phone', 'homephone', 'home_phone', 'work_phone', 'workphone',
        'job_application[phone]', 'mobilephone',
        // Autocomplete tokens
        'tel',
      ],
      labels: [
        'phone', 'mobile', 'telephone', 'cell phone', 'phone number',
        'mobile number', 'contact number', 'primary phone', 'phone no',
        'phone #', 'applicant phone', 'candidate phone', 'home phone',
        'work phone', 'personal phone',
      ],
    },
    {
      field: 'dateOfBirth',
      patterns: [
        'dob', 'dateofbirth', 'date_of_birth', 'birthdate', 'birthday',
        'birth_date', 'birthmonth', 'dateofbirth', 'birth-date',
        'applicant_dob', 'candidatedob',
      ],
      labels: [
        'date of birth', 'birthday', 'birth date', 'dob', 'date of birth (mm/dd/yyyy)',
        'd.o.b', 'date of birth *',
      ],
    },
    // ── Online Presence ───────────────────────────────────────────────────────
    {
      field: 'linkedIn',
      patterns: [
        'linkedin', 'linkedinurl', 'linkedin_url', 'linkedinprofile',
        'linkedinlink', 'linkedinprofileurl', 'linkedin-url', 'linkedin-profile',
        'linkedin_profile', 'linkedinpage', 'linkedin_page',
        'job_application[urls][linkedin]',
      ],
      labels: [
        'linkedin', 'linkedin url', 'linkedin profile', 'linkedin profile url',
        'linkedin page', 'your linkedin', 'linkedin link',
      ],
    },
    {
      field: 'github',
      patterns: [
        'github', 'githuburl', 'github_url', 'githubprofile', 'githublink',
        'githubpage', 'github-url', 'github_profile',
        'job_application[urls][github]',
      ],
      labels: [
        'github', 'github url', 'github profile', 'github page', 'your github',
        'github link', 'github repository',
      ],
    },
    {
      field: 'portfolio',
      patterns: [
        'portfolio', 'website', 'personalwebsite', 'websiteurl', 'website_url',
        'portfoliourl', 'personalsite', 'portfoliolink', 'personal_website',
        'portfolio_url', 'portfolio-url', 'siteurl', 'site_url',
        'blog', 'blogurl', 'blog_url', 'othersiteurl',
        'job_application[urls][portfolio]', 'job_application[urls][other]',
        'personal-website', 'personal-site',
      ],
      labels: [
        'portfolio', 'website', 'personal website', 'portfolio url', 'personal site',
        'your website', 'blog', 'portfolio link', 'other url', 'other website',
        'online portfolio', 'personal portfolio',
      ],
    },
    // ── Address ───────────────────────────────────────────────────────────────
    {
      field: 'address',
      patterns: [
        'address', 'streetaddress', 'street_address', 'address1', 'addr',
        'addressline1', 'address_line_1', 'addressline_1', 'street',
        'streetaddr', 'street-address', 'addr1', 'currentaddress',
        'current_address', 'mailing_address', 'mailingaddress',
        // Autocomplete tokens
        'streetaddress',
      ],
      labels: [
        'address', 'street address', 'street', 'address line 1', 'street address 1',
        'current address', 'mailing address', 'residential address', 'home address',
        'address line 1', 'address 1',
      ],
    },
    {
      field: 'city',
      patterns: [
        'city', 'town', 'locality', 'currentcity', 'current_city', 'city_name',
        'cityname', 'homecity', 'home_city',
        // Autocomplete token
        'addresslevel2',
      ],
      labels: [
        'city', 'town', 'locality', 'city / town', 'current city', 'home city',
        'city name', 'city of residence',
      ],
    },
    {
      field: 'state',
      patterns: [
        'state', 'province', 'region', 'stateprovince', 'state_province',
        'currentstate', 'current_state', 'statename',
        // Autocomplete token
        'addresslevel1',
      ],
      labels: [
        'state', 'province', 'region', 'state / province', 'state or province',
        'current state', 'state name', 'state of residence',
      ],
    },
    {
      field: 'zipCode',
      patterns: [
        'zip', 'zipcode', 'zip_code', 'postalcode', 'postal_code', 'postcode',
        'pin', 'pincode', 'pin_code', 'zip-code', 'postal-code',
        // Autocomplete token
        'postalcode',
      ],
      labels: [
        'zip', 'postal code', 'zip code', 'postcode', 'zip / postal code',
        'pin code', 'area code', 'zip code (optional)',
      ],
    },
    {
      field: 'country',
      patterns: [
        'country', 'countryofresidence', 'nation', 'countryname',
        'country_of_residence', 'currentcountry', 'current_country',
        'country-name', 'country_name',
        // Autocomplete token
        'country',
      ],
      labels: [
        'country', 'country of residence', 'nation', 'country name',
        'current country', 'country / region', 'country of citizenship',
      ],
    },
    // ── Professional ──────────────────────────────────────────────────────────
    {
      field: 'currentTitle',
      patterns: [
        'title', 'jobtitle', 'job_title', 'currenttitle', 'currentjobtitle',
        'position', 'currentposition', 'professionaltitle', 'current_title',
        'current_job_title', 'job-title', 'current-title',
        'mostrecent_title', 'mostrecentjobtitle', 'latesttitle', 'latestjobtitle',
        'presenttitle', 'present_title',
      ],
      labels: [
        'job title', 'current title', 'current position', 'position',
        'professional title', 'most recent title', 'most recent job title',
        'latest title', 'current job title', 'present title',
        'title / position',
      ],
    },
    {
      field: 'desiredTitle',
      patterns: [
        'desiredtitle', 'desired_title', 'desiredposition', 'positionsought',
        'jobseeking', 'targetjob', 'target_job', 'desired-title',
        'targetrole', 'target_role', 'applying_for', 'applyingfor', 'roleapplied',
        'positionapplied', 'position_applied', 'positionofinterest',
      ],
      labels: [
        'desired title', 'desired position', 'target job', 'position sought',
        'target role', 'role of interest', 'position applied for',
        'position of interest', 'applying for', 'job sought',
      ],
    },
    {
      field: 'yearsExperience',
      patterns: [
        'yearsexperience', 'years_experience', 'yearsofexperience',
        'experienceyears', 'totalexperience', 'total_experience',
        'years_of_experience', 'exp_years', 'expyears', 'experience',
        'years-of-experience', 'work_experience_years',
      ],
      labels: [
        'years of experience', 'years experience', 'total experience',
        'experience years', 'years of relevant experience',
        'total years of experience', 'how many years of experience',
        'years of work experience', 'professional experience (years)',
      ],
    },
    {
      field: 'currentSalary',
      patterns: [
        'currentsalary', 'current_salary', 'currsalary', 'curr_salary',
        'presentcompensation', 'presentsalary', 'currentcompensation',
        'current_compensation', 'present_salary', 'present_compensation',
        'currcomp', 'current-salary', 'current-compensation',
        'currentctc', 'current_ctc', 'ctc', 'currentpackage', 'current_package',
      ],
      labels: [
        'current salary', 'current compensation', 'present salary',
        'present compensation', 'current ctc', 'current package',
        'current annual salary', 'current annual compensation',
        'current total compensation',
      ],
    },
    {
      field: 'desiredSalary',
      patterns: [
        'salary', 'desiredsalary', 'desired_salary', 'expectedsalary',
        'expected_salary', 'compensation', 'salaryexpectation', 'annualsalary',
        'salary_expectation', 'expected_compensation', 'expectedcompensation',
        'desiredcompensation', 'desired_compensation', 'salary-expectation',
        'expected-salary', 'expected-compensation', 'desiredctc', 'desired_ctc',
        'expectedctc', 'expected_ctc', 'targetctc', 'target_ctc',
        'desiredpackage', 'desired_package', 'salaryrange',
      ],
      labels: [
        'salary', 'desired salary', 'expected salary', 'compensation',
        'salary expectation', 'annual salary', 'expected compensation',
        'desired compensation', 'salary requirement', 'salary requirements',
        'expected ctc', 'desired ctc', 'target salary', 'salary expectation (annual)',
        'what are your salary expectations', 'expected annual salary',
      ],
    },
    {
      field: 'workAuthorization',
      patterns: [
        'workauth', 'workauthorization', 'work_authorization', 'authorization',
        'eligibility', 'visastatus', 'visa_status', 'workvisa', 'authorized',
        'eligible', 'work_eligibility', 'workeligibility', 'right_to_work',
        'righttowork', 'work-authorization', 'legalstatus', 'legal_status',
        'workpermit', 'work_permit', 'immigrationstatus', 'immigration_status',
      ],
      labels: [
        'work authorization', 'authorized to work', 'visa status', 'eligibility',
        'work eligibility', 'right to work', 'legal status', 'work permit',
        'immigration status', 'are you legally authorized to work',
        'authorized to work in', 'employment eligibility', 'work visa status',
        'do you have authorization to work',
      ],
    },
    {
      field: 'willingToRelocate',
      patterns: [
        'relocate', 'willingtorelocate', 'willing_to_relocate', 'relocation',
        'opentorelocate', 'open_to_relocate', 'willing-to-relocate',
        'relocationwillingness', 'willing_relocation', 'canrelocate', 'can_relocate',
      ],
      labels: [
        'relocate', 'willing to relocate', 'open to relocation', 'relocation',
        'are you willing to relocate', 'open to relocate',
        'are you open to relocation', 'relocation preference',
      ],
    },
    {
      field: 'remotePreference',
      patterns: [
        'remote', 'remotework', 'remote_work', 'remotejob', 'worktype',
        'workmode', 'work_mode', 'workstyle', 'work-mode', 'work-type',
        'work_preference', 'workpreference', 'jobtype', 'job_type',
        'work_arrangement', 'workarrangement', 'onsitehybridremote',
        'workformat', 'work_format', 'location_preference', 'locationpreference',
      ],
      labels: [
        'remote', 'remote work', 'work type', 'work mode', 'work preference',
        'work style', 'job type', 'work arrangement', 'location preference',
        'on-site / hybrid / remote', 'preferred work arrangement',
        'are you open to remote work', 'remote or on-site', 'work location preference',
      ],
    },
    {
      field: 'summary',
      patterns: [
        'summary', 'aboutme', 'about_me', 'bio', 'background', 'profile',
        'coverletter', 'cover_letter', 'intro', 'introduction', 'tell', 'additional',
        'message', 'notes', 'additionalnotes', 'additionalinfo', 'additional_info',
        'additional_information', 'additionalinformation', 'personalstatement',
        'professionalsummary', 'professional_summary', 'about', 'overview',
        'job_application[cover_letter]', 'candidatestatement',
      ],
      labels: [
        'summary', 'about me', 'bio', 'cover letter', 'tell us about yourself',
        'background', 'introduction', 'additional information',
        'professional summary', 'personal statement', 'why do you want to work here',
        'tell us more about yourself', 'notes', 'additional notes',
        'message to the hiring team', 'message to hiring manager',
      ],
    },
    // ── Education ─────────────────────────────────────────────────────────────
    {
      field: 'degree',
      patterns: [
        'degree', 'highestdegree', 'highest_degree', 'educationlevel',
        'education_level', 'degreetype', 'qualification', 'degree_type',
        'degreelevel', 'degree_level', 'highest_qualification',
        'highestqualification', 'educationdegree',
      ],
      labels: [
        'degree', 'highest degree', 'education level', 'qualification',
        'degree type', 'highest qualification', 'degree earned',
        'level of education', 'academic degree', 'highest education level',
      ],
    },
    {
      field: 'fieldOfStudy',
      patterns: [
        'fieldofstudy', 'field_of_study', 'major', 'concentration',
        'studyfield', 'area_of_study', 'areaofstudy', 'discipline',
        'major_field', 'majorfield', 'minorfield', 'courseofstudy',
        'course_of_study', 'subject', 'specialization', 'studydiscipline',
      ],
      labels: [
        'field of study', 'major', 'concentration', 'area of study',
        'discipline', 'course of study', 'specialization', 'subject',
        'study major', 'academic major', 'field of study / major',
      ],
    },
    {
      field: 'university',
      patterns: [
        'university', 'college', 'school', 'institution', 'schoolname',
        'universityname', 'collegename', 'schoolattended', 'school_name',
        'university_name', 'college_name', 'institution_name', 'educationschool',
        'education_school', 'school-name', 'alma_mater', 'almamater',
      ],
      labels: [
        'university', 'college', 'school', 'institution', 'school name',
        'college name', 'university name', 'institution name', 'alma mater',
        'school attended', 'name of school', 'name of university',
        'name of college',
      ],
    },
    {
      field: 'graduationYear',
      patterns: [
        'graduationyear', 'graduation_year', 'gradyear', 'yearofgraduation',
        'graddate', 'graduationdate', 'grad_year', 'grad_date',
        'year_of_graduation', 'graduation-year', 'expected_graduation',
        'expectedgraduation', 'expectedgradyear',
      ],
      labels: [
        'graduation year', 'year of graduation', 'grad year', 'graduation date',
        'expected graduation', 'expected graduation year',
        'year of completion', 'completion year',
      ],
    },
    {
      field: 'gpa',
      patterns: [
        'gpa', 'gradepoint', 'grade_point_average', 'academicgpa',
        'grade_point', 'gradepoaverage', 'cgpa',
      ],
      labels: [
        'gpa', 'grade point average', 'cgpa', 'academic gpa',
        'cumulative gpa', 'overall gpa',
      ],
    },
    // ── Work Experience ───────────────────────────────────────────────────────
    {
      field: 'expCompany' as any,
      patterns: [
        'company', 'currentcompany', 'current_company', 'employer', 'organization',
        'currentemployer', 'mostrecent', 'companyname', 'employer_name',
        'prevcompany', 'previouscompany', 'previousemployer', 'prev_company',
        'company_name', 'org', 'orgname', 'org_name', 'workplacename',
        'workplace_name', 'employername', 'business_name', 'businessname',
        'current_employer', 'most_recent_employer', 'organization_name',
      ],
      labels: [
        'company', 'current company', 'employer', 'organization', 'company name',
        'previous company', 'previous employer', 'organization name',
        'employer name', 'business name', 'workplace', 'most recent employer',
        'current employer',
      ],
    },
    {
      field: 'expRole' as any,
      patterns: [
        'currentrole', 'current_role', 'role', 'currentposition', 'jobrole',
        'prevrole', 'prev_role', 'previousrole', 'previousposition',
        'jobtitle', 'job_title', 'worktitle', 'work_title', 'designation',
        'job-role', 'position_title', 'positiontitle', 'occupationtitle',
      ],
      labels: [
        'current role', 'role', 'current position', 'previous role',
        'previous position', 'job role', 'job title', 'designation',
        'position title', 'most recent role', 'title at company',
      ],
    },
    {
      field: 'expStartDate' as any,
      patterns: [
        'startdate', 'start_date', 'fromdate', 'datestarted', 'employmentstart',
        'prevstartdate', 'prev_start_date', 'from_date', 'from-date',
        'employment_start', 'start-date', 'begindate', 'begin_date',
        'joindate', 'join_date', 'joiningdate', 'joining_date',
      ],
      labels: [
        'start date', 'from', 'date started', 'employment start',
        'previous start date', 'joining date', 'from date', 'begin date',
        'employment start date', 'start month',
      ],
    },
    {
      field: 'expEndDate' as any,
      patterns: [
        'enddate', 'end_date', 'todate', 'dateended', 'employmentend',
        'prevenddate', 'prev_end_date', 'to_date', 'to-date',
        'employment_end', 'end-date', 'finishdate', 'finish_date',
        'leavedate', 'leave_date', 'lastdate', 'last_date',
      ],
      labels: [
        'end date', 'to', 'date ended', 'employment end', 'previous end date',
        'to date', 'finish date', 'leave date', 'last date', 'until',
        'employment end date', 'end month',
      ],
    },
    // ── Skills ────────────────────────────────────────────────────────────────
    {
      field: 'skills',
      patterns: [
        'skills', 'topskills', 'top_skills', 'keyskills', 'key_skills',
        'coreskills', 'technicalskills', 'competencies', 'skill_set', 'skillset',
        'skill-set', 'yourskills', 'your_skills', 'abilities',
        'job_application[skills]',
      ],
      labels: [
        'skills', 'top skills', 'key skills', 'core skills', 'technical skills',
        'competencies', 'skill set', 'your skills', 'professional skills',
        'relevant skills',
      ],
    },
    {
      field: 'programmingLanguages',
      patterns: [
        'languages', 'programminglanguages', 'programming_languages',
        'codinglanguages', 'coding_languages', 'coding-languages',
        'programming-languages', 'devlanguages', 'dev_languages',
        'computerlanguages', 'computer_languages', 'softwarelanguages',
      ],
      labels: [
        'programming languages', 'coding languages', 'languages',
        'computer languages', 'software languages', 'dev languages',
        'coding skills',
      ],
    },
    {
      field: 'frameworks',
      patterns: [
        'frameworks', 'tools', 'technologies', 'techstack', 'tech_stack',
        'toolsandtechnologies', 'frameworks_tools', 'tech-stack',
        'softwaretools', 'software_tools', 'devtools', 'dev_tools',
        'platformsandtools', 'toolsused', 'tools_used',
      ],
      labels: [
        'frameworks', 'tools', 'technologies', 'tech stack', 'tools & technologies',
        'software tools', 'dev tools', 'platforms and tools', 'tools and technologies',
        'frameworks and tools', 'development tools',
      ],
    },
    // ── Links / Documents ──────────────────────────────────────────────────────
    {
      field: 'resumeUrl',
      patterns: [
        'resume', 'resumelink', 'resumeurl', 'resume_url', 'cvlink', 'cv_url',
        'resume_link', 'cv', 'cv-url', 'cvurl', 'resume-url', 'resume-link',
        'resumepath',
      ],
      labels: [
        'resume', 'resume url', 'resume link', 'cv', 'cv link', 'cv url',
        'resume / cv', 'upload resume url',
      ],
    },
    {
      field: 'coverLetterUrl',
      patterns: [
        'coverletter', 'cover_letter', 'coverletterurl', 'coverletterlink',
        'cover_letter_url', 'cover_letter_link', 'cl_url', 'cl-url',
      ],
      labels: [
        'cover letter', 'cover letter url', 'cover letter link',
        'upload cover letter url',
      ],
    },
    // ── Diversity / EEO ───────────────────────────────────────────────────────
    {
      field: 'gender',
      patterns: [
        'gender', 'sex', 'genderidentity', 'gender_identity', 'gender-identity',
        'applicant_gender', 'self_identify_gender',
      ],
      labels: [
        'gender', 'sex', 'gender identity', 'please select your gender',
        'what is your gender', 'applicant gender',
      ],
    },
    {
      field: 'ethnicity',
      patterns: [
        'ethnicity', 'race', 'raceethnicity', 'race_ethnicity', 'racial',
        'ethnic_group', 'ethnicgroup', 'ethnic_background', 'race_background',
      ],
      labels: [
        'ethnicity', 'race', 'race/ethnicity', 'racial background',
        'ethnic group', 'ethnic background', 'racial/ethnic identification',
      ],
    },
    {
      field: 'veteranStatus',
      patterns: [
        'veteran', 'veteranstatus', 'veteran_status', 'military', 'militarystatus',
        'military_status', 'militaryservice', 'military_service',
        'protectedveteran', 'protected_veteran',
      ],
      labels: [
        'veteran', 'veteran status', 'military', 'military status',
        'military service', 'protected veteran',
        'are you a veteran', 'veteran classification',
      ],
    },
    {
      field: 'disabilityStatus',
      patterns: [
        'disability', 'disabilitystatus', 'disability_status', 'disabled',
        'disability-status', 'handicap', 'differentlyabled',
      ],
      labels: [
        'disability', 'disability status', 'disabled', 'disability identification',
        'do you have a disability', 'differently abled',
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // Utils
  // ─────────────────────────────────────────────────────────────

  /** Normalize text: lowercase, strip spaces/hyphens/underscores/dots */
  function norm(s: string): string {
    return s.toLowerCase().replace(/[\s\-_\.]+/g, '');
  }

  /** Get label text associated with an input element */
  function getLabelText(el: HTMLElement): string {
    // 1. aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.toLowerCase();

    // 2. aria-labelledby
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ids = labelledBy.split(/\s+/);
      const texts = ids.map((id) => document.getElementById(id)?.textContent?.trim() || '');
      const combined = texts.filter(Boolean).join(' ');
      if (combined) return combined.toLowerCase();
    }

    // 3. <label for="id">
    const elId = el.getAttribute('id');
    if (elId) {
      const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(elId)}"]`);
      if (label) return label.textContent?.toLowerCase() || '';
    }

    // 4. Ancestor <label>
    const parentLabel = el.closest('label');
    if (parentLabel) {
      // Get label text without the input's own text
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('input, textarea, select').forEach((n) => n.remove());
      const text = clone.textContent?.trim().toLowerCase();
      if (text) return text;
    }

    // 5. aria-describedby as fallback
    const describedBy = el.getAttribute('aria-describedby');
    if (describedBy) {
      const desc = document.getElementById(describedBy);
      if (desc) return desc.textContent?.toLowerCase() || '';
    }

    // 6. Walk up DOM to find nearby text
    let parent = el.parentElement;
    for (let depth = 0; depth < 4 && parent; depth++, parent = parent.parentElement) {
      const clone = parent.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('input, textarea, select, button').forEach((n) => n.remove());
      const text = clone.textContent?.trim().toLowerCase() || '';
      if (text.length > 0 && text.length < 120) return text;
    }

    return '';
  }

  /** Match an element to a profile field */
  /** Match an element to a profile field with score */
  function matchFieldWithScore(el: HTMLElement, customKeywords?: Record<string, string>): { field: keyof Profile; score: number } | null {
    const name = norm(el.getAttribute('name') || '');
    const id = norm(el.getAttribute('id') || '');
    const placeholder = norm(el.getAttribute('placeholder') || '');
    const labelText = getLabelText(el);
    const normLabel = norm(labelText);

    // Score-based matching to find the best rule
    let bestField: keyof Profile | null = null;
    let bestScore = 0;

    for (const rule of RULES) {
      let score = 0;

      const patterns = [...rule.patterns];
      const labels = [...rule.labels];

      if (customKeywords && customKeywords[rule.field as string]) {
        const userKw = customKeywords[rule.field as string].split(',').map(s => s.trim()).filter(Boolean);
        patterns.push(...userKw);
        labels.push(...userKw);
      }

      for (const p of patterns) {
        const np = norm(p);
        if (name === np || id === np) { score = Math.max(score, 10); }
        else if (name.includes(np) || id.includes(np)) { score = Math.max(score, 7); }
        else if (placeholder === np) { score = Math.max(score, 6); }
        else if (placeholder.includes(np)) { score = Math.max(score, 4); }
      }

      for (const lp of labels) {
        const nlp = norm(lp);
        if (normLabel === nlp) { score = Math.max(score, 9); }
        else if (normLabel.includes(nlp) || nlp.includes(normLabel)) { score = Math.max(score, 5); }
      }

      if (score > bestScore) {
        bestScore = score;
        bestField = rule.field;
      }
    }

    // Minimum confidence threshold
    return bestScore >= 4 ? { field: bestField!, score: bestScore } : null;
  }

  /** Match an element to a profile field */
  function matchField(el: HTMLElement, customKeywords?: Record<string, string>): keyof Profile | null {
    const res = matchFieldWithScore(el, customKeywords);
    return res ? res.field : null;
  }

  /** Match an element to a custom profile field with score */
  function matchCustomFieldWithScore(el: HTMLElement, customFields?: CustomField[]): { customField: CustomField; score: number } | null {
    if (!customFields || customFields.length === 0) return null;

    const name = norm(el.getAttribute('name') || '');
    const id = norm(el.getAttribute('id') || '');
    const placeholder = norm(el.getAttribute('placeholder') || '');
    const labelText = getLabelText(el);
    const normLabel = norm(labelText);

    let bestCF: CustomField | null = null;
    let bestScore = 0;

    for (const cf of customFields) {
      let score = 0;
      const patterns = [cf.label, ...cf.keywords.split(',').map(s => s.trim()).filter(Boolean)];
      const labels = [cf.label, ...cf.keywords.split(',').map(s => s.trim()).filter(Boolean)];

      for (const p of patterns) {
        const np = norm(p);
        if (!np) continue;
        if (name === np || id === np) { score = Math.max(score, 10); }
        else if (name.includes(np) || id.includes(np)) { score = Math.max(score, 7); }
        else if (placeholder === np) { score = Math.max(score, 6); }
        else if (placeholder.includes(np)) { score = Math.max(score, 4); }
      }

      for (const lp of labels) {
        const nlp = norm(lp);
        if (!nlp) continue;
        if (normLabel === nlp) { score = Math.max(score, 9); }
        else if (normLabel.includes(nlp) || nlp.includes(normLabel)) { score = Math.max(score, 5); }
      }

      if (score > bestScore) {
        bestScore = score;
        bestCF = cf;
      }
    }

    return bestScore >= 4 ? { customField: bestCF!, score: bestScore } : null;
  }

  // ─────────────────────────────────────────────────────────────
  // Value setters (handles React/Angular/Vue controlled inputs)
  // ─────────────────────────────────────────────────────────────

  function nativeSet(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    const proto = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    const setter = descriptor?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  }

  function fillSelect(select: HTMLSelectElement, value: string): boolean {
    const normalizedValue = value.toLowerCase().trim();
    let bestOption: HTMLOptionElement | null = null;
    let bestScore = 0;

    for (const option of Array.from(select.options)) {
      if (option.value === '' || option.disabled) continue;
      const optText = option.text.toLowerCase().trim();
      const optVal = option.value.toLowerCase().trim();

      let score = 0;
      if (optVal === normalizedValue || optText === normalizedValue) score = 10;
      else if (optText.includes(normalizedValue) || normalizedValue.includes(optText)) score = 6;
      else if (optVal.includes(normalizedValue) || normalizedValue.includes(optVal)) score = 5;

      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }

    if (bestOption && bestScore >= 5) {
      select.value = bestOption.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  function fillRadioGroup(name: string, value: string): boolean {
    const radios = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
    if (!radios.length) return false;
    const normalizedValue = value.toLowerCase().trim();
    let filled = false;

    for (const radio of Array.from(radios)) {
      const radioVal = radio.value.toLowerCase();
      const radioLabel = getLabelText(radio).toLowerCase();
      if (
        radioVal === normalizedValue || radioVal.includes(normalizedValue) ||
        normalizedValue.includes(radioVal) || radioLabel.includes(normalizedValue)
      ) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        filled = true;
        break;
      }
    }
    return filled;
  }

  function fillElement(el: HTMLElement, value: string): boolean {
    if (!value?.trim()) return false;

    const tag = el.tagName.toLowerCase();
    const type = ((el as HTMLInputElement).type || '').toLowerCase();

    if (tag === 'textarea') {
      nativeSet(el as HTMLTextAreaElement, value);
      return true;
    }

    if (tag === 'select') {
      return fillSelect(el as HTMLSelectElement, value);
    }

    if (tag === 'input') {
      if (['hidden', 'submit', 'button', 'image', 'file', 'reset'].includes(type)) return false;

      if (type === 'radio') {
        const name = el.getAttribute('name');
        if (name) return fillRadioGroup(name, value);
        return false;
      }

      if (type === 'checkbox') {
        const check = el as HTMLInputElement;
        const yes = ['yes', 'true', '1', 'on', 'agree', 'accept'].includes(value.toLowerCase());
        check.checked = yes;
        check.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      // Don't overwrite if already has a value (user pre-filled)
      if ((el as HTMLInputElement).value && type !== 'date') return false;

      nativeSet(el as HTMLInputElement, value);
      return true;
    }

    // Contenteditable
    if (el.getAttribute('contenteditable') === 'true') {
      el.textContent = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // Main fill function
  // ─────────────────────────────────────────────────────────────

  function fillForm(profile: Profile): { filled: number; total: number; skipped: number } {
    const selector = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="file"]):not([type="reset"])',
      'textarea',
      'select',
      '[contenteditable="true"]',
    ].join(', ');

    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    // Deduplicate radio groups
    const seenRadioNames = new Set<string>();
    const uniqueElements = elements.filter((el) => {
      if ((el as HTMLInputElement).type === 'radio') {
        const name = el.getAttribute('name');
        if (!name || seenRadioNames.has(name)) return false;
        seenRadioNames.add(name);
      }
      return true;
    });

    let filled = 0;
    let skipped = 0;
    const total = uniqueElements.length;

    // Track dynamic experience field indices
    let companyIdx = 0;
    let roleIdx = 0;
    let startIdx = 0;
    let endIdx = 0;

    for (const el of uniqueElements) {
      const standardMatch = matchFieldWithScore(el, profile.customKeywords);
      const customMatch = matchCustomFieldWithScore(el, profile.customFields);

      let useStandard = false;
      let useCustom = false;

      if (standardMatch && customMatch) {
        if (customMatch.score > standardMatch.score) {
          useCustom = true;
        } else {
          useStandard = true;
        }
      } else if (standardMatch) {
        useStandard = true;
      } else if (customMatch) {
        useCustom = true;
      }

      if (!useStandard && !useCustom) { skipped++; continue; }

      if (useStandard) {
        const field = standardMatch!.field;
        // Handle experiences
        if (field === 'expCompany' as any) {
          const value = profile.experiences?.[companyIdx]?.company || '';
          if (value) {
            const success = fillElement(el, value);
            if (success) { filled++; companyIdx++; continue; }
          }
          skipped++;
          continue;
        }
        if (field === 'expRole' as any) {
          const value = profile.experiences?.[roleIdx]?.role || '';
          if (value) {
            const success = fillElement(el, value);
            if (success) { filled++; roleIdx++; continue; }
          }
          skipped++;
          continue;
        }
        if (field === 'expStartDate' as any) {
          const value = profile.experiences?.[startIdx]?.startDate || '';
          if (value) {
            const success = fillElement(el, value);
            if (success) { filled++; startIdx++; continue; }
          }
          skipped++;
          continue;
        }
        if (field === 'expEndDate' as any) {
          const value = profile.experiences?.[endIdx]?.isCurrent ? 'Present' : (profile.experiences?.[endIdx]?.endDate || '');
          if (value) {
            const success = fillElement(el, value);
            if (success) { filled++; endIdx++; continue; }
          }
          skipped++;
          continue;
        }

        // Handle normal fields
        const value = profile[field];
        if (!value) { skipped++; continue; }
        const success = fillElement(el, value as string);
        if (success) filled++;
        else skipped++;
      } else if (useCustom) {
        const cf = customMatch!.customField;
        const value = cf.value;
        if (!value) { skipped++; continue; }
        const success = fillElement(el, value);
        if (success) filled++;
        else skipped++;
      }
    }

    return { filled, total, skipped };
  }

  // ─────────────────────────────────────────────────────────────
  // Show a subtle toast overlay after filling
  // ─────────────────────────────────────────────────────────────
  function showToast(filled: number, total: number): void {
    const existing = document.getElementById('__jobfill_toast__');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = '__jobfill_toast__';
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 2147483647;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; padding: 14px 20px; border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      font-size: 14px; font-weight: 500; letter-spacing: 0.01em;
      box-shadow: 0 8px 32px rgba(99,102,241,0.5), 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; gap: 10px;
      animation: __jobfill_slide_in__ 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
      max-width: 320px;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes __jobfill_slide_in__ {
        from { opacity: 0; transform: translateX(40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes __jobfill_slide_out__ {
        from { opacity: 1; transform: translateX(0); }
        to   { opacity: 0; transform: translateX(40px); }
      }
    `;
    document.head.appendChild(style);

    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div>
        <div style="font-weight:600;">JobFill Complete ✨</div>
        <div style="opacity:0.85;font-size:12px;margin-top:2px;">Filled ${filled} of ${total} fields</div>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = '__jobfill_slide_out__ 0.25s ease forwards';
      setTimeout(() => toast.remove(), 260);
    }, 3500);
  }

  // ─────────────────────────────────────────────────────────────
  // Active element tracking for shortcut fills
  // ─────────────────────────────────────────────────────────────
  let lastActiveElement: HTMLElement | null = null;

  function updateActiveElement(e: Event) {
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true')
    ) {
      lastActiveElement = target;
    }
  }

  document.addEventListener('focus', updateActiveElement, true);
  document.addEventListener('click', updateActiveElement, true);
  document.addEventListener('mousedown', updateActiveElement, true);

  // ─────────────────────────────────────────────────────────────
  // LinkedIn Easy Apply Automation Engine
  // ─────────────────────────────────────────────────────────────

  let liAutoApplyRunning = false;

  /** Get the visible Easy Apply / Apply modal element */
  function getLiModal(): HTMLElement | null {
    return (
      document.querySelector<HTMLElement>('[data-test-modal-id="easy-apply-modal"]') ||
      document.querySelector<HTMLElement>('.jobs-easy-apply-modal') ||
      // Newer LinkedIn: just uses role=dialog with artdeco classes
      document.querySelector<HTMLElement>('div[role="dialog"].artdeco-modal') ||
      document.querySelector<HTMLElement>('[aria-label="Easy Apply"]') ||
      document.querySelector<HTMLElement>('[aria-labelledby*="easy-apply"]') ||
      null
    );
  }

  /** Show a prominent "ready to submit" overlay on the modal */
  function showSubmitReadyOverlay(): void {
    const existing = document.getElementById('__jobfill_submit_overlay__');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.id = '__jobfill_submit_overlay__';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #fff;
      padding: 18px 22px;
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 40px rgba(16,185,129,0.55), 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 300px;
      animation: __jobfill_slide_in__ 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
    `;
    overlay.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17L4 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-weight:700;font-size:15px;">Ready to Submit! 🎉</span>
      </div>
      <div style="font-size:12.5px;opacity:0.9;line-height:1.5;">
        JobFill has filled all steps.<br>
        <strong>Please review</strong> your application, then click <strong>Submit application</strong>.
      </div>
      <button
        id="__jobfill_dismiss_overlay__"
        style="
          margin-top:4px;
          background:rgba(0,0,0,0.2);
          border:1px solid rgba(255,255,255,0.25);
          color:white;
          border-radius:8px;
          padding:6px 12px;
          font-size:12px;
          font-weight:600;
          cursor:pointer;
          font-family:inherit;
          transition:background 0.2s;
        "
      >Dismiss</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById('__jobfill_dismiss_overlay__')?.addEventListener('click', () => overlay.remove());
    // Auto-dismiss after 20 seconds
    setTimeout(() => overlay?.remove(), 20000);
  }

  /** Show a live progress toast during Easy Apply navigation */
  function showAutoApplyProgress(message: string, step: number, total: number): void {
    let toast = document.getElementById('__jobfill_aa_progress__') as HTMLDivElement | null;
    if (!toast) {
      toast = document.createElement('div');
      toast.id = '__jobfill_aa_progress__';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        background: #0e1220;
        border: 1px solid rgba(99,102,241,0.4);
        color: #f1f5f9;
        padding: 14px 18px;
        border-radius: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 240px;
        max-width: 300px;
      `;
      document.body.appendChild(toast);
    }
    const pct = total > 0 ? Math.round((step / total) * 100) : 0;
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="
          width:16px;height:16px;
          border:2px solid rgba(99,102,241,0.25);
          border-top-color:#6366f1;
          border-radius:50%;
          animation:__jobfill_spin__ 0.7s linear infinite;
          flex-shrink:0;
        "></div>
        <span style="font-weight:600;color:#a5b4fc;">JobFill Auto Apply</span>
      </div>
      <div style="font-size:12px;color:#94a3b8;">${message}</div>
      <div style="background:rgba(255,255,255,0.06);border-radius:6px;overflow:hidden;height:4px;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:6px;transition:width 0.3s;"></div>
      </div>
    `;
  }

  function removeAutoApplyProgress(): void {
    document.getElementById('__jobfill_aa_progress__')?.remove();
  }

  /** Sleep helper for async delays */
  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Wait for a DOM element matching selector, up to timeoutMs */
  async function waitForElement(selector: string, timeoutMs = 5000): Promise<HTMLElement | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  }

  /**
   * Fill LinkedIn Easy Apply specific fields inside the modal.
   * LinkedIn uses custom DOM structures – this mirrors the Python bot's logic:
   * - select → <select> elements (dropdowns)
   * - radio  → fieldset[data-test-form-builder-radio-button-form-component]
   * - text   → input[type=text]
   * - textarea → <textarea>
   * - checkbox → input[type=checkbox]
   */
  function fillLinkedInModalStep(modal: HTMLElement, profile: Profile): number {
    let filled = 0;

    // ── 1. Standard inputs and textareas ──────────────────────────
    const inputSelector = [
      'input[type="text"]:not([readonly]):not([disabled])',
      'input[type="email"]:not([readonly]):not([disabled])',
      'input[type="tel"]:not([readonly]):not([disabled])',
      'input[type="number"]:not([readonly]):not([disabled])',
      'input[type="url"]:not([readonly]):not([disabled])',
      'textarea:not([readonly]):not([disabled])',
    ].join(',');

    const inputs = Array.from(modal.querySelectorAll<HTMLElement>(inputSelector));
    for (const el of inputs) {
      // Skip if already filled
      const current = (el as HTMLInputElement | HTMLTextAreaElement).value;
      if (current && current.trim().length > 0) continue;

      const match = matchField(el, profile.customKeywords);
      if (!match) continue;

      const value = profile[match as keyof Profile] as string;
      if (!value) continue;

      nativeSet(el as HTMLInputElement | HTMLTextAreaElement, value);
      filled++;
    }

    // ── 2. Select dropdowns ────────────────────────────────────────
    const selects = Array.from(modal.querySelectorAll<HTMLSelectElement>('select:not([disabled])'));
    for (const sel of selects) {
      if (sel.value && sel.value !== '' && sel.selectedIndex > 0) continue; // already chosen

      const match = matchField(sel, profile.customKeywords);
      if (!match) continue;

      const value = profile[match as keyof Profile] as string;
      if (!value) continue;

      const ok = fillSelect(sel, value);
      if (ok) filled++;
    }

    // ── 3. LinkedIn radio buttons (fieldset-based) ─────────────────
    // LinkedIn wraps radio options in a fieldset with a specific data attribute
    const radioFieldsets = Array.from(
      modal.querySelectorAll<HTMLElement>('fieldset[data-test-form-builder-radio-button-form-component="true"]')
    );
    for (const fieldset of radioFieldsets) {
      // Skip if already answered
      const alreadySelected = fieldset.querySelector<HTMLInputElement>('input[type="radio"]:checked');
      if (alreadySelected) continue;

      // Get the label text
      const titleEl =
        fieldset.querySelector<HTMLElement>('[data-test-form-builder-radio-button-form-component__title]') ||
        fieldset.querySelector<HTMLElement>('legend') ||
        fieldset.querySelector<HTMLElement>('span');
      const labelText = titleEl?.textContent?.trim().toLowerCase() || '';

      // Determine best value from profile based on label keyword
      let value = '';
      if (labelText.includes('sponsor') || labelText.includes('visa')) {
        value = profile.workAuthorization || 'Yes';
      } else if (labelText.includes('relocat')) {
        value = profile.willingToRelocate || 'Yes';
      } else if (labelText.includes('remote') || labelText.includes('work mode') || labelText.includes('work type')) {
        value = profile.remotePreference || 'Hybrid';
      } else if (labelText.includes('gender') || labelText.includes('sex')) {
        value = profile.gender || 'Decline to self identify';
      } else if (labelText.includes('veteran')) {
        value = profile.veteranStatus || 'I am not a protected veteran';
      } else if (labelText.includes('disability') || labelText.includes('handicap')) {
        value = profile.disabilityStatus || 'I do not have a disability';
      } else if (labelText.includes('citizenship') || labelText.includes('authorized') || labelText.includes('eligib')) {
        value = 'Yes';
      } else {
        value = 'Yes'; // safe default
      }

      const radioInputs = Array.from(fieldset.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      const normalizedValue = value.toLowerCase();

      let selected = false;
      // Try exact/partial label match first
      for (const radio of radioInputs) {
        const radioLabel = fieldset.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(radio.id)}"`);
        const radioText = radioLabel?.textContent?.trim().toLowerCase() || radio.value.toLowerCase();
        if (radioText === normalizedValue || radioText.includes(normalizedValue) || normalizedValue.includes(radioText)) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          radio.click();
          selected = true;
          filled++;
          break;
        }
      }
      // Fallback: click first option
      if (!selected && radioInputs.length > 0) {
        radioInputs[0].click();
        filled++;
      }
    }

    // ── 4. Checkboxes ──────────────────────────────────────────────
    const checkboxes = Array.from(
      modal.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:not([disabled])')
    );
    for (const cb of checkboxes) {
      if (cb.checked) continue; // already checked
      // For "follow company" and acknowledgement checkboxes, leave unchecked (user preference)
      const label = getLabelText(cb).toLowerCase();
      if (label.includes('follow')) continue; // skip follow company
      if (label.includes('acknowledge') || label.includes('agree') || label.includes('certif')) {
        cb.click();
        filled++;
      }
    }

    return filled;
  }

  /** Check if the current modal step is the Review/Submit step */
  function isSubmitStep(modal: HTMLElement): boolean {
    const buttons = Array.from(modal.querySelectorAll('button'));
    return buttons.some(btn => {
      const text = btn.textContent?.toLowerCase().trim() || '';
      return text === 'submit application' || text === 'submit';
    });
  }

  /** Find the Next / Review / Submit button in the modal footer */
  function findNextButton(modal: HTMLElement): HTMLButtonElement | null {
    const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>('button'));

    // Priority: Next > Review your application > Submit application
    const priority = ['next', 'review your application', 'submit application', 'submit'];

    for (const label of priority) {
      const btn = buttons.find(b => b.textContent?.toLowerCase().trim() === label && !b.disabled);
      if (btn) return btn;
    }

    // Fallback: any visible primary button in the footer
    const footer =
      modal.querySelector<HTMLElement>('[data-test-modal-footer]') ||
      modal.querySelector<HTMLElement>('.jobs-easy-apply-modal__footer') ||
      modal.querySelector<HTMLElement>('footer');

    if (footer) {
      const footerBtn = footer.querySelector<HTMLButtonElement>(
        'button[aria-label*="next" i], button[aria-label*="continue" i], button[aria-label*="review" i]'
      );
      if (footerBtn && !footerBtn.disabled) return footerBtn;
    }

    return null;
  }

  /** Count total steps from the progress bar if available */
  function getStepCount(modal: HTMLElement): { current: number; total: number } {
    // LinkedIn progress bar: "Step X of Y"
    const progressEl = modal.querySelector<HTMLElement>('[data-test-progress-bar]') ||
      modal.querySelector<HTMLElement>('[aria-label*="Step"]') ||
      modal.querySelector<HTMLElement>('.artdeco-completeness-meter-linear');
    if (progressEl) {
      const text = progressEl.getAttribute('aria-label') || progressEl.textContent || '';
      const match = text.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) return { current: parseInt(match[1]), total: parseInt(match[2]) };
    }
    return { current: 0, total: 0 };
  }

  /** Main LinkedIn Easy Apply automation loop */
  async function runLinkedInAutoApply(profile: Profile): Promise<{ success: boolean; message: string }> {
    if (liAutoApplyRunning) {
      return { success: false, message: 'Auto Apply is already running.' };
    }
    liAutoApplyRunning = true;

    try {
      // 1. Find the Apply button on the page and click it if modal isn't open
      let modal = getLiModal();
      if (!modal) {
        // Selectors derived from LinkedIn's actual button HTML:
        //   id="jobs-apply-button-id"
        //   data-live-test-job-apply-button=""
        //   class="jobs-apply-button artdeco-button artdeco-button--3 artdeco-button--primary"
        //   aria-label="LinkedIn Apply to <Role> at <Company>"
        const applyBtn: HTMLElement | null =
          // 1. Fixed ID — most reliable
          document.querySelector<HTMLElement>('#jobs-apply-button-id') ||
          // 2. LinkedIn's test attribute on the button
          document.querySelector<HTMLElement>('[data-live-test-job-apply-button]') ||
          // 3. data-job-id attribute (button carries the job ID)
          document.querySelector<HTMLElement>('.jobs-apply-button[data-job-id]') ||
          // 4. Class that LinkedIn has always used on this button
          document.querySelector<HTMLElement>('.jobs-apply-button') ||
          // 5. aria-label starts with "LinkedIn Apply"
          document.querySelector<HTMLElement>('[aria-label^="LinkedIn Apply" i]') ||
          // 6. Broader: aria-label contains "Apply" but not "Save" or "Save job"
          document.querySelector<HTMLElement>('button[aria-label*="Apply" i]:not([aria-label*="Save" i])') ||
          // 7. Wrapper container specific to top card
          document.querySelector<HTMLElement>('.jobs-apply-button--top-card button') ||
          // 8. Find by inner text
          Array.from(document.querySelectorAll<HTMLElement>('button, .artdeco-button')).find(btn => {
            const text = btn.textContent?.trim().toLowerCase() || '';
            return (text.includes('easy apply') || text === 'apply' || text === 'apply now') && !text.includes('save');
          }) ||
          null;

        if (!applyBtn) {
          liAutoApplyRunning = false;
          return {
            success: false,
            message: 'Apply button not found. Make sure you are on a LinkedIn job page and the Apply button is visible.',
          };
        }

        // LinkedIn uses Ember.js — plain .click() may not trigger its listeners.
        // Dispatch a full mousedown → mouseup → click sequence on the element.
        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
          applyBtn.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true }));
        });

        // Wait for the application modal to appear — try multiple selectors
        modal = await waitForElement(
          [
            '[data-test-modal-id="easy-apply-modal"]',
            '.jobs-easy-apply-modal',
            'div[role="dialog"].artdeco-modal',
            '[aria-label="Easy Apply"]',
            '.jobs-easy-apply-form-section__group',
          ].join(', '),
          7000
        );

        // Absolute fallback: any open dialog on the page
        if (!modal) {
          modal = document.querySelector<HTMLElement>('div[role="dialog"]');
        }

        if (!modal) {
          liAutoApplyRunning = false;
          return {
            success: false,
            message: 'Application modal did not open. Try clicking the Apply button manually first, then run Auto Apply.',
          };
        }
        await sleep(900);
      }

      let stepNumber = 1;
      let maxSteps = 20; // Safety cap

      while (maxSteps-- > 0 && liAutoApplyRunning) {
        // Re-acquire modal reference each iteration (DOM may re-render)
        modal = getLiModal();
        if (!modal) break;

        const { current, total } = getStepCount(modal);
        const stepLabel = total > 0 ? `Step ${current} of ${total}` : `Step ${stepNumber}`;

        // Check for submit step BEFORE filling
        if (isSubmitStep(modal)) {
          showAutoApplyProgress('Review your application, then submit.', total || stepNumber, total || stepNumber);
          await sleep(600);
          removeAutoApplyProgress();
          showSubmitReadyOverlay();
          liAutoApplyRunning = false;
          return { success: true, message: 'Reached submit step — paused for your review.' };
        }

        showAutoApplyProgress(`Filling ${stepLabel}…`, current || stepNumber, total || stepNumber + 2);

        // Fill current modal step
        fillLinkedInModalStep(modal, profile);
        await sleep(600);

        // Find and click Next
        modal = getLiModal();
        if (!modal) break;

        const nextBtn = findNextButton(modal);
        if (!nextBtn) {
          // Maybe we're at submit now
          if (isSubmitStep(modal)) {
            removeAutoApplyProgress();
            showSubmitReadyOverlay();
            liAutoApplyRunning = false;
            return { success: true, message: 'Reached submit step — paused for your review.' };
          }
          // No button found — stop gracefully
          removeAutoApplyProgress();
          liAutoApplyRunning = false;
          return { success: false, message: 'Could not find the Next button. Please continue manually.' };
        }

        const btnText = nextBtn.textContent?.toLowerCase().trim() || '';

        // If we're about to click Submit — stop and let user do it
        if (btnText === 'submit application' || btnText === 'submit') {
          removeAutoApplyProgress();
          showSubmitReadyOverlay();
          liAutoApplyRunning = false;
          return { success: true, message: 'Reached submit step — paused for your review.' };
        }

        nextBtn.click();
        stepNumber++;

        // Wait for next step to render
        await sleep(1200);
      }

      removeAutoApplyProgress();
      liAutoApplyRunning = false;
      return { success: false, message: 'Auto Apply ended unexpectedly. Please continue manually.' };
    } catch (err) {
      removeAutoApplyProgress();
      liAutoApplyRunning = false;
      return { success: false, message: `Error: ${String(err)}` };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Message listener
  // ─────────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'PING') {
      sendResponse({ success: true, ready: true });
      return false;
    }

    if (message.action === 'FILL_FORM') {
      const result = fillForm(message.profile as Profile);
      showToast(result.filled, result.total);
      sendResponse({ success: true, ...result });
      return false;
    }

    if (message.action === 'INSERT_SHORTCUT') {
      const el = lastActiveElement || (document.activeElement as HTMLElement);
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.getAttribute('contenteditable') === 'true')
      ) {
        const success = fillElement(el, message.value);
        if (success) {
          sendResponse({ success: true });
          return false;
        }
      }
      sendResponse({ success: false, error: 'No active input field found. Click on an input field first!' });
      return false;
    }

    if (message.action === 'LI_AUTO_APPLY') {
      // Kick off async without blocking message channel
      runLinkedInAutoApply(message.profile as Profile).then(result => {
        sendResponse(result);
      });
      return true; // keep channel open for async response
    }

    if (message.action === 'LI_AUTO_APPLY_STOP') {
      liAutoApplyRunning = false;
      removeAutoApplyProgress();
      sendResponse({ success: true });
      return false;
    }

    return false;
  });
})();
