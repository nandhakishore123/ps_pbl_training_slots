import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { adminService } from '../../../services/features/adminService'
import { superAdminService } from '../../../services/features/superAdminService'
import { useApp } from './AppContext'

// Mock approvals since they are not fully migrated yet
import { initialLabApprovals, initialApApprovals } from '../data/approvals'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { showToast } = useApp()

  // ── STATE ───────────────────────────────────────────────────
  const [dashboardKPI, setDashboardKPI] = useState(null)
  const [venues, setVenues] = useState([])
  const [faculty, setFaculty] = useState([])
  const [students, setStudents] = useState([])
  const [trainingSkills, setTrainingSkills] = useState([])
  const [slotTimings, setSlotTimings] = useState([])
  // Admin management list — includes inactive slots (active-only `slotTimings`
  // stays the source for assign/booking pickers).
  const [allSlotTimings, setAllSlotTimings] = useState([])
  
  // Mock approvals
  const [labApprovals, setLabApprovals] = useState(initialLabApprovals)
  const [apApprovals, setApApprovals] = useState(initialApApprovals)

  const [loading, setLoading] = useState(true)

  // ── FETCH DATA ──────────────────────────────────────────────
  const fetchDashboardKPI = useCallback(async () => {
    try {
      const res = await adminService.getDashboardKPI()
      setDashboardKPI(res.data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchVenues = useCallback(async () => {
    try {
      const res = await adminService.getVenues()
      setVenues(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchFaculty = useCallback(async () => {
    try {
      const res = await adminService.getFaculty()
      setFaculty(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const res = await adminService.getStudents()
      setStudents(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchTrainingSkills = useCallback(async () => {
    try {
      const res = await adminService.getTrainingSkills()
      setTrainingSkills(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchSlotTimings = useCallback(async () => {
    try {
      const res = await adminService.getSlotTimings()
      setSlotTimings(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchAllSlotTimings = useCallback(async () => {
    try {
      const res = await adminService.getAllSlotTimings()
      setAllSlotTimings(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchDashboardKPI(),
      fetchVenues(),
      fetchFaculty(),
      fetchStudents(),
      fetchTrainingSkills(),
      fetchSlotTimings(),
      fetchAllSlotTimings()
    ])
    setLoading(false)
  }, [fetchDashboardKPI, fetchVenues, fetchFaculty, fetchStudents, fetchTrainingSkills, fetchSlotTimings, fetchAllSlotTimings])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // ── ACTIONS ─────────────────────────────────────────────────

  const swapFaculty = async (mappingId, newFacultyId, reason) => {
    try {
      await adminService.swapFaculty(mappingId, newFacultyId, reason)
      await fetchVenues()
      await fetchFaculty()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to swap faculty', true)
      return false
    }
  }

  const addVenueToFaculty = async (facultyId, venueId, trainingSkillId, slotId) => {
    try {
      // Routed through the assign endpoint, which writes BOTH venue_mapping
      // AND venue_alloted_skills (so the venue becomes bookable for the skill).
      await superAdminService.assignFacultyToLab(facultyId, { venueId, slotId, trainingSkillId })
      await fetchFaculty()
      await fetchVenues()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add venue', true)
      return false
    }
  }

  const transferIndividualVenue = async (mappingId, toFacultyId, reason) => {
    try {
      await adminService.transferIndividualVenue(mappingId, toFacultyId, reason)
      await fetchFaculty()
      await fetchVenues()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to transfer venue', true)
      return false
    }
  }

  const transferAllVenues = async (fromFacultyId, toFacultyId, reason) => {
    try {
      await adminService.transferAllVenues(fromFacultyId, toFacultyId, reason)
      await fetchFaculty()
      await fetchVenues()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to transfer venues', true)
      return false
    }
  }

  const addSlotTiming = async (startTime, endTime) => {
    try {
      await adminService.addSlotTiming(startTime, endTime)
      await fetchSlotTimings()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add slot timing', true)
      return false
    }
  }

  const deleteSlotTiming = async (slotId) => {
    try {
      await adminService.deleteSlotTiming(slotId)
      await fetchSlotTimings()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete slot timing', true)
      return false
    }
  }

  // ── Venue management ────────────────────────────────────────
  const createVenue = async (payload) => {
    try {
      await adminService.createVenue(payload)
      await fetchVenues()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create venue', true)
      return false
    }
  }

  const updateVenue = async (venueId, payload) => {
    try {
      await adminService.updateVenue(venueId, payload)
      await fetchVenues()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update venue', true)
      return false
    }
  }

  // Returns true on success, { requiresConfirmation, message } if a guard blocked
  // it (venue still mapped), or false on a hard error.
  const setVenueActive = async (venueId, isActive, force = false) => {
    try {
      await adminService.setVenueActive(venueId, isActive, force)
      await fetchVenues()
      return true
    } catch (err) {
      const data = err.response?.data
      if (data?.requiresConfirmation) {
        return { requiresConfirmation: true, message: data.message }
      }
      showToast(data?.message || 'Failed to update venue status', true)
      return false
    }
  }

  // ── Slot timing edit / open-close ───────────────────────────
  const refreshSlots = async () => {
    await fetchAllSlotTimings()
    await fetchSlotTimings()
  }

  const updateSlotTiming = async (slotId, startTime, endTime, force = false) => {
    try {
      await adminService.updateSlotTiming(slotId, startTime, endTime, force)
      await refreshSlots()
      return true
    } catch (err) {
      const data = err.response?.data
      if (data?.requiresConfirmation) {
        return { requiresConfirmation: true, message: data.message }
      }
      showToast(data?.message || 'Failed to update slot timing', true)
      return false
    }
  }

  const setSlotActive = async (slotId, isActive) => {
    try {
      await adminService.setSlotActive(slotId, isActive)
      await refreshSlots()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update slot status', true)
      return false
    }
  }

  // ── Venue ↔ Skill management ────────────────────────────────
  const getVenueSkills = async (venueId) => {
    try {
      const res = await adminService.getVenueSkills(venueId)
      return Array.isArray(res.data) ? res.data : []
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load venue skills', true)
      return []
    }
  }

  const addVenueSkill = async (venueId, trainingSkillId) => {
    try {
      await adminService.addVenueSkill(venueId, trainingSkillId)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add skill', true)
      return false
    }
  }

  const removeVenueSkill = async (venueId, trainingSkillId) => {
    try {
      await adminService.removeVenueSkill(venueId, trainingSkillId)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove skill', true)
      return false
    }
  }

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
        loading,
        dashboardKPI,
        venues,
        faculty,
        students,
        trainingSkills,
        slotTimings,
        allSlotTimings,
        labApprovals,
        apApprovals,
        refreshAll,
        // actions
        swapFaculty,
        addVenueToFaculty,
        transferIndividualVenue,
        transferAllVenues,
        addSlotTiming,
        deleteSlotTiming,
        // venue management
        createVenue,
        updateVenue,
        setVenueActive,
        // slot edit / open-close
        updateSlotTiming,
        setSlotActive,
        // venue ↔ skill
        getVenueSkills,
        addVenueSkill,
        removeVenueSkill,
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

