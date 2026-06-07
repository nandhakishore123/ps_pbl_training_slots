import * as facultyModel from './faculty.model.js';
import { successResponse, errorResponse } from '../../utils/response.js';

// ── Resolve faculty_id from token ────────────────────────────────────────────
const resolveFacultyId = async (req, res) => {
    const userId = req.user?.user_id || req.user?.userId;
    if (!userId) {
        errorResponse(res, 'User ID not found in token', 401);
        return null;
    }
    const faculty = await facultyModel.getFacultyByUserId(userId);
    if (!faculty) {
        errorResponse(res, 'Faculty profile not found', 404);
        return null;
    }
    return faculty.faculty_id;
};

// GET /faculty/dashboard-kpi
export const getDashboardKPI = async (req, res, next) => {
    try {
        const facultyId = await resolveFacultyId(req, res);
        if (!facultyId) return;
        const data = await facultyModel.getFacultyDashboardKPI(facultyId);
        return successResponse(res, 'Dashboard KPI retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

// GET /faculty/my-venues
export const getMyVenues = async (req, res, next) => {
    try {
        const facultyId = await resolveFacultyId(req, res);
        if (!facultyId) return;
        const data = await facultyModel.getMyVenues(facultyId);
        return successResponse(res, 'Venues retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

// GET /faculty/mappings/:mappingId/students
export const getStudentsByMapping = async (req, res, next) => {
    try {
        const facultyId = await resolveFacultyId(req, res);
        if (!facultyId) return;
        const { mappingId } = req.params;
        const data = await facultyModel.getStudentsByMapping(mappingId, facultyId);
        return successResponse(res, 'Students retrieved successfully', data);
    } catch (error) {
        if (error.message?.includes('Forbidden')) {
            return errorResponse(res, error.message, 403);
        }
        next(error);
    }
};

// POST /faculty/bookings/:bookingId/attendance
export const markAttendance = async (req, res, next) => {
    try {
        const facultyId = await resolveFacultyId(req, res);
        if (!facultyId) return;
        const { bookingId } = req.params;
        await facultyModel.markAttendance(bookingId, facultyId);
        return successResponse(res, 'Attendance marked successfully', null);
    } catch (error) {
        if (error.message?.includes('Forbidden')) {
            return errorResponse(res, error.message, 403);
        }
        next(error);
    }
};

// POST /faculty/mappings/:mappingId/attendance/all
export const markAllAttendance = async (req, res, next) => {
    try {
        const facultyId = await resolveFacultyId(req, res);
        if (!facultyId) return;
        const { mappingId } = req.params;
        const marked = await facultyModel.markAllAttendance(mappingId, facultyId);
        return successResponse(res, `${marked} students marked as present`, { marked });
    } catch (error) {
        if (error.message?.includes('Forbidden')) {
            return errorResponse(res, error.message, 403);
        }
        next(error);
    }
};

// POST /faculty/bookings/:bookingId/malpractice
export const markMalpractice = async (req, res, next) => {
    try {
        const facultyId = await resolveFacultyId(req, res);
        if (!facultyId) return;
        const { bookingId } = req.params;
        const { reason } = req.body;
        if (!reason || !String(reason).trim()) {
            return errorResponse(res, 'Reason is required for malpractice', 400);
        }
        await facultyModel.markMalpractice(bookingId, facultyId, reason.trim());
        return successResponse(res, 'Malpractice flagged successfully', null);
    } catch (error) {
        if (error.message?.includes('Forbidden')) {
            return errorResponse(res, error.message, 403);
        }
        next(error);
    }
};

// POST /faculty/bookings/:bookingId/revoke-malpractice
export const revokeMalpractice = async (req, res, next) => {
    try {
        const facultyId = await resolveFacultyId(req, res);
        if (!facultyId) return;
        const { bookingId } = req.params;
        await facultyModel.revokeMalpractice(bookingId, facultyId);
        return successResponse(res, 'Malpractice flag revoked successfully', null);
    } catch (error) {
        if (error.message?.includes('Forbidden')) {
            return errorResponse(res, error.message, 403);
        }
        next(error);
    }
};

// GET /faculty/transfer-requests
export const getMyTransferRequests = async (req, res, next) => {
    try {
        const facultyId = await resolveFacultyId(req, res);
        if (!facultyId) return;
        const data = await facultyModel.getMyTransferRequests(facultyId);
        return successResponse(res, 'Transfer requests retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

// POST /faculty/transfer-requests
export const createTransferRequest = async (req, res, next) => {
    try {
        const facultyId = await resolveFacultyId(req, res);
        if (!facultyId) return;
        const { mappingId, toFacultyId, reason } = req.body;
        if (!mappingId || !toFacultyId || !reason?.trim()) {
            return errorResponse(res, 'mappingId, toFacultyId and reason are all required', 400);
        }
        const transferId = await facultyModel.createTransferRequest(facultyId, mappingId, toFacultyId, reason.trim());
        return successResponse(res, 'Transfer request created successfully', { transferId });
    } catch (error) {
        if (error.message?.includes('Forbidden')) {
            return errorResponse(res, error.message, 403);
        }
        next(error);
    }
};
