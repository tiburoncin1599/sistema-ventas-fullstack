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
const VENTAS2_EMAIL = `ventas2.e2e.${TS}@test.com`;
const VENTAS2_PASS = 'Ventas2123456';
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
let ventas2Id: number;
let ventas2Token: string;

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

  // 4b) Segundo vendedor (para probar separación entre vendedores)
  const ventas2Res = await authReq('post', '/usuarios', adminToken).send({
    nombre: 'Ventas2 E2E',
    email: VENTAS2_EMAIL,
    password: VENTAS2_PASS,
    rol: 'ventas',
  });
  ventas2Id = ventas2Res.body.id;

  const ventas2Login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: VENTAS2_EMAIL, password: VENTAS2_PASS });
  ventas2Token = ventas2Login.body.token;

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
// 6b. PEDIDOS — EDICIÓN CONTROLADA: solo editable en estado "pendiente"
// ═══════════════════════════════════════════════════════════════════════
describe('6b. Pedidos — edición controlada por estado', () => {
  let pendienteId: number;
  let itemId: number;
  let cancelId: number;

  beforeAll(async () => {
    const pRes = await authReq('post', '/productos', adminToken).send({
      nombre: `Prod Editable ${TS}`,
      precio: 10,
    });
    const pId = pRes.body.id;
    await authReq('put', `/inventario/${pId}`, invToken).send({
      cantidad: 100,
    });

    const crearPedido = async () => {
      const res = await authReq('post', '/pedidos', clienteToken).send({
        usuarioId: clienteId,
        items: [{ producto_id: pId, cantidad: 1, precio: 10 }],
      });
      expect(res.status).toBe(201);
      return res.body.id;
    };

    pendienteId = await crearPedido();
    cancelId = await crearPedido();

    const detalle = await authReq(
      'get',
      `/pedidos/${pendienteId}`,
      adminToken,
    );
    itemId = detalle.body.detalles[0].id;
    expect(itemId).toBeDefined();
  }, 30_000);

  it('pendiente → modificar cantidad de item (200, editable antes de confirmar)', async () => {
    const res = await authReq(
      'put',
      `/pedidos/${pendienteId}/items/${itemId}`,
      clienteToken,
    ).send({ cantidad: 2 });
    expect(res.status).toBe(200);
    expect(res.body.detalles[0].cantidad).toBe(2);
    expect(Number(res.body.pedido.total)).toBe(20);
  });

  it('confirmado → modificar item (400, stock/venta restringidos)', async () => {
    const estadoRes = await authReq(
      'put',
      `/pedidos/${pendienteId}/estado`,
      adminToken,
    ).send({ estado: 'confirmado' });
    expect(estadoRes.status).toBe(200);

    const res = await authReq(
      'put',
      `/pedidos/${pendienteId}/items/${itemId}`,
      adminToken,
    ).send({ cantidad: 5 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pendiente/i);
  });

  it('enviado → agregar item (400, restringido)', async () => {
    const estadoRes = await authReq(
      'put',
      `/pedidos/${pendienteId}/estado`,
      adminToken,
    ).send({ estado: 'enviado' });
    expect(estadoRes.status).toBe(200);

    const res = await authReq(
      'post',
      `/pedidos/${pendienteId}/items`,
      adminToken,
    ).send({ items: [{ producto_id: pendienteId, cantidad: 1, precio: 10 }] });
    expect(res.status).toBe(400);
  });

  it('cancelado → eliminar item (400, sin edición)', async () => {
    const estadoRes = await authReq(
      'put',
      `/pedidos/${cancelId}/estado`,
      adminToken,
    ).send({ estado: 'cancelado' });
    expect(estadoRes.status).toBe(200);

    const res = await authReq(
      'delete',
      `/pedidos/${cancelId}/items/1`,
      adminToken,
    );
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6c. VENTAS POR PERSONAL: agregados con detalle y valores numéricos
// ═══════════════════════════════════════════════════════════════════════
describe('6c. Ventas por personal', () => {
  beforeAll(async () => {
    const pRes = await authReq('post', '/productos', adminToken).send({
      nombre: `Prod VP ${TS}`,
      precio: 15,
    });
    const pId = pRes.body.id;
    await authReq('put', `/inventario/${pId}`, invToken).send({
      cantidad: 100,
    });

    for (let i = 0; i < 2; i++) {
      const res = await authReq('post', '/pedidos', adminToken).send({
        usuarioId: clienteId,
        items: [{ producto_id: pId, cantidad: 1, precio: 15 }],
      });
      expect(res.status).toBe(201);
    }
  }, 30_000);

  it('GET /pedidos/ventas/personal → fila del vendedor con total numérico y detalle', async () => {
    const res = await authReq('get', '/pedidos/ventas/personal', adminToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const fila = res.body.find(
      (v: { usuario_id: number }) => v.usuario_id === adminId,
    );
    expect(fila).toBeDefined();
    expect(typeof fila.total_vendido).toBe('number');
    expect(typeof fila.total_pedidos).toBe('number');
    expect(Array.isArray(fila.pedidos)).toBe(true);
    expect(fila.pedidos.length).toBeGreaterThanOrEqual(2);
    expect(fila.pedidos[0]).toHaveProperty('id');
    expect(fila.pedidos[0]).toHaveProperty('estado');
    expect(fila.pedidos[0]).toHaveProperty('total');
    expect(typeof fila.pedidos[0].total).toBe('number');
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

  it('POST /deudas con rol ventas → 201, deuda asignada al vendedor', async () => {
    const res = await authReq('post', '/deudas', ventasToken).send({
      usuarioId: clienteId,
      monto: 100,
      descripcion: 'Deuda venta a crédito (Ventas)',
    });
    expect(res.status).toBe(201);
    expect(res.body.vendedor_id).toBe(ventasId);
    expect(res.body.estado).toBe('pendiente');
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

// ═══════════════════════════════════════════════════════════════════════
// 10. REPORTES
// ═══════════════════════════════════════════════════════════════════════
describe('10. Reportes', () => {
  it('GET /reportes/ventas-por-fecha → 200 con series por día', async () => {
    const res = await authReq('get', '/reportes/ventas-por-fecha', adminToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const fila = res.body[0];
    expect(fila).toHaveProperty('fecha');
    expect(fila).toHaveProperty('total_pedidos');
    expect(fila).toHaveProperty('total_vendido');
    expect(fila).toHaveProperty('cancelados');
    expect(Number(fila.total_vendido)).toBeGreaterThanOrEqual(0);
  });

  it('GET /reportes/ganancias → 200 con ingresos/costo/ganancia', async () => {
    const res = await authReq('get', '/reportes/ganancias', adminToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const g = res.body[0] || {};
    expect(Number(g.ingresos)).toBeGreaterThanOrEqual(0);
    expect(Number(g.costo)).toBeGreaterThanOrEqual(0);
    expect(Math.abs(Number(g.ganancia) - (Number(g.ingresos) - Number(g.costo)))).toBeLessThan(0.01);
  });

  it('GET /reportes/ventas-por-producto y /ventas-por-categoria → 200', async () => {
    const porProducto = await authReq('get', '/reportes/ventas-por-producto', adminToken);
    expect(porProducto.status).toBe(200);
    expect(Array.isArray(porProducto.body)).toBe(true);
    if (porProducto.body.length > 0) {
      expect(porProducto.body[0]).toHaveProperty('nombre');
      expect(porProducto.body[0]).toHaveProperty('unidades_vendidas');
    }

    const porCategoria = await authReq('get', '/reportes/ventas-por-categoria', adminToken);
    expect(porCategoria.status).toBe(200);
    expect(Array.isArray(porCategoria.body)).toBe(true);
  });

  it('GET /reportes/inventario y /clientes-frecuentes → 200', async () => {
    const inv = await authReq('get', '/reportes/inventario', adminToken);
    expect(inv.status).toBe(200);
    expect(Array.isArray(inv.body)).toBe(true);

    const clientes = await authReq('get', '/reportes/clientes-frecuentes', adminToken);
    expect(clientes.status).toBe(200);
    expect(Array.isArray(clientes.body)).toBe(true);
    if (clientes.body.length > 0) {
      expect(clientes.body[0]).toHaveProperty('nombre');
      expect(clientes.body[0]).toHaveProperty('total_compras');
    }
  });

  it('Reportes: rol ventas → 200; rol inventario y cliente → 403', async () => {
    const ventasRes = await authReq('get', '/reportes/ganancias', ventasToken);
    expect(ventasRes.status).toBe(200);

    const invRes = await authReq('get', '/reportes/ganancias', invToken);
    expect(invRes.status).toBe(403);

    const clienteRes = await authReq('get', '/reportes/ganancias', clienteToken);
    expect(clienteRes.status).toBe(403);
  });

  it('GET /reportes/ventas-personal-por-dia → un vendedor solo ve su propio rendimiento', async () => {
    const res = await authReq(
      'get',
      `/reportes/ventas-personal-por-dia?usuarioId=${adminId}`,
      ventasToken,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /reportes/exportar/csv y /exportar/pdf → 200', async () => {
    const csv = await authReq(
      'get',
      `/reportes/exportar/csv?tipo=ventas-por-fecha&desde=${new Date().toISOString().slice(0, 10)}`,
      adminToken,
    );
    expect(csv.status).toBe(200);
    expect(String(csv.headers['content-type'])).toContain('text/csv');

    const pdf = await authReq(
      'get',
      '/reportes/exportar/pdf?tipo=inventario',
      adminToken,
    );
    expect(pdf.status).toBe(200);
    expect(String(pdf.headers['content-type'])).toContain('application/pdf');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 11. Stock visible para el cliente (P1) — catálogo + validación backend
// ══════════════════════════════════════════════════════════════════════════
describe('11. Stock visible y limitación del cliente', () => {
  let prodConStockId: number;
  let prodSinStockId: number;

  beforeAll(async () => {
    const p1 = await authReq('post', '/productos', adminToken).send({
      nombre: 'E2E Stock 5',
      precio: 25,
      categoria_id: 1,
    });
    prodConStockId = p1.body.id;
    await authReq('put', `/productos/${prodConStockId}/activo`, adminToken).send({ activo: true });
    await authReq('put', `/inventario/${prodConStockId}`, invToken).send({
      cantidad: 5,
    });

    const p2 = await authReq('post', '/productos', adminToken).send({
      nombre: 'E2E Stock 0',
      precio: 30,
      categoria_id: 1,
    });
    prodSinStockId = p2.body.id;
    await authReq('put', `/productos/${prodSinStockId}/activo`, adminToken).send({ activo: true });
    await authReq('put', `/inventario/${prodSinStockId}`, invToken).send({
      cantidad: 0,
    });
  });

  it('GET /productos (público) → incluye stock y disponible', async () => {
    const res = await authReq('get', '/productos', clienteToken);
    expect(res.status).toBe(200);
    const item = res.body.find((p: any) => p.id === prodConStockId);
    expect(item).toBeDefined();
    expect(item.stock).toBe(5);
    expect(item.disponible).toBe(true);
  });

  it('GET /productos/:id → stock=0 y disponible=false', async () => {
    const res = await authReq('get', `/productos/${prodSinStockId}`, clienteToken);
    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(0);
    expect(res.body.disponible).toBe(false);
  });

  it('POST /pedidos cliente con cantidad mayor al stock → 400', async () => {
    const res = await authReq('post', '/pedidos', clienteToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodConStockId, cantidad: 999, precio: 25 }],
    });
    expect(res.status).toBe(400);
    expect(String(res.body.message)).toMatch(/stock/i);
  });

  it('POST /pedidos cliente con stock=0 → 400', async () => {
    const res = await authReq('post', '/pedidos', clienteToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodSinStockId, cantidad: 1, precio: 30 }],
    });
    expect(res.status).toBe(400);
  });

  it('GET /inventario/:id sigue protegido (cliente → 403)', async () => {
    const res = await authReq('get', `/inventario/${prodConStockId}`, clienteToken);
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 12. Pedidos externos + asignación de vendedor (P2/P3)
// ══════════════════════════════════════════════════════════════════════════
describe('12. Pedidos externos y asignación de vendedor', () => {
  let pedidoClienteId: number;

  beforeAll(async () => {
    const pRes = await authReq('post', '/productos', adminToken).send({
      nombre: `Prod Asig ${TS}`,
      precio: 20,
    });
    const pId = pRes.body.id;
    await authReq('put', `/inventario/${pId}`, invToken).send({
      cantidad: 50,
    });

    // cliente crea pedido (queda sin vendedor asignado)
    const res = await authReq('post', '/pedidos', clienteToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: pId, cantidad: 1, precio: 20 }],
    });
    expect(res.status).toBe(201);
    pedidoClienteId = res.body.id;
  });

  it('POST /pedidos (cliente) → procesado_por es null', async () => {
    const res = await authReq('get', `/pedidos/${pedidoClienteId}`, clienteToken);
    expect(res.status).toBe(200);
    expect(res.body.procesado_por).toBeFalsy();
  });

  it('GET /pedidos?sinVendedor=true (inventario) → incluye pedido sin vendedor', async () => {
    const res = await authReq('get', `/pedidos?sinVendedor=true`, invToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: pedidoClienteId }),
      ]),
    );
  });

  it('GET /usuarios/vendedores (inventario) → lista personal ventas', async () => {
    const res = await authReq('get', '/usuarios/vendedores', invToken);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.some((u: any) => u.email === VENTAS_EMAIL)).toBe(true);
    expect(res.body.some((u: any) => u.email === VENTAS2_EMAIL)).toBe(true);
  });

  it('PUT /pedidos/:id/asignar-vendedor (inventario) → 200', async () => {
    const res = await authReq('put', `/pedidos/${pedidoClienteId}/asignar-vendedor`, invToken)
      .send({ vendedorId: ventasId });
    expect(res.status).toBe(200);
    expect(res.body.procesado_por).toBe(ventasId);
  });

  it('PUT /pedidos/:id/asignar-vendedor (ya asignado) → 400', async () => {
    const res = await authReq('put', `/pedidos/${pedidoClienteId}/asignar-vendedor`, invToken)
      .send({ vendedorId: ventas2Id });
    expect(res.status).toBe(400);
  });

  it('Vendedor asignado ve el pedido en su listado', async () => {
    const res = await authReq('get', '/pedidos', ventasToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: pedidoClienteId }),
      ]),
    );
  });

  it('Otro vendedor NO ve el pedido como propio (GET/:id → 403)', async () => {
    const res = await authReq('get', `/pedidos/${pedidoClienteId}`, ventas2Token);
    expect(res.status).toBe(403);
  });

  it('Otro vendedor NO puede cambiar estado del pedido ajeno', async () => {
    const res = await authReq('put', `/pedidos/${pedidoClienteId}/estado`, ventas2Token)
      .send({ estado: 'entregado' });
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 13. Deudas por rol — vendedor registra y solo ve las suyas (P4)
// ══════════════════════════════════════════════════════════════════════════
describe('13. Deudas por rol — vendedor registra y solo ve las suyas', () => {
  let deudaVentasId: number;

  it('Ventas crea deuda → vendedor_id = su id', async () => {
    const res = await authReq('post', '/deudas', ventasToken).send({
      usuarioId: clienteId,
      monto: 200,
      descripcion: 'Venta crédito E2E',
    });
    expect(res.status).toBe(201);
    expect(res.body.vendedor_id).toBe(ventasId);
    expect(res.body.estado).toBe('pendiente');
    deudaVentasId = res.body.id;
  });

  it('Ventas ve solo sus deudas (no las de admin)', async () => {
    const res = await authReq('get', '/deudas', ventasToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const d of res.body) {
      expect(d.vendedor_id).toBe(ventasId);
    }
  });

  it('Admin ve todas las deudas incluyendo la del vendedor', async () => {
    const res = await authReq('get', '/deudas', adminToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: deudaVentasId, vendedor_id: ventasId }),
      ]),
    );
  });

  it('GET /deudas/resumen (ventas) → solo suma de sus deudas', async () => {
    const res = await authReq('get', '/deudas/resumen', ventasToken);
    expect(res.status).toBe(200);
    expect(Number(res.body.total_pendiente)).toBeGreaterThanOrEqual(200);
  });

  it('Ventas NO puede pagar deuda (rol no permitido → 403)', async () => {
    const res = await authReq('put', `/deudas/${deudaVentasId}/pagar`, ventasToken)
      .send({ monto: 50 });
    expect(res.status).toBe(403);
  });

  it('Pago parcial → parcial con saldo correcto', async () => {
    const res = await authReq('put', `/deudas/${deudaVentasId}/pagar`, adminToken)
      .send({ monto: 150 });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('parcial');
    expect(Number(res.body.monto_pagado)).toBe(150);
  });

  it('Pago excedente → 400', async () => {
    const res = await authReq('put', `/deudas/${deudaVentasId}/pagar`, adminToken)
      .send({ monto: 999 });
    expect(res.status).toBe(400);
  });

  it('Pago que completa → pagado', async () => {
    const res = await authReq('put', `/deudas/${deudaVentasId}/pagar`, adminToken)
      .send({ monto: 50 });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('pagado');
  });

  it('Pago sobre deuda ya pagada → 400', async () => {
    const res = await authReq('put', `/deudas/${deudaVentasId}/pagar`, adminToken)
      .send({ monto: 1 });
    expect(res.status).toBe(400);
  });

  it('Ventas NO puede eliminar deuda → 403', async () => {
    const res = await authReq('delete', `/deudas/${deudaVentasId}`, ventasToken);
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 14. Historial de ventas por vendedor + gráficas + acceso por URL (P5)
// ══════════════════════════════════════════════════════════════════════════
describe('14. Ventas por vendedor, gráficas y acceso por URL', () => {
  let prodVId: number;

  beforeAll(async () => {
    const p = await authReq('post', '/productos', adminToken).send({
      nombre: 'E2E Ventas-Vendedor',
      precio: 40,
      categoria_id: 1,
    });
    prodVId = p.body.id;
    await authReq('put', `/productos/${prodVId}/activo`, adminToken).send({ activo: true });
    await authReq('put', `/inventario/${prodVId}`, invToken).send({
      cantidad: 50,
    });

    // ventas2 obtiene ventas: admin registra pedido a nombre del cliente con
    // procesado_por = ventas2 (el usuario debe existir en la tabla usuarios)
    const pedidoV2 = await authReq('post', '/pedidos', adminToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodVId, cantidad: 2, precio: 40 }],
      procesadoPor: ventas2Id,
    });
    expect(pedidoV2.status).toBe(201);
  });

  it('Admin filtra ventas por vendedor → solo filas de ese vendedor', async () => {
    const res = await authReq('get', `/pedidos/ventas/personal?usuarioId=${ventas2Id}`, adminToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const row of res.body) {
      expect(row.usuario_id).toBe(ventas2Id);
    }
  });

  it('GET /pedidos/ventas/personal (ventas) → solo sus filas', async () => {
    const res = await authReq('get', '/pedidos/ventas/personal', ventasToken);
    expect(res.status).toBe(200);
    for (const row of res.body) {
      expect(row.usuario_id).toBe(ventasId);
    }
  });

  it('Ventas no puede acceder al reporte de otro vendedor (parcial)', async () => {
    const res = await authReq(
      'get',
      `/reportes/ventas-personal-por-dia?usuarioId=${ventas2Id}`,
      ventasToken,
    );
    expect(res.status).toBe(200);
    const totalVentas2 = Number(res.body.reduce((s: number, r: any) => s + Number(r.total_vendido), 0));

    const adminRes = await authReq(
      'get',
      `/reportes/ventas-personal-por-dia?usuarioId=${ventas2Id}`,
      adminToken,
    );
    const totalAdmin = Number(adminRes.body.reduce((s: number, r: any) => s + Number(r.total_vendido), 0));
    expect(totalAdmin).toBeGreaterThanOrEqual(totalVentas2);
  });

  it('GET /reportes/ventas-por-fecha → 200 (admin)', async () => {
    const res = await authReq('get', '/reportes/ventas-por-fecha', adminToken);
    expect(res.status).toBe(200);
  });

  it('Acceso por URL a portales no autorizados', async () => {
    const a1 = await authReq('get', '/usuarios', clienteToken);
    expect(a1.status).toBe(403);

    const a2 = await authReq('get', '/inventario/1', ventasToken);
    expect(a2.status).toBe(403);

    const a3 = await authReq('get', '/reportes/ventas-por-fecha', invToken);
    expect(a3.status).toBe(403);

    const a4 = await authReq('post', '/deudas', clienteToken).send({
      usuarioId: clienteId, monto: 10,
    });
    expect(a4.status).toBe(403);
  });

  it('Dashboard por rol — ventas puede pedidos y deudas propias', async () => {
    const p = await authReq('get', '/pedidos', ventasToken);
    expect(p.status).toBe(200);

    const d = await authReq('get', '/deudas', ventasToken);
    expect(d.status).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 15. Tipo de pago CONTADO/CRÉDITO al registrar ventas (vendedor)
// ══════════════════════════════════════════════════════════════════════════
describe('15. Tipo de pago CONTADO/CRÉDITO en el registro de ventas', () => {
  let prodPagoId: number;

  beforeAll(async () => {
    const p = await authReq('post', '/productos', adminToken).send({
      nombre: `E2E TipoPago ${TS}`,
      precio: 30,
      categoria_id: 1,
    });
    prodPagoId = p.body.id;
    await authReq('put', `/productos/${prodPagoId}/activo`, adminToken).send({ activo: true });
    await authReq('put', `/inventario/${prodPagoId}`, invToken).send({
      cantidad: 50,
    });
  });

  it('POST /pedidos (ventas) tipoPago=contado → queda registrado como pagado (entregado)', async () => {
    const res = await authReq('post', '/pedidos', ventasToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodPagoId, cantidad: 2, precio: 30 }],
      tipoPago: 'contado',
    });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('entregado');
    expect(res.body.procesado_por).toBe(ventasId);
  });

  it('POST /pedidos (ventas) tipoPago=credito → registra saldo pendiente en deudas', async () => {
    const res = await authReq('post', '/pedidos', ventasToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodPagoId, cantidad: 2, precio: 30 }],
      tipoPago: 'credito',
    });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('pendiente');

    const deudas = await authReq('get', '/deudas', ventasToken);
    expect(deudas.status).toBe(200);
    const d = deudas.body.find(
      (x: any) =>
        Number(x.monto) === 60 &&
        x.estado === 'pendiente' &&
        x.usuario_id === clienteId &&
        x.vendedor_id === ventasId,
    );
    expect(d).toBeDefined();
    expect(String(d.descripcion)).toMatch(/Venta a crédito/i);
  });

  it('POST /pedidos (ventas) sin tipoPago → estado pendiente (regresión)', async () => {
    const res = await authReq('post', '/pedidos', ventasToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodPagoId, cantidad: 1, precio: 30 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('pendiente');
  });

  it('POST /pedidos (cliente) con tipoPago=contado → se ignora, queda pendiente', async () => {
    const res = await authReq('post', '/pedidos', clienteToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodPagoId, cantidad: 1, precio: 30 }],
      tipoPago: 'contado',
    });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('pendiente');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 16. Validación de stock (backend como validación definitiva)
// ══════════════════════════════════════════════════════════════════════════
describe('16. Validación de stock — mensaje con unidades disponibles', () => {
  let prodStockId: number;

  beforeAll(async () => {
    const p = await authReq('post', '/productos', adminToken).send({
      nombre: `E2E StockMsg ${TS}`,
      precio: 12,
      categoria_id: 1,
    });
    prodStockId = p.body.id;
    await authReq('put', `/productos/${prodStockId}/activo`, adminToken).send({ activo: true });
    await authReq('put', `/inventario/${prodStockId}`, invToken).send({
      cantidad: 3,
    });
  });

  it('POST /pedidos cantidad > stock → 400 con mensaje de unidades disponibles', async () => {
    const res = await authReq('post', '/pedidos', ventasToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodStockId, cantidad: 5, precio: 12 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'Stock insuficiente. Stock disponible: 3 unidades.',
    );
  });

  it('POST /pedidos cantidad = 0 → 400 (validación DTO)', async () => {
    const res = await authReq('post', '/pedidos', ventasToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodStockId, cantidad: 0, precio: 12 }],
    });
    expect(res.status).toBe(400);
  });

  it('POST /pedidos cantidad negativa → 400 (validación DTO)', async () => {
    const res = await authReq('post', '/pedidos', ventasToken).send({
      usuarioId: clienteId,
      items: [{ producto_id: prodStockId, cantidad: -3, precio: 12 }],
    });
    expect(res.status).toBe(400);
  });
});
