import * as adminModel from './admin.model.js';

export const getDashboardKPI = async () => {
    return await adminModel.getDashboardKPI();
};

export const getVenues = async () => {
    return await adminModel.listVenues();
};

export const getFaculty = async () => {
    return await adminModel.listFaculty();
};

export const searchFaculty = async (query, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    return await adminModel.searchFaculty(query, limit, offset);
};

export const getStudents = async () => {
    return await adminModel.listStudentsWithPoints();
};

export const getTrainingSkills = async () => {
    return await adminModel.listTrainingSkills();
};

export const getSlotTimings = async () => {
    return await adminModel.listSlotTimings();
};

export const addSlotTiming = async (startTime, endTime) => {
    if (!startTime || !endTime) {
        throw new Error('Start time and End time are required');
    }
    return await adminModel.addSlotTiming(startTime, endTime);
};

export const deleteSlotTiming = async (slotId) => {
    if (!slotId) {
        throw new Error('Slot ID is required');
    }
    return await adminModel.deleteSlotTiming(slotId);
};

// ── Venue management ─────────────────────────────────────────
export const getAllVenues = async () => {
    return await adminModel.listAllVenues();
};

export const createVenue = async ({ venueName, location, capacity }) => {
    if (!venueName || !String(venueName).trim()) {
        throw new Error('Venue name is required');
    }
    return await adminModel.createVenue({
        venueName: String(venueName).trim(),
        location: location != null ? String(location).trim() : null,
        capacity: capacity != null && capacity !== '' ? Number(capacity) : null,
    });
};

export const updateVenue = async (venueId, { venueName, location, capacity }) => {
    if (!venueId) throw new Error('Venue ID is required');
    if (!venueName || !String(venueName).trim()) {
        throw new Error('Venue name is required');
    }
    return await adminModel.updateVenue(venueId, {
        venueName: String(venueName).trim(),
        location: location != null ? String(location).trim() : null,
        capacity: capacity != null && capacity !== '' ? Number(capacity) : null,
    });
};

export const setVenueActive = async (venueId, isActive, force = false) => {
    if (!venueId) throw new Error('Venue ID is required');
    // Deactivating a venue that still has faculty mappings would hide a venue
    // in use from booking — require explicit confirmation.
    if (!isActive && !force) {
        const mappingCount = await adminModel.countMappingsByVenue(venueId);
        if (mappingCount > 0) {
            const err = new Error(`This venue has ${mappingCount} faculty mapping(s). Deactivating it removes it from booking. Confirm to proceed.`);
            err.status = 409;
            err.requiresConfirmation = true;
            err.count = mappingCount;
            throw err;
        }
    }
    return await adminModel.setVenueActive(venueId, isActive);
};

// ── Slot timing edit / open-close ────────────────────────────
export const updateSlotTiming = async (slotId, startTime, endTime, force = false) => {
    if (!slotId) throw new Error('Slot ID is required');
    if (!startTime || !endTime) throw new Error('Start time and End time are required');
    if (String(startTime) >= String(endTime)) {
        throw new Error('End time must be after start time');
    }
    // Editing a slot with existing bookings shifts the assessment window for
    // those bookings — warn (not hard-block) so admins confirm intent.
    if (!force) {
        const bookingCount = await adminModel.countBookingsBySlot(slotId);
        if (bookingCount > 0) {
            const err = new Error(`This slot has ${bookingCount} existing booking(s). Editing its times shifts the assessment window for them. Confirm to proceed.`);
            err.status = 409;
            err.requiresConfirmation = true;
            err.count = bookingCount;
            throw err;
        }
    }
    return await adminModel.updateSlotTiming(slotId, startTime, endTime);
};

export const setSlotActive = async (slotId, isActive) => {
    if (!slotId) throw new Error('Slot ID is required');
    return await adminModel.setSlotActive(slotId, isActive);
};

export const getAllSlotTimings = async () => {
    return await adminModel.listAllSlotTimings();
};

// ── Venue ↔ Skill management ─────────────────────────────────
export const getVenueSkills = async (venueId) => {
    if (!venueId) throw new Error('Venue ID is required');
    return await adminModel.listVenueSkills(venueId);
};

export const addVenueSkill = async (venueId, trainingSkillId) => {
    if (!venueId || !trainingSkillId) throw new Error('Venue ID and Training Skill ID are required');
    await adminModel.addVenueSkill(venueId, trainingSkillId);
    return { success: true };
};

export const removeVenueSkill = async (venueId, trainingSkillId) => {
    if (!venueId || !trainingSkillId) throw new Error('Venue ID and Training Skill ID are required');
    await adminModel.removeVenueSkill(venueId, trainingSkillId);
    return { success: true };
};

export const swapFaculty = async (mappingId, newFacultyId, reason) => {
    if (!mappingId || !newFacultyId || !reason) {
        throw new Error('Mapping ID, New Faculty ID, and Reason are required');
    }
    await adminModel.swapFaculty(mappingId, newFacultyId, reason);
};

export const transferIndividualVenue = async (mappingId, toFacultyId, reason) => {
    if (!mappingId || !toFacultyId || !reason) {
        throw new Error('Mapping ID, New Faculty ID, and Reason are required');
    }
    await adminModel.transferIndividualVenue(mappingId, toFacultyId, reason);
};

export const transferAllVenues = async (fromFacultyId, toFacultyId, reason) => {
    if (!fromFacultyId || !toFacultyId || !reason) {
        throw new Error('From Faculty ID, To Faculty ID, and Reason are required');
    }
    await adminModel.transferAllVenues(fromFacultyId, toFacultyId, reason);
};

// ── Attendance ───────────────────────────────────────────────

export const getAttendanceMappings = async () => {
    return await adminModel.listAllMappingsWithVenues();
};

export const getAttendanceStudents = async (mappingId) => {
    if (!mappingId) {
        throw new Error('Mapping ID is required');
    }
    return await adminModel.getStudentsByMappingAdmin(mappingId);
};

export const markAttendance = async (bookingId, status) => {
    if (!bookingId) {
        throw new Error('Booking ID is required');
    }
    if (!status || !['PRESENT', 'ABSENT'].includes(status)) {
        throw new Error('Status must be PRESENT or ABSENT');
    }
    await adminModel.markAttendanceAdmin(bookingId, status);
};

// ── All-Bookings dashboard ───────────────────────────────────

export const getAllBookings = async ({ venueId, date, slotId } = {}) => {
    return await adminModel.listAllBookings({ venueId, date, slotId });
};
