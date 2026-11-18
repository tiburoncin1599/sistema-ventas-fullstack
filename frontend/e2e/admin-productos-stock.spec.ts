import { expect, test } from '@playwright/test';
import { cabeceraAuth, rutaEstado } from './support/auth';
import {
  cantidadStock,
  crearProductoConStock,
  limpiarProductosE2E,
} from './support/api';
import { BACKEND_URL } from './support/env';

interface MovimientoKardex {
  tipo: string;
  cantidad: number;
  cantidad_anterior: number | null;
  cantidad_nueva: number | null;
  motivo: string | null;
}

test.describe('Edición de stock desde /admin/productos', () => {
  test.use({ storageState: rutaEstado('admin') });

  const nombreProducto = `E2E Ajuste ${Date.now()}`;
  let productoId: number;

  test.beforeAll(async ({ request }) => {
    productoId = await crearProductoConStock(request, nombreProducto, 25);
  });

  test.afterAll(async ({ request }) => {
    await limpiarProductosE2E(request);
  });

  test('guardar un nuevo stock ajusta inventario y escribe el Kardex', async ({
    page,
    request,
  }) => {
    await page.goto('/admin/productos');
    await page.getByPlaceholder('Buscar por nombre, código o categoría').fill(nombreProducto);

    const tarjeta = page.locator('div.group').filter({ hasText: nombreProducto });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.getByLabel(`Stock actual: 25`)).toBeVisible();

    await tarjeta.click();
    await expect(page.getByRole('heading', { name: 'Editar producto' })).toBeVisible();
    const campoStock = page.getByRole('spinbutton', { name: 'Stock Actual' });
    await expect(campoStock).toHaveValue('25');

    await campoStock.fill('7');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect.poll(async () => cantidadStock(request, productoId)).toBe(7);

    await page.reload();
    await page.getByPlaceholder('Buscar por nombre, código o categoría').fill(nombreProducto);
    const actualizada = page.locator('div.group').filter({ hasText: nombreProducto });
    await expect(actualizada.getByLabel('Stock actual: 7')).toContainText(
      'Stock bajo · quedan 7',
    );

    const respuesta = await request.get(
      `${BACKEND_URL}/inventario-movimientos/producto/${productoId}`,
      { headers: cabeceraAuth('admin') },
    );
    expect(respuesta.ok()).toBeTruthy();
    const kardex = (await respuesta.json()) as { data: MovimientoKardex[] };
    const ajuste = kardex.data.find(
      (m) =>
        m.tipo === 'AJUSTE' &&
        m.motivo === 'Ajuste manual desde edición de producto' &&
        m.cantidad_anterior === 25 &&
        m.cantidad_nueva === 7,
    );
    expect(ajuste).toBeDefined();
    expect(ajuste?.cantidad).toBe(-18);
  });
});
