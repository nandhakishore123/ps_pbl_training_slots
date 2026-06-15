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
        clearSession();
        return false;
    } catch (error) {
        console.error('Silent refresh failed:', error);
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
        clearSession();
        throw new Error('No access token received');
    } catch (error) {
        console.error('Token refresh failed:', error);
        clearSession();
        throw error;
    }
};
