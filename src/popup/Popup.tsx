import { useState, useEffect } from 'react'
import { type UserProfile, STORAGE_KEY, getCompletionPercent, defaultProfile } from '../types'

type FillState = 'idle' | 'filling' | 'success' | 'error' | 'no-profile'
type LiApplyState = 'idle' | 'running' | 'done' | 'error'

export function Popup() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [fillState, setFillState] = useState<FillState>('idle')
  const [fillResult, setFillResult] = useState<{ filled: number; total: number } | null>(null)
  const [completion, setCompletion] = useState(0)
  const [hasProfile, setHasProfile] = useState(false)

  // LinkedIn Auto Apply state
  const [liApplyState, setLiApplyState] = useState<LiApplyState>('idle')
  const [liApplyMessage, setLiApplyMessage] = useState('')

  // Shortcut insert state
  const [insertError, setInsertError] = useState<string | null>(null)
  const [insertSuccessId, setInsertSuccessId] = useState<string | null>(null)

  useEffect(() => {
    // Load initial profile
    chrome.storage.local.get(STORAGE_KEY, (result: Record<string, unknown>) => {
      if (result[STORAGE_KEY]) {
        const p = result[STORAGE_KEY] as UserProfile
        setProfile(p)
        setCompletion(getCompletionPercent(p))
        setHasProfile(true)
      } else {
        setFillState('no-profile')
        setHasProfile(false)
      }
    })

    // Listen for storage changes to sync options and sidebar in real-time
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[STORAGE_KEY]) {
        const nextProfile = changes[STORAGE_KEY].newValue as UserProfile
        if (nextProfile) {
          setProfile(nextProfile)
          setCompletion(getCompletionPercent(nextProfile))
          setHasProfile(true)
        }
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const handleFill = () => {
    if (!hasProfile || completion === 0) {
      chrome.runtime.openOptionsPage()
      return
    }

    setFillState('filling')

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      const tabId = tabs[0]?.id
      if (!tabId) {
        setFillState('error')
        return
      }

      const doFill = () => {
        chrome.tabs.sendMessage(tabId, { action: 'FILL_FORM', profile }, (response: { success: boolean; filled: number; total: number } | undefined) => {
          if (chrome.runtime.lastError) {
            setFillState('error')
            return
          }
          if (response?.success) {
            setFillResult({ filled: response.filled, total: response.total })
            setFillState('success')
          } else {
            setFillState('error')
          }
        })
      }

      // First try sending directly; if content script not loaded, inject it
      chrome.tabs.sendMessage(tabId, { action: 'PING' }, (response: { ready?: boolean } | undefined) => {
        if (chrome.runtime.lastError || !response?.ready) {
          // Inject content script then retry
          chrome.scripting.executeScript(
            { target: { tabId }, files: ['content.js'] },
            () => {
              if (chrome.runtime.lastError) {
                setFillState('error')
                return
              }
              setTimeout(doFill, 350)
            }
          )
        } else {
          doFill()
        }
      })
    })
  }

  const openOptions = () => chrome.runtime.openOptionsPage()

  // ─────────────────────────────────────────────────────────────
  // LinkedIn Auto Apply
  // ─────────────────────────────────────────────────────────────

  const handleLiAutoApply = () => {
    if (!hasProfile) {
      chrome.runtime.openOptionsPage()
      return
    }

    if (liApplyState === 'running') {
      // Stop the bot
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: 'LI_AUTO_APPLY_STOP' }, () => {})
        }
      })
      setLiApplyState('idle')
      setLiApplyMessage('')
      return
    }

    setLiApplyState('running')
    setLiApplyMessage('Starting…')

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) {
        setLiApplyState('error')
        setLiApplyMessage('No active tab found.')
        return
      }

      const doApply = () => {
        chrome.tabs.sendMessage(
          tabId,
          { action: 'LI_AUTO_APPLY', profile },
          (response: { success: boolean; message: string } | undefined) => {
            if (chrome.runtime.lastError) {
              setLiApplyState('error')
              setLiApplyMessage('Could not connect to page. Reload LinkedIn and try again.')
              return
            }
            if (response?.success) {
              setLiApplyState('done')
              setLiApplyMessage(response.message)
            } else {
              setLiApplyState('error')
              setLiApplyMessage(response?.message || 'Something went wrong.')
            }
          }
        )
      }

      chrome.tabs.sendMessage(tabId, { action: 'PING' }, (r) => {
        if (chrome.runtime.lastError || !r?.ready) {
          chrome.scripting.executeScript(
            { target: { tabId }, files: ['content.js'] },
            () => {
              if (chrome.runtime.lastError) {
                setLiApplyState('error')
                setLiApplyMessage('Could not inject content script.')
                return
              }
              setTimeout(doApply, 400)
            }
          )
        } else {
          doApply()
        }
      })
    })
  }



  // ─────────────────────────────────────────────────────────────
  // Shortcut Insert
  // ─────────────────────────────────────────────────────────────

  const handleInsertShortcut = (shortcut: { id: string; value: string }) => {
    setInsertError(null)
    setInsertSuccessId(null)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) {
        setInsertError('No active tab found.')
        return
      }

      const doInsert = () => {
        chrome.tabs.sendMessage(tabId, { action: 'INSERT_SHORTCUT', value: shortcut.value }, (response) => {
          if (chrome.runtime.lastError) {
            setInsertError('Could not connect to page. Try reloading it.')
            return
          }
          if (response?.success) {
            setInsertSuccessId(shortcut.id)
            setTimeout(() => setInsertSuccessId(null), 1500)

            // Increment usage count
            const updatedShortcuts = (profile.shortcuts || []).map((s) =>
              s.id === shortcut.id ? { ...s, usages: (s.usages || 0) + 1, lastUsed: Date.now() } : s
            )
            const updatedProfile = { ...profile, shortcuts: updatedShortcuts }
            setProfile(updatedProfile)
            chrome.storage.local.set({ [STORAGE_KEY]: updatedProfile })
          } else {
            setInsertError(response?.error || 'Failed to insert.')
          }
        })
      }

      chrome.tabs.sendMessage(tabId, { action: 'PING' }, (response) => {
        if (chrome.runtime.lastError || !response?.ready) {
          chrome.scripting.executeScript(
            { target: { tabId }, files: ['content.js'] },
            () => {
              if (chrome.runtime.lastError) {
                setInsertError('Could not load content script.')
                return
              }
              setTimeout(doInsert, 350)
            }
          )
        } else {
          doInsert()
        }
      })
    })
  }

  // SVG circular progress ring
  const RADIUS = 36
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const dashOffset = CIRCUMFERENCE - (completion / 100) * CIRCUMFERENCE

  const displayName =
    profile.fullName ||
    (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : '')

  return (
    <div className="popup">
      {/* ── Header ── */}
      <div className="popup-header">
        <div className="popup-logo">
          {/* Briefcase + Lightning icon */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="8" fill="url(#hGrad)" />
            <path d="M7 11h14v9a1 1 0 01-1 1H8a1 1 0 01-1-1v-9z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
            <path d="M10 11V9a1 1 0 011-1h6a1 1 0 011 1v2" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinecap="round"/>
            <path d="M15.5 13.5l-3 3h2.5l-1.5 3 3-3.5H14l1.5-2.5z" fill="white"/>
            <defs>
              <linearGradient id="hGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/>
                <stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="popup-title">JobFill</span>
        </div>
        <div className="popup-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="popup-header-completion-text" onClick={openOptions} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sub)', cursor: 'pointer' }}>
            {completion}%
          </span>
          {/* Small circular completion ring - always filled */}
          <div className="popup-mini-ring" onClick={openOptions} title={`Profile Completion: ${completion}%`}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"/>
              <circle
                cx="14" cy="14" r="10"
                fill="none"
                stroke="url(#ringGradMini)"
                strokeWidth="2.5"
                strokeDasharray={2 * Math.PI * 10}
                strokeDashoffset={0}
                strokeLinecap="round"
                transform="rotate(-90 14 14)"
              />
              <defs>
                <linearGradient id="ringGradMini" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <button className="popup-settings-btn" onClick={openOptions} title="Edit Profile">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Action Section ── */}
      <div className="popup-action">
        {/* Status banners */}
        {fillState === 'no-profile' && (
          <div className="popup-notice">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4M12 17h.01" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#fbbf24" strokeWidth="2"/>
            </svg>
            <span>Set up your profile to auto-fill forms</span>
          </div>
        )}

        {fillState === 'error' && (
          <div className="popup-notice popup-notice--error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Could not connect to page. Try reloading it.</span>
          </div>
        )}

        {fillState === 'success' && fillResult && (
          <div className="popup-success">
            <div className="popup-success-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="popup-success-title">Form Filled!</p>
              <p className="popup-success-sub">{fillResult.filled} field{fillResult.filled !== 1 ? 's' : ''} of {fillResult.total} matched &amp; filled</p>
            </div>
          </div>
        )}

        {/* Main CTA */}
        <button
          id="jobfill-autofill-btn"
          className={[
            'popup-fill-btn',
            fillState === 'filling' ? 'popup-fill-btn--loading' : '',
            fillState === 'success' ? 'popup-fill-btn--success' : '',
          ].join(' ')}
          onClick={handleFill}
          disabled={fillState === 'filling'}
        >
          {fillState === 'filling' ? (
            <>
              <div className="popup-spinner" />
              <span>Filling Form…</span>
            </>
          ) : fillState === 'success' ? (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Fill Again</span>
            </>
          ) : fillState === 'no-profile' ? (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Set Up Profile</span>
            </>
          ) : (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>Auto Fill Form</span>
            </>
          )}
        </button>
      </div>

      <div className="popup-divider" />

      {/* ── LinkedIn Auto Apply ── */}
      <div className="popup-li-apply-section">
        <div className="popup-section-header">
          {/* LinkedIn icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#0a66c2' }}>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <span className="popup-section-title">LinkedIn Auto Apply</span>
        </div>

        {/* Status message */}
        {liApplyState === 'error' && (
          <div className="popup-notice popup-notice--error">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>{liApplyMessage}</span>
          </div>
        )}
        {liApplyState === 'done' && (
          <div className="popup-li-done">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{liApplyMessage}</span>
          </div>
        )}
        {liApplyState === 'running' && liApplyMessage && (
          <div className="popup-li-progress">
            <div className="popup-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
            <span>{liApplyMessage}</span>
          </div>
        )}

        <button
          id="jobfill-li-auto-apply-btn"
          className={[
            'popup-li-apply-btn',
            liApplyState === 'running' ? 'popup-li-apply-btn--running' : '',
            liApplyState === 'done' ? 'popup-li-apply-btn--done' : '',
          ].join(' ')}
          onClick={handleLiAutoApply}
          title={!hasProfile ? 'Set up your profile first' : 'Auto-fill & navigate LinkedIn Easy Apply — pauses before Submit'}
        >
          {liApplyState === 'running' ? (
            <>
              <div className="popup-spinner" style={{ width: 15, height: 15 }} />
              <span>Stop Auto Apply</span>
            </>
          ) : liApplyState === 'done' ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Apply Another Job</span>
            </>
          ) : (
            <>
              {/* LinkedIn icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span>LinkedIn Auto Apply</span>
            </>
          )}
        </button>

        <p className="popup-li-hint">
          Click the <strong>&#8203;in&#8203;</strong> Apply button → fills all steps → pauses before Submit.
        </p>
      </div>

      <div className="popup-divider" />

      {/* ── Shortcut Fills ── */}
      <div className="popup-shortcuts-section">
        <div className="popup-section-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="15" y2="9"/>
            <line x1="9" y1="13" x2="15" y2="13"/>
            <line x1="9" y1="17" x2="13" y2="17"/>
          </svg>
          <span className="popup-section-title">Shortcut Fills</span>
        </div>

        {insertError && (
          <div className="popup-shortcut-error">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{insertError}</span>
          </div>
        )}

        {(profile.shortcuts || []).length === 0 ? (
          <p className="popup-shortcuts-empty-hint">
            No shortcuts yet —{' '}
            <button className="popup-shortcuts-manage-link" onClick={openOptions}>add one in Profile</button>
          </p>
        ) : (
          <div className="popup-quick-pills">
            {(profile.shortcuts || []).map((shortcut) => (
              <button
                key={shortcut.id}
                className={`popup-quick-pill ${insertSuccessId === shortcut.id ? 'inserted' : ''}`}
                onClick={() => handleInsertShortcut(shortcut)}
                title={shortcut.value}
              >
                {insertSuccessId === shortcut.id ? '✓' : shortcut.label}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Recent pills are now inline inside the shortcuts section above */}

      <div className="popup-divider" />

      {/* ── Footer ── */}
      <div className="popup-footer">
        <button className="popup-profile-link" onClick={openOptions}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Edit Profile
        </button>
        <span className="popup-version">v1.0.0</span>
      </div>
    </div>
  )
}

