import * as adminService from './admin.services.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getDashboardKPI = async (req, res, next) => {
    try {
        const data = await adminService.getDashboardKPI();
        return successResponse(res, 'KPIs retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getVenues = async (req, res, next) => {
    try {
        const data = await adminService.getVenues();
        return successResponse(res, 'Venues retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getFaculty = async (req, res, next) => {
    try {
        const data = await adminService.getFaculty();
        return successResponse(res, 'Faculty retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const searchFaculty = async (req, res, next) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;
        const data = await adminService.searchFaculty(q, Number(page), Number(limit));
        return successResponse(res, 'Faculty search results retrieved', data);
    } catch (error) {
        next(error);
    }
};

export const getStudents = async (req, res, next) => {
    try {
        const data = await adminService.getStudents();
        return successResponse(res, 'Students retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getTrainingSkills = async (req, res, next) => {
    try {
        const data = await adminService.getTrainingSkills();
        return successResponse(res, 'Training skills retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getSlotTimings = async (req, res, next) => {
    try {
        const data = await adminService.getSlotTimings();
        return successResponse(res, 'Slot timings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const swapFaculty = async (req, res, next) => {
    try {
        const { mappingId } = req.params;
        const { toFacultyId, reason } = req.body;
        await adminService.swapFaculty(mappingId, toFacultyId, reason);
        return successResponse(res, null, 'Faculty swapped successfully');
    } catch (error) {
        next(error);
    }
};

export const transferIndividualVenue = async (req, res, next) => {
    try {
        const { mappingId, toFacultyId, reason } = req.body;
        await adminService.transferIndividualVenue(mappingId, toFacultyId, reason);
        return successResponse(res, null, 'Venue transferred successfully');
    } catch (error) {
        next(error);
    }
};

export const transferAllVenues = async (req, res, next) => {
    try {
        const { fromFacultyId, toFacultyId, reason } = req.body;
        await adminService.transferAllVenues(fromFacultyId, toFacultyId, reason);
        return successResponse(res, null, 'All venues transferred successfully');
    } catch (error) {
        next(error);
    }
};

export const addSlotTiming = async (req, res, next) => {
    try {
        const { startTime, endTime } = req.body;
        const insertId = await adminService.addSlotTiming(startTime, endTime);
        return successResponse(res, { slotId: insertId }, 'Slot timing added successfully');
    } catch (error) {
        next(error);
    }
};

export const deleteSlotTiming = async (req, res, next) => {
    try {
        const { slotId } = req.params;
        await adminService.deleteSlotTiming(slotId);
        return successResponse(res, null, 'Slot timing deleted successfully');
    } catch (error) {
        next(error);
    }
};

// ── Venue management ─────────────────────────────────────────

export const getAllVenues = async (req, res, next) => {
    try {
        const data = await adminService.getAllVenues();
        return successResponse(res, 'Venues retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createVenue = async (req, res, next) => {
    try {
        const { venueName, location, capacity } = req.body;
        const venueId = await adminService.createVenue({ venueName, location, capacity });
        return successResponse(res, 'Venue created successfully', { venueId });
    } catch (error) {
        next(error);
    }
};

export const updateVenue = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const { venueName, location, capacity } = req.body;
        await adminService.updateVenue(venueId, { venueName, location, capacity });
        return successResponse(res, 'Venue updated successfully', null);
    } catch (error) {
        next(error);
    }
};

export const setVenueActive = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const { isActive, force } = req.body;
        await adminService.setVenueActive(venueId, !!isActive, !!force);
        return successResponse(res, `Venue ${isActive ? 'activated' : 'deactivated'} successfully`, null);
    } catch (error) {
        if (error.requiresConfirmation) {
            return res.status(409).json({ success: false, requiresConfirmation: true, count: error.count, message: error.message });
        }
        next(error);
    }
};

// ── Slot timing edit / open-close ────────────────────────────

export const getAllSlotTimings = async (req, res, next) => {
    try {
        const data = await adminService.getAllSlotTimings();
        return successResponse(res, 'Slot timings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const updateSlotTiming = async (req, res, next) => {
    try {
        const { slotId } = req.params;
        const { startTime, endTime, force } = req.body;
        await adminService.updateSlotTiming(slotId, startTime, endTime, !!force);
        return successResponse(res, 'Slot timing updated successfully', null);
    } catch (error) {
        if (error.requiresConfirmation) {
            return res.status(409).json({ success: false, requiresConfirmation: true, count: error.count, message: error.message });
        }
        next(error);
    }
};

export const setSlotActive = async (req, res, next) => {
    try {
        const { slotId } = req.params;
        const { isActive } = req.body;
        await adminService.setSlotActive(slotId, !!isActive);
        return successResponse(res, `Slot ${isActive ? 'opened' : 'closed'} successfully`, null);
    } catch (error) {
        next(error);
    }
};

// ── Venue ↔ Skill management ─────────────────────────────────

export const getVenueSkills = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const data = await adminService.getVenueSkills(venueId);
        return successResponse(res, 'Venue skills retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const addVenueSkill = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const { trainingSkillId } = req.body;
        await adminService.addVenueSkill(venueId, trainingSkillId);
        return successResponse(res, 'Skill linked to venue successfully', null);
    } catch (error) {
        next(error);
    }
};

export const removeVenueSkill = async (req, res, next) => {
    try {
        const { venueId, trainingSkillId } = req.params;
        await adminService.removeVenueSkill(venueId, trainingSkillId);
        return successResponse(res, 'Skill removed from venue successfully', null);
    } catch (error) {
        next(error);
    }
};

// ── Per-venue + per-date slots (venue_slots) — Stage 3a (ADDITIVE) ───────────

export const getVenueSlotsByDate = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const { date } = req.query;
        const data = await adminService.getVenueSlotsByDate(venueId, date || null);
        return successResponse(res, 'Venue slots retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getAllVenueSlotsByDate = async (req, res, next) => {
    try {
        const { date } = req.query;
        const data = await adminService.getAllVenueSlotsByDate(date);
        return successResponse(res, 'Slots for date retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createVenueSlot = async (req, res, next) => {
    try {
        const { mappingId, slotDate, startTime, endTime } = req.body;
        const data = await adminService.createVenueSlot({ mappingId, slotDate, startTime, endTime });
        return successResponse(res, 'Venue slot created successfully', data);
    } catch (error) {
        next(error);
    }
};

export const updateVenueSlot = async (req, res, next) => {
    try {
        const { venueSlotId } = req.params;
        const { slotDate, startTime, endTime } = req.body;
        await adminService.updateVenueSlot(venueSlotId, { slotDate, startTime, endTime });
        return successResponse(res, 'Venue slot updated successfully', null);
    } catch (error) {
        next(error);
    }
};

export const setVenueSlotActive = async (req, res, next) => {
    try {
        const { venueSlotId } = req.params;
        const { isActive } = req.body;
        await adminService.setVenueSlotActive(venueSlotId, !!isActive);
        return successResponse(res, `Venue slot ${isActive ? 'opened' : 'closed'} successfully`, null);
    } catch (error) {
        next(error);
    }
};

// ── Booking-open time config ─────────────────────────────────

export const getBookingWindowConfig = async (req, res, next) => {
    try {
        const data = await adminService.getBookingWindowConfig();
        return successResponse(res, 'Booking window config retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const updateBookingWindowConfig = async (req, res, next) => {
    try {
        const { openHour, openMinute } = req.body;
        const data = await adminService.updateBookingWindowConfig(openHour, openMinute);
        return successResponse(res, 'Booking open time updated successfully', data);
    } catch (error) {
        next(error);
    }
};

// ── Attendance ───────────────────────────────────────────────

export const getAttendanceMappings = async (req, res, next) => {
    try {
        const data = await adminService.getAttendanceMappings();
        return successResponse(res, 'Attendance mappings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getAttendanceStudents = async (req, res, next) => {
    try {
        const { mappingId } = req.params;
        const data = await adminService.getAttendanceStudents(mappingId);
        return successResponse(res, 'Students retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const markAttendance = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const status = (req.body.status || '').toUpperCase();
        if (status !== 'PRESENT' && status !== 'ABSENT') {
            return errorResponse(res, 'Status must be PRESENT or ABSENT', 400);
        }
        await adminService.markAttendance(bookingId, status);
        return successResponse(res, `Attendance marked as ${status}`, null);
    } catch (error) {
        if (error.message?.includes('not found')) {
            return errorResponse(res, error.message, 404);
        }
        next(error);
    }
};

// ── All-Bookings dashboard ───────────────────────────────────

export const getAllBookings = async (req, res, next) => {
    try {
        const { venueId, date, venueSlotId } = req.query;
        const data = await adminService.getAllBookings({ venueId, date, venueSlotId });
        return successResponse(res, 'Bookings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};
