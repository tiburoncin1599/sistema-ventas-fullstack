/* Crea o actualiza el usuario administrador.
   Uso: node scripts/crear-admin.cjs [email] [password] */
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const email = process.argv[2] || 'admin@sistema.com';
  const password = process.argv[3] || 'admin123';
  const hash = await bcrypt.hash(password, 10);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const res = await client.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
     VALUES ($1, $2, $3, 'admin', true)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           rol = 'admin',
           activo = true
     RETURNING id, nombre, email, rol`,
    ['Admin', email, hash],
  );

  console.log('Admin listo:', res.rows[0]);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
