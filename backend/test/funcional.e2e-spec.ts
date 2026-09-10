import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';

/**
 * PRUEBAS FUNCIONALES E2E
 * Objetivo Especial 4: "Validar el funcionamiento del sistema web
 * mediante pruebas funcionales aplicadas a los procesos de gestión
 * de productos, pedidos, ventas e inventario."
 */

// Storage que nunca bloquea peticiones (desactiva el rate limit en pruebas)
const noThrottleStorage = {
  async increment() {
    return {
      totalHits: 0,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  },
};

// ─── CONSTANTES ───────────────────────────────────────────────────────
const TS = Date.now();
const ADMIN_EMAIL = `admin.e2e.${TS}@test.com`;
const ADMIN_PASS = 'Admin123456';
const VENTAS_EMAIL = `ventas.e2e.${TS}@test.com`;
const VENTAS_PASS = 'Ventas123456';
const INV_EMAIL = `inv.e2e.${TS}@test.com`;
const INV_PASS = 'Invent123456';
const CLIENTE_EMAIL = `cliente.e2e.${TS}@test.com`;
const CLIENTE_PASS = 'Client123456';

let app: INestApplication<App>;
let adminToken: string;
let ventasToken: string;
let invToken: string;
let clienteToken: string;
let adminId: number;
let ventasId: number;
let invId: number;
let clienteId: number;

// ─── HELPER: REQUEST AUTENTICADO ──────────────────────────────────────
function authReq(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  token: string,
) {
  return request(app.getHttpServer())
    [method](path)
    .set('Authorization', `Bearer ${token}`);
}

// ─── SETUP GLOBAL ─────────────────────────────────────────────────────
beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ThrottlerStorage)
    .useValue(noThrottleStorage)
    .compile();

  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  await app.init();

  const dataSource = app.get(DataSource);

  // 1) Registrar admin (se crea con rol=cliente por defecto)
  const adminReg = await request(app.getHttpServer())
    .post('/auth/registro')
    .send({
      nombre: 'Admin E2E',
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
    });
  adminId = adminReg.body.usuario.id;

  // 2) Elevar a admin directamente en la BD
  await dataSource.query(
    `UPDATE usuarios SET rol = 'admin' WHERE id = $1`,
    [adminId],
  );

  // 3) Re-login para obtener token con rol=admin
  const adminLogin = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
  adminToken = adminLogin.body.token;

  // 4) Crear usuario ventas via admin
  const ventasRes = await authReq('post', '/usuarios', adminToken).send({
    nombre: 'Ventas E2E',
    email: VENTAS_EMAIL,
    password: VENTAS_PASS,
    rol: 'ventas',
  });
  ventasId = ventasRes.body.id;

  const ventasLogin = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: VENTAS_EMAIL, password: VENTAS_PASS });
  ventasToken = ventasLogin.body.token;

  // 5) Crear usuario inventario via admin
  const invRes = await authReq('post', '/usuarios', adminToken).send({
    nombre: 'Inv E2E',
    email: INV_EMAIL,
    password: INV_PASS,
    rol: 'inventario',
  });
  invId = invRes.body.id;

  const invLogin = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: INV_EMAIL, password: INV_PASS });
  invToken = invLogin.body.token;

  // 6) Registrar cliente
  const clienteRes = await request(app.getHttpServer())
    .post('/auth/registro')
    .send({
      nombre: 'Cliente E2E',
      email: CLIENTE_EMAIL,
      password: CLIENTE_PASS,
    });
  clienteToken = clienteRes.body.token;
  clienteId = clienteRes.body.usuario.id;
}, 90_000);

afterAll(async () => {
  await app.close();
});

