import * as model from './feedback.model.js';
// Reuse the canonical user_id → student_id resolver (single source of truth).
import { getStudentIdByUserId } from '../training/training.model.js';

const MAX_LEN = 2000;

const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const notFound = (message) => {
  const err = new Error(message);
  err.status = 404;
  return err;
};

// ── Student ──────────────────────────────────────────────────
export const submitFeedback = async (userId, message) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');

  const clean = String(message ?? '').trim();
  if (!clean) throw badRequest('Feedback message is required');
  if (clean.length > MAX_LEN) throw badRequest(`Feedback must be ${MAX_LEN} characters or fewer`);

  const id = await model.insertFeedback({ studentId, message: clean });
  return model.getFeedbackById(id);
};

export const listMine = async (userId) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');
  return model.listFeedbackByStudent(studentId);
};

// ── Admin ────────────────────────────────────────────────────
export const listAll = () => model.listAllFeedback();

export const setVerified = async (id, isVerified) => {
  const existing = await model.getFeedbackById(id);
  if (!existing) throw notFound('Feedback not found');
  await model.setVerified(id, isVerified);
  return model.getFeedbackById(id);
};
