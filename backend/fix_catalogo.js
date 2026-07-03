const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2Kb5LEXMFJjH@ep-lucky-wave-apt6bc7w-pooler.c-7.us-east-1.aws.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
});
(async () => {
  try {
    await pool.query(`
      ALTER TABLE productos
        ADD COLUMN IF NOT EXISTS precio_por_docena DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS tamano VARCHAR(50);
    `);
    const updates = [
      { id: 1,  docena: 150.00, tamano: '360ml' },
      { id: 2,  docena: 170.00, tamano: '860ml' },
      { id: 3,  docena: 140.00, tamano: '860ml' },
      { id: 4,  docena: 170.00, tamano: '860ml' },
      { id: 5,  docena: 140.00, tamano: '860ml' },
      { id: 6,  docena: 110.00, tamano: '1lt' },
      { id: 7,  docena: 130.00, tamano: '1lt' },
      { id: 8,  docena: 130.00, tamano: '1lt' },
      { id: 9,  docena: 130.00, tamano: '1lt' },
      { id: 10, docena: 150.00, tamano: '1lt' },
      { id: 11, docena: 170.00, tamano: '880ml' },
      { id: 12, docena: 140.00, tamano: '900ml' },
    ];
    for (const p of updates) {
      await pool.query(
        'UPDATE productos SET precio_por_docena = $1, tamano = $2 WHERE id = $3',
        [p.docena, p.tamano, p.id]
      );
    }
    const r = await pool.query('SELECT id, nombre, precio, precio_por_docena, tamano FROM productos ORDER BY id');
    console.log('Catalogo actualizado:');
    r.rows.forEach(p => console.log(`  #${p.id} ${p.nombre} | Bs${p.precio} | docena: Bs${p.precio_por_docena} | ${p.tamano}`));
  } catch (e) { console.log('ERROR:', e.message); }
  await pool.end();
})();
