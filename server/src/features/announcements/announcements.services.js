import * as model from './announcements.model.js';
// Reuse the canonical user_id → student_id resolver (single source of truth).
import { getStudentIdByUserId } from '../training/training.model.js';

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

// Normalize an incoming target value: '' / 'ALL' / null → null (no filter).
const normalizeCourse = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.toUpperCase() === 'ALL') return null;
  return s;
};

const normalizeYear = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.toUpperCase() === 'ALL') return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
};

// ── Admin ────────────────────────────────────────────────────
export const createAnnouncement = async ({ title, body, targetCourse, targetYear, createdBy }) => {
  const cleanTitle = String(title ?? '').trim();
  const cleanBody = String(body ?? '').trim();
  if (!cleanTitle) throw badRequest('Title is required');
  if (!cleanBody) throw badRequest('Message body is required');
  if (!createdBy) throw badRequest('Missing creator');

  const id = await model.insertAnnouncement({
    title: cleanTitle,
    body: cleanBody,
    targetCourse: normalizeCourse(targetCourse),
    targetYear: normalizeYear(targetYear),
    createdBy,
  });
  return model.getAnnouncementById(id);
};

export const listAllAnnouncements = () => model.listAllAnnouncements();

export const setActive = async (id, isActive) => {
  const existing = await model.getAnnouncementById(id);
  if (!existing) throw notFound('Announcement not found');
  await model.setAnnouncementActive(id, isActive);
  return model.getAnnouncementById(id);
};

// Soft-delete: set is_active = 0 so it disappears from students instantly.
export const softDelete = async (id) => {
  const existing = await model.getAnnouncementById(id);
  if (!existing) throw notFound('Announcement not found');
  await model.setAnnouncementActive(id, false);
  return true;
};

// ── Student ──────────────────────────────────────────────────
export const listForStudent = async (userId) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');
  const info = await model.getStudentCourseYear(studentId);
  return model.listAnnouncementsForStudent({
    studentId,
    course: info?.course ?? null,
    year: info?.year_of_study ?? null,
  });
};

export const markSeen = async (userId, announcementId) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');
  await model.upsertSeen(announcementId, studentId);
  return true;
};

export const markRead = async (userId, announcementId) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');
  await model.upsertRead(announcementId, studentId);
  return true;
};
