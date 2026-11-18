import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { cabeceraAuth, rutaEstado, type Role } from './support/auth';
import {
  crearProductoConStock,
  limpiarProductosE2E,
  primerCliente,
} from './support/api';
import { BACKEND_URL } from './support/env';
import { venderEnPOS } from './support/pos';

async function verificarPdfPorApi(
  request: APIRequestContext,
  pedidoId: number,
  rol: Role,
): Promise<void> {
  const respuesta = await request.get(
    `${BACKEND_URL}/pedidos/${pedidoId}/comprobante-pdf`,
    { headers: cabeceraAuth(rol) },
  );
  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()['content-type']).toContain('application/pdf');
  expect(respuesta.headers()['content-disposition']).toContain(
    `comprobante-${pedidoId}.pdf`,
  );
  const buffer = await respuesta.body();
  expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
  expect(buffer.length).toBeGreaterThan(1000);
}

/** Registra la petición del PDF que dispara un botón y la deja continuar. */
async function capturarRutaPdf(
  page: Page,
  accion: () => Promise<void>,
): Promise<string[]> {
  const urls: string[] = [];
  await page.route('**/api/pedidos/*/comprobante-pdf', route => {
    urls.push(route.request().url());
    return route.continue();
  });

  // apiFetchBlob abre el blob con window.open: puede generar popup o descarga.
  const popup = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
  await accion();
  const ventana = await popup;
  if (ventana) await ventana.close().catch(() => undefined);

  await expect.poll(() => urls.length, { timeout: 10_000 }).toBeGreaterThan(0);
  return urls;
}

test.describe('Comprobante comercial PDF', () => {
  test.use({ storageState: rutaEstado('ventas') });

  const nombreProducto = `E2E PDF ${Date.now()}`;
  let clienteId: number;

  test.beforeAll(async ({ request }) => {
    await crearProductoConStock(request, nombreProducto, 20);
    clienteId = (await primerCliente(request)).id;
  });

  test.afterAll(async ({ request }) => {
    await limpiarProductosE2E(request);
  });

  test('se invoca y descarga al finalizar una venta', async ({
    page,
    request,
  }) => {
    const pedidoId = await venderEnPOS(page, {
      nombreProducto,
      clienteId,
      cantidad: 1,
      direccion: 'Av. Comprobante #1',
    });

    const urls = await capturarRutaPdf(page, () =>
      page
        .getByRole('button', {
          name: `Ver comprobante PDF del pedido ${pedidoId}`,
        })
        .click(),
    );
    expect(urls[0]).toContain(`/pedidos/${pedidoId}/comprobante-pdf`);

    await verificarPdfPorApi(request, pedidoId, 'ventas');
    // El cliente dueño del pedido también puede recuperar su comprobante.
    await verificarPdfPorApi(request, pedidoId, 'cliente');
    // Sin token, la ruta está protegida.
    const sinToken = await request.get(
      `${BACKEND_URL}/pedidos/${pedidoId}/comprobante-pdf`,
    );
    expect(sinToken.status()).toBe(401);
  });

  test('se invoca desde el historial de pedidos del vendedor', async ({
    page,
    request,
  }) => {
    const pedidoId = await venderEnPOS(page, {
      nombreProducto,
      clienteId,
      cantidad: 1,
    });
    await page.getByRole('button', { name: 'Cerrar' }).click();

    await page.goto('/ventas/pedidos');
    await expect(
      page.getByRole('heading', { name: 'Pedidos', exact: true }),
    ).toBeVisible();
    const pedido = page.locator('article').filter({ hasText: `#${pedidoId}` });
    await expect(pedido).toBeVisible();

    const urls = await capturarRutaPdf(page, () =>
      pedido
        .getByRole('button', {
          name: `Ver comprobante PDF del pedido ${pedidoId}`,
        })
        .click(),
    );
    expect(urls[0]).toContain(`/pedidos/${pedidoId}/comprobante-pdf`);

    await verificarPdfPorApi(request, pedidoId, 'ventas');
  });
});
