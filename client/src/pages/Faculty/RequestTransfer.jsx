import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.jsx'
import { authService } from '../../services/features/authService'
import { facultyService } from '../../services/features/facultyService'
import { adminService } from '../../services/features/adminService'
import styles from './FacultyDashboard.module.css'
import tStyles from './RequestTransfer.module.css'

function Toast({ message, type, onClose }) {
  const bgStyle = {
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    error: 'bg-red-600',
  }
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${bgStyle[type] || bgStyle.success} animate-slide-up`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100 leading-none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function RequestTransfer() {
  const routeNavigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  // Form states
  const [venues, setVenues] = useState([])
  const [selectedMappingId, setSelectedMappingId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [reason, setReason] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // Status/List states
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const rawName = user?.name || user?.email || 'Faculty'
  const baseName = String(rawName).split('@')[0]
  const displayName = baseName
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
  const initials = String(displayName).trim()?.charAt(0)?.toUpperCase() || 'F'

  // Fetch initial data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [venuesRes, transfersRes] = await Promise.all([
        facultyService.getMyVenues(),
        facultyService.getMyTransferRequests(),
      ])
      if (venuesRes?.data) setVenues(venuesRes.data)
      if (transfersRes?.data) setTransfers(transfersRes.data)
    } catch (err) {
      console.error('Failed to load data:', err)
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Debounced search for target faculty
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await adminService.searchFaculty(searchQuery)
        if (res?.data) {
          // Filter out current logged-in faculty
          const filtered = res.data.filter(
            (f) => f.name !== user?.name && f.reg_num !== user?.reg_num
          )
          setSearchResults(filtered)
        }
      } catch (err) {
        console.error('Faculty search failed:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, user])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } finally {
      logout()
      routeNavigate('/auth/login', { replace: true })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedMappingId || !selectedFaculty || !reason.trim()) {
      showToast('Please fill all fields', 'warning')
      return
    }

    setSubmitLoading(true)
    try {
      await facultyService.createTransferRequest(
        selectedMappingId,
        selectedFaculty.faculty_id,
        reason.trim()
      )
      showToast('Transfer request submitted successfully!')
      setSelectedMappingId('')
      setSelectedFaculty(null)
      setSearchQuery('')
      setReason('')
      // Reload lists
      const transfersRes = await facultyService.getMyTransferRequests()
      if (transfersRes?.data) setTransfers(transfersRes.data)
    } catch (err) {
      console.error('Failed to submit transfer request:', err)
      showToast(err.response?.data?.message || 'Failed to submit request', 'error')
    } finally {
      setSubmitLoading(false)
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const hh = parseInt(h, 10)
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const h12 = hh % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backBtn}
            onClick={() => {
              routeNavigate('/faculty-dashboard')
              window.scrollTo(0, 0)
            }}
          >
            ← Back
          </button>
          <span className={styles.headerSep}>/</span>
          <span className={styles.headerCrumb}>Request Transfer</span>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.userPill} title={displayName}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userName}>{displayName}</div>
          </div>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 12H3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 9l-3 3 3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className={styles.pageMain}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Request Transfer</div>
          <div className={styles.sectionSub}>
            Initiate a PENDING request to transfer ownership of a slot to another faculty member.
          </div>
        </div>

        <div className={styles.groups}>
          {loading ? (
            <div className={tStyles.card} style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text2)' }}>Loading transfer details...</p>
            </div>
          ) : (
            <div className={tStyles.transferGrid}>
              {/* Left Column: Assigned Venues List */}
              <div className={tStyles.card}>
                <h3 className={tStyles.cardTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Select Your Assigned Slot
                </h3>
                {venues.length === 0 ? (
                  <p style={{ color: 'var(--text3)', fontSize: '13px' }}>No venues assigned to you.</p>
                ) : (
                  <div className={tStyles.venueList}>
                    {venues.map((v) => (
                      <div
                        key={v.mapping_id}
                        className={`${tStyles.venueItem} ${
                          selectedMappingId === v.mapping_id ? tStyles.selectedVenue : ''
                        }`}
                        onClick={() => setSelectedMappingId(v.mapping_id)}
                      >
                        <div className={tStyles.venueInfo}>
                          <span className={tStyles.venueName}>
                            {v.venue_name} ({v.skill_type})
                          </span>
                          <span className={tStyles.venueLoc}>Loc: {v.location}</span>
                          <span className={tStyles.venueTime}>
                            {formatTime(v.start_time)} - {formatTime(v.end_time)}
                          </span>
                        </div>
                        {selectedMappingId === v.mapping_id && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--purple)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Transfer Form */}
              <form onSubmit={handleSubmit} className={tStyles.card}>
                <h3 className={tStyles.cardTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  Transfer Target
                </h3>

                {/* Selected Faculty or Search Box */}
                <div className={tStyles.formGroup}>
                  <label className={tStyles.label}>Target Faculty Member</label>
                  {!selectedFaculty ? (
                    <div className={tStyles.searchContainer}>
                      <input
                        type="text"
                        placeholder="Search faculty by name or reg num..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          setShowDropdown(true)
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className={tStyles.input}
                        style={{ width: '100%' }}
                      />
                      {showDropdown && searchQuery.trim() && (
                        <div className={tStyles.dropdownList}>
                          {searchLoading && (
                            <div className={tStyles.dropdownItem} style={{ color: 'var(--text3)' }}>
                              Searching...
                            </div>
                          )}
                          {!searchLoading && searchResults.length === 0 && (
                            <div className={tStyles.dropdownItem} style={{ color: 'var(--text3)' }}>
                              No results found
                            </div>
                          )}
                          {!searchLoading &&
                            searchResults.map((f) => (
                              <div
                                key={f.faculty_id}
                                className={tStyles.dropdownItem}
                                onClick={() => {
                                  setSelectedFaculty(f)
                                  setShowDropdown(false)
                                }}
                              >
                                <span className={tStyles.facultyName}>{f.name}</span>
                                <span className={tStyles.facultyMeta}>
                                  Reg: {f.reg_num} | Dept: {f.department}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={tStyles.selectedFacultyPill}>
                      <div>
                        <div className={tStyles.facultyName}>{selectedFaculty.name}</div>
                        <div className={tStyles.facultyMeta}>
                          Reg: {selectedFaculty.reg_num} | Dept: {selectedFaculty.department}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFaculty(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--red)',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {/* Reason field */}
                <div className={tStyles.formGroup}>
                  <label className={tStyles.label}>Reason for Transfer</label>
                  <textarea
                    placeholder="Provide a valid reason for the slot transfer..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={tStyles.textarea}
                    rows="3"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitLoading || !selectedMappingId || !selectedFaculty || !reason.trim()}
                  className={tStyles.submitBtn}
                >
                  {submitLoading ? 'Submitting request...' : 'Submit Transfer Request'}
                </button>
              </form>

              {/* Logs Table */}
              <div className={`${tStyles.card} ${tStyles.fullWidth}`}>
                <h3 className={tStyles.cardTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Your Transfer Logs
                </h3>
                {transfers.length === 0 ? (
                  <p style={{ color: 'var(--text3)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                    No transfer requests created yet.
                  </p>
                ) : (
                  <div className={tStyles.tableWrap}>
                    <table className={tStyles.table}>
                      <thead>
                        <tr>
                          <th>Venue & Location</th>
                          <th>Slot Time</th>
                          <th>Transferred To</th>
                          <th>Reason</th>
                          <th>Requested On</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((t) => (
                          <tr key={t.transfer_id}>
                            <td>
                              <div style={{ fontWeight: '700' }}>{t.venue_name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                                {t.location}
                              </div>
                            </td>
                            <td>
                              <span className={tStyles.venueTime}>
                                {formatTime(t.start_time)} - {formatTime(t.end_time)}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: '600' }}>{t.to_faculty_name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                                Dept: {t.to_faculty_dept}
                              </div>
                            </td>
                            <td style={{ maxWidth: '200px', wordBreak: 'break-word' }}>
                              {t.reason}
                            </td>
                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
                            <td>
                              <span
                                className={`${tStyles.badge} ${
                                  t.current_status === 'ACCEPTED'
                                    ? tStyles.badgeAccepted
                                    : t.current_status === 'REJECTED'
                                    ? tStyles.badgeRejected
                                    : tStyles.badgePending
                                }`}
                              >
                                {t.current_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
