import { request as crearContextoApi, type APIRequestContext } from '@playwright/test';
import { cabeceraAuth } from './support/auth';
import { BACKEND_URL } from './support/env';

/**
 * Red de seguridad: si un spec falla antes de su afterAll (o se interrumpe la
 * corrida), esta limpieza global elimina igualmente los datos `E2E %`.
 * Nunca falla la corrida por un problema de teardown: incluso crear el contexto
 * y liberarlo están protegidos.
 */
export default async function globalTeardown(): Promise<void> {
  let contexto: APIRequestContext | undefined;

  try {
    contexto = await crearContextoApi.newContext();
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
    if (contexto) {
      try {
        await contexto.dispose();
      } catch (error) {
        console.warn(
          '[teardown] No se pudo liberar el contexto:',
          (error as Error).message,
        );
      }
    }
  }
}
