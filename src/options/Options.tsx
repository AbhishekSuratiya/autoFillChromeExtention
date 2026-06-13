import { useState, useEffect, useCallback, type ReactNode, type ReactElement } from 'react'
import { type UserProfile, type WorkExperience, type CustomField, type ShortcutFill, defaultProfile, STORAGE_KEY, getCompletionPercent } from '../types'

// ── Tab definitions ───────────────────────────────────────────
type TabId = 'personal' | 'address' | 'professional' | 'education' | 'experience' | 'skills' | 'diversity' | 'shortcuts' | 'custom'

const TABS: Array<{ id: TabId; label: string; icon: ReactElement; fields: (keyof UserProfile)[] }> = [
  {
    id: 'personal',
    label: 'Personal Info',
    fields: ['firstName', 'lastName', 'fullName', 'email', 'phone', 'dateOfBirth', 'linkedIn', 'github', 'portfolio'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'address',
    label: 'Address',
    fields: ['address', 'city', 'state', 'zipCode', 'country'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    id: 'professional',
    label: 'Professional',
    fields: ['currentTitle', 'desiredTitle', 'yearsExperience', 'currentSalary', 'desiredSalary', 'workAuthorization', 'willingToRelocate', 'remotePreference', 'summary'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'education',
    label: 'Education',
    fields: ['degree', 'fieldOfStudy', 'university', 'graduationYear', 'gpa'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 12v5c3.33 2 8.67 2 12 0v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'experience',
    label: 'Experience',
    fields: ['experiences'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'skills',
    label: 'Skills & Links',
    fields: ['skills', 'programmingLanguages', 'frameworks', 'resumeUrl', 'coverLetterUrl'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'diversity',
    label: 'Diversity',
    fields: ['gender', 'ethnicity', 'veteranStatus', 'disabilityStatus'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'shortcuts',
    label: 'Shortcut Fills',
    fields: ['shortcuts' as any],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="9" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="9" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="9" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'custom',
    label: 'Custom Fields',
    fields: ['customFields' as any],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

// ── Small reusable Field components ──────────────────────────
function Field({
  label,
  helper,
  required,
  children,
  span,
  fieldKey,
  customKeywords,
  onKeywordChange,
}: {
  label: string
  helper?: string
  required?: boolean
  children: ReactNode
  span?: 2 | 3
  fieldKey?: string
  customKeywords?: Record<string, string>
  onKeywordChange?: (field: string, value: string) => void
}) {
  return (
    <div
      className="opt-field"
      style={span ? { gridColumn: `span ${span}` } : undefined}
    >
      <label className="opt-label">
        {label}
        {required && <span className="opt-label-req">*</span>}
      </label>
      {fieldKey && onKeywordChange ? (
        <div className="opt-input-kw-wrapper">
          <div className="opt-input-primary-container">
            {children}
          </div>
          <input
            className="opt-input opt-kw-input"
            placeholder="Related keywords (comma-separated)..."
            value={customKeywords?.[fieldKey] || ''}
            onChange={(e) => onKeywordChange(fieldKey, e.target.value)}
          />
        </div>
      ) : (
        children
      )}
      {helper && <span className="opt-helper">{helper}</span>}
    </div>
  )
}

// ── Main Options component ────────────────────────────────────
export function Options() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [activeTab, setActiveTab] = useState<TabId>('personal')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [completion, setCompletion] = useState(0)

  // Shortcut states
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Load stored profile
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result: Record<string, unknown>) => {
      if (result[STORAGE_KEY]) {
        const p = result[STORAGE_KEY] as UserProfile
        // Backward compatibility: check if experiences exists, otherwise populate it
        const oldProfile = p as any
        if (!p.experiences || p.experiences.length === 0) {
          p.experiences = [
            {
              id: '1',
              company: oldProfile.currentCompany || '',
              role: oldProfile.currentRole || '',
              startDate: oldProfile.currentStartDate || '',
              endDate: oldProfile.currentEndDate || '',
              isCurrent: !oldProfile.currentEndDate && !!oldProfile.currentCompany,
            }
          ];
          if (oldProfile.prevCompany) {
            p.experiences.push({
              id: '2',
              company: oldProfile.prevCompany,
              role: oldProfile.prevRole || '',
              startDate: oldProfile.prevStartDate || '',
              endDate: oldProfile.prevEndDate || '',
              isCurrent: false,
            });
          }
        }
        if (!p.customFields) {
          p.customFields = [];
        }
        setProfile(p)
        setCompletion(getCompletionPercent(p))
      }
    })

    // Listen for storage changes to sync options and sidebar in real-time
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[STORAGE_KEY]) {
        const nextProfile = changes[STORAGE_KEY].newValue as UserProfile
        if (nextProfile) {
          setProfile(nextProfile)
          setCompletion(getCompletionPercent(nextProfile))
        }
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const update = useCallback((field: keyof UserProfile, value: string) => {
    setProfile((prev: UserProfile) => {
      const next = { ...prev, [field]: value }

      // Auto-derive fullName from first+last
      if (field === 'firstName' || field === 'lastName') {
        const fn = field === 'firstName' ? value : prev.firstName
        const ln = field === 'lastName' ? value : prev.lastName
        if (fn || ln) next.fullName = `${fn} ${ln}`.trim()
      }

      setCompletion(getCompletionPercent(next))
      return next
    })
  }, [])

  const updateCustomKeyword = useCallback((field: string, value: string) => {
    setProfile((prev: UserProfile) => {
      const nextKeywords = { ...(prev.customKeywords || {}), [field]: value }
      const next = { ...prev, customKeywords: nextKeywords }
      return next
    })
  }, [])

  const updateExperience = useCallback((id: string, field: keyof WorkExperience, value: any) => {
    setProfile((prev: UserProfile) => {
      const updated = prev.experiences.map((exp) => {
        if (exp.id === id) {
          const nextExp = { ...exp, [field]: value }
          if (field === 'isCurrent' && value === true) {
            nextExp.endDate = ''
          }
          return nextExp
        }
        return exp
      })
      const next = { ...prev, experiences: updated }
      setCompletion(getCompletionPercent(next))
      return next
    })
  }, [])

  const addExperience = useCallback(() => {
    setProfile((prev: UserProfile) => {
      const newExp: WorkExperience = {
        id: Date.now().toString(),
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
      }
      const next = { ...prev, experiences: [...(prev.experiences || []), newExp] }
      setCompletion(getCompletionPercent(next))
      return next
    })
  }, [])

  const removeExperience = useCallback((id: string) => {
    setProfile((prev: UserProfile) => {
      if ((prev.experiences || []).length <= 1) return prev
      const next = { ...prev, experiences: prev.experiences.filter((exp) => exp.id !== id) }
      setCompletion(getCompletionPercent(next))
      return next
    })
  }, [])

  const handleAddCustomField = useCallback(() => {
    setProfile((prev: UserProfile) => {
      const newCF = {
        id: Date.now().toString(),
        label: '',
        value: '',
        keywords: '',
      }
      const next = { ...prev, customFields: [...(prev.customFields || []), newCF] }
      setCompletion(getCompletionPercent(next))
      return next
    })
  }, [])

  const handleUpdateCustomField = useCallback((id: string, updates: Partial<{ label: string; value: string; keywords: string }>) => {
    setProfile((prev: UserProfile) => {
      const updated = (prev.customFields || []).map((cf) => cf.id === id ? { ...cf, ...updates } : cf)
      const next = { ...prev, customFields: updated }
      setCompletion(getCompletionPercent(next))
      return next
    })
  }, [])

  const handleDeleteCustomField = useCallback((id: string) => {
    setProfile((prev: UserProfile) => {
      const next = { ...prev, customFields: (prev.customFields || []).filter((cf) => cf.id !== id) }
      setCompletion(getCompletionPercent(next))
      return next
    })
  }, [])

  const handleSave = async () => {
    setSaveState('saving')
    chrome.storage.local.set({ [STORAGE_KEY]: profile }, () => {
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2400)
    })
  }

  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "jobfill_profile_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          const p = parsed as UserProfile;
          if (!p.experiences || p.experiences.length === 0) {
            const old = p as any;
            p.experiences = [
              {
                id: '1',
                company: old.currentCompany || '',
                role: old.currentRole || '',
                startDate: old.currentStartDate || '',
                endDate: old.currentEndDate || '',
                isCurrent: !old.currentEndDate && !!old.currentCompany,
              }
            ];
            if (old.prevCompany) {
              p.experiences.push({
                id: '2',
                company: old.prevCompany,
                role: old.prevRole || '',
                startDate: old.prevStartDate || '',
                endDate: old.prevEndDate || '',
                isCurrent: false,
              });
            }
          }

          if (!p.customFields) {
            p.customFields = [];
          }

          setProfile(p);
          setCompletion(getCompletionPercent(p));
          chrome.storage.local.set({ [STORAGE_KEY]: p }, () => {
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2400);
          });
        }
      } catch (err) {
        alert("Invalid JSON backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // Tab completion badge
  const tabCompletion = (tab: typeof TABS[0]) => {
    const total = tab.fields.length
    const filled = tab.fields.filter((f) => {
      if (f === 'shortcuts' as any) {
        return (profile.shortcuts || []).length > 0
      }
      if (f === 'customFields' as any) {
        return (profile.customFields || []).length > 0
      }
      return profile[f]?.toString().trim() !== ''
    }).length
    return { filled, total, pct: Math.round((filled / total) * 100) }
  }

  const tab = TABS.find((t) => t.id === activeTab)!

  return (
    <div className="opt-app">
      {/* ── Sidebar ── */}
      <aside className="opt-sidebar">
        <div className="opt-sidebar-header">
          <div className="opt-brand">
            <svg className="opt-brand-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="9" fill="url(#bGrad)"/>
              <path d="M8 13h16v10a1 1 0 01-1 1H9a1 1 0 01-1-1V13z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
              <path d="M11 13V11a1 1 0 011-1h8a1 1 0 011 1v2" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round"/>
              <path d="M17.5 15.5l-3.5 3.5h3l-1.5 3.5 3.5-4H16l1.5-3z" fill="white"/>
              <defs>
                <linearGradient id="bGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/>
                  <stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <div>
              <div className="opt-brand-name">JobFill</div>
              <div className="opt-brand-sub">Profile Settings</div>
            </div>
          </div>

          {/* Progress */}
          <div className="opt-progress-wrap">
            <div className="opt-progress-label">
              <span className="opt-progress-text">Profile Completion</span>
              <span className="opt-progress-pct">{completion}%</span>
            </div>
            <div className="opt-progress-bar">
              <div className="opt-progress-fill" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>

        <nav className="opt-nav">
          {TABS.map((t) => {
            const { filled, total, pct } = tabCompletion(t)
            return (
              <button
                key={t.id}
                className={`opt-nav-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="opt-nav-icon">{t.icon}</span>
                <span>{t.label}</span>
                {pct === 100 ? (
                  <span className="opt-nav-badge complete">✓</span>
                ) : filled > 0 ? (
                  <span className="opt-nav-badge">{filled}/{total}</span>
                ) : null}
              </button>
            )
          })}
        </nav>

        <div className="opt-sidebar-footer">
          <div className="opt-version-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.86 0 .53-.39 1.38-2.1 1.38-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" fill="#64748b"/>
            </svg>
            JobFill v1.0.0
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="opt-main">
        {/* Top bar */}
        <div className="opt-topbar">
          <div className="opt-topbar-left">
            <h1>{tab.label}</h1>
            <p>
              {activeTab === 'personal' && 'Your name, contact details, and online profiles'}
              {activeTab === 'address' && 'Your current residential address'}
              {activeTab === 'professional' && 'Job preferences, work authorization, and your summary'}
              {activeTab === 'education' && 'Your highest degree and academic details'}
              {activeTab === 'experience' && 'Current and most recent work experience'}
              {activeTab === 'skills' && 'Technical skills, tools, and document links'}
              {activeTab === 'diversity' && 'Optional EEO fields — only filled when forms explicitly ask'}
              {activeTab === 'shortcuts' && 'Manage reusable text shortcuts for quick form insertion'}
              {activeTab === 'custom' && 'Create custom autofill fields with customizable labels, values, and keywords'}
            </p>
          </div>

          <div className="opt-topbar-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="opt-backup-btn"
              onClick={handleExportBackup}
              title="Export profile settings as a backup JSON file"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Backup
            </button>
            <label
              className="opt-backup-btn"
              title="Import profile settings from a backup JSON file"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                style={{ display: 'none' }}
              />
            </label>

            <button
              className={`opt-save-btn ${saveState === 'saved' ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? (
                <>
                  <div className="popup-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Saving…
                </>
              ) : saveState === 'saved' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M17 21v-8H7v8M7 3v5h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable form area */}
        <div className="opt-scroll">
          {/* ── PERSONAL ── */}
          {activeTab === 'personal' && (
            <div className="opt-panel" key="personal">
              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Name
                </div>
                <div className="opt-grid">
                  <Field label="First Name" required fieldKey="firstName" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-firstName" className="opt-input" placeholder="Jane" value={profile.firstName} onChange={e => update('firstName', e.target.value)} />
                  </Field>
                  <Field label="Last Name" required fieldKey="lastName" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-lastName" className="opt-input" placeholder="Smith" value={profile.lastName} onChange={e => update('lastName', e.target.value)} />
                  </Field>
                  <Field label="Full Name" span={2} helper="Auto-filled from first + last name. Some forms use this directly." fieldKey="fullName" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-fullName" className="opt-input" placeholder="Jane Smith" value={profile.fullName} onChange={e => update('fullName', e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Contact
                </div>
                <div className="opt-grid">
                  <Field label="Email Address" required fieldKey="email" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-email" className="opt-input" type="email" placeholder="jane@example.com" value={profile.email} onChange={e => update('email', e.target.value)} />
                  </Field>
                  <Field label="Phone Number" required fieldKey="phone" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-phone" className="opt-input" type="tel" placeholder="+1 (555) 000-0000" value={profile.phone} onChange={e => update('phone', e.target.value)} />
                  </Field>
                  <Field label="Date of Birth" helper="Required by some compliance forms" fieldKey="dateOfBirth" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-dob" className="opt-input" type="date" value={profile.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Online Presence
                </div>
                <div className="opt-grid">
                  <Field label="LinkedIn URL" fieldKey="linkedIn" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-linkedin" className="opt-input" placeholder="https://linkedin.com/in/janesmith" value={profile.linkedIn} onChange={e => update('linkedIn', e.target.value)} />
                  </Field>
                  <Field label="GitHub URL" fieldKey="github" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-github" className="opt-input" placeholder="https://github.com/janesmith" value={profile.github} onChange={e => update('github', e.target.value)} />
                  </Field>
                  <Field label="Portfolio / Website" span={2} fieldKey="portfolio" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-portfolio" className="opt-input" placeholder="https://janesmith.dev" value={profile.portfolio} onChange={e => update('portfolio', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── ADDRESS ── */}
          {activeTab === 'address' && (
            <div className="opt-panel" key="address">
              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Residential Address
                </div>
                <div className="opt-grid">
                  <Field label="Street Address" span={2} fieldKey="address" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-address" className="opt-input" placeholder="123 Main Street, Apt 4B" value={profile.address} onChange={e => update('address', e.target.value)} />
                  </Field>
                  <Field label="City" required fieldKey="city" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-city" className="opt-input" placeholder="San Francisco" value={profile.city} onChange={e => update('city', e.target.value)} />
                  </Field>
                  <Field label="State / Province" fieldKey="state" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-state" className="opt-input" placeholder="California" value={profile.state} onChange={e => update('state', e.target.value)} />
                  </Field>
                  <Field label="ZIP / Postal Code" fieldKey="zipCode" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-zip" className="opt-input" placeholder="94102" value={profile.zipCode} onChange={e => update('zipCode', e.target.value)} />
                  </Field>
                  <Field label="Country" required fieldKey="country" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <select id="opt-country" className="opt-select" value={profile.country} onChange={e => update('country', e.target.value)}>
                      <option value="">Select country…</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="Singapore">Singapore</option>
                      <option value="India">India</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── PROFESSIONAL ── */}
          {activeTab === 'professional' && (
            <div className="opt-panel" key="professional">
              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Job Details
                </div>
                <div className="opt-grid">
                  <Field label="Current Job Title" required fieldKey="currentTitle" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-currentTitle" className="opt-input" placeholder="Senior Software Engineer" value={profile.currentTitle} onChange={e => update('currentTitle', e.target.value)} />
                  </Field>
                  <Field label="Desired Job Title" fieldKey="desiredTitle" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-desiredTitle" className="opt-input" placeholder="Staff Engineer" value={profile.desiredTitle} onChange={e => update('desiredTitle', e.target.value)} />
                  </Field>
                  <Field label="Years of Experience" fieldKey="yearsExperience" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <select id="opt-yearsExp" className="opt-select" value={profile.yearsExperience} onChange={e => update('yearsExperience', e.target.value)}>
                      <option value="">Select…</option>
                      <option value="Less than 1">Less than 1 year</option>
                      <option value="1">1 year</option>
                      <option value="2">2 years</option>
                      <option value="3">3 years</option>
                      <option value="4">4 years</option>
                      <option value="5">5 years</option>
                      <option value="6">6 years</option>
                      <option value="7">7 years</option>
                      <option value="8">8 years</option>
                      <option value="9">9 years</option>
                      <option value="10+">10+ years</option>
                      <option value="15+">15+ years</option>
                      <option value="20+">20+ years</option>
                    </select>
                  </Field>
                  <Field label="Current Salary" helper="e.g. $100,000 or 100000" fieldKey="currentSalary" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-currentSalary" className="opt-input" placeholder="$100,000 / year" value={profile.currentSalary || ''} onChange={e => update('currentSalary', e.target.value)} />
                  </Field>
                  <Field label="Desired Salary" helper="e.g. $120,000 or 120000" fieldKey="desiredSalary" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-salary" className="opt-input" placeholder="$120,000 / year" value={profile.desiredSalary} onChange={e => update('desiredSalary', e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Eligibility & Preferences
                </div>
                <div className="opt-grid">
                  <Field label="Work Authorization" fieldKey="workAuthorization" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <select id="opt-workAuth" className="opt-select" value={profile.workAuthorization} onChange={e => update('workAuthorization', e.target.value)}>
                      <option value="">Select…</option>
                      <option value="US Citizen">US Citizen</option>
                      <option value="Permanent Resident">Permanent Resident / Green Card</option>
                      <option value="H-1B">H-1B Visa</option>
                      <option value="OPT">OPT / STEM OPT</option>
                      <option value="CPT">CPT</option>
                      <option value="TN Visa">TN Visa</option>
                      <option value="L-1">L-1 Visa</option>
                      <option value="O-1">O-1 Visa</option>
                      <option value="EAD">EAD (Other)</option>
                      <option value="Require Sponsorship">Require Sponsorship</option>
                      <option value="Not authorized">Not authorized</option>
                    </select>
                  </Field>
                  <Field label="Remote Preference" fieldKey="remotePreference" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <select id="opt-remote" className="opt-select" value={profile.remotePreference} onChange={e => update('remotePreference', e.target.value)}>
                      <option value="">Select…</option>
                      <option value="Remote">Fully Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site / In-office</option>
                      <option value="Flexible">Flexible / No preference</option>
                    </select>
                  </Field>
                  <Field label="Willing to Relocate?" fieldKey="willingToRelocate" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <select id="opt-relocate" className="opt-select" value={profile.willingToRelocate} onChange={e => update('willingToRelocate', e.target.value)}>
                      <option value="">Select…</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Maybe">Open to discuss</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Professional Summary
                </div>
                <div className="opt-grid">
                  <Field
                    label="Summary / Cover Letter"
                    span={2}
                    helper="Used for 'About Me', 'Summary', and 'Cover Letter' text fields. Keep it concise (2–4 sentences)."
                    fieldKey="summary"
                    customKeywords={profile.customKeywords}
                    onKeywordChange={updateCustomKeyword}
                  >
                    <textarea
                      id="opt-summary"
                      className="opt-textarea"
                      rows={5}
                      placeholder="Experienced software engineer with 6+ years building scalable web applications. Passionate about clean architecture, developer experience, and shipping impactful products. Looking for an opportunity to lead engineering at a mission-driven company."
                      value={profile.summary}
                      onChange={e => update('summary', e.target.value)}
                      style={{ minHeight: 120 }}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── EDUCATION ── */}
          {activeTab === 'education' && (
            <div className="opt-panel" key="education">
              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Highest Degree
                </div>
                <div className="opt-grid">
                  <Field label="Degree" required fieldKey="degree" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <select id="opt-degree" className="opt-select" value={profile.degree} onChange={e => update('degree', e.target.value)}>
                      <option value="">Select…</option>
                      <option value="High School Diploma">High School Diploma / GED</option>
                      <option value="Associate's">Associate's Degree</option>
                      <option value="Bachelor's">Bachelor's Degree</option>
                      <option value="Master's">Master's Degree</option>
                      <option value="MBA">MBA</option>
                      <option value="PhD">PhD / Doctorate</option>
                      <option value="MD">MD (Medicine)</option>
                      <option value="JD">JD (Law)</option>
                      <option value="Certificate">Professional Certificate</option>
                      <option value="Bootcamp">Bootcamp / Coding School</option>
                      <option value="Self-taught">Self-taught</option>
                    </select>
                  </Field>
                  <Field label="Field of Study / Major" fieldKey="fieldOfStudy" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-fieldOfStudy" className="opt-input" placeholder="Computer Science" value={profile.fieldOfStudy} onChange={e => update('fieldOfStudy', e.target.value)} />
                  </Field>
                  <Field label="University / College" span={2} fieldKey="university" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-university" className="opt-input" placeholder="University of California, Berkeley" value={profile.university} onChange={e => update('university', e.target.value)} />
                  </Field>
                  <Field label="Graduation Year" fieldKey="graduationYear" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-gradYear" className="opt-input" type="number" min={1950} max={2035} placeholder="2020" value={profile.graduationYear} onChange={e => update('graduationYear', e.target.value)} />
                  </Field>
                  <Field label="GPA" helper="Optional — e.g. 3.8 / 4.0" fieldKey="gpa" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-gpa" className="opt-input" placeholder="3.8" value={profile.gpa} onChange={e => update('gpa', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── EXPERIENCE ── */}
          {activeTab === 'experience' && (
            <div className="opt-panel" key="experience">
              {(profile.experiences || []).map((exp: WorkExperience, index: number) => (
                <div className="opt-section" key={exp.id}>
                  <div className="opt-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="opt-section-title-dot" />
                      {index === 0 ? 'Current / Most Recent Position' : `Position #${index + 1}`}
                    </div>
                    {(profile.experiences || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExperience(exp.id)}
                        className="opt-remove-exp-btn"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="opt-grid">
                    <Field label="Company Name" required>
                      <input id={`opt-company-${exp.id}`} className="opt-input" placeholder="Acme Corp" value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)} />
                    </Field>
                    <Field label="Job Title / Role" required>
                      <input id={`opt-role-${exp.id}`} className="opt-input" placeholder="Senior Software Engineer" value={exp.role} onChange={e => updateExperience(exp.id, 'role', e.target.value)} />
                    </Field>
                    <Field label="Start Date">
                      <input id={`opt-start-${exp.id}`} className="opt-input" type="month" value={exp.startDate} onChange={e => updateExperience(exp.id, 'startDate', e.target.value)} />
                    </Field>
                    <Field label="End Date" helper={exp.isCurrent ? "Currently work here" : "Leave blank if current position"}>
                      <input id={`opt-end-${exp.id}`} className="opt-input" type="month" value={exp.endDate} onChange={e => updateExperience(exp.id, 'endDate', e.target.value)} disabled={exp.isCurrent} />
                    </Field>
                    <div className="opt-span-2" style={{ marginTop: 4 }}>
                      <label className="opt-radio-option" style={{ display: 'inline-flex', width: 'auto' }}>
                        <input
                          type="checkbox"
                          checked={exp.isCurrent}
                          onChange={e => updateExperience(exp.id, 'isCurrent', e.target.checked)}
                          style={{ accentColor: 'var(--primary)', marginRight: 8 }}
                        />
                        <span>I currently work here</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={addExperience}
                  className="opt-add-exp-btn"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  + Add Experience
                </button>
              </div>
            </div>
          )}

          {/* ── SKILLS ── */}
          {activeTab === 'skills' && (
            <div className="opt-panel" key="skills">
              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Technical Skills
                </div>
                <div className="opt-grid">
                  <Field label="Key Skills" span={2} helper="Comma-separated. Used for 'Skills' text areas on application forms." fieldKey="skills" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <textarea
                      id="opt-skills"
                      className="opt-textarea"
                      placeholder="React, Node.js, TypeScript, System Design, REST APIs, Docker, AWS"
                      value={profile.skills}
                      onChange={e => update('skills', e.target.value)}
                    />
                  </Field>
                  <Field label="Programming Languages" helper="e.g. JavaScript, Python, Go, Java" fieldKey="programmingLanguages" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <textarea
                      id="opt-langs"
                      className="opt-textarea"
                      placeholder="JavaScript, TypeScript, Python, Go"
                      value={profile.programmingLanguages}
                      onChange={e => update('programmingLanguages', e.target.value)}
                      style={{ minHeight: 80 }}
                    />
                  </Field>
                  <Field label="Frameworks & Tools" helper="e.g. React, Next.js, PostgreSQL, Kubernetes" fieldKey="frameworks" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <textarea
                      id="opt-frameworks"
                      className="opt-textarea"
                      placeholder="React, Next.js, Node.js, PostgreSQL, Redis, Docker"
                      value={profile.frameworks}
                      onChange={e => update('frameworks', e.target.value)}
                      style={{ minHeight: 80 }}
                    />
                  </Field>
                </div>
              </div>

              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Document Links
                </div>
                <div className="opt-grid">
                  <Field label="Resume URL" helper="Google Drive, Dropbox, or direct PDF link" fieldKey="resumeUrl" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-resume" className="opt-input" placeholder="https://drive.google.com/file/…" value={profile.resumeUrl} onChange={e => update('resumeUrl', e.target.value)} />
                  </Field>
                  <Field label="Cover Letter URL" helper="Optional — generic cover letter link" fieldKey="coverLetterUrl" customKeywords={profile.customKeywords} onKeywordChange={updateCustomKeyword}>
                    <input id="opt-coverLetter" className="opt-input" placeholder="https://drive.google.com/file/…" value={profile.coverLetterUrl} onChange={e => update('coverLetterUrl', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── DIVERSITY ── */}
          {activeTab === 'diversity' && (
            <div className="opt-panel" key="diversity">
              <div className="opt-diversity-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M12 9v4M12 17h.01M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <span>
                  These fields are <strong>optional</strong> and only used when an application explicitly asks for EEO (Equal Employment Opportunity) information.
                  Your answers are stored locally and never shared.
                </span>
              </div>

              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  EEO / Diversity Information
                </div>
                <div className="opt-grid">
                  <Field label="Gender Identity">
                    <select id="opt-gender" className="opt-select" value={profile.gender} onChange={e => update('gender', e.target.value)}>
                      <option value="">Prefer not to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary / Non-conforming</option>
                      <option value="Transgender">Transgender</option>
                      <option value="Other">Other</option>
                      <option value="Decline">Decline to self-identify</option>
                    </select>
                  </Field>
                  <Field label="Race / Ethnicity">
                    <select id="opt-ethnicity" className="opt-select" value={profile.ethnicity} onChange={e => update('ethnicity', e.target.value)}>
                      <option value="">Prefer not to say</option>
                      <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                      <option value="Asian">Asian</option>
                      <option value="Black or African American">Black or African American</option>
                      <option value="Hispanic or Latino">Hispanic or Latino</option>
                      <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                      <option value="White">White</option>
                      <option value="Two or More Races">Two or More Races</option>
                      <option value="Decline">Decline to self-identify</option>
                    </select>
                  </Field>
                  <Field label="Veteran Status">
                    <select id="opt-veteran" className="opt-select" value={profile.veteranStatus} onChange={e => update('veteranStatus', e.target.value)}>
                      <option value="">Prefer not to say</option>
                      <option value="Not a veteran">I am not a protected veteran</option>
                      <option value="Veteran">I identify as a protected veteran</option>
                      <option value="Disabled veteran">Disabled veteran</option>
                      <option value="Decline">Decline to self-identify</option>
                    </select>
                  </Field>
                  <Field label="Disability Status">
                    <select id="opt-disability" className="opt-select" value={profile.disabilityStatus} onChange={e => update('disabilityStatus', e.target.value)}>
                      <option value="">Prefer not to say</option>
                      <option value="No disability">No, I do not have a disability</option>
                      <option value="Has disability">Yes, I have a disability</option>
                      <option value="Decline">Decline to self-identify</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── SHORTCUTS ── */}
          {activeTab === 'shortcuts' && (
            <div className="opt-panel" key="shortcuts">
              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Add New Shortcut
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newLabel.trim() || !newValue.trim()) return;
                  const newShortcut = {
                    id: Date.now().toString(),
                    label: newLabel.trim(),
                    value: newValue.trim(),
                    usages: 0,
                  };
                  const updated = [...(profile.shortcuts || []), newShortcut];
                  const updatedProfile = { ...profile, shortcuts: updated };
                  setProfile(updatedProfile);
                  chrome.storage.local.set({ [STORAGE_KEY]: updatedProfile });
                  setNewLabel('');
                  setNewValue('');
                }} className="opt-shortcut-add-form">
                  <div className="opt-grid">
                    <Field label="Shortcut Label" helper="e.g. Phone, Secondary Email, Cover Letter P2">
                      <input
                        className="opt-input"
                        placeholder="Label"
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Shortcut Text Value" helper="The text that will be inserted into the form field">
                      <input
                        className="opt-input"
                        placeholder="Text Value"
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        required
                      />
                    </Field>
                  </div>
                  <button type="submit" className="opt-add-exp-btn" style={{ marginTop: 16 }}>
                    + Add Shortcut
                  </button>
                </form>
              </div>

              <div className="opt-section">
                <div className="opt-section-title">
                  <div className="opt-section-title-dot" />
                  Manage Shortcuts (Drag & Drop to Reorder)
                </div>
                {(profile.shortcuts || []).length === 0 ? (
                  <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
                    No shortcuts created yet. Add one above!
                  </div>
                ) : (
                  <div className="opt-shortcuts-list">
                    {(profile.shortcuts || []).map((shortcut: ShortcutFill, index: number) => (
                      <div
                        key={shortcut.id}
                        className={`opt-shortcut-item-row ${draggedIndex === index ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          setDraggedIndex(index);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedIndex === null || draggedIndex === index) return;
                          const nextShortcuts = [...(profile.shortcuts || [])];
                          const draggedItem = nextShortcuts[draggedIndex];
                          nextShortcuts.splice(draggedIndex, 1);
                          nextShortcuts.splice(index, 0, draggedItem);
                          setDraggedIndex(index);
                          setProfile((prev: UserProfile) => ({ ...prev, shortcuts: nextShortcuts }));
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          chrome.storage.local.set({ [STORAGE_KEY]: profile });
                        }}
                      >
                        <div className="opt-shortcut-drag-handle">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="9" cy="5" r="1" />
                            <circle cx="9" cy="12" r="1" />
                            <circle cx="9" cy="19" r="1" />
                            <circle cx="15" cy="5" r="1" />
                            <circle cx="15" cy="12" r="1" />
                            <circle cx="15" cy="19" r="1" />
                          </svg>
                        </div>
                        <div className="opt-shortcut-inputs">
                          <input
                            type="text"
                            className="opt-input opt-shortcut-input-el"
                            value={shortcut.label}
                            placeholder="Label"
                            onChange={(e) => {
                              const updated = (profile.shortcuts || []).map((s: ShortcutFill, i: number) =>
                                i === index ? { ...s, label: e.target.value } : s
                              );
                              setProfile((prev: UserProfile) => ({ ...prev, shortcuts: updated }));
                            }}
                            onBlur={() => {
                              chrome.storage.local.set({ [STORAGE_KEY]: profile });
                            }}
                          />
                          <input
                            type="text"
                            className="opt-input opt-shortcut-input-el value-field"
                            value={shortcut.value}
                            placeholder="Text Value"
                            onChange={(e) => {
                              const updated = (profile.shortcuts || []).map((s: ShortcutFill, i: number) =>
                                i === index ? { ...s, value: e.target.value } : s
                              );
                              setProfile((prev: UserProfile) => ({ ...prev, shortcuts: updated }));
                            }}
                            onBlur={() => {
                              chrome.storage.local.set({ [STORAGE_KEY]: profile });
                            }}
                          />
                        </div>
                        <div className="opt-shortcut-meta">
                          <span className="opt-shortcut-usages">{shortcut.usages || 0} uses</span>
                          <button
                            type="button"
                            className="opt-remove-exp-btn"
                            onClick={() => {
                              const updated = (profile.shortcuts || []).filter((s: ShortcutFill) => s.id !== shortcut.id);
                              const updatedProfile = { ...profile, shortcuts: updated };
                              setProfile(updatedProfile);
                              chrome.storage.local.set({ [STORAGE_KEY]: updatedProfile });
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CUSTOM FIELDS ── */}
          {activeTab === 'custom' && (
            <div className="opt-panel" key="custom">
              <div className="opt-section">
                <div className="opt-section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <p className="opt-section-desc" style={{ color: 'var(--sub)', margin: 0 }}>
                    Create custom autofill fields with editable labels, values, and related search keywords.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="opt-add-exp-btn"
                    style={{ width: 'auto', padding: '10px 16px', margin: 0 }}
                  >
                    + Add Custom Field
                  </button>
                </div>

                <div className="opt-custom-fields-list">
                  {(profile.customFields || []).length === 0 ? (
                    <div className="opt-empty-state" style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>
                      No custom fields added yet. Click "+ Add Custom Field" to create one.
                    </div>
                  ) : (
                    (profile.customFields || []).map((cf: CustomField) => (
                      <div key={cf.id} className="opt-custom-field-row">
                        <div className="opt-cf-inputs-grid">
                          <div className="opt-field">
                            <label className="opt-label">Field Label</label>
                            <input
                              className="opt-input"
                              placeholder="e.g. Preferred Name, Security Clearance"
                              value={cf.label}
                              onChange={(e) => handleUpdateCustomField(cf.id, { label: e.target.value })}
                            />
                          </div>

                          <div className="opt-field">
                            <label className="opt-label">Field Value</label>
                            <input
                              className="opt-input"
                              placeholder="Value to fill"
                              value={cf.value}
                              onChange={(e) => handleUpdateCustomField(cf.id, { value: e.target.value })}
                            />
                          </div>

                          <div className="opt-field">
                            <label className="opt-label">Related Keywords</label>
                            <input
                              className="opt-input opt-kw-input"
                              placeholder="Comma-separated keywords (e.g. preferredName, securityClearance)"
                              value={cf.keywords}
                              onChange={(e) => handleUpdateCustomField(cf.id, { keywords: e.target.value })}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCustomField(cf.id)}
                          className="opt-cf-delete-btn"
                          title="Delete custom field"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
