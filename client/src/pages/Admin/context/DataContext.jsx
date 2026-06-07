import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { adminService } from '../../../services/features/adminService'
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

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchDashboardKPI(),
      fetchVenues(),
      fetchFaculty(),
      fetchStudents(),
      fetchTrainingSkills(),
      fetchSlotTimings()
    ])
    setLoading(false)
  }, [fetchDashboardKPI, fetchVenues, fetchFaculty, fetchStudents, fetchTrainingSkills, fetchSlotTimings])

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

  const addVenueToFaculty = async (facultyId, venueId, skillType, slotId) => {
    try {
      await adminService.addVenueToFaculty(facultyId, venueId, skillType, slotId)
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

