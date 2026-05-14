import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '@/config/api.config';
import { ResponseObject } from "./response-object";

// Token management utilities
const TokenService = {
  getAccessToken: (): string | null => localStorage.getItem('token'),
  getRefreshToken: (): string | null => localStorage.getItem('refreshToken'),
  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },
  clearTokens: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
  getUser: <T>(): T | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as T;
    } catch {
      return null;
    }
  },
  setUser: <T>(user: T): void => {
    localStorage.setItem('user', JSON.stringify(user));
  },
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = TokenService.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Only re-wrap responses that *already* look like a server ResponseObject
// payload ({ statusCode, message, data, ... }). Some endpoints — notably the
// meeting-session controller — return raw TypeORM entities. Blindly running
// `ResponseObject.fromObject(rawEntity)` on those reads `rawEntity.data`
// (undefined) and overwrites `response.data` with an empty wrapper, dropping
// the actual payload on the floor. The signature we look for is "has either
// a numeric statusCode or a string message at the top level".
const looksWrapped = (body: unknown): boolean => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.statusCode === 'number' || typeof b.message === 'string';
};

apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      if (response.data && looksWrapped(response.data)) {
        response.data = ResponseObject.fromObject(response.data);
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return apiClient(originalRequest);
              })
              .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = TokenService.getRefreshToken();

        if (!refreshToken) {
          TokenService.clearTokens();
          window.location.href = '/auth/signin';
          return Promise.reject(error);
        }

        try {
          const response = await axios.post(
              `${API_CONFIG.BASE_URL}/auth/refresh-tokens`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${refreshToken}`,
                },
              }
          );

          const responseObject = ResponseObject.fromObject<{accessToken: string, refreshToken: string}>(response.data);
          const tokens = responseObject.data;

          if (tokens) {
            TokenService.setTokens(tokens.accessToken, tokens.refreshToken);
            processQueue(null, tokens.accessToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            }
            return apiClient(originalRequest);
          }

          throw new Error("Invalid refresh response");
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          TokenService.clearTokens();
          window.location.href = '/auth/signin';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      if (error.response?.data && looksWrapped(error.response.data)) {
        error.response.data = ResponseObject.fromObject(error.response.data);
      }

      return Promise.reject(error);
    }
);

export { apiClient, TokenService };
export default apiClient;