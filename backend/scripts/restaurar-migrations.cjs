require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const estructura = await c.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'migrations' ORDER BY ordinal_position`,
  );
  console.log('Columnas de migrations:', JSON.stringify(estructura.rows));

  const dir = 'dist/migrations';
  const archivos = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => {
      // Archivo "1717000000000-CreateAuditoria.js" → TypeORM usa como nombre
      // de migración el de la clase: "CreateAuditoria1717000000000"
      const m = f.match(/^(\d+)-(.+)\.js$/);
      return m ? { timestamp: +m[1], name: `${m[2]}${m[1]}` } : null;
    })
    .filter(Boolean);

  await c.query('DELETE FROM migrations');
  for (const m of archivos) {
    await c.query('INSERT INTO migrations (timestamp, name) VALUES ($1, $2)', [
      m.timestamp,
      m.name,
    ]);
  }
  console.log(`Restauradas ${archivos.length} migraciones:`);
  const r = await c.query('SELECT id, timestamp, name FROM migrations ORDER BY timestamp');
  r.rows.forEach((x) => console.log(' ', x.id, x.timestamp, x.name));

  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
