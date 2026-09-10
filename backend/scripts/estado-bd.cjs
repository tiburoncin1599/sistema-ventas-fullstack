require('dotenv').config({ quiet: true });
const { Client } = require('pg');

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query(`
    SELECT
      (SELECT count(*) FROM usuarios) AS usuarios,
      (SELECT count(*) FROM productos) AS productos,
      (SELECT count(*) FROM categorias) AS categorias,
      (SELECT count(*) FROM clientes) AS clientes,
      (SELECT count(*) FROM pedidos) AS pedidos,
      (SELECT count(*) FROM inventario) AS inventario,
      (SELECT count(*) FROM proveedores) AS proveedores,
      (SELECT count(*) FROM deudas) AS deudas
  `);
  console.log('Estado restaurado:', r.rows[0]);
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
