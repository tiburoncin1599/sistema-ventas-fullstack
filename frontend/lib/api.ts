import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

export const api = axios.create({
  baseURL: API_URL,
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  document.cookie = 'token=; path=/; max-age=0';
  document.cookie = 'usuario=; path=/; max-age=0';
  window.dispatchEvent(new Event('auth-change'));
}

function getRefreshTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)refresh_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function refreshToken(): Promise<string | null> {
  try {
    const refreshTokenCookie = getRefreshTokenFromCookie();
    const body = refreshTokenCookie ? {} : { refreshToken: localStorage.getItem('refresh_token') };
    const headers: Record<string, string> = {};
    if (refreshTokenCookie) {
      headers.Cookie = `refresh_token=${refreshTokenCookie}`;
    }
    const res = await axios.post(`${API_URL}/auth/refresh`, body, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      withCredentials: true,
    });
    const newToken = res.data.token;
    localStorage.setItem('token', newToken);
    document.cookie = `token=${newToken}; path=/; max-age=604800`;
    if (res.data.refreshToken) {
      localStorage.setItem('refresh_token', res.data.refreshToken);
    }
    return newToken;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (typeof window !== 'undefined' && error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const newToken = await refreshToken();
      if (newToken) {
        isRefreshing = false;
        pendingRequests.forEach((cb) => cb(newToken));
        pendingRequests = [];
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      isRefreshing = false;
      pendingRequests = [];
      clearAuth();
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  },
);

export async function apiFetchBlob(url: string): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Error al descargar');
  return res.blob();
}
