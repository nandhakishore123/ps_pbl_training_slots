import { api } from '../core/apiMethods';

export const superAdminService = {
  // ── Phase 0: foundation ping ────────────────────────────────────────────────
  ping() {
    return api.get('/superadmin/ping');
  },
};
