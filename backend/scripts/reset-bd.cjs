/* Vacía TODAS las tablas de la BD y recrea el usuario admin.
   Uso: node scripts/reset-bd.cjs */
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE 'typeorm_%'
    ORDER BY tablename
  `);
  const tablas = rows.map((r) => `"${r.tablename}"`);
  console.log(`Tablas encontradas (${tablas.length}):`, rows.map((r) => r.tablename).join(', '));

  if (tablas.length > 0) {
    await client.query(`TRUNCATE TABLE ${tablas.join(', ')} RESTART IDENTITY CASCADE`);
    console.log('Todas las tablas vaciadas (identidades reiniciadas).');
  }

  const hash = await bcrypt.hash('admin123', 10);
  const res = await client.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
     VALUES ($1, $2, $3, 'admin', true)
     RETURNING id, nombre, email, rol`,
    ['Admin', 'admin@sistema.com', hash],
  );
  console.log('Admin creado:', res.rows[0]);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