// ═══════════════════════════════════════════════════════════════════════
// 1. AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════════════
describe('1. Autenticación', () => {
  it('Login correcto → retorna token y datos del usuario', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.usuario.email).toBe(ADMIN_EMAIL);
    expect(res.body.usuario.rol).toBe('admin');
  });

  it('Login con contraseña incorrecta → 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'ClaveIncorrecta123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/credenciales/i);
  });

  it('Login con email inexistente → 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noexiste@noexiste.com', password: 'cualquier123' });
    expect(res.status).toBe(401);
  });

  it('Registro de nuevo usuario → retorna token y rol cliente', async () => {
    const email = `regtest.${TS}@test.com`;
    const res = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        nombre: 'Nuevo Registro',
        email,
        password: 'Test123456',
      });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.rol).toBe('cliente');
    expect(res.body.usuario.email).toBe(email);
  });

  it('Registro con email duplicado → 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        nombre: 'Dup',
        email: ADMIN_EMAIL,
        password: 'Test123456',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email.*registrado/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════
describe('2. Productos', () => {
  let productoId: number;

  it('POST /productos → crear producto (admin)', async () => {
    const res = await authReq('post', '/productos', adminToken).send({
      nombre: `Jabon Test ${TS}`,
      precio: 15.5,
      descripcion: 'Producto de prueba',
      tamano: '1L',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nombre).toBe(`Jabon Test ${TS}`);
    expect(Number(res.body.precio)).toBe(15.5);
    expect(res.body.activo).toBe(true);
    productoId = res.body.id;
  });

  it('GET /productos → listar productos activos incluye el creado', async () => {
    const res = await request(app.getHttpServer()).get('/productos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((p: any) => p.id === productoId);
    expect(found).toBeDefined();
    expect(found.nombre).toBe(`Jabon Test ${TS}`);
  });

  it('GET /productos/:id → obtener detalle del producto', async () => {
    const res = await request(app.getHttpServer()).get(
      `/productos/${productoId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(productoId);
    expect(res.body.nombre).toBe(`Jabon Test ${TS}`);
  });

  it('PUT /productos/:id → actualizar nombre y precio', async () => {
    const res = await authReq('put', `/productos/${productoId}`, adminToken).send({
      nombre: `Jabon Test Actualizado ${TS}`,
      precio: 20.0,
    });
    expect(res.status).toBe(200);
    const verif = await request(app.getHttpServer()).get(
      `/productos/${productoId}`,
    );
    expect(verif.body.nombre).toBe(`Jabon Test Actualizado ${TS}`);
    expect(Number(verif.body.precio)).toBe(20);
  });

  it('DELETE /productos/:id → desactivar producto', async () => {
    const res = await authReq(
      'delete',
      `/productos/${productoId}`,
      adminToken,
    );
    expect(res.status).toBe(200);
    const listRes = await request(app.getHttpServer()).get('/productos');
    const found = listRes.body.find((p: any) => p.id === productoId);
    expect(found).toBeUndefined();
  });

  it('POST /productos sin token → 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/productos')
      .send({ nombre: 'No Auth', precio: 10 });
    expect(res.status).toBe(401);
  });

  it('POST /productos con rol cliente → 403 Forbidden', async () => {
    const res = await authReq('post', '/productos', clienteToken).send({
      nombre: 'Cliente Intenta',
      precio: 10,
    });
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. CATEGORÍAS
// ═══════════════════════════════════════════════════════════════════════
describe('3. Categorías', () => {
  let categoriaId: number;

  it('POST /categorias → crear categoría (admin)', async () => {
    const res = await authReq('post', '/categorias', adminToken).send({
      nombre: `Categ Test ${TS}`,
      descripcion: 'Categoría de prueba',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nombre).toBe(`Categ Test ${TS}`);
    categoriaId = res.body.id;
  });

  it('GET /categorias → listar categorías incluye la creada', async () => {
    const res = await request(app.getHttpServer()).get('/categorias');
    expect(res.status).toBe(200);
    const found = res.body.find((c: any) => c.id === categoriaId);
    expect(found).toBeDefined();
  });

  it('Asociar categoría a producto → producto.categoria se actualiza', async () => {
    const prodRes = await authReq('post', '/productos', adminToken).send({
      nombre: `Prod ConCategoria ${TS}`,
      precio: 25,
      categoria_id: categoriaId,
    });
    expect(prodRes.status).toBe(201);
    const prodId = prodRes.body.id;

    const detRes = await request(app.getHttpServer()).get(
      `/productos/${prodId}`,
    );
    expect(detRes.status).toBe(200);
    expect(detRes.body.categoria).toBeDefined();
    expect(detRes.body.categoria.id).toBe(categoriaId);

    await authReq('delete', `/productos/${prodId}`, adminToken);
  });

  it('PUT /categorias/:id → actualizar nombre', async () => {
    const res = await authReq(
      'put',
      `/categorias/${categoriaId}`,
      adminToken,
    ).send({
      nombre: `Categ Actualizada ${TS}`,
    });
    expect(res.status).toBe(200);
    const verif = await request(app.getHttpServer()).get(
      `/categorias/${categoriaId}`,
    );
    expect(verif.body.nombre).toBe(`Categ Actualizada ${TS}`);
  });

  it('POST /categorias con rol ventas → 403 Forbidden', async () => {
    const res = await authReq('post', '/categorias', ventasToken).send({
      nombre: 'No Puede',
    });
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. CLIENTES
// ═══════════════════════════════════════════════════════════════════════
describe('4. Clientes', () => {
  let clienteTestId: number;

  it('POST /clientes → crear cliente (ventas)', async () => {
    const res = await authReq('post', '/clientes', ventasToken).send({
      nombre: `Cliente E2E Test ${TS}`,
      telefono: '71234567',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nombre).toBe(`Cliente E2E Test ${TS}`);
    expect(res.body.rol).toBe('cliente');
    clienteTestId = res.body.id;
  });

  it('GET /clientes → listar clientes incluye el creado', async () => {
    const res = await authReq('get', '/clientes', adminToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((c: any) => c.id === clienteTestId);
    expect(found).toBeDefined();
    expect(found.rol).toBe('cliente');
  });

  it('GET /clientes/:id → detalle del cliente sin password_hash', async () => {
    const res = await authReq(
      'get',
      `/clientes/${clienteTestId}`,
      adminToken,
    );
    expect(res.status).toBe(200);
    expect(res.body.rol).toBe('cliente');
    expect(res.body.password_hash).toBeUndefined();
  });

  it('PUT /clientes/:id → actualizar nombre del cliente', async () => {
    const res = await authReq(
      'put',
      `/clientes/${clienteTestId}`,
      ventasToken,
    ).send({
      nombre: `Cliente E2E Actualizado ${TS}`,
    });
    expect(res.status).toBe(200);
  });

  it('DELETE /clientes/:id → desactivar (admin)', async () => {
    const res = await authReq(
      'delete',
      `/clientes/${clienteTestId}`,
      adminToken,
    );
    expect(res.status).toBe(200);
  });

  it('POST /clientes con rol inventario → 403 Forbidden', async () => {
    const res = await authReq('post', '/clientes', invToken).send({
      nombre: 'No Puede',
    });
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. PEDIDOS + INVENTARIO (Stock suficiente e insuficiente)
// ═══════════════════════════════════════════════════════════════════════
describe('5. Pedidos + Inventario (stock)', () => {
  let prodTestId: number;
  const STOCK_INICIAL = 50;
  const CANT_COMPRA = 10;
  let pedidoId: number;

  beforeAll(async () => {
    const pRes = await authReq('post', '/productos', adminToken).send({
      nombre: `Prod Stock ${TS}`,
      precio: 30,
    });
    prodTestId = pRes.body.id;

    await authReq('put', `/inventario/${prodTestId}`, invToken).send({
      cantidad: STOCK_INICIAL,
    });
  }, 30_000);

  it('GET /inventario/:id → verificar stock inicial', async () => {
    const res = await authReq(
      'get',
      `/inventario/${prodTestId}`,
      invToken,
    );
    expect(res.status).toBe(200);
    expect(Number(res.body.cantidad)).toBe(STOCK_INICIAL);
  });

  it('POST /pedidos con stock suficiente → pedido creado, stock disminuye', async () => {
    const res = await authReq('post', '/pedidos', clienteToken).send({
      usuarioId: clienteId,
      items: [
        { producto_id: prodTestId, cantidad: CANT_COMPRA, precio: 30 },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.estado).toBe('pendiente');
    pedidoId = res.body.id;

    const invRes = await authReq(
      'get',
      `/inventario/${prodTestId}`,
      invToken,
    );
    expect(Number(invRes.body.cantidad)).toBe(
      STOCK_INICIAL - CANT_COMPRA,
    );
  });

  it('POST /pedidos con stock insuficiente → 400, stock no cambia', async () => {
    const stockAntes = STOCK_INICIAL - CANT_COMPRA;
    const res = await authReq('post', '/pedidos', clienteToken).send({
      usuarioId: clienteId,
      items: [
        { producto_id: prodTestId, cantidad: 9999, precio: 30 },
      ],
    });
    expect(res.status).toBe(400);

    const invRes = await authReq(
      'get',
      `/inventario/${prodTestId}`,
      invToken,
    );
    expect(Number(invRes.body.cantidad)).toBe(stockAntes);
  });

  it('GET /pedidos/:id → pedido con detalles correctos', async () => {
    const res = await authReq('get', `/pedidos/${pedidoId}`, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pedidoId);
    expect(res.body.detalles).toBeDefined();
    expect(res.body.detalles.length).toBe(1);
    expect(res.body.detalles[0].producto_id).toBe(prodTestId);
    expect(res.body.detalles[0].cantidad).toBe(CANT_COMPRA);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. ESTADOS DE PEDIDOS (máquina de estados)
// ═══════════════════════════════════════════════════════════════════════
describe('6. Estados de pedidos', () => {
  let pedidoId: number;

  beforeAll(async () => {
    const pRes = await authReq('post', '/productos', adminToken).send({
      nombre: `Prod Estados ${TS}`,
      precio: 10,
    });
    const pId = pRes.body.id;
    await authReq('put', `/inventario/${pId}`, invToken).send({
      cantidad: 100,
    });

    const pedidoRes = await authReq('post', '/pedidos', clienteToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: pId, cantidad: 1, precio: 10 }],
    });
    pedidoId = pedidoRes.body.id;
  }, 30_000);

  it('Estado inicial → pendiente', async () => {
    const res = await authReq('get', `/pedidos/${pedidoId}`, adminToken);
    expect(res.body.estado).toBe('pendiente');
  });

  it('pendiente → confirmado (transición válida)', async () => {
    const res = await authReq(
      'put',
      `/pedidos/${pedidoId}/estado`,
      adminToken,
    ).send({ estado: 'confirmado' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('confirmado');
  });

  it('confirmado → enviado (transición válida)', async () => {
    const res = await authReq(
      'put',
      `/pedidos/${pedidoId}/estado`,
      adminToken,
    ).send({ estado: 'enviado' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('enviado');
  });

  it('enviado → entregado (transición válida)', async () => {
    const res = await authReq(
      'put',
      `/pedidos/${pedidoId}/estado`,
      adminToken,
    ).send({ estado: 'entregado' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('entregado');
  });

  it('entregado → pendiente (transición INVÁLIDA → 400)', async () => {
    const res = await authReq(
      'put',
      `/pedidos/${pedidoId}/estado`,
      adminToken,
    ).send({ estado: 'pendiente' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no se puede cambiar/i);
  });

  it('entregado → cancelado (transición INVÁLIDA → 400)', async () => {
    const res = await authReq(
      'put',
      `/pedidos/${pedidoId}/estado`,
      adminToken,
    ).send({ estado: 'cancelado' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no se puede cambiar/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. INVENTARIO (entradas, salidas, kardex)
// ═══════════════════════════════════════════════════════════════════════
describe('7. Inventario (movimientos)', () => {
  let prodInvId: number;
  const STOCK_BASE = 100;

  beforeAll(async () => {
    const pRes = await authReq('post', '/productos', adminToken).send({
      nombre: `Prod MovInv ${TS}`,
      precio: 12,
    });
    prodInvId = pRes.body.id;
    await authReq('put', `/inventario/${prodInvId}`, invToken).send({
      cantidad: STOCK_BASE,
    });
  }, 30_000);

  it('GET /inventario/:id → stock inicial correcto', async () => {
    const res = await authReq(
      'get',
      `/inventario/${prodInvId}`,
      invToken,
    );
    expect(Number(res.body.cantidad)).toBe(STOCK_BASE);
  });

  it('POST /inventario-movimientos/entrada → stock aumenta', async () => {
    const antes = await authReq(
      'get',
      `/inventario/${prodInvId}`,
      invToken,
    );
    const cantAntes = Number(antes.body.cantidad);

    const res = await authReq(
      'post',
      '/inventario-movimientos/entrada',
      invToken,
    ).send({
      producto_id: prodInvId,
      tipo: 'entrada',
      cantidad: 25,
      motivo: 'Compra a proveedor',
    });
    expect(res.status).toBe(201);

    const despues = await authReq(
      'get',
      `/inventario/${prodInvId}`,
      invToken,
    );
    expect(Number(despues.body.cantidad)).toBe(cantAntes + 25);
  });

  it('POST /inventario-movimientos/salida → stock disminuye', async () => {
    const antes = await authReq(
      'get',
      `/inventario/${prodInvId}`,
      invToken,
    );
    const cantAntes = Number(antes.body.cantidad);

    const res = await authReq(
      'post',
      '/inventario-movimientos/salida',
      invToken,
    ).send({
      producto_id: prodInvId,
      tipo: 'salida',
      cantidad: 10,
      motivo: 'Salida manual',
    });
    expect(res.status).toBe(201);

    const despues = await authReq(
      'get',
      `/inventario/${prodInvId}`,
      invToken,
    );
    expect(Number(despues.body.cantidad)).toBe(cantAntes - 10);
  });

  it('POST /inventario-movimientos/salida con cantidad excesiva → 400', async () => {
    const antes = await authReq(
      'get',
      `/inventario/${prodInvId}`,
      invToken,
    );
    const cantAntes = Number(antes.body.cantidad);

    const res = await authReq(
      'post',
      '/inventario-movimientos/salida',
      invToken,
    ).send({
      producto_id: prodInvId,
      tipo: 'salida',
      cantidad: 99999,
      motivo: 'Salida imposible',
    });
    expect(res.status).toBe(400);

    const despues = await authReq(
      'get',
      `/inventario/${prodInvId}`,
      invToken,
    );
    expect(Number(despues.body.cantidad)).toBe(cantAntes);
  });

  it('GET /inventario-movimientos/kardex/:id → historial con saldos', async () => {
    const res = await authReq(
      'get',
      `/inventario-movimientos/kardex/${prodInvId}`,
      invToken,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    for (const m of res.body) {
      expect(m.saldo_actual).toBeDefined();
      expect(typeof m.saldo_actual).toBe('number');
    }
  });

  it('GET /inventario-movimientos → listado paginado con total', async () => {
    const res = await authReq(
      'get',
      '/inventario-movimientos',
      invToken,
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeDefined();
    expect(Number(res.body.total)).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. DEUDAS Y PAGOS
// ═══════════════════════════════════════════════════════════════════════
describe('8. Deudas y pagos', () => {
  let deudaId: number;
  const MONTO_DEUDA = 500;

  it('POST /deudas → crear deuda para cliente', async () => {
    const res = await authReq('post', '/deudas', adminToken).send({
      usuarioId: clienteId,
      monto: MONTO_DEUDA,
      descripcion: 'Deuda de prueba E2E',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(Number(res.body.monto)).toBe(MONTO_DEUDA);
    expect(Number(res.body.monto_pagado)).toBe(0);
    expect(res.body.estado).toBe('pendiente');
    deudaId = res.body.id;
  });

  it('PUT /deudas/:id/pagar → pago parcial, estado parcial', async () => {
    const res = await authReq(
      'put',
      `/deudas/${deudaId}/pagar`,
      adminToken,
    ).send({ monto: 200 });
    expect(res.status).toBe(200);
    expect(Number(res.body.monto_pagado)).toBe(200);
    expect(res.body.estado).toBe('parcial');
    expect(
      Number(res.body.monto) - Number(res.body.monto_pagado),
    ).toBe(300);
  });

  it('PUT /deudas/:id/pagar → pago restante, estado pagado', async () => {
    const res = await authReq(
      'put',
      `/deudas/${deudaId}/pagar`,
      adminToken,
    ).send({ monto: 300 });
    expect(res.status).toBe(200);
    expect(Number(res.body.monto_pagado)).toBe(500);
    expect(res.body.estado).toBe('pagado');
  });

  it('PUT /deudas/:id/pagar → pago en deuda ya pagada → 400', async () => {
    const res = await authReq(
      'put',
      `/deudas/${deudaId}/pagar`,
      adminToken,
    ).send({ monto: 100 });
    expect(res.status).toBe(400);
  });

  it('GET /deudas/resumen → resumen con totales', async () => {
    const res = await authReq('get', '/deudas/resumen', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.total_deudas).toBeDefined();
    expect(Number(res.body.total_deudas)).toBeGreaterThanOrEqual(1);
  });

  it('POST /deudas con rol ventas → 403 Forbidden', async () => {
    const res = await authReq('post', '/deudas', ventasToken).send({
      usuarioId: clienteId,
      monto: 100,
    });
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. ROLES Y PERMISOS
// ═══════════════════════════════════════════════════════════════════════
describe('9. Roles y permisos', () => {
  it('Solo admin puede listar usuarios', async () => {
    const adminRes = await authReq('get', '/usuarios', adminToken);
    expect(adminRes.status).toBe(200);
    expect(Array.isArray(adminRes.body)).toBe(true);

    const ventasRes = await authReq('get', '/usuarios', ventasToken);
    expect(ventasRes.status).toBe(403);

    const invRes = await authReq('get', '/usuarios', invToken);
    expect(invRes.status).toBe(403);

    const clienteRes = await authReq('get', '/usuarios', clienteToken);
    expect(clienteRes.status).toBe(403);
  });

  it('Solo admin puede crear usuarios', async () => {
    const res = await authReq('post', '/usuarios', adminToken).send({
      nombre: 'Permiso Test',
      email: `perm.test.${TS}@test.com`,
      password: 'Test123456',
      rol: 'ventas',
    });
    expect(res.status).toBe(201);

    const ventasRes = await authReq('post', '/usuarios', ventasToken).send({
      nombre: 'No Puede',
      email: `no.puede.${TS}@test.com`,
      password: 'Test123456',
      rol: 'ventas',
    });
    expect(ventasRes.status).toBe(403);
  });

  it('Solo admin/inventario puede gestionar inventario', async () => {
    const resAdmin = await authReq('get', '/inventario/alertas', adminToken);
    expect(resAdmin.status).toBe(200);

    const resInv = await authReq('get', '/inventario/alertas', invToken);
    expect(resInv.status).toBe(200);

    const resVentas = await authReq('get', '/inventario/alertas', ventasToken);
    expect(resVentas.status).toBe(403);
  });

  it('Solo admin/inventario/ventas puede listar pedidos', async () => {
    const resAdmin = await authReq('get', '/pedidos', adminToken);
    expect(resAdmin.status).toBe(200);

    const resInv = await authReq('get', '/pedidos', invToken);
    expect(resInv.status).toBe(200);

    const resVentas = await authReq('get', '/pedidos', ventasToken);
    expect(resVentas.status).toBe(200);

    const resCliente = await authReq('get', '/pedidos', clienteToken);
    expect(resCliente.status).toBe(403);
  });

  it('Solo admin/inventario puede gestionar movimientos de inventario', async () => {
    const resAdmin = await authReq(
      'get',
      '/inventario-movimientos',
      adminToken,
    );
    expect(resAdmin.status).toBe(200);

    const resInv = await authReq(
      'get',
      '/inventario-movimientos',
      invToken,
    );
    expect(resInv.status).toBe(200);

    const resVentas = await authReq(
      'get',
      '/inventario-movimientos',
      ventasToken,
    );
    expect(resVentas.status).toBe(403);
  });

  it('Sin token → 401 en endpoints protegidos', async () => {
    const res = await request(app.getHttpServer()).get('/usuarios');
    expect(res.status).toBe(401);
  });

  it('Cliente solo ve sus propios pedidos', async () => {
    const res = await authReq(
      'get',
      '/pedidos/usuario/999999',
      clienteToken,
    );
    expect(res.status).toBe(403);
  });
});
