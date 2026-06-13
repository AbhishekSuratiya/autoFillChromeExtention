export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface UserProfile {
  // ── Personal ──────────────────────────────────
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;

  // ── Online Presence ───────────────────────────
  linkedIn: string;
  github: string;
  portfolio: string;

  // ── Address ───────────────────────────────────
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;

  // ── Professional ──────────────────────────────
  currentTitle: string;
  desiredTitle: string;
  yearsExperience: string;
  currentSalary: string;
  desiredSalary: string;
  workAuthorization: string;
  willingToRelocate: string;
  remotePreference: string;
  summary: string;

  // ── Education ─────────────────────────────────
  degree: string;
  fieldOfStudy: string;
  university: string;
  graduationYear: string;
  gpa: string;

  // ── Work Experience ───────────────────────────
  experiences: WorkExperience[];

  // ── Skills ────────────────────────────────────
  skills: string;
  programmingLanguages: string;
  frameworks: string;

  // ── Links ─────────────────────────────────────
  resumeUrl: string;
  coverLetterUrl: string;

  // ── Diversity (optional) ──────────────────────
  gender: string;
  ethnicity: string;
  veteranStatus: string;
  disabilityStatus: string;

  // ── Shortcut Fills ────────────────────────────
  shortcuts?: ShortcutFill[];

  // ── Custom Keywords ───────────────────────────
  customKeywords?: Record<string, string>;

  // ── Custom Fields ─────────────────────────────
  customFields?: CustomField[];
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
  keywords: string;
}


export interface ShortcutFill {
  id: string;
  label: string;
  value: string;
  usages: number;
  lastUsed?: number;
}

export const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  linkedIn: '',
  github: '',
  portfolio: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  currentTitle: '',
  desiredTitle: '',
  yearsExperience: '',
  currentSalary: '',
  desiredSalary: '',
  workAuthorization: '',
  willingToRelocate: '',
  remotePreference: '',
  summary: '',
  degree: '',
  fieldOfStudy: '',
  university: '',
  graduationYear: '',
  gpa: '',
  experiences: [
    {
      id: '1',
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
    },
  ],
  skills: '',
  programmingLanguages: '',
  frameworks: '',
  resumeUrl: '',
  coverLetterUrl: '',
  gender: '',
  ethnicity: '',
  veteranStatus: '',
  disabilityStatus: '',
  shortcuts: [],
  customKeywords: {},
  customFields: [],
};

export const STORAGE_KEY = 'jobfill_profile';

export function getCompletionPercent(profile: UserProfile): number {
  const keys = Object.keys(defaultProfile) as (keyof UserProfile)[];
  // Diversity fields, shortcuts and customKeywords are optional – exclude from core calculation
  const optionalKeys: (keyof UserProfile)[] = ['gender', 'ethnicity', 'veteranStatus', 'disabilityStatus', 'shortcuts' as any, 'customKeywords' as any, 'customFields' as any];
  const coreKeys = keys.filter((k) => !optionalKeys.includes(k));
  const filled = coreKeys.filter((k) => {
    if (k === 'experiences') {
      return profile.experiences?.some((exp) => exp.company.trim() !== '');
    }
    return profile[k]?.toString().trim() !== '';
  }).length;
  return Math.round((filled / coreKeys.length) * 100);
}
