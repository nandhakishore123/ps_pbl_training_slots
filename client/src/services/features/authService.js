import { api } from '../core/apiMethods';
import { clearSession, clearSessionExpiryFlags, saveAccessToken } from '../core/session';

export const authService = {
  async googleLogin(credential) {
    const payload = await api.post('/auth/google-login', { credential });

    // Expected shape: { success, message, data: { accessToken, user, ... } }
    const accessToken = payload?.data?.accessToken;
    if (accessToken) saveAccessToken(accessToken);

    return payload;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      // Deliberate sign-out: drop the expiry markers first so the login page
      // does NOT show "your session expired". This is the path every Logout
      // button in the app goes through.
      clearSessionExpiryFlags();
      clearSession();
    }
  },
};
