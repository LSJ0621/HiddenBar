import axios, { type InternalAxiosRequestConfig } from 'axios';
import { clearIsLoggedIn } from '@/lib/token';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface QueueItem {
  resolve: () => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else {
      item.resolve();
    }
  });
  failedQueue = [];
};

/** Axios instance configured for the backend API */
const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
  withCredentials: true,
  timeout: 15000,
});

// Handle 401 → refresh token → retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = originalRequest.url ?? '';
    const skipRefresh = [
      API_ENDPOINTS.AUTH.LOGIN,
      API_ENDPOINTS.AUTH.SIGNUP,
      API_ENDPOINTS.AUTH.GOOGLE,
    ].some((path) => url.endsWith(path));

    if (error.response?.status !== 401 || originalRequest._retry || skipRefresh) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1${API_ENDPOINTS.AUTH.REFRESH}`,
        {},
        { withCredentials: true },
      );

      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);

      // 서버에 로그아웃 요청하여 HttpOnly 쿠키 제거
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1${API_ENDPOINTS.AUTH.LOGOUT}`,
          {},
          { withCredentials: true },
        );
      } catch {
        // 로그아웃 실패해도 리다이렉트는 진행
      }

      clearIsLoggedIn();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
