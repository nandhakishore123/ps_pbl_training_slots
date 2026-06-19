import {
  successResponse,
  createdResponse,
  errorResponse,
  internalServerErrorResponse,
} from '../../utils/response.js';
import * as service from './announcements.services.js';

// ── Admin (role 3) ───────────────────────────────────────────
export const createAnnouncement = async (req, res) => {
  try {
    const { title, body, target_course, target_year } = req.body;
    const data = await service.createAnnouncement({
      title,
      body,
      targetCourse: target_course ?? null,
      targetYear: target_year ?? null,
      createdBy: req.user?.user_id,
    });
    return createdResponse(res, 'Announcement created', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in createAnnouncement:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to create announcement');
  }
};

export const listAllAnnouncements = async (req, res) => {
  try {
    const data = await service.listAllAnnouncements();
    return successResponse(res, 'Announcements fetched', { items: data });
  } catch (error) {
    console.error('Error in listAllAnnouncements:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch announcements');
  }
};

export const toggleAnnouncementActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    const data = await service.setActive(req.params.id, Boolean(isActive));
    return successResponse(res, 'Announcement updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in toggleAnnouncementActive:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update announcement');
  }
};

export const softDeleteAnnouncement = async (req, res) => {
  try {
    await service.softDelete(req.params.id);
    return successResponse(res, 'Announcement deleted');
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in softDeleteAnnouncement:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to delete announcement');
  }
};

// ── Student (role 1) ─────────────────────────────────────────
export const listStudentAnnouncements = async (req, res) => {
  try {
    const data = await service.listForStudent(req.user?.user_id);
    return successResponse(res, 'Student announcements fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in listStudentAnnouncements:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch announcements');
  }
};

export const markSeen = async (req, res) => {
  try {
    await service.markSeen(req.user?.user_id, req.params.id);
    return successResponse(res, 'Marked seen');
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in markSeen:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to mark seen');
  }
};

export const markRead = async (req, res) => {
  try {
    await service.markRead(req.user?.user_id, req.params.id);
    return successResponse(res, 'Marked read');
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in markRead:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to mark read');
  }
};
