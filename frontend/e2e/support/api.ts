import { expect, type APIRequestContext } from '@playwright/test';
import { cabeceraAuth } from './auth';
import { BACKEND_URL } from './env';

interface ProductoResumen {
  id: number;
  nombre: string;
}

interface ClienteResumen {
  id: number;
  nombre: string;
  email?: string;
}

interface InventarioRespuesta {
  cantidad: number | string;
}

/** Crea un producto único y le asigna stock inicial (semilla determinista). */
export async function crearProductoConStock(
  request: APIRequestContext,
  nombre: string,
  stock: number,
  precio = 10.5,
): Promise<number> {
  const headers = cabeceraAuth('admin');
  const creacion = await request.post(`${BACKEND_URL}/productos`, {
    headers,
    data: {
      nombre,
      precio,
      descripcion: 'Producto automatizado E2E — Sprint 5',
    },
  });
  expect(creacion.ok(), `POST /productos -> ${creacion.status()}`).toBeTruthy();

  // El controller no awaitea el service: se polllea hasta que aparece.
  let productoId: number | undefined;
  for (let intento = 0; intento < 25 && !productoId; intento++) {
    const listado = await request.get(`${BACKEND_URL}/productos?limit=100`);
    const productos = (await listado.json()) as ProductoResumen[];
    productoId = productos.find(p => p.nombre === nombre)?.id;
    if (!productoId) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  if (!productoId) {
    throw new Error(`El producto "${nombre}" no apareció en /productos`);
  }

  const inventario = await request.put(
    `${BACKEND_URL}/inventario/${productoId}`,
    { headers, data: { cantidad: stock } },
  );
  expect(
    inventario.ok(),
    `PUT /inventario/${productoId} -> ${inventario.status()}`,
  ).toBeTruthy();

  return productoId;
}

/**
 * Devuelve un cliente activo (los del select del POS). Se prefiere `juan@gmail.com`
 * porque es el usuario con sesión de cliente usada en las pruebas de PDF.
 */
export async function primerCliente(
  request: APIRequestContext,
): Promise<ClienteResumen> {
  const respuesta = await request.get(`${BACKEND_URL}/clientes`, {
    headers: cabeceraAuth('admin'),
  });
  expect(respuesta.ok()).toBeTruthy();
  const clientes = (await respuesta.json()) as ClienteResumen[];
  if (clientes.length === 0) throw new Error('No hay clientes para la venta E2E');
  return (
    clientes.find(c => c.email === 'juan@gmail.com') ?? clientes[0]!
  );
}

/**
 * Elimina todos los productos `E2E %` y sus pedidos exclusivos usando el
 * endpoint admin transaccional del backend. Se llama desde el teardown de los
 * specs que siembran datos, y desde un globalTeardown de seguridad.
 */
export async function limpiarProductosE2E(
  request: APIRequestContext,
): Promise<void> {
  const respuesta = await request.delete(`${BACKEND_URL}/productos/e2e`, {
    headers: cabeceraAuth('admin'),
  });
  expect(
    respuesta.ok(),
    `DELETE /productos/e2e -> ${respuesta.status()} ${await respuesta.text()}`,
  ).toBeTruthy();
}

/** Stock actual leído de la API (fuente de verdad, no de la UI). */
export async function cantidadStock(
  request: APIRequestContext,
  productoId: number,
): Promise<number> {
  const respuesta = await request.get(
    `${BACKEND_URL}/inventario/${productoId}`,
    { headers: cabeceraAuth('admin') },
  );
  expect(respuesta.ok()).toBeTruthy();
  const inventario = (await respuesta.json()) as InventarioRespuesta;
  return Number(inventario.cantidad);
}
