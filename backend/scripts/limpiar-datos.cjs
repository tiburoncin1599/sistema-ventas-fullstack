/* Limpieza selectiva: borra SOLO datos transaccionales y usuarios,
   CONSERVA productos, categorias, inventario y proveedores.
   Uso: node scripts/limpiar-datos.cjs */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Orden respetando claves foráneas (hijos primero)
  const pasos = [
    ['detalle_pedido', 'DELETE FROM detalle_pedido'],
    ['pedidos', 'DELETE FROM pedidos'],
    ['deudas', 'DELETE FROM deudas'],
    ['refresh_tokens', 'DELETE FROM refresh_tokens'],
    ['auditoria', 'DELETE FROM auditoria'],
    ['inventario_movimientos', 'DELETE FROM inventario_movimientos'],
    ['seguimientos', 'DELETE FROM seguimientos'],
    ['vendedor_ubicaciones', 'DELETE FROM vendedor_ubicaciones'],
    ['cliente_visitas', 'DELETE FROM cliente_visitas'],
    ['clientes', 'DELETE FROM clientes'],
    ['usuarios (excepto admin@sistema.com)', `DELETE FROM usuarios WHERE email <> 'admin@sistema.com'`],
  ];

  for (const [nombre, sql] of pasos) {
    const r = await client.query(sql);
    console.log(`${nombre}: ${r.rowCount} filas eliminadas`);
  }

  // Reiniciar identidades de lo borrado (NO toca productos ni catálogo)
  await client.query(`ALTER SEQUENCE pedidos_id_seq RESTART WITH 1`);
  await client.query(`ALTER SEQUENCE detalle_pedido_id_seq RESTART WITH 1`);
  await client.query(`ALTER SEQUENCE clientes_id_seq RESTART WITH 1`);

  const restante = await client.query(
    `SELECT
       (SELECT count(*) FROM usuarios) AS usuarios,
       (SELECT count(*) FROM productos) AS productos,
       (SELECT count(*) FROM categorias) AS categorias,
       (SELECT count(*) FROM clientes) AS clientes,
       (SELECT count(*) FROM pedidos) AS pedidos`,
  );
  console.log('Estado final:', restante.rows[0]);

  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
