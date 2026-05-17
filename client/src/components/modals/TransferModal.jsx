import { useState } from 'react'
import styles from './TransferModal.module.css'
import { useApp } from '../../pages/Admin/context/AppContext'
import { useData } from '../../pages/Admin/context/DataContext'

export default function TransferModal({ isOpen, onClose, context }) {
  const { showToast } = useApp()
  const {
    venues,
    faculty,
    slotMap,
    swapFaculty,
    moveVenue,
    transferSingleSlot,
    transferAllSlots,
  } = useData()

  const [selectedFacultyId, setSelectedFacultyId] = useState(null)
  const [selectedVenueId, setSelectedVenueId] = useState(null)
  const [reason, setReason] = useState('')

  if (!isOpen || !context) return null

  // ── DERIVED DATA ─────────────────────────────────────────────
  const getTitle = () => {
    if (context.type === 'swap') return 'Swap Faculty Incharge'
    if (context.type === 'move') return 'Move Faculty to Another Venue'
    if (context.type === 'singleslot') return 'Transfer Single Slot'
    if (context.type === 'faculty') {
      const f = faculty.find((x) => x.id === context.id)
      return (f?.name || '') + ' · Transfer Slots'
    }
  }

  const getSub = () => {
    if (context.type === 'swap') {
      const v = venues.find((x) => x.id === context.id)
      const fac = v?.faculty ? faculty.find((f) => f.id === v.faculty) : null
      return `${v?.name} · ${v?.block}, ${v?.room}${fac ? ' · Current: ' + fac.name : ' · No faculty assigned'}`
    }
    if (context.type === 'move') {
      const v = venues.find((x) => x.id === context.id)
      const fac = v?.faculty ? faculty.find((f) => f.id === v.faculty) : null
      return `${fac?.name || 'Faculty'} · Currently at ${v?.name} (${v?.block}, ${v?.room})`
    }
    if (context.type === 'singleslot') {
      const f = faculty.find((x) => x.id === context.facultyId)
      const slots = slotMap[context.facultyId] || []
      const slot = slots.find((s) => s.id === context.slotId)
      return `${f?.name} · ${slot?.venue} · ${slot?.day} ${slot?.full}`
    }
    if (context.type === 'faculty') {
      const f = faculty.find((x) => x.id === context.id)
      return `Transfer all assigned slots from ${f?.name} to another faculty`
    }
  }

  const getModeLabel = () => {
    if (context.type === 'swap') return 'Select new faculty incharge for this venue:'
    if (context.type === 'move') return 'Select destination venue:'
    if (context.type === 'singleslot') return 'Select faculty to take over this slot:'
    if (context.type === 'faculty') return 'Select faculty to take over:'
  }

  const excludeFacultyId =
    context.type === 'swap'
      ? venues.find((v) => v.id === context.id)?.faculty
      : context.type === 'singleslot'
      ? context.facultyId
      : context.type === 'faculty'
      ? context.id
      : null

  const eligibleFaculty = faculty.filter((f) => f.id !== excludeFacultyId)
  const freeVenues = venues.filter(
    (v) => v.id !== context.id && v.status === 'free'
  )

  const showVenueList = context.type === 'move'

  // ── SINGLE SLOT PILL ─────────────────────────────────────────
  const getSingleSlotPill = () => {
    if (context.type !== 'singleslot') return null
    const slots = slotMap[context.facultyId] || []
    const slot = slots.find((s) => s.id === context.slotId)
    return slot
      ? `Transferring: ${slot.venue} · ${slot.day} ${slot.full}`
      : null
  }

  // ── CONFIRM ──────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!reason.trim()) {
      showToast('Please enter a reason', true)
      return
    }

    if (context.type === 'swap') {
      if (!selectedFacultyId) { showToast('Please select a faculty', true); return }
      const v = venues.find((x) => x.id === context.id)
      const toFac = faculty.find((f) => f.id === selectedFacultyId)
      swapFaculty(context.id, selectedFacultyId)
      showToast(`Faculty swapped to ${toFac.name} for ${v.name}`, false)
      handleClose()

    } else if (context.type === 'move') {
      if (!selectedVenueId) { showToast('Please select a destination venue', true); return }
      const toV = venues.find((x) => x.id === selectedVenueId)
      const fromV = venues.find((x) => x.id === context.id)
      const fac = faculty.find((f) => f.id === fromV?.faculty)
      moveVenue(context.id, selectedVenueId)
      showToast(`${fac?.name || 'Faculty'} moved to ${toV.name} (${toV.block})`, false)
      handleClose()

    } else if (context.type === 'singleslot') {
      if (!selectedFacultyId) { showToast('Please select a faculty', true); return }
      const toFac = faculty.find((f) => f.id === selectedFacultyId)
      const slots = slotMap[context.facultyId] || []
      const slot = slots.find((s) => s.id === context.slotId)
      transferSingleSlot(context.facultyId, context.slotId, selectedFacultyId)
      showToast(`${slot?.venue} ${slot?.full} transferred to ${toFac.name}`, false)
      handleClose()

    } else if (context.type === 'faculty') {
      if (!selectedFacultyId) { showToast('Please select a faculty', true); return }
      const toFac = faculty.find((f) => f.id === selectedFacultyId)
      const fromSlots = slotMap[context.id] || []
      transferAllSlots(context.id, selectedFacultyId)
      showToast(`All ${fromSlots.length} slots transferred to ${toFac.name}`, false)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedFacultyId(null)
    setSelectedVenueId(null)
    setReason('')
    onClose()
  }

  const singleSlotPill = getSingleSlotPill()

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className={styles.boxHeader}>
          <div className={styles.title}>{getTitle()}</div>
          <div className={styles.sub}>{getSub()}</div>

          {/* Mode pills */}
          {singleSlotPill ? (
            <div className={styles.pillRow}>
              <span className={styles.singleSlotPill}>{singleSlotPill}</span>
            </div>
          ) : (
            <div className={styles.pillRow}>
              <span className={styles.pillSwap}>Swap Faculty = same venue, new incharge</span>
              <span className={styles.pillMove}>Move Venue = same faculty, new room</span>
            </div>
          )}
        </div>

        {/* SCROLL BODY */}
        <div className={styles.boxScroll}>
          <div className={styles.modeLabel}>{getModeLabel()}</div>

          {/* FACULTY LIST */}
          {!showVenueList && (
            <div className={styles.list}>
              {eligibleFaculty.map((f) => (
                <div
                  key={f.id}
                  className={`${styles.optItem} ${selectedFacultyId === f.id ? styles.optSelected : ''}`}
                  onClick={() => setSelectedFacultyId(f.id)}
                >
                  <div className={styles.optAvatar}>{f.initials}</div>
                  <div>
                    <div className={styles.optName}>{f.name}</div>
                    <div className={styles.optSub}>
                      {f.dept} · {f.venues.join(', ') || 'No venue'} · {f.slots} slots
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VENUE LIST */}
          {showVenueList && (
            <div className={styles.list}>
              {freeVenues.length > 0 ? freeVenues.map((v) => (
                <div
                  key={v.id}
                  className={`${styles.optItem} ${selectedVenueId === v.id ? styles.optVenueSelected : ''}`}
                  onClick={() => setSelectedVenueId(v.id)}
                >
                  <div className={styles.optVenueType}>{v.type}</div>
                  <div>
                    <div className={styles.optName}>{v.name}</div>
                    <div className={styles.optSub}>{v.block} · {v.room} · Free</div>
                  </div>
                  <span className={styles.freeBadge}>Free</span>
                </div>
              )) : (
                <div className={styles.emptyMsg}>No free venues available</div>
              )}
            </div>
          )}

          {/* REASON */}
          <div className={styles.modeLabel} style={{ marginTop: 16 }}>Reason</div>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="e.g. Faculty on leave, block maintenance…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* FOOTER */}
        <div className={styles.boxFooter}>
          <div className={styles.footerBtns}>
            <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
            <button className={styles.confirmBtn} onClick={handleConfirm}>Confirm</button>
          </div>
        </div>

      </div>
    </div>
  )
}
