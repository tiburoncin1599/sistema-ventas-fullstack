import axios from 'axios';
import { normalizarRol } from './roles';

// En desarrollo y producción el frontend habla con el backend por el mismo
// origen: Next enruta `/api/*` hacia el proceso backend (ver next.config.ts).
// `NEXT_PUBLIC_API_URL` permite apuntar a un origen distinto si hiciera falta.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, '');

// Endpoints que NO deben pasar por el interceptor de 401:
// un login/registro fallido devuelve 401 y ahí no hay sesión que refrescar
const RUTAS_SIN_REFRESH = ['/auth/login', '/auth/registro', '/auth/refresh', '/auth/google'];

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let pendingRequests: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function limpiarAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  localStorage.removeItem('refresh_token');
  document.cookie = 'token=; path=/; max-age=0';
  document.cookie = 'usuario=; path=/; max-age=0';
  window.dispatchEvent(new Event('auth-change'));
}

/** Cierra sesión en el servidor (revoca el refresh token) y limpia el cliente. */
export async function cerrarSesion() {
  try {
    await api.post('/auth/logout');
  } catch {
    // aunque falle, la sesión local se limpia igual
  }
  limpiarAuth();
}

/** True cuando ya estamos en una pantalla de login (evita redirects en bucle). */
function esPantallaAuth(): boolean {
  if (typeof window === 'undefined') return true;
  const ruta = window.location.pathname;
  return ruta.startsWith('/auth') || ruta.startsWith('/ventas/login');
}

/** Sale hacia el login correspondiente al área donde ocurrió el fallo. */
function redirigirPorSesion() {
  if (esPantallaAuth()) return;
  const ruta = window.location.pathname;
  window.location.href = ruta.startsWith('/ventas') ? '/ventas/login' : '/auth';
}

/** Refresca el access token. Exportado también para el cliente SSE. */
export async function refreshToken(): Promise<string | null> {
  try {
    const refreshTokenLocal = localStorage.getItem('refresh_token');
    const res = await axios.post(
      `${API_URL}/auth/refresh`,
      refreshTokenLocal ? { refreshToken: refreshTokenLocal } : {},
      { withCredentials: true },
    );
    const newToken = res.data?.token;
    if (!newToken) return null;
    localStorage.setItem('token', newToken);
    document.cookie = `token=${newToken}; path=/; max-age=604800`;
    if (res.data.usuario) {
      const usuario = {
        ...res.data.usuario,
        rol: normalizarRol(res.data.usuario?.rol),
      };
      localStorage.setItem('usuario', JSON.stringify(usuario));
      document.cookie = `usuario=${encodeURIComponent(JSON.stringify(usuario))}; path=/; max-age=604800`;
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
    const url = (originalRequest?.url as string) || '';

    // 403 = sesión/rol inválido para el recurso: NO se intenta refresh.
    if (typeof window !== 'undefined' && error.response?.status === 403) {
      limpiarAuth();
      redirigirPorSesion();
      return Promise.reject(error);
    }

    if (
      typeof window !== 'undefined' &&
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !RUTAS_SIN_REFRESH.some((r) => url.startsWith(r))
    ) {
      if (isRefreshing) {
        // Se encola y se rechaza correctamente si el refresh falla
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const newToken = await refreshToken();
      if (newToken) {
        isRefreshing = false;
        pendingRequests.forEach(({ resolve }) => resolve(newToken));
        pendingRequests = [];
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh fallido: resolver las promesas encoladas con rechazo
      isRefreshing = false;
      const encoladas = pendingRequests;
      pendingRequests = [];
      encoladas.forEach(({ reject }) => reject(error));
      limpiarAuth();
      redirigirPorSesion();
    }
    return Promise.reject(error);
  },
);

/** Extrae el `message` real del backend de una respuesta con responseType blob. */
async function mensajeDelBlob(data: unknown): Promise<string> {
  const porDefecto = 'Error al descargar';
  let objeto: unknown = data;

  if (data instanceof Blob) {
    try {
      objeto = JSON.parse(await data.text());
    } catch {
      return porDefecto;
    }
  }

  if (objeto && typeof objeto === 'object' && 'message' in objeto) {
    const mensaje = (objeto as { message?: string | string[] }).message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
  }
  return porDefecto;
}

/**
 * Descarga un blob usando la instancia `api` para heredar credenciales,
 * Authorization y el refresh de 401. Mantiene la firma `(url) => Promise<Blob>`.
 */
export async function apiFetchBlob(url: string): Promise<Blob> {
  try {
    const res = await api.get<Blob>(url, { responseType: 'blob' });
    return res.data as Blob;
  } catch (err: unknown) {
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    throw new Error(await mensajeDelBlob(data));
  }
}
