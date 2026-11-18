import { expect, test } from '@playwright/test';
import { cabeceraAuth, rutaEstado } from './support/auth';
import { BACKEND_URL } from './support/env';
import {
  cantidadStock,
  crearProductoConStock,
  limpiarProductosE2E,
  primerCliente,
} from './support/api';
import { tarjetaProducto, venderEnPOS } from './support/pos';

test.describe('Flujo de venta y stock', () => {
  test.use({ storageState: rutaEstado('ventas') });

  const nombreProducto = `E2E Stock ${Date.now()}`;
  let productoId: number;
  let clienteId: number;

  test.beforeAll(async ({ request }) => {
    // Stock inicial 12 -> al vender 5 queda 7 (<= 10, dispara la alerta).
    productoId = await crearProductoConStock(request, nombreProducto, 12);
    clienteId = (await primerCliente(request)).id;
  });

  test.afterAll(async ({ request }) => {
    await limpiarProductosE2E(request);
  });

  test('la venta descuenta el stock y muestra alerta visual <= 10', async ({
    page,
    request,
  }) => {
    const pedidoId = await venderEnPOS(page, {
      nombreProducto,
      clienteId,
      cantidad: 5,
      direccion: 'Av. E2E #123',
    });
    expect(pedidoId).toBeGreaterThan(0);

    // Fuente de verdad: API de inventario.
    await expect.poll(async () => cantidadStock(request, productoId)).toBe(7);

    // La alerta visual aparece al recargar el catálogo del POS.
    await page.reload();
    await page.getByPlaceholder('Buscar producto...').fill(nombreProducto);
    const tarjeta = tarjetaProducto(page, nombreProducto);
    await expect(tarjeta.getByText('Stock: 7')).toBeVisible();
    await expect(tarjeta.getByRole('status')).toContainText('Stock bajo');
    await expect(tarjeta.getByRole('status')).toContainText('quedan 7');

    // El backend también lo reporta en /inventario/alertas.
    const alertas = await request.get(`${BACKEND_URL}/inventario/alertas`, {
      headers: cabeceraAuth('admin'),
    });
    expect(alertas.status()).toBe(200);
    const items = (await alertas.json()) as { producto_id: number }[];
    expect(items.some(item => item.producto_id === productoId)).toBeTruthy();
  });
});
