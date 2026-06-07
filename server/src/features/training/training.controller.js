import * as trainingServices from './training.services.js';
import { successResponse, createdResponse, errorResponse, internalServerErrorResponse } from '../../utils/response.js';

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
    const { type, categoryId, search, limit, offset, all } = req.query;
    const data = await trainingServices.getSkills({ type, categoryId, search, limit, offset, all });
    return successResponse(res, 'Training skills fetched', data);
  } catch (error) {
    console.error('Error in getSkills:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch training skills');
  }
};

export const getSkillDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await trainingServices.getSkillDetails(id);
    return successResponse(res, 'Training skill details fetched', data);
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
    const userId = req.user.user_id;
    const { slotId, mappingId, trainingSkillId, levelId } = req.body;

    const data = await trainingServices.createBooking({
      userId,
      slotId,
      mappingId,
      trainingSkillId,
      levelId: levelId || null,
    });

    res.status(201).json({ success: true, data });
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
    const data = await trainingServices.getStudentBookings({ userId: req.user?.user_id });
    return successResponse(res, 'Student bookings fetched', data);
  } catch (error) {
    console.error('Error in getStudentBookings:', error);
    if (error?.status) {
      return errorResponse(res, error.message || 'Failed to fetch bookings', error.status);
    }
    return internalServerErrorResponse(res, error.message || 'Failed to fetch bookings');
  }
};

// ── Assessment controllers ────────────────────────────────────────────────────

export const getAssessment = async (req, res) => {
  try {
    const { skillId, levelId } = req.params;
    const data = await trainingServices.getAssessment(skillId, levelId, req.user?.user_id);
    return successResponse(res, 'Assessment fetched', data);
  } catch (error) {
    console.error('Error in getAssessment:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch assessment');
  }
};

export const getAssessmentQuestions = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    // Fetch type configs first, then get random questions per type
    const assessment = await trainingServices.getAssessment(null, null, Number(assessmentId));
    const questions = await trainingServices.fetchQuestionsForAssessment(
      Number(assessmentId),
      assessment.typeConfigs
    );
    return successResponse(res, 'Questions fetched', questions);
  } catch (error) {
    console.error('Error in getAssessmentQuestions:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch questions');
  }
};

export const startAssessment = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { assessmentId, totalMarks } = req.body;
    const data = await trainingServices.startAssessment({ userId, assessmentId, totalMarks });
    return createdResponse(res, 'Assessment started', data);
  } catch (error) {
    console.error('Error in startAssessment:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to start assessment');
  }
};

export const submitAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, passingMarks } = req.body;
    const data = await trainingServices.submitAssessment({
      studentAssessmentId: id,
      answers,
      passingMarks,
    });
    return successResponse(res, 'Assessment submitted', data);
  } catch (error) {
    console.error('Error in submitAssessment:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to submit assessment');
  }
};

export const reportMalpractice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { studentAssessmentId } = req.body;
    const data = await trainingServices.reportMalpractice({ bookingId, studentAssessmentId });
    return successResponse(res, 'Malpractice reported', data);
  } catch (error) {
    console.error('Error in reportMalpractice:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to report malpractice');
  }
};

// ── Lab Record controllers ────────────────────────────────────────────────────

export const getLabRecordQuestions = async (req, res) => {
  try {
    const data = await trainingServices.getLabRecordQuestions();
    return successResponse(res, 'Lab record questions fetched', data);
  } catch (error) {
    console.error('Error in getLabRecordQuestions:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch lab record questions');
  }
};

export const saveLabRecord = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { responses } = req.body;
    const userId = req.user.user_id;
    const data = await trainingServices.saveLabRecord({
      userId,
      bookingId: Number(bookingId),
      responses,
    });
    return successResponse(res, 'Lab record submitted successfully', data);
  } catch (error) {
    console.error('Error in saveLabRecord:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to submit lab record');
  }
};

export const getLabRecordByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const data = await trainingServices.getLabRecordByBooking(Number(bookingId));
    return successResponse(res, 'Lab record fetched', data);
  } catch (error) {
    console.error('Error in getLabRecordByBooking:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch lab record');
  }
};

