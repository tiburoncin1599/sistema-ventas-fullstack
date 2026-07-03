const { Pool } = require('pg');
const pool = new Pool({
   connectionString: 'postgresql://neondb_owner:npg_2Kb5LEXMFJjH@ep-lucky-wave-apt6bc7w-pooler.c-7.us-east-1.aws.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
});
(async () => {
  try {
    await pool.query("UPDATE productos SET imagen_url = '/uploads/productos/ba\u00f1os gatillo.jpg' WHERE id = 2");
    await pool.query("UPDATE productos SET imagen_url = '/uploads/productos/ba\u00f1os recarga.jpg' WHERE id = 3");
    const r = await pool.query('SELECT id, nombre, imagen_url FROM productos WHERE id IN (2,3)');
    console.log('Actualizado:');
    r.rows.forEach(p => console.log('  id=' + p.id + ' img=' + p.imagen_url));
  } catch (e) { console.log('ERROR:', e.message); }
  await pool.end();
})();
