import { api } from '../core/apiMethods';

export const trainingService = {
  getCategories() {
    return api.get('/training/categories');
  },

  getSkills({ type, categoryId, search, limit = 8, offset = 0 } = {}) {
    return api.get('/training/skills', {
      params: { type, categoryId, search, limit, offset },
    });
  },

  getSkillDetails(trainingSkillId) {
    return api.get(`/training/skills/${trainingSkillId}/details`);
  },

  getSkillSlots(trainingSkillId) {
    return api.get(`/training/skills/${trainingSkillId}/slots`);
  },

  getBookings() {
    return api.get('/training/bookings');
  },

  bookSlot({ trainingSkillId, slotId }) {
    return api.post('/training/bookings', { trainingSkillId, slotId });
  },
};
