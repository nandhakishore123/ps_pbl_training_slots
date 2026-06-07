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

export const addVenueToFaculty = async (req, res, next) => {
    try {
        const { facultyId } = req.params;
        const { venueId, skillType, slotId } = req.body;
        await adminService.addVenueToFaculty(facultyId, venueId, skillType, slotId);
        return successResponse(res, null, 'Venue added successfully');
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
