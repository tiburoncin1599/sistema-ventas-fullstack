import { expect, type Page } from '@playwright/test';

export interface DatosVentaPOS {
  nombreProducto: string;
  clienteId: number;
  cantidad: number;
  direccion?: string;
}

/** Tarjeta del catálogo POS para un producto (por su input de cantidad). */
export function tarjetaProducto(page: Page, nombre: string) {
  return page
    .getByLabel(`Cantidad de ${nombre}`)
    .locator('xpath=ancestor::div[3]');
}

/** Completa una venta al contado desde la UI y devuelve el id del pedido. */
export async function venderEnPOS(
  page: Page,
  datos: DatosVentaPOS,
): Promise<number> {
  await page.goto('/ventas/nuevo-pedido');
  await expect(page.getByText('Punto de venta', { exact: true })).toBeVisible();

  await page.getByLabel('Cliente').selectOption(String(datos.clienteId));
  await page
    .getByPlaceholder('Buscar producto...')
    .fill(datos.nombreProducto);

  const tarjeta = tarjetaProducto(page, datos.nombreProducto);
  await expect(tarjeta.getByText(/Stock:/)).toBeVisible();
  await page
    .getByLabel(`Cantidad de ${datos.nombreProducto}`)
    .fill(String(datos.cantidad));

  if (datos.direccion) {
    await page
      .getByPlaceholder('Ej: Av. Banzer #123')
      .fill(datos.direccion);
  }

  await page.getByRole('button', { name: 'Guardar Pedido' }).click();
  await expect(
    page.getByText('✅ Pedido creado y registrado como pagado (contado).'),
  ).toBeVisible();

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  const titulo = (await modal.getByRole('heading').first().textContent()) ?? '';
  const coincidencia = /¡Pedido #(\d+) registrado!/.exec(titulo);
  if (!coincidencia) {
    throw new Error(`No se pudo leer el id del pedido del modal: "${titulo}"`);
  }
  return Number(coincidencia[1]);
}
