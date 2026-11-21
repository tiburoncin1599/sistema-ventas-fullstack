import { request } from '@playwright/test';
import { asegurarSesiones } from './support/auth';
import { BACKEND_URL, FRONTEND_URL } from './support/env';

/**
 * La suite E2E crea y modifica datos reales. Por defecto sólo se permite
 * apuntar al stack local; E2E_ALLOW=1 es el único escape explícito.
 */
function esLocal(valor: string): boolean {
  try {
    const url = new URL(valor);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

function verificarEntornoLocal(): void {
  if (process.env.E2E_ALLOW === '1') return;

  const destinos = [
    { nombre: 'E2E_FRONTEND_URL', valor: FRONTEND_URL },
    { nombre: 'E2E_BACKEND_URL', valor: BACKEND_URL },
  ].filter((destino) => !esLocal(destino.valor));

  if (destinos.length > 0) {
    throw new Error(
      [
        '[E2E] La suite crea datos de prueba: sólo se permite contra localhost o 127.0.0.1.',
        ...destinos.map((destino) => `  - ${destino.nombre}=${destino.valor}`),
        'Ajustá las variables de entorno o forzá con E2E_ALLOW=1.',
      ].join('\n'),
    );
  }
}

/** Verifica que el stack esté arriba y prepara las sesiones por rol. */
export default async function globalSetup(): Promise<void> {
  verificarEntornoLocal();

  const ctx = await request.newContext();
  try {
    const front = await ctx.get(`${FRONTEND_URL}/`);
    if (!front.ok()) {
      throw new Error(
        `Frontend no disponible en ${FRONTEND_URL} (${front.status()}). ` +
          'Levantá el stack con: docker compose up -d --build',
      );
    }

    const health = await ctx.get(`${BACKEND_URL}/health`);
    if (!health.ok()) {
      throw new Error(
        `Backend no disponible en ${BACKEND_URL}/health (${health.status()}).`,
      );
    }
    const estado = (await health.json()) as { status?: string };
    if (estado.status !== 'ok') {
      throw new Error(`/health respondió status="${estado.status}"`);
    }

    const sesiones = await asegurarSesiones(ctx);
    console.log(
      `[E2E] Stack listo (frontend ${front.status()}, backend ${health.status()}). ` +
        `Sesiones: ${Object.keys(sesiones).join(', ')}`,
    );
  } finally {
    await ctx.dispose();
  }
}
