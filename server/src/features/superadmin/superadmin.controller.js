import * as superAdminServices from './superadmin.services.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  internalServerErrorResponse,
} from '../../utils/response.js';

// ── Phase 0: foundation ping ──────────────────────────────────────────────────
// Minimal endpoint so the Super Admin frontend has something to call and can
// verify the role_id = 4 plumbing end-to-end. No DB access.
export const ping = async (req, res) => {
  try {
    return successResponse(res, 'Super Admin online', {
      role: 'SUPER_ADMIN',
      message: 'Welcome',
      ts: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in superadmin ping:', error);
    return internalServerErrorResponse(res, error.message || 'Super Admin ping failed');
  }
};

// ── Faculty management ────────────────────────────────────────────────────────
export const listFaculty = async (req, res) => {
  try {
    const data = await superAdminServices.listFaculty();
    return successResponse(res, 'Faculty fetched', data);
  } catch (error) {
    console.error('Error in superadmin listFaculty:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch faculty');
  }
};

export const createFaculty = async (req, res) => {
  try {
    const { name, email, designation, department } = req.body;
    const data = await superAdminServices.createFaculty({ name, email, designation, department });
    return createdResponse(res, 'Faculty created', data);
  } catch (error) {
    console.error('Error in superadmin createFaculty:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to create faculty');
  }
};

export const updateFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { name, designation, department } = req.body;
    const data = await superAdminServices.updateFaculty(facultyId, { name, designation, department });
    return successResponse(res, 'Faculty updated', data);
  } catch (error) {
    console.error('Error in superadmin updateFaculty:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to update faculty');
  }
};

export const revokeFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const data = await superAdminServices.revokeFaculty(facultyId);
    return successResponse(res, 'Faculty revoked', data);
  } catch (error) {
    console.error('Error in superadmin revokeFaculty:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to revoke faculty');
  }
};

export const reactivateFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const data = await superAdminServices.reactivateFaculty(facultyId);
    return successResponse(res, 'Faculty reactivated', data);
  } catch (error) {
    console.error('Error in superadmin reactivateFaculty:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to reactivate faculty');
  }
};

export const assignFacultyToLab = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { venueId, slotId, trainingSkillId } = req.body;
    const data = await superAdminServices.assignFacultyToLab({ facultyId, venueId, slotId, trainingSkillId });
    return createdResponse(res, 'Faculty assigned to lab', data);
  } catch (error) {
    console.error('Error in superadmin assignFacultyToLab:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to assign faculty to lab');
  }
};

export const reassignIndividual = async (req, res) => {
  try {
    const { mappingId, toFacultyId, reason } = req.body;
    const data = await superAdminServices.reassignIndividual({ mappingId, toFacultyId, reason });
    return successResponse(res, 'Venue reassigned', data);
  } catch (error) {
    console.error('Error in superadmin reassignIndividual:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to reassign venue');
  }
};

export const reassignAll = async (req, res) => {
  try {
    const { fromFacultyId, toFacultyId, reason } = req.body;
    const data = await superAdminServices.reassignAll({ fromFacultyId, toFacultyId, reason });
    return successResponse(res, 'All venues reassigned', data);
  } catch (error) {
    console.error('Error in superadmin reassignAll:', error);
    if (error?.status) return errorResponse(res, error.message, error.status);
    return internalServerErrorResponse(res, error.message || 'Failed to reassign venues');
  }
};

// ── Lookups for the Assign modal ──────────────────────────────────────────────
export const getVenues = async (req, res) => {
  try {
    const data = await superAdminServices.getVenues();
    return successResponse(res, 'Venues fetched', data);
  } catch (error) {
    console.error('Error in superadmin getVenues:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch venues');
  }
};

export const getSlotTimings = async (req, res) => {
  try {
    const data = await superAdminServices.getSlotTimings();
    return successResponse(res, 'Slot timings fetched', data);
  } catch (error) {
    console.error('Error in superadmin getSlotTimings:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch slot timings');
  }
};

export const getTrainingSkills = async (req, res) => {
  try {
    const data = await superAdminServices.getTrainingSkills();
    return successResponse(res, 'Training skills fetched', data);
  } catch (error) {
    console.error('Error in superadmin getTrainingSkills:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch training skills');
  }
};
