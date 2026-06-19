import {
  successResponse,
  createdResponse,
  errorResponse,
  internalServerErrorResponse,
} from '../../utils/response.js';
import * as service from './feedback.services.js';

// ── Student (role 1) ─────────────────────────────────────────
export const submitFeedback = async (req, res) => {
  try {
    const { message } = req.body;
    const data = await service.submitFeedback(req.user?.user_id, message);
    return createdResponse(res, 'Feedback submitted', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in submitFeedback:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to submit feedback');
  }
};

export const listMyFeedback = async (req, res) => {
  try {
    const data = await service.listMine(req.user?.user_id);
    return successResponse(res, 'Feedback fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in listMyFeedback:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch feedback');
  }
};

// ── Admin (role 3) ───────────────────────────────────────────
export const listAllFeedback = async (req, res) => {
  try {
    const data = await service.listAll();
    return successResponse(res, 'Feedback fetched', { items: data });
  } catch (error) {
    console.error('Error in listAllFeedback:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch feedback');
  }
};

export const toggleVerified = async (req, res) => {
  try {
    const { isVerified } = req.body;
    const data = await service.setVerified(req.params.id, Boolean(isVerified));
    return successResponse(res, 'Feedback updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in toggleVerified:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update feedback');
  }
};
