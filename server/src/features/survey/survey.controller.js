import {
  successResponse,
  createdResponse,
  errorResponse,
  internalServerErrorResponse,
} from '../../utils/response.js';
import * as service from './survey.services.js';

// ── Admin (role 3) ───────────────────────────────────────────
export const createSurvey = async (req, res) => {
  try {
    const { title, description, target_course, target_year, questions } = req.body;
    const data = await service.createSurvey({
      title,
      description: description ?? null,
      targetCourse: target_course ?? null,
      targetYear: target_year ?? null,
      createdBy: req.user?.user_id,
      questions,
    });
    return createdResponse(res, 'Survey created', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in createSurvey:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to create survey');
  }
};

export const listSurveys = async (req, res) => {
  try {
    const data = await service.listSurveys();
    return successResponse(res, 'Surveys fetched', { items: data });
  } catch (error) {
    console.error('Error in listSurveys:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch surveys');
  }
};

export const getSurveyDetail = async (req, res) => {
  try {
    const data = await service.getSurveyDetail(req.params.id);
    return successResponse(res, 'Survey fetched', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getSurveyDetail:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch survey');
  }
};

export const getSurveyResponses = async (req, res) => {
  try {
    const data = await service.getSurveyResponses(req.params.id);
    return successResponse(res, 'Survey responses fetched', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getSurveyResponses:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch survey responses');
  }
};

export const exportSurveyResponses = async (req, res) => {
  try {
    const { id } = req.params;
    const csv = await service.getSurveyResponsesCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${id}-responses.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in exportSurveyResponses:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to export survey responses');
  }
};

export const setSurveyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const data = await service.setStatus(req.params.id, status);
    return successResponse(res, 'Survey updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in setSurveyStatus:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update survey');
  }
};

export const deleteSurvey = async (req, res) => {
  try {
    await service.deleteSurvey(req.params.id);
    return successResponse(res, 'Survey deleted');
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in deleteSurvey:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to delete survey');
  }
};

// ── Student (role 1) ─────────────────────────────────────────
export const getStudentSurveys = async (req, res) => {
  try {
    const data = await service.listForStudent(req.user?.user_id);
    return successResponse(res, 'Surveys fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getStudentSurveys:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch surveys');
  }
};

export const getStudentSurveyDetail = async (req, res) => {
  try {
    const data = await service.getDetailForStudent(req.user?.user_id, req.params.id);
    return successResponse(res, 'Survey fetched', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getStudentSurveyDetail:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch survey');
  }
};

export const submitStudentSurvey = async (req, res) => {
  try {
    const { answers } = req.body;
    await service.submitForStudent(req.user?.user_id, req.params.id, answers);
    return createdResponse(res, 'Survey submitted');
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in submitStudentSurvey:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to submit survey');
  }
};
