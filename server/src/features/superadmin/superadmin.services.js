import * as superAdminModel from './superadmin.model.js';
import * as authModel from '../auth/auth.model.js';
import * as adminModel from '../admin/admin.model.js';

const normalizeStr = (v) => (v == null ? '' : String(v).trim());

// ── Faculty list ──────────────────────────────────────────────────────────────
export const listFaculty = async () => {
  return superAdminModel.listFacultyWithVenues();
};

// ── Create faculty (users role 2 + faculties) ─────────────────────────────────
export const createFaculty = async ({ name, email, designation, department }) => {
  const cleanName = normalizeStr(name);
  const cleanEmail = normalizeStr(email).toLowerCase();

  if (!cleanName) {
    const err = new Error('Faculty name is required');
    err.status = 400;
    throw err;
  }
  if (!cleanEmail) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }

  // Email is the Google login key + UNIQUE — reject duplicates with a clear 409.
  const existing = await authModel.getUserByEmail(cleanEmail);
  if (existing) {
    const err = new Error('A user with this email already exists.');
    err.status = 409;
    throw err;
  }

  try {
    return await superAdminModel.createFacultyTx({
      name: cleanName,
      email: cleanEmail,
      designation: normalizeStr(designation) || null,
      department: normalizeStr(department) || null,
      regNum: null, // not collected in Phase 1; UNIQUE column stays NULL
    });
  } catch (error) {
    // Safety net for a race on the UNIQUE email between the pre-check and insert.
    if (error?.code === 'ER_DUP_ENTRY') {
      const err = new Error('A user with this email already exists.');
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

// ── Edit faculty (name/designation/department only) ───────────────────────────
export const updateFaculty = async (facultyId, { name, designation, department }) => {
  const faculty = await superAdminModel.getFacultyById(facultyId);
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.status = 404;
    throw err;
  }
  const cleanName = normalizeStr(name);
  if (!cleanName) {
    const err = new Error('Faculty name is required');
    err.status = 400;
    throw err;
  }
  await superAdminModel.updateFacultyProfile(facultyId, {
    name: cleanName,
    designation: normalizeStr(designation) || null,
    department: normalizeStr(department) || null,
  });
  return { faculty_id: Number(facultyId) };
};

// ── Revoke (soft) — block if the faculty still owns labs ──────────────────────
export const revokeFaculty = async (facultyId) => {
  const faculty = await superAdminModel.getFacultyById(facultyId);
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.status = 404;
    throw err;
  }

  const labCount = await superAdminModel.countVenueMappingsByFaculty(facultyId);
  if (labCount > 0) {
    const err = new Error(
      `This faculty still has ${labCount} assigned lab${labCount === 1 ? '' : 's'}. Reassign or transfer their labs before revoking.`
    );
    err.status = 409;
    throw err;
  }

  await superAdminModel.setUserActive(faculty.user_id, 0);
  // Force-logout: clearing the refresh hash stops token refresh immediately.
  await authModel.clearRefreshTokenHash(faculty.user_id);
  return { faculty_id: Number(facultyId), is_active: 0 };
};

export const reactivateFaculty = async (facultyId) => {
  const faculty = await superAdminModel.getFacultyById(facultyId);
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.status = 404;
    throw err;
  }
  await superAdminModel.setUserActive(faculty.user_id, 1);
  return { faculty_id: Number(facultyId), is_active: 1 };
};

// ── Assign faculty to a lab (venue_mapping + venue_alloted_skills) ─────────────
export const assignFacultyToLab = async ({ facultyId, venueId, slotId, trainingSkillId }) => {
  if (!facultyId || !venueId || !slotId || !trainingSkillId) {
    const err = new Error('facultyId, venueId, slotId and trainingSkillId are all required');
    err.status = 400;
    throw err;
  }
  const faculty = await superAdminModel.getFacultyById(facultyId);
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.status = 404;
    throw err;
  }
  return superAdminModel.assignFacultyToLabTx({ facultyId, venueId, slotId, trainingSkillId });
};

// ── Reassign / transfer (reuse existing admin logic) ──────────────────────────
export const reassignIndividual = async ({ mappingId, toFacultyId, reason }) => {
  if (!mappingId || !toFacultyId || !normalizeStr(reason)) {
    const err = new Error('mappingId, toFacultyId and reason are required');
    err.status = 400;
    throw err;
  }
  await adminModel.transferIndividualVenue(mappingId, toFacultyId, reason);
  return { success: true };
};

export const reassignAll = async ({ fromFacultyId, toFacultyId, reason }) => {
  if (!fromFacultyId || !toFacultyId || !normalizeStr(reason)) {
    const err = new Error('fromFacultyId, toFacultyId and reason are required');
    err.status = 400;
    throw err;
  }
  await adminModel.transferAllVenues(fromFacultyId, toFacultyId, reason);
  return { success: true };
};

// ── Lookups for the Assign modal (reuse admin read queries) ───────────────────
export const getVenues = async () => adminModel.listVenues();
export const getSlotTimings = async () => adminModel.listSlotTimings();
export const getTrainingSkills = async () => adminModel.listTrainingSkills();
