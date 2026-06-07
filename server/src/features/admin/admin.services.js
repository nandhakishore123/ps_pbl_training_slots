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

export const swapFaculty = async (mappingId, newFacultyId, reason) => {
    if (!mappingId || !newFacultyId || !reason) {
        throw new Error('Mapping ID, New Faculty ID, and Reason are required');
    }
    await adminModel.swapFaculty(mappingId, newFacultyId, reason);
};

export const addVenueToFaculty = async (facultyId, venueId, skillType, slotId) => {
    if (!facultyId || !venueId || !skillType || !slotId) {
        throw new Error('All fields are required');
    }
    return await adminModel.addVenueToFaculty(facultyId, venueId, skillType, slotId);
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
