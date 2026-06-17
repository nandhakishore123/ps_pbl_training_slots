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
  // Admin management list — includes inactive venues (active-only `venues`
  // stays the source for assign/booking pickers and the Venue Map).
  const [allVenues, setAllVenues] = useState([])
  const [faculty, setFaculty] = useState([])
  const [students, setStudents] = useState([])
  // Admin management list — includes inactive students + email (active-only
  // `students` stays the source for the points/read path).
  const [allStudents, setAllStudents] = useState([])
  const [trainingSkills, setTrainingSkills] = useState([])
  // Admin management list — includes inactive courses/labs (active-only
  // `trainingSkills` stays the source for the points read & booking pickers).
  const [allTrainingSkills, setAllTrainingSkills] = useState([])
  const [skillCategories, setSkillCategories] = useState([])
  const [slotTimings, setSlotTimings] = useState([])
  // Admin management list — includes inactive slots (active-only `slotTimings`
  // stays the source for assign/booking pickers).
  const [allSlotTimings, setAllSlotTimings] = useState([])
  // Admin-configurable booking-open time { openHour, openMinute }
  const [bookingWindow, setBookingWindow] = useState(null)
  
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

  const fetchAllVenues = useCallback(async () => {
    try {
      const res = await adminService.getAllVenues()
      setAllVenues(Array.isArray(res.data) ? res.data : [])
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

  const fetchAllStudents = useCallback(async () => {
    try {
      const res = await adminService.getAllStudents()
      setAllStudents(Array.isArray(res.data) ? res.data : [])
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

  const fetchAllTrainingSkills = useCallback(async () => {
    try {
      const res = await adminService.getAllTrainingSkills()
      setAllTrainingSkills(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchSkillCategories = useCallback(async () => {
    try {
      const res = await adminService.getSkillCategories()
      setSkillCategories(Array.isArray(res.data) ? res.data : [])
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

  const fetchBookingWindow = useCallback(async () => {
    try {
      const res = await adminService.getBookingWindowConfig()
      setBookingWindow(res.data || null)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchDashboardKPI(),
      fetchVenues(),
      fetchAllVenues(),
      fetchFaculty(),
      fetchStudents(),
      fetchAllStudents(),
      fetchTrainingSkills(),
      fetchAllTrainingSkills(),
      fetchSkillCategories(),
      fetchSlotTimings(),
      fetchAllSlotTimings(),
      fetchBookingWindow()
    ])
    setLoading(false)
  }, [fetchDashboardKPI, fetchVenues, fetchAllVenues, fetchFaculty, fetchStudents, fetchAllStudents, fetchTrainingSkills, fetchAllTrainingSkills, fetchSkillCategories, fetchSlotTimings, fetchAllSlotTimings, fetchBookingWindow])

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
  const refreshVenues = async () => {
    await fetchVenues()
    await fetchAllVenues()
  }

  const createVenue = async (payload) => {
    try {
      await adminService.createVenue(payload)
      await refreshVenues()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create venue', true)
      return false
    }
  }

  const updateVenue = async (venueId, payload) => {
    try {
      await adminService.updateVenue(venueId, payload)
      await refreshVenues()
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
      await refreshVenues()
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

  // ── Training skill (Course/Lab) management — Stage 5a ───────
  const refreshTrainingSkills = async () => {
    await fetchTrainingSkills()
    await fetchAllTrainingSkills()
  }

  const getSkillCategories = async () => {
    // Categories rarely change; serve cached list but refresh if empty.
    if (skillCategories.length === 0) await fetchSkillCategories()
    return skillCategories
  }

  const createTrainingSkill = async (payload) => {
    try {
      await adminService.createTrainingSkill(payload)
      await refreshTrainingSkills()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create course/lab', true)
      return false
    }
  }

  const updateTrainingSkill = async (id, payload) => {
    try {
      await adminService.updateTrainingSkill(id, payload)
      await refreshTrainingSkills()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update course/lab', true)
      return false
    }
  }

  // Returns true on success, { requiresConfirmation, message } if the soft guard
  // fired (course still offered at venues), or false on a hard error.
  const setTrainingSkillActive = async (id, isActive, force = false) => {
    try {
      await adminService.setTrainingSkillActive(id, isActive, force)
      await refreshTrainingSkills()
      return true
    } catch (err) {
      const data = err.response?.data
      if (data?.requiresConfirmation) {
        return { requiresConfirmation: true, message: data.message }
      }
      showToast(data?.message || 'Failed to update course/lab status', true)
      return false
    }
  }

  // ── Student management — Stage 5d ───────────────────────────
  const refreshStudents = async () => {
    await fetchStudents()
    await fetchAllStudents()
  }

  const createStudent = async (payload) => {
    try {
      await adminService.createStudent(payload)
      await refreshStudents()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create student', true)
      return false
    }
  }

  const updateStudent = async (id, payload) => {
    try {
      await adminService.updateStudent(id, payload)
      await refreshStudents()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update student', true)
      return false
    }
  }

  const setStudentActive = async (id, isActive) => {
    try {
      await adminService.setStudentActive(id, isActive)
      await refreshStudents()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update student status', true)
      return false
    }
  }

  // ── Skill level (Course/Lab level) management — Stage 5b ────
  // Levels are loaded on demand per course (like venue skills/slots), not held
  // in global state. Mutations refresh the skill lists so levels_count updates.
  const getLevels = async (skillId) => {
    try {
      const res = await adminService.getLevels(skillId)
      return Array.isArray(res.data) ? res.data : []
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load levels', true)
      return []
    }
  }

  const createLevel = async (skillId, payload) => {
    try {
      await adminService.createLevel(skillId, payload)
      await refreshTrainingSkills()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create level', true)
      return false
    }
  }

  const updateLevel = async (levelId, payload) => {
    try {
      await adminService.updateLevel(levelId, payload)
      await refreshTrainingSkills()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update level', true)
      return false
    }
  }

  // Guard-delete: a 409 carries the block reason — surface it via toast.
  const deleteLevel = async (levelId) => {
    try {
      await adminService.deleteLevel(levelId)
      await refreshTrainingSkills()
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete level', true)
      return false
    }
  }

  // ── Assessment management — Stage 5c-i ──────────────────────
  // Loaded on demand per skill+level / per assessment (not in global state).
  const getAssessments = async (skillId, levelId) => {
    try {
      const res = await adminService.getAssessments(skillId, levelId)
      return Array.isArray(res.data) ? res.data : []
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load assessments', true)
      return []
    }
  }

  const createAssessment = async (skillId, levelId, payload) => {
    try {
      await adminService.createAssessment(skillId, levelId, payload)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create assessment', true)
      return false
    }
  }

  const updateAssessment = async (assessmentId, payload) => {
    try {
      await adminService.updateAssessment(assessmentId, payload)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update assessment', true)
      return false
    }
  }

  const setAssessmentActive = async (assessmentId, isActive) => {
    try {
      await adminService.setAssessmentActive(assessmentId, isActive)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update assessment status', true)
      return false
    }
  }

  const getMcqTypes = async () => {
    try {
      const res = await adminService.getMcqTypes()
      return Array.isArray(res.data) ? res.data : []
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load MCQ types', true)
      return []
    }
  }

  const getMcqTypeConfig = async (assessmentId) => {
    try {
      const res = await adminService.getMcqTypeConfig(assessmentId)
      return Array.isArray(res.data) ? res.data : []
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load MCQ type config', true)
      return []
    }
  }

  const upsertMcqTypeConfig = async (assessmentId, mcqTypeId, questionCount) => {
    try {
      await adminService.upsertMcqTypeConfig(assessmentId, mcqTypeId, questionCount)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save MCQ type config', true)
      return false
    }
  }

  const deleteMcqTypeConfig = async (configId) => {
    try {
      await adminService.deleteMcqTypeConfig(configId)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove MCQ type config', true)
      return false
    }
  }

  // ── MCQ Question Bank — Stage 5c-ii ─────────────────────────
  const getQuestions = async (assessmentId) => {
    try {
      const res = await adminService.getQuestions(assessmentId)
      return Array.isArray(res.data) ? res.data : []
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load questions', true)
      return []
    }
  }

  const createQuestion = async (assessmentId, payload) => {
    try {
      await adminService.createQuestion(assessmentId, payload)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create question', true)
      return false
    }
  }

  const updateQuestion = async (questionId, payload) => {
    try {
      await adminService.updateQuestion(questionId, payload)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update question', true)
      return false
    }
  }

  const setQuestionActive = async (questionId, isActive) => {
    try {
      await adminService.setQuestionActive(questionId, isActive)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update question status', true)
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

  // ── Per-venue + per-date slots (admin-only, Stage 3a) ───────
  const getVenueSlots = async (venueId, slotDate = null) => {
    try {
      const res = await adminService.getVenueSlotsByDate(venueId, slotDate)
      return res.data || { slots: [], mappings: [] }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load venue slots', true)
      return { slots: [], mappings: [] }
    }
  }

  // Whole-day convenience read for the Slot Scheduling page (one call).
  const getAllVenueSlots = async (slotDate) => {
    try {
      const res = await adminService.getAllVenueSlotsByDate(slotDate)
      return res.data || { slots: [], mappings: [] }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load slots for this day', true)
      return { slots: [], mappings: [] }
    }
  }

  const createVenueSlot = async (venueId, payload) => {
    try {
      await adminService.createVenueSlot(venueId, payload)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add slot', true)
      return false
    }
  }

  const updateVenueSlot = async (venueSlotId, payload) => {
    try {
      await adminService.updateVenueSlot(venueSlotId, payload)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update slot', true)
      return false
    }
  }

  const setVenueSlotActive = async (venueSlotId, isActive) => {
    try {
      await adminService.setVenueSlotActive(venueSlotId, isActive)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update slot status', true)
      return false
    }
  }

  // ── Booking-open time config ────────────────────────────────
  const getBookingWindowConfig = async () => {
    try {
      const res = await adminService.getBookingWindowConfig()
      const data = res.data || null
      setBookingWindow(data)
      return data
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load booking open time', true)
      return null
    }
  }

  const updateBookingWindowConfig = async (openHour, openMinute) => {
    try {
      const res = await adminService.updateBookingWindowConfig(openHour, openMinute)
      setBookingWindow(res.data || { openHour, openMinute })
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update booking open time', true)
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
        allVenues,
        faculty,
        students,
        allStudents,
        trainingSkills,
        allTrainingSkills,
        skillCategories,
        slotTimings,
        allSlotTimings,
        bookingWindow,
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
        // student management (Stage 5d)
        createStudent,
        updateStudent,
        setStudentActive,
        // training skill (course/lab) management
        getSkillCategories,
        createTrainingSkill,
        updateTrainingSkill,
        setTrainingSkillActive,
        // skill level management (Stage 5b)
        getLevels,
        createLevel,
        updateLevel,
        deleteLevel,
        // assessment management (Stage 5c-i)
        getAssessments,
        createAssessment,
        updateAssessment,
        setAssessmentActive,
        getMcqTypes,
        getMcqTypeConfig,
        upsertMcqTypeConfig,
        deleteMcqTypeConfig,
        // mcq question bank (Stage 5c-ii)
        getQuestions,
        createQuestion,
        updateQuestion,
        setQuestionActive,
        // slot edit / open-close
        updateSlotTiming,
        setSlotActive,
        // venue ↔ skill
        getVenueSkills,
        addVenueSkill,
        removeVenueSkill,
        // per-venue + per-date slots (Stage 3a)
        getVenueSlots,
        getAllVenueSlots,
        createVenueSlot,
        updateVenueSlot,
        setVenueSlotActive,
        // booking-open time config
        getBookingWindowConfig,
        updateBookingWindowConfig,
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

