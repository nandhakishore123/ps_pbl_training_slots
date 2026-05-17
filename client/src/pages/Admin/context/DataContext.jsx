import { createContext, useContext, useState } from 'react'
import { allFaculty, facultySlotMap } from '../data/faculty'
import { allVenues } from '../data/venues'
import { initialPsSlots, initialPblSlots } from '../data/slots'
import { allStudents } from '../data/students'
import { initialLabApprovals, initialApApprovals } from '../data/approvals'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  // ── VENUES ──────────────────────────────────────────────────
  const [venues, setVenues] = useState(allVenues)

  // ── FACULTY ─────────────────────────────────────────────────
  const [faculty, setFaculty] = useState(allFaculty)

  // ── FACULTY SLOT MAP ─────────────────────────────────────────
  const [slotMap, setSlotMap] = useState(facultySlotMap)

  // ── SLOTS ───────────────────────────────────────────────────
  const [psSlots, setPsSlots] = useState(initialPsSlots)
  const [pblSlots, setPblSlots] = useState(initialPblSlots)

  // ── STUDENTS ────────────────────────────────────────────────
  const [students] = useState(allStudents)

  // ── APPROVALS ───────────────────────────────────────────────
  const [labApprovals, setLabApprovals] = useState(initialLabApprovals)
  const [apApprovals, setApApprovals] = useState(initialApApprovals)

  // ── VENUE ACTIONS ────────────────────────────────────────────
  const updateVenue = (venueId, changes) => {
    setVenues((prev) =>
      prev.map((v) => (v.id === venueId ? { ...v, ...changes } : v))
    )
  }

  const revokeVenueTransfer = (venueId) => {
    updateVenue(venueId, { transferredTo: null })
  }

  // ── FACULTY ACTIONS ──────────────────────────────────────────
  const updateFaculty = (facultyId, changes) => {
    setFaculty((prev) =>
      prev.map((f) => (f.id === facultyId ? { ...f, ...changes } : f))
    )
  }

  // ── TRANSFER ACTIONS ─────────────────────────────────────────

  // Swap Faculty — same venue, new incharge
  const swapFaculty = (venueId, toFacultyId) => {
    updateVenue(venueId, { transferredTo: toFacultyId })
  }

  // Move Venue — same faculty, new room
  const moveVenue = (fromVenueId, toVenueId) => {
    setVenues((prev) => {
      const updated = prev.map((v) => {
        if (v.id === fromVenueId) {
          return { ...v, faculty: null, slot: null, status: 'free', transferredTo: null }
        }
        if (v.id === toVenueId) {
          const fromV = prev.find((x) => x.id === fromVenueId)
          return { ...v, faculty: fromV.faculty, slot: fromV.slot, status: 'occupied' }
        }
        return v
      })
      return updated
    })
    // Update faculty venues list
    setVenues((prev) => {
      const fromV = prev.find((v) => v.id === fromVenueId)
      const toV = prev.find((v) => v.id === toVenueId)
      if (fromV && toV && fromV.faculty) {
        setFaculty((fPrev) =>
          fPrev.map((f) => {
            if (f.id === fromV.faculty) {
              return {
                ...f,
                venues: [...f.venues.filter((x) => x !== fromV.name), toV.name],
              }
            }
            return f
          })
        )
      }
      return prev
    })
  }

  // Transfer single slot
  const transferSingleSlot = (fromFacultyId, slotId, toFacultyId) => {
    setSlotMap((prev) => {
      const fromSlots = prev[fromFacultyId] || []
      const slot = fromSlots.find((s) => s.id === slotId)
      if (!slot) return prev
      const newFromSlots = fromSlots.filter((s) => s.id !== slotId)
      const toSlots = prev[toFacultyId] || []
      const newSlot = {
        ...slot,
        id: toFacultyId + '-S' + (toSlots.length + 1),
      }
      return {
        ...prev,
        [fromFacultyId]: newFromSlots,
        [toFacultyId]: [...toSlots, newSlot],
      }
    })
    setFaculty((prev) =>
      prev.map((f) => {
        if (f.id === fromFacultyId) {
          return { ...f, slots: (slotMap[fromFacultyId] || []).length - 1 }
        }
        if (f.id === toFacultyId) {
          return { ...f, slots: (slotMap[toFacultyId] || []).length + 1 }
        }
        return f
      })
    )
  }

  // Transfer all slots from one faculty to another
  const transferAllSlots = (fromFacultyId, toFacultyId) => {
    setSlotMap((prev) => {
      const fromSlots = prev[fromFacultyId] || []
      const toSlots = prev[toFacultyId] || []
      const movedSlots = fromSlots.map((s, i) => ({
        ...s,
        id: toFacultyId + '-S' + (toSlots.length + i + 1),
      }))
      return {
        ...prev,
        [fromFacultyId]: [],
        [toFacultyId]: [...toSlots, ...movedSlots],
      }
    })
    setFaculty((prev) =>
      prev.map((f) => {
        if (f.id === fromFacultyId) return { ...f, slots: 0, venues: [] }
        if (f.id === toFacultyId) {
          return {
            ...f,
            slots: (slotMap[toFacultyId] || []).length + (slotMap[fromFacultyId] || []).length,
          }
        }
        return f
      })
    )
  }

  // ── SLOT ACTIONS ─────────────────────────────────────────────
  const addPsSlot = (slot) => {
    setPsSlots((prev) => [
      ...prev,
      { ...slot, id: 'PS0' + (prev.length + 1) },
    ])
  }

  const deletePsSlot = (index) => {
    setPsSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const addPblSlot = (slot) => {
    setPblSlots((prev) => [
      ...prev,
      { ...slot, id: 'PBL0' + (prev.length + 1) },
    ])
  }

  const deletePblSlot = (index) => {
    setPblSlots((prev) => prev.filter((_, i) => i !== index))
  }

  // ── APPROVAL ACTIONS ─────────────────────────────────────────
  const handleLabApproval = (id, action) => {
    setLabApprovals((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: action } : l))
    )
  }

  const handleApApproval = (id, action) => {
    setApApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: action } : a))
    )
  }

  return (
    <DataContext.Provider
      value={{
        // state
        venues,
        faculty,
        slotMap,
        psSlots,
        pblSlots,
        students,
        labApprovals,
        apApprovals,
        // venue actions
        updateVenue,
        revokeVenueTransfer,
        // transfer actions
        swapFaculty,
        moveVenue,
        transferSingleSlot,
        transferAllSlots,
        // slot actions
        addPsSlot,
        deletePsSlot,
        addPblSlot,
        deletePblSlot,
        // approval actions
        handleLabApproval,
        handleApApproval,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
