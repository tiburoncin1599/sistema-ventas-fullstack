/* Crea el esquema de la BD de PRUEBA (local, Puerto 5433) a partir de las entidades.
   NO toca la BD de producción (Neon).  Uso: node scripts/crear-schema-test.cjs */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'test', '.env.test') });

const { DataSource } = require('typeorm');

const archivos = [
  'audit/audit.entity.js',
  'auth/refresh-token.entity.js',
  'categorias/categoria.entity.js',
  'configuracion/configuracion.entity.js',
  'deudas/deuda.entity.js',
  'inventario/inventario.entity.js',
  'inventario-movimientos/inventario-movimiento.entity.js',
  'pedidos/detalle-pedido.entity.js',
  'pedidos/pedido.entity.js',
  'productos/producto.entity.js',
  'proveedores/proveedor.entity.js',
  'ubicaciones/cliente-visita.entity.js',
  'ubicaciones/seguimiento.entity.js',
  'ubicaciones/ubicacion.entity.js',
  'usuarios/usuario.entity.js',
];

const entityClasses = [];
for (const f of archivos) {
  const mod = require(`../dist/${f}`);
  const keys = Object.keys(mod).filter((k) => k !== 'default');
  for (const k of keys) {
    const val = mod[k];
    if (val && typeof val === 'function' && /^\w+$/.test(k)) {
      entityClasses.push(val);
    }
  }
}

async function main() {
  console.log('DATABASE_URL usada:', String(process.env.DATABASE_URL).replace(/:[^:@/]+@/, ':***@'));
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: false,
    entities: entityClasses,
    synchronize: true,
  });
  await ds.initialize();
  const tablas = await ds.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
  );
  console.log('Tablas creadas:', tablas.map((t) => t.table_name).join(', '));
  await ds.destroy();
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});