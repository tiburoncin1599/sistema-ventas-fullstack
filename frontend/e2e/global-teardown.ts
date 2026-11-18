import { request as crearContextoApi } from '@playwright/test';
import { cabeceraAuth } from './support/auth';
import { BACKEND_URL } from './support/env';

/**
 * Red de seguridad: si un spec falla antes de su afterAll (o se interrumpe la
 * corrida), esta limpieza global elimina igualmente los datos `E2E %`.
 * Nunca falla la corrida por un problema de teardown.
 */
export default async function globalTeardown(): Promise<void> {
  const contexto = await crearContextoApi.newContext();
  try {
    const respuesta = await contexto.delete(`${BACKEND_URL}/productos/e2e`, {
      headers: cabeceraAuth('admin'),
    });
    if (!respuesta.ok()) {
      console.warn(
        `[teardown] Limpieza E2E no exitosa: ${respuesta.status()} ${await respuesta.text()}`,
      );
    }
  } catch (error) {
    console.warn('[teardown] Limpieza E2E omitida:', (error as Error).message);
  } finally {
    await contexto.dispose();
  }
}
