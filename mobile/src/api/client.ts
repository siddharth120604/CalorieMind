import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = __DEV__
  ? 'https://b645-182-77-74-58.ngrok-free.app/api/v1'
  : 'https://caloriemind.duckdns.org/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
};

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, null, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
        const { access_token } = res.data;
        await AsyncStorage.setItem('access_token', access_token);
        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
