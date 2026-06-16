import { successResponse, internalServerErrorResponse } from '../../utils/response.js';

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
