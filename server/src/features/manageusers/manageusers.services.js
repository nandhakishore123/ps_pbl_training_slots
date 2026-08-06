// manageusers.services.js — USER MANAGEMENT (non-student roles) — REMOVABLE FEATURE
// All validation lives here; typed errors carry err.status like the inventory
// services, which the controller maps to a response.
import * as model from './manageusers.model.js';

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

const STUDENT_ROLE_ID = 1;

// Deliberately permissive — matches the loose validation used elsewhere in the
// project, while still rejecting obvious non-addresses.
const normEmail = (value) => String(value ?? '').trim().toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Shared role guard: students are managed by the existing admin endpoints, so
// role 1 is rejected on both create and switch.
const assertManagedRole = (roleId) => {
  const id = Number(roleId);
  if (!Number.isInteger(id)) throw badRequest('role_id is required');
  if (id === STUDENT_ROLE_ID) {
    throw badRequest('Students are managed from Student Management, not here.');
  }
  if (!model.MANAGED_ROLE_IDS.includes(id)) {
    throw badRequest(`role_id must be one of ${model.MANAGED_ROLE_IDS.join(', ')}`);
  }
  return id;
};

// Guards an admin against locking themselves out of their own console.
const assertNotSelf = (targetUserId, actingUserId, message) => {
  if (Number(targetUserId) === Number(actingUserId)) throw badRequest(message);
};

export const createManagedUser = async ({ email, name, role_id }) => {
  const cleanEmail = normEmail(email);
  const cleanName = String(name ?? '').trim();
  if (!cleanEmail) throw badRequest('Email is required');
  if (!isEmail(cleanEmail)) throw badRequest('Enter a valid email address');
  if (!cleanName) throw badRequest('Name is required');
  if (cleanName.length > 150) throw badRequest('Name must be 150 characters or fewer');
  const roleId = assertManagedRole(role_id);

  return model.createUserWithProfile({ email: cleanEmail, name: cleanName, role_id: roleId });
};

export const listManagedUsers = async () => model.listManagedUsers();

export const switchUserRole = async (actingUserId, targetUserId, roleId) => {
  const id = Number(targetUserId);
  if (!id) throw badRequest('Invalid user id');
  assertNotSelf(id, actingUserId, 'You cannot change your own role.');
  const newRole = assertManagedRole(roleId);

  const user = await model.getManagedUserById(id);
  if (!user) throw notFound('User not found');
  // A student record would also need its students row maintained — out of scope.
  if (Number(user.role_id) === STUDENT_ROLE_ID) {
    throw badRequest('Students are managed from Student Management, not here.');
  }

  await model.updateUserRole(id, newRole);
  return model.getManagedUserById(id);
};

export const setManagedUserActive = async (actingUserId, targetUserId, isActive) => {
  const id = Number(targetUserId);
  if (!id) throw badRequest('Invalid user id');
  const active = isActive ? 1 : 0;
  if (!active) assertNotSelf(id, actingUserId, 'You cannot deactivate yourself.');

  const user = await model.getManagedUserById(id);
  if (!user) throw notFound('User not found');
  if (Number(user.role_id) === STUDENT_ROLE_ID) {
    throw badRequest('Students are managed from Student Management, not here.');
  }

  await model.setUserActive(id, active);
  return model.getManagedUserById(id);
};

export const updateManagedUserName = async (targetUserId, name) => {
  const id = Number(targetUserId);
  if (!id) throw badRequest('Invalid user id');
  const cleanName = String(name ?? '').trim();
  if (!cleanName) throw badRequest('Name is required');
  if (cleanName.length > 150) throw badRequest('Name must be 150 characters or fewer');

  const user = await model.getManagedUserById(id);
  if (!user) throw notFound('User not found');
  if (Number(user.role_id) === STUDENT_ROLE_ID) {
    throw badRequest('Students are managed from Student Management, not here.');
  }

  await model.upsertUserName(id, cleanName);
  return model.getManagedUserById(id);
};

// ── ROLE-5 SUB-TYPE — REMOVABLE BLOCK (start) ────────────────────────────────
// Label-only: which kind of lab member a role-5 user is. It grants nothing and
// is read purely for display (consumption report). Roles 2/3/4 are rejected so
// this can never be mistaken for a faculty/admin attribute.
export const MEMBER_SUBTYPES = ['FACULTY', 'INTERN', 'TECHNICIAN'];
const LAB_MEMBER_ROLE_ID = 5;

export const setManagedUserSubtype = async (targetUserId, subtype) => {
  const id = Number(targetUserId);
  if (!id) throw badRequest('Invalid user id');

  const clean = String(subtype ?? '').trim().toUpperCase();
  if (!clean) throw badRequest('Sub-type is required');
  if (!MEMBER_SUBTYPES.includes(clean)) {
    throw badRequest(`Sub-type must be one of ${MEMBER_SUBTYPES.join(', ')}`);
  }

  const user = await model.getManagedUserById(id);
  if (!user) throw notFound('User not found');
  // Guards role-2 faculty, admins and incharges — sub-type is a role-5 concept.
  if (Number(user.role_id) !== LAB_MEMBER_ROLE_ID) {
    throw badRequest('Sub-type only applies to lab members');
  }

  await model.upsertUserSubtype(id, clean);
  return model.getManagedUserById(id);
};
// ── ROLE-5 SUB-TYPE — REMOVABLE BLOCK (end) ──────────────────────────────────
