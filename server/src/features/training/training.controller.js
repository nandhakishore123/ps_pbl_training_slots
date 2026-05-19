import * as trainingServices from './training.services.js';
import { successResponse, createdResponse, errorResponse, internalServerErrorResponse } from '../../utils/response.js';

const getAssetBaseUrl = (req) => {
  const envBase = (process.env.ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || '').trim();
  const base = envBase || req.get('host');
  return base.replace(/^https?:\/\//i, '').replace(/\/$/, '');
};

const resolveSkillImageUrl = (req, imageUrl, skillType) => {
  if (!imageUrl) return imageUrl;
  const raw = String(imageUrl).trim();
  if (!raw) return imageUrl;
  if (/^https?:\/\//i.test(raw)) return raw;

  const base = getAssetBaseUrl(req);
  if (raw.startsWith('/')) return `${base}${raw}`;
  if (raw.startsWith('courses/')) return `${base}/${raw}`;
  if (raw.startsWith('ps_courses/')) return `${base}/courses/${raw}`;
  if (raw.startsWith('pbl_courses/')) return `${base}/courses/${raw}`;

  const folder = String(skillType || '').toUpperCase() === 'PBL' ? 'pbl_courses' : 'ps_courses';
  return `${base}/courses/${folder}/${raw}`;
};

export const getCategories = async (req, res) => {
  try {
    const data = await trainingServices.getCategories();
    return successResponse(res, 'Training categories fetched', data);
  } catch (error) {
    console.error('Error in getCategories:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch training categories');
  }
};

export const getSkills = async (req, res) => {
  try {
    const { type, categoryId, search, limit, offset } = req.query;
    const data = await trainingServices.getSkills({ type, categoryId, search, limit, offset });
    const rows = Array.isArray(data) ? data : [];
    const mapped = rows.map((row) => ({
      ...row,
      image_url: resolveSkillImageUrl(req, row.image_url, row.skill_type),
    }));
    return successResponse(res, 'Training skills fetched', mapped);
  } catch (error) {
    console.error('Error in getSkills:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch training skills');
  }
};

export const getSkillDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await trainingServices.getSkillDetails(id);
    const mapped = data
      ? {
          ...data,
          image_url: resolveSkillImageUrl(req, data.image_url, data.skill_type),
        }
      : data;
    return successResponse(res, 'Training skill details fetched', mapped);
  } catch (error) {
    console.error('Error in getSkillDetails:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch training skill details');
  }
};

export const getSkillSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await trainingServices.getSkillSlots(id);
    return successResponse(res, 'Training slots fetched', data);
  } catch (error) {
    console.error('Error in getSkillSlots:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch training slots');
  }
};

export const createBooking = async (req, res) => {
  try {
    const { slotId, trainingSkillId } = req.body || {};
    const data = await trainingServices.createBooking({
      user: req.user,
      slotId,
      trainingSkillId,
    });
    return createdResponse(res, 'Training slot booked', data);
  } catch (error) {
    console.error('Error in createBooking:', error);
    if (error?.status) {
      return errorResponse(res, error.message || 'Failed to book slot', error.status);
    }
    return internalServerErrorResponse(res, error.message || 'Failed to book slot');
  }
};

export const getStudentBookings = async (req, res) => {
  try {
    const data = await trainingServices.getStudentBookings({ user: req.user });
    return successResponse(res, 'Student bookings fetched', data);
  } catch (error) {
    console.error('Error in getStudentBookings:', error);
    if (error?.status) {
      return errorResponse(res, error.message || 'Failed to fetch bookings', error.status);
    }
    return internalServerErrorResponse(res, error.message || 'Failed to fetch bookings');
  }
};
