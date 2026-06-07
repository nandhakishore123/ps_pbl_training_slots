import axios from 'axios';
import { getAccessToken, refreshAccessToken } from './session';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
    withCredentials: true,
    timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 with automatic refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If axios didn't generate a config, just pass through
        if (!originalRequest) return Promise.reject(error);

        // If 401 and not already retrying, attempt refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Use shared refresh function (prevents race conditions)
                const accessToken = await refreshAccessToken();

                if (accessToken) {
                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed → session already cleared by refreshAccessToken.
                // Let React Router guards handle redirect (avoids URL flip-flopping).
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
