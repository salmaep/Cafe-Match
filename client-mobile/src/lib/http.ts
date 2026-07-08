import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT_MS, MAX_BODY_LENGTH } from '../constant/env';

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
  maxBodyLength: MAX_BODY_LENGTH,
  maxContentLength: MAX_BODY_LENGTH,
});

http.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

declare const __DEV__: boolean;

const MAX_LOG_LEN = 800;

function trunc(value: unknown): string {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (!str) return '';
    return str.length > MAX_LOG_LEN ? `${str.slice(0, MAX_LOG_LEN)}…(+${str.length - MAX_LOG_LEN})` : str;
  } catch {
    return String(value);
  }
}

type TimedConfig = InternalAxiosRequestConfig & { metadata?: { startedAt: number } };

if (__DEV__) {
  http.interceptors.request.use((config) => {
    const c = config as TimedConfig;
    c.metadata = { startedAt: Date.now() };
    const method = (c.method ?? 'get').toUpperCase();
    const url = `${c.baseURL ?? ''}${c.url ?? ''}`;
    const params = c.params ? ` params=${trunc(c.params)}` : '';
    const body = c.data ? ` body=${trunc(c.data)}` : '';
    console.log(`→ ${method} ${url}${params}${body}`);
    return c;
  });

  http.interceptors.response.use(
    (res: AxiosResponse) => {
      const c = res.config as TimedConfig;
      const ms = c.metadata ? Date.now() - c.metadata.startedAt : 0;
      const method = (c.method ?? 'get').toUpperCase();
      const url = `${c.baseURL ?? ''}${c.url ?? ''}`;
      console.log(`← ${method} ${url} ${res.status} ${ms}ms body=${trunc(res.data)}`);
      return res;
    },
    (err: AxiosError) => {
      const c = (err.config ?? {}) as TimedConfig;
      const ms = c.metadata ? Date.now() - c.metadata.startedAt : 0;
      const method = (c.method ?? 'get').toUpperCase();
      const url = `${c.baseURL ?? ''}${c.url ?? ''}`;
      const status = err.response?.status ?? 'ERR';
      const body = err.response?.data ? ` body=${trunc(err.response.data)}` : '';
      console.log(`✕ ${method} ${url} ${status} ${ms}ms ${err.message}${body}`);
      return Promise.reject(err);
    },
  );
}

export default http;
