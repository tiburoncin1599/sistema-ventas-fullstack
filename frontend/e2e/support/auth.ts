import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext } from '@playwright/test';
import { BACKEND_URL, FRONTEND_URL } from './env';

export type Role = 'admin' | 'ventas' | 'inventario' | 'cliente';

/** Usuarios reales del entorno de pruebas locales (migración inicial). */
export const CREDENCIALES: Record<Role, { email: string; password: string }> = {
  admin: { email: 'admin@sistema.com', password: 'admin123' },
  ventas: { email: 'ven1@gmail.com', password: 'noemi123' },
  inventario: { email: 'inventario@sistema.com', password: 'inventario123' },
  cliente: { email: 'juan@gmail.com', password: 'juan123' },
};

const AUTH_DIR = path.join(__dirname, '.auth');

export const rutaEstado = (rol: Role): string =>
  path.join(AUTH_DIR, `${rol}.json`);

interface JwtPayload {
  exp?: number;
  rol?: string;
}

interface Almacenamiento {
  name: string;
  value: string;
}

interface EstadoLocal {
  cookies: {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax' | 'None' | 'Strict';
  }[];
  origins: { origin: string; localStorage: Almacenamiento[] }[];
}

function decodificarToken(token: string): JwtPayload | null {
  try {
    const parte = token.split('.')[1];
    if (!parte) return null;
    const json = Buffer.from(
      parte.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function leerEstado(archivo: string): EstadoLocal | null {
  if (!fs.existsSync(archivo)) return null;
  try {
    return JSON.parse(fs.readFileSync(archivo, 'utf8')) as EstadoLocal;
  } catch {
    return null;
  }
}

function tokenDelEstado(estado: EstadoLocal | null): string | undefined {
  return estado?.origins
    .find(o => o.origin === FRONTEND_URL)
    ?.localStorage.find(i => i.name === 'token')?.value;
}

function estadoEsValido(rol: Role, archivo: string): boolean {
  const token = tokenDelEstado(leerEstado(archivo));
  if (!token) return false;
  const payload = decodificarToken(token);
  const ahora = Math.floor(Date.now() / 1000);
  return !!payload && payload.rol === rol && (payload.exp ?? 0) > ahora + 120;
}

/**
 * Crea (o reutiliza si aún es válido) un `storageState` por rol.
 * Se ejecuta en globalSetup: 4 logins como máximo en la primera corrida,
 * evitando el throttler de 5 intentos/minuto de POST /auth/login.
 */
export async function asegurarSesiones(
  ctx: APIRequestContext,
): Promise<Record<Role, string>> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const dominio = new URL(FRONTEND_URL).hostname;
  const resultado = {} as Record<Role, string>;

  for (const rol of Object.keys(CREDENCIALES) as Role[]) {
    const archivo = rutaEstado(rol);
    if (estadoEsValido(rol, archivo)) {
      resultado[rol] = archivo;
      continue;
    }

    const { email, password } = CREDENCIALES[rol];
    const respuesta = await ctx.post(`${BACKEND_URL}/auth/login`, {
      data: { email, password },
    });
    if (!respuesta.ok()) {
      throw new Error(
        `No se pudo autenticar al rol ${rol} (${email}): ` +
          `${respuesta.status()} ${await respuesta.text()}`,
      );
    }

    const sesion = (await respuesta.json()) as {
      token: string;
      usuario: { id: number; nombre: string; email: string; rol: string };
    };
    const exp = decodificarToken(sesion.token)?.exp ??
      Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    const usuarioJson = JSON.stringify(sesion.usuario);

    const estado: EstadoLocal = {
      cookies: [
        {
          name: 'token',
          value: sesion.token,
          domain: dominio,
          path: '/',
          expires: exp,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'usuario',
          value: encodeURIComponent(usuarioJson),
          domain: dominio,
          path: '/',
          expires: exp,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [
        {
          origin: FRONTEND_URL,
          localStorage: [
            { name: 'token', value: sesion.token },
            { name: 'usuario', value: usuarioJson },
          ],
        },
      ],
    };

    fs.writeFileSync(archivo, JSON.stringify(estado, null, 2));
    resultado[rol] = archivo;
  }

  return resultado;
}

/** Token JWT listo para llamadas directas a la API desde un spec. */
export function tokenDe(rol: Role): string {
  const token = tokenDelEstado(leerEstado(rutaEstado(rol)));
  if (!token) {
    throw new Error(`No hay sesión guardada para ${rol}; correr globalSetup.`);
  }
  return token;
}

export function cabeceraAuth(rol: Role): Record<string, string> {
  return { Authorization: `Bearer ${tokenDe(rol)}` };
}
