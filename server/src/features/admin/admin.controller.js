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
        const { venueId, date, slotId } = req.query;
        const data = await adminService.getAllBookings({ venueId, date, slotId });
        return successResponse(res, 'Bookings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};
