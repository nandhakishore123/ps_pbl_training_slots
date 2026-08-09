import { useAuthStore } from '../../store/authStore';
import axios from 'axios';

// Shared promise to prevent multiple simultaneous refresh calls
let refreshPromise = null;

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Single shared refresh request. IMPORTANT: Always resolves to `accessToken | null`.
// This prevents a race where one caller expects a boolean while another expects a token.
const getRefreshPromise = () => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = axios
        .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
        .then((response) => response?.data?.data?.accessToken ?? null)
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

// ── SESSION EXPIRY NOTICE ────────────────────────────────────
// Two one-shot flags let the login page tell "your session ran out" apart from
// "you have never signed in" and from "you clicked Logout" — all three end up
// at the same route, so the redirect alone cannot distinguish them.
//
//   HAD_SESSION_KEY  (localStorage)   — survives browser close, like the refresh
//                                       cookie it shadows. Set once a session is
//                                       actually established; cleared on logout.
//   EXPIRED_KEY      (sessionStorage) — set only when a refresh fails while
//                                       HAD_SESSION_KEY was present. Read and
//                                       cleared once by the login page.
//
// Without HAD_SESSION_KEY a first-time visitor would see "session expired",
// because the silent refresh on app load fails for them too.
const HAD_SESSION_KEY = 'pt_had_session';
const EXPIRED_KEY = 'pt_session_expired';

const safeStore = (store, fn) => { try { return fn(store); } catch { return null; } };

const markHadSession = () => safeStore(localStorage, (s) => s.setItem(HAD_SESSION_KEY, '1'));

// Called when a refresh fails. Only raises the notice if there was a session to
// lose, and consumes HAD_SESSION_KEY so a second failure cannot re-raise it.
const markSessionExpired = () => {
    const had = safeStore(localStorage, (s) => s.getItem(HAD_SESSION_KEY));
    if (!had) return;
    safeStore(localStorage, (s) => s.removeItem(HAD_SESSION_KEY));
    safeStore(sessionStorage, (s) => s.setItem(EXPIRED_KEY, '1'));
};

// Deliberate sign-out: no notice, and the marker goes so the next visit is clean.
export const clearSessionExpiryFlags = () => {
    safeStore(localStorage, (s) => s.removeItem(HAD_SESSION_KEY));
    safeStore(sessionStorage, (s) => s.removeItem(EXPIRED_KEY));
};

// Read-and-clear, so the notice shows once rather than on every login visit.
export const consumeSessionExpired = () => {
    const flag = safeStore(sessionStorage, (s) => s.getItem(EXPIRED_KEY));
    if (flag) safeStore(sessionStorage, (s) => s.removeItem(EXPIRED_KEY));
    return flag === '1';
};

// Decode JWT token (simple base64 decode)
export const decodeToken = (token) => {
    try {
        const payload = token.split('.')[1];
        // JWT uses base64url encoding (not plain base64)
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
        const decodedPayload = atob(padded);
        return JSON.parse(decodedPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

export const saveAccessToken = (token) => {
    const decoded = decodeToken(token);
    useAuthStore.getState().setAccessToken(token);
    if (decoded) {
        useAuthStore.getState().setUser(decoded);
    }
    // A session now exists — remember that, so a later refresh failure can be
    // reported as an expiry rather than mistaken for a first-time visit.
    markHadSession();
};

export const getAccessToken = () => {
    return useAuthStore.getState().accessToken;
};

export const getUser = () => {
    return useAuthStore.getState().user;
};

export const clearSession = () => {
    useAuthStore.getState().logout();
};

// Logout: clears refresh cookie on server + clears local auth state
export const logoutSession = async () => {
    try {
        await axios.post(
            `${API_BASE_URL}/auth/logout`,
            {},
            { withCredentials: true }
        );
    } catch (error) {
        // Even if server logout fails, clear local session to force re-auth
        console.error('Logout failed:', error);
    } finally {
        // Deliberate sign-out — drop the markers BEFORE clearing, so the login
        // page shows no "session expired" notice.
        clearSessionExpiryFlags();
        clearSession();
    }
};

// Silent refresh: called on app load to restore session from HttpOnly refresh token
export const silentRefresh = async () => {
    try {
        const accessToken = await getRefreshPromise();
        if (accessToken) {
            saveAccessToken(accessToken);
            return true;
        }
        markSessionExpired();
        clearSession();
        return false;
    } catch (error) {
        console.error('Silent refresh failed:', error);
        markSessionExpired();
        clearSession();
        return false;
    }
};

// Refresh access token using refresh token cookie (used by apiClient interceptor)
export const refreshAccessToken = async () => {
    try {
        const accessToken = await getRefreshPromise();
        if (accessToken) {
            saveAccessToken(accessToken);
            return accessToken;
        }
        markSessionExpired();
        clearSession();
        throw new Error('No access token received');
    } catch (error) {
        console.error('Token refresh failed:', error);
        markSessionExpired();
        clearSession();
        throw error;
    }
};
