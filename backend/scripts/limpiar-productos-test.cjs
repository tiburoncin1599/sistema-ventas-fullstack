/* Elimina los productos de prueba creados por la suite E2E.
 *
 * Patrón detectado (terminan en timestamp numérico largo):
 *   Prod Stock 1788535717400
 *   Prod Estados 1788535717400
 *   Prod MovInv 1788535717400
 *   Prod ConCategoria 1788535717400
 *   Jabon Test Actualizado 1788535717400
 *
 * Conserva los productos reales del catálogo (p.ej. "Alcohol en Gel Amare 360ml").
 *
 * Uso:
 *   node scripts/limpiar-productos-test.cjs            # vista previa (no borra nada)
 *   node scripts/limpiar-productos-test.cjs --confirm  # ejecuta la limpieza
 */
require('dotenv').config({ quiet: true });
const { Client } = require('pg');

// ^(Prod|Jabon) + texto sin dígitos + timestamp >= 10 dígitos al final
const PATRON_NOMBRE = '^(Prod|Jabon)[^0-9]*[0-9]{10,}$';

async function main() {
  const confirmar = process.argv.includes('--confirm');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query('BEGIN');

    const { rows: encontrados } = await client.query(
      `SELECT id, nombre FROM productos WHERE nombre ~ $1 ORDER BY id`,
      [PATRON_NOMBRE],
    );

    console.log(`Productos de prueba detectados: ${encontrados.length}`);
    for (const p of encontrados) console.log(`  - id ${p.id}: ${p.nombre}`);

    if (encontrados.length === 0) {
      console.log('Nada que limpiar.');
      await client.query('ROLLBACK');
      return;
    }

    if (!confirmar) {
      console.log('\n[preview] No se borró nada. Ejecutá con --confirm para eliminar.');
      await client.query('ROLLBACK');
      return;
    }

    const ids = encontrados.map((p) => p.id);
    const n = {};
    const del = async (sql, params) => (await client.query(sql, params)).rowCount;

    // Detecta pedidos cuyos detalles referencian estos productos ANTES de borrarlos
    const { rows: pedidosAfectados } = await client.query(
      `SELECT DISTINCT pedido_id FROM detalle_pedido WHERE producto_id = ANY($1)`,
      [ids],
    );
    const pedidoIds = pedidosAfectados.map((r) => r.pedido_id);

    n.detalle_pedido = await del(
      `DELETE FROM detalle_pedido WHERE producto_id = ANY($1)`,
      [ids],
    );

    // Pedidos que quedaron sin detalles por la limpieza anterior
    if (pedidoIds.length) {
      n.pedidos = await del(
        `DELETE FROM pedidos WHERE id = ANY($1)
         AND NOT EXISTS (SELECT 1 FROM detalle_pedido dp WHERE dp.pedido_id = pedidos.id)`,
        [pedidoIds],
      );
    }

    n.inventario = await del(
      `DELETE FROM inventario WHERE producto_id = ANY($1)`,
      [ids],
    );
    n.inventario_movimientos = await del(
      `DELETE FROM inventario_movimientos WHERE producto_id = ANY($1)`,
      [ids],
    );
    n.productos = await del(
      `DELETE FROM productos WHERE id = ANY($1)`,
      [ids],
    );

    console.log('Eliminado:', JSON.stringify(n));
    await client.query('COMMIT');

    const { rows: restantes } = await client.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE activo) AS activos FROM productos`,
    );
    console.log(`Productos restantes: ${restantes[0].total} (${restantes[0].activos} activos)`);
    console.log('Listo.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();