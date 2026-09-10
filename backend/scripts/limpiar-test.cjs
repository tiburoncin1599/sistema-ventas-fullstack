require('dotenv').config({ quiet: true });
const { Client } = require('pg');

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query(`DELETE FROM inventario WHERE producto_id IN (SELECT id FROM productos WHERE nombre IN ('Jabón Rey Lavandina','Detergente Blanca Nieve'))`);
  await c.query(`DELETE FROM productos WHERE nombre IN ('Jabón Rey Lavandina','Detergente Blanca Nieve')`);
  await c.query(`DELETE FROM categorias WHERE nombre = 'Limpieza' AND id NOT IN (SELECT DISTINCT categoria_id FROM productos WHERE categoria_id IS NOT NULL)`);
  const r = await c.query(`
    SELECT
      (SELECT count(*) FROM productos) AS productos,
      (SELECT count(*) FROM categorias) AS categorias,
      (SELECT count(*) FROM inventario) AS inventario
  `);
  console.log('BD limpia:', r.rows[0]);
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
