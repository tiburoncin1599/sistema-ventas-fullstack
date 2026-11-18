import { request } from '@playwright/test';
import { asegurarSesiones } from './support/auth';
import { BACKEND_URL, FRONTEND_URL } from './support/env';

/** Verifica que el stack esté arriba y prepara las sesiones por rol. */
export default async function globalSetup(): Promise<void> {
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
