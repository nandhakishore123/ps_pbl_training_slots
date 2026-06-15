import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.jsx'
import { authService } from '../../services/features/authService'
import { facultyService } from '../../services/features/facultyService'
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

  // Allocation Lists
  const [myVenues, setMyVenues] = useState([])
  const [allAllocations, setAllAllocations] = useState({ venues: [], slots: [], mappings: [] })
  
  // Selection States
  const [selectedMappingId, setSelectedMappingId] = useState('')
  const [targetSlotKey, setTargetSlotKey] = useState('') // "venueId-slotId"
  const [reason, setReason] = useState('')
  
  // Calendar Date State (default to tomorrow)
  const [transferDate, setTransferDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })

  // Collapsible Folders State
  const [expandedVenues, setExpandedVenues] = useState({})

  // History/Status Lists
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
      const [myVenuesRes, allRes, transfersRes] = await Promise.all([
        facultyService.getMyVenues(),
        facultyService.getAllVenueAllocations(),
        facultyService.getMyTransferRequests(),
      ])
      if (myVenuesRes?.data) setMyVenues(myVenuesRes.data)
      if (allRes?.data) setAllAllocations(allRes.data)
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

    let targetVenueId = null
    let targetSlotId = null
    if (targetSlotKey) {
      const [vId, sId] = targetSlotKey.split('-')
      targetVenueId = Number(vId)
      targetSlotId = Number(sId)
    }

    if (!selectedMappingId || !targetVenueId || !targetSlotId || !reason.trim() || !transferDate) {
      showToast('Please fill all fields', 'warning')
      return
    }

    setSubmitLoading(true)
    try {
      await facultyService.createTransferRequest(
        selectedMappingId,
        null, // toFacultyId is null since transferring to a free slot
        reason.trim(),
        targetVenueId,
        targetSlotId,
        transferDate
      )
      showToast('Transfer request submitted successfully!')
      setSelectedMappingId('')
      setTargetSlotKey('')
      setReason('')
      // Reload logs
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

  // Toggle venue folder open/close
  const toggleVenue = (venueId) => {
    setExpandedVenues(prev => ({ ...prev, [venueId]: !prev[venueId] }))
  }

  // Get status details for a slot timing under a venue
  const getSlotStatus = (venueId, slotId) => {
    const isOwn = myVenues.some(mv => mv.venue_id === venueId && mv.slot_id === slotId)
    if (isOwn) {
      const mv = myVenues.find(mv => mv.venue_id === venueId && mv.slot_id === slotId)
      return { type: 'own', label: 'Assigned: You', mappingId: mv.mapping_id }
    }
    
    const mapped = allAllocations.mappings.find(m => m.venue_id === venueId && m.slot_id === slotId)
    if (mapped) {
      return { type: 'assigned', label: `Assigned: ${mapped.faculty_name}`, facultyName: mapped.faculty_name, regNum: mapped.faculty_reg_num }
    }

    return { type: 'free', label: 'Free' }
  }

  // Get the selected source slot details for displaying in the form
  const getSelectedSourceDetails = () => {
    if (!selectedMappingId) return null
    return myVenues.find(mv => mv.mapping_id === selectedMappingId)
  }

  const selectedSource = getSelectedSourceDetails()

  // Compile list of currently free slots across all venues
  const freeSlots = []
  allAllocations.venues.forEach(v => {
    allAllocations.slots.forEach(s => {
      const status = getSlotStatus(v.venue_id, s.slot_id)
      if (status.type === 'free') {
        freeSlots.push({
          key: `${v.venue_id}-${s.slot_id}`,
          venueName: v.venue_name,
          location: v.location,
          slotText: `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`,
          venueId: v.venue_id,
          slotId: s.slot_id
        })
      }
    })
  })

  const todayStr = new Date().toISOString().split('T')[0]

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
            Initiate a transfer of your assigned slot to a currently free slot on a specific date.
          </div>
        </div>

        <div className={styles.groups}>
          {loading ? (
            <div className={tStyles.card} style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text2)' }}>Loading allocation data...</p>
            </div>
          ) : (
            <>
              {/* Calendar date picker at the top */}
              <div className={tStyles.calendarCard}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.5px' }}>
                  Choose Date of Transfer
                </h4>
                <div className={tStyles.calendarRow}>
                  <input
                    type="date"
                    min={todayStr}
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className={tStyles.dateInput}
                  />
                  <p style={{ fontSize: '12.5px', color: 'var(--text3)' }}>
                    Slots will show their status on <b>{new Date(transferDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</b>.
                  </p>
                </div>
              </div>

              <div className={tStyles.transferGrid}>
                {/* Left Column: All Venues & Slots Folder Tree View */}
                <div className={tStyles.card}>
                  <h3 className={tStyles.cardTitle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Select Your Assigned Slot
                  </h3>
                  
                  <p style={{ fontSize: '12.5px', color: 'var(--text2)', marginBottom: '16px', textALign: 'left' }}>
                    Open a venue below. Click one of your own slots (purple) to release, and click a free slot (green) to select as target.
                  </p>

                  <div className={tStyles.folderContainer}>
                    {allAllocations.venues.map((v) => {
                      const isOpen = !!expandedVenues[v.venue_id]
                      return (
                        <div key={v.venue_id} className={tStyles.folderVenue}>
                          <div
                            className={`${tStyles.folderVenueHeader} ${isOpen ? tStyles.folderVenueHeaderOpen : ''}`}
                            onClick={() => toggleVenue(v.venue_id)}
                          >
                            <span className={tStyles.folderVenueName}>
                              <svg
                                className={`${tStyles.folderVenueIcon} ${isOpen ? tStyles.folderVenueIconOpen : ''}`}
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                              {v.venue_name}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text2)' }}>
                              Loc: {v.location} (Cap: {v.capacity})
                            </span>
                          </div>
                          {isOpen && (
                            <div className={tStyles.folderSlots}>
                              {allAllocations.slots.map((s) => {
                                const status = getSlotStatus(v.venue_id, s.slot_id)
                                const slotTime = `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`
                                
                                let slotClass = ''
                                let badgeClass = ''
                                let badgeText = ''

                                if (status.type === 'own') {
                                  slotClass = `${tStyles.folderSlotItem} ${tStyles.folderSlotOwn} ${
                                    selectedMappingId === status.mappingId ? tStyles.folderSlotSelected : ''
                                  }`
                                  badgeClass = tStyles.badgeOwn
                                  badgeText = 'Assigned: You'
                                } else if (status.type === 'assigned') {
                                  slotClass = `${tStyles.folderSlotItem} ${tStyles.folderSlotAssigned}`
                                  badgeClass = tStyles.badgeAssigned
                                  badgeText = `Assigned: ${status.facultyName}`
                                } else {
                                  const isSelectedTarget = targetSlotKey === `${v.venue_id}-${s.slot_id}`
                                  slotClass = `${tStyles.folderSlotItem} ${tStyles.folderSlotFree} ${
                                    isSelectedTarget ? tStyles.folderSlotSelected : ''
                                  }`
                                  badgeClass = tStyles.badgeFree
                                  badgeText = 'Free'
                                }

                                const handleSlotClick = () => {
                                  if (status.type === 'own') {
                                    setSelectedMappingId(status.mappingId)
                                  } else if (status.type === 'free') {
                                    setTargetSlotKey(`${v.venue_id}-${s.slot_id}`)
                                  } else {
                                    showToast(`This slot is assigned to ${status.facultyName} and cannot be requested as a target.`, 'warning')
                                  }
                                }

                                return (
                                  <div
                                    key={s.slot_id}
                                    className={slotClass}
                                    onClick={handleSlotClick}
                                  >
                                    <div className={tStyles.folderSlotInfo}>
                                      <span className={tStyles.slotTimeText}>{slotTime}</span>
                                      <span className={tStyles.slotStatusText}>
                                        {status.type === 'assigned' && `Reg Num: ${status.regNum}`}
                                        {status.type === 'own' && 'Click to select / release'}
                                        {status.type === 'free' && 'Click to select as target'}
                                      </span>
                                    </div>
                                    <span className={`${tStyles.badge} ${badgeClass}`}>
                                      {badgeText}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right Column: Transfer Form */}
                <form onSubmit={handleSubmit} className={tStyles.card}>
                  <h3 className={tStyles.cardTitle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Transfer Details
                  </h3>

                  {/* Selected Source Slot */}
                  <div className={tStyles.formGroup}>
                    <label className={tStyles.label}>Source Slot (To Release)</label>
                    {selectedSource ? (
                      <div className={tStyles.slotPill}>
                        <div style={{ textAlign: 'left' }}>
                          <div className={tStyles.venueName}>{selectedSource.venue_name}</div>
                          <div className={tStyles.venueLoc}>
                            Loc: {selectedSource.location} | Time: {formatTime(selectedSource.start_time)} - {formatTime(selectedSource.end_time)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedMappingId('')}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '14px', border: '1.5px dashed var(--border)', borderRadius: '10px', fontSize: '13px', color: 'var(--text3)', background: 'rgba(0,0,0,0.01)' }}>
                        No slot selected. Click a slot marked as <b>"Assigned: You"</b> in the tree list.
                      </div>
                    )}
                  </div>

                  {/* Target Slot Selector */}
                  <div className={tStyles.formGroup}>
                    <label className={tStyles.label}>Target Slot (To Request)</label>
                    <select
                      value={targetSlotKey}
                      onChange={(e) => setTargetSlotKey(e.target.value)}
                      className={tStyles.input}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select a free target slot...</option>
                      {freeSlots.map(s => (
                        <option key={s.key} value={s.key}>
                          {s.venueName} ({s.slotText}) &middot; Loc: {s.location || '—'}
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px', textAlign: 'left' }}>
                      Tip: You can also select a free slot by clicking on a green <b>"Free"</b> slot in the tree.
                    </p>
                  </div>

                  {/* Reason field */}
                  <div className={tStyles.formGroup}>
                    <label className={tStyles.label}>Reason for Transfer</label>
                    <textarea
                      placeholder="Provide a valid reason for the slot transfer request..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={tStyles.textarea}
                      rows="3"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitLoading || !selectedMappingId || !targetSlotKey || !reason.trim() || !transferDate}
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
                            <th>Original Slot</th>
                            <th>Target Slot / Faculty</th>
                            <th>Transfer Date</th>
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
                                <div style={{ fontSize: '11.5px', color: 'var(--purple)', fontWeight: '600' }}>
                                  {formatTime(t.start_time)} - {formatTime(t.end_time)}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                                  Loc: {t.location}
                                </div>
                              </td>
                              <td>
                                {t.target_venue_name ? (
                                  <div>
                                    <div style={{ fontWeight: '700', color: 'var(--green)' }}>{t.target_venue_name} (Free Slot)</div>
                                    <div style={{ fontSize: '11.5px', color: 'var(--purple)', fontWeight: '600' }}>
                                      {formatTime(t.target_start_time)} - {formatTime(t.target_end_time)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                                      Loc: {t.target_location}
                                    </div>
                                  </div>
                                ) : t.to_faculty_name ? (
                                  <div>
                                    <div style={{ fontWeight: '600' }}>{t.to_faculty_name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                                      Dept: {t.to_faculty_dept || '—'}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text3)' }}>—</span>
                                )}
                              </td>
                              <td style={{ fontWeight: '600' }}>
                                {t.transfer_date ? new Date(t.transfer_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </td>
                              <td style={{ maxWidth: '200px', wordBreak: 'break-word', fontSize: '12.5px' }}>
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
            </>
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
