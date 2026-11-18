import { expect, test } from '@playwright/test';
import { cabeceraAuth, rutaEstado } from './support/auth';
import { BACKEND_URL, FRONTEND_URL } from './support/env';

test.describe('Autenticación y permisos por rol', () => {
  test.describe('ADMIN', () => {
    test.use({ storageState: rutaEstado('admin') });

    test('accede al panel completo y a los módulos restringidos', async ({
      page,
      request,
    }) => {
      await page.goto('/admin');
      await expect(
        page.getByRole('heading', { name: 'Panel de Administración' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Usuarios' }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Reportes' }).first(),
      ).toBeVisible();

      await page.goto('/admin/usuarios');
      await expect(page).toHaveURL(/\/admin\/usuarios$/);
      await page.goto('/admin/reportes');
      await expect(page).toHaveURL(/\/admin\/reportes$/);

      const pedidos = await request.get(`${BACKEND_URL}/pedidos`, {
        headers: cabeceraAuth('admin'),
      });
      expect(pedidos.status()).toBe(200);
    });
  });

  test.describe('VENDEDOR', () => {
    test.use({ storageState: rutaEstado('ventas') });

    test('accede solo al POS/ventas y no al panel admin', async ({
      page,
      request,
    }) => {
      await page.goto('/ventas');
      await expect(
        page.getByRole('heading', { name: 'Portal de Ventas' }),
      ).toBeVisible();
      await page.goto('/ventas/nuevo-pedido');
      await expect(page).toHaveURL(/\/ventas\/nuevo-pedido$/);
      await expect(page.getByText('Punto de venta', { exact: true })).toBeVisible();

      await page.goto('/admin/usuarios');
      await expect(page).toHaveURL(`${FRONTEND_URL}/`);

      const adminOnly = await request.get(`${BACKEND_URL}/productos/admin`, {
        headers: cabeceraAuth('ventas'),
      });
      expect(adminOnly.status()).toBe(403);
      const alertas = await request.get(`${BACKEND_URL}/inventario/alertas`, {
        headers: cabeceraAuth('ventas'),
      });
      expect(alertas.status()).toBe(403);
    });

    // Sin storageState: este caso verifica el formulario real de login.
    test.describe('sin sesión previa', () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      test('inicia sesión por el portal interno y entra a ventas', async ({
        page,
      }) => {
        await page.goto('/ventas/login');
        await expect(
          page.getByRole('heading', { name: 'Portal de Ventas' }).first(),
        ).toBeVisible();
        await page
          .getByPlaceholder('vendedor@prolimac.com')
          .fill('ven1@gmail.com');
        await page.getByPlaceholder('Tu contraseña').fill('noemi123');
        await page.getByRole('button', { name: 'Ingresar' }).click();

        await expect(page).toHaveURL(new RegExp('/ventas/?$'));
        await expect(
          page.getByRole('heading', { name: 'Portal de Ventas' }).first(),
        ).toBeVisible();
      });
    });
  });

  test.describe('INVENTARIO', () => {
    test.use({ storageState: rutaEstado('inventario') });

    test('accede a stock y movimientos, pero no a usuarios', async ({
      page,
      request,
    }) => {
      await page.goto('/admin/inventario');
      await expect(
        page.getByRole('heading', { name: 'Inventario', exact: true }),
      ).toBeVisible();
      await expect(page.getByText('Stock actual')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ajustar' }).first()).toBeVisible();

      await page.goto('/admin/usuarios');
      await expect(page).toHaveURL(`${FRONTEND_URL}/`);

      const alertas = await request.get(`${BACKEND_URL}/inventario/alertas`, {
        headers: cabeceraAuth('inventario'),
      });
      expect(alertas.status()).toBe(200);
      const movimientos = await request.get(
        `${BACKEND_URL}/inventario-movimientos`,
        { headers: cabeceraAuth('inventario') },
      );
      expect(movimientos.status()).toBe(200);
    });
  });

  test.describe('CLIENTE', () => {
    test.use({ storageState: rutaEstado('cliente') });

    test('accede al catálogo y no al panel interno', async ({
      page,
      request,
    }) => {
      await page.goto('/productos');
      await expect(
        page.getByRole('heading', {
          name: 'Todo lo que tu espacio necesita.',
        }),
      ).toBeVisible();

      await page.goto('/admin');
      await expect(page).toHaveURL(`${FRONTEND_URL}/`);
      await page.goto('/ventas');
      // Con sesión de cliente, el proxy devuelve al inicio (no al login).
      await expect(page).toHaveURL(`${FRONTEND_URL}/`);

      const pedidos = await request.get(`${BACKEND_URL}/pedidos`, {
        headers: cabeceraAuth('cliente'),
      });
      expect(pedidos.status()).toBe(403);
    });
  });
});
