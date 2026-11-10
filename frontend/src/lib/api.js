import axios from 'axios';
import { useAuth } from '../store/auth';
import { compressImages } from './image';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/** Shared axios instance. The access token lives in memory; the refresh token in an httpOnly cookie. */
export const api = axios.create({ baseURL: API_BASE, withCredentials: true, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

/** Exchange the refresh cookie for a new access token (deduplicated across parallel 401s). */
export function refreshSession() {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        useAuth.getState().setSession(data.accessToken, data.user);
        return data.accessToken;
      })
      .catch((err) => {
        useAuth.getState().clear();
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/');
    if (status === 401 && !original._retry && !isAuthCall && useAuth.getState().accessToken) {
      original._retry = true;
      try {
        const token = await refreshSession();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        /* fall through */
      }
    }
    return Promise.reject(error);
  },
);

/** Human-friendly error message from an axios error. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.error?.message || (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Check your connection.' : fallback);
}

export const errorCode = (err) => err?.response?.data?.error?.code;

/** Small helpers so pages read naturally: get('/x').then(...) */
export const get = (url, params) => api.get(url, { params }).then((r) => r.data);
export const post = (url, body, config) => api.post(url, body, config).then((r) => r.data);
export const put = (url, body) => api.put(url, body).then((r) => r.data);
export const del = (url) => api.delete(url).then((r) => r.data);

/** Upload FormData of files under `field`. */
/** Multipart upload. Images are shrunk in the browser first, so any photo size works. */
/** Photos are sent a few at a time, so choosing 20+ photos still works on slow mobile data. */
export const UPLOAD_BATCH = 4;
export function inBatches(files, size = UPLOAD_BATCH) {
  const list = [...files];
  return Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));
}

export async function upload(url, files, field = 'photos', extra = {}) {
  const fd = new FormData();
  (await compressImages(files)).forEach((f) => fd.append(field, f));
  Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  // longer timeout than normal requests: photos can take a while on slow mobile data
  return api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 }).then((r) => r.data);
}
