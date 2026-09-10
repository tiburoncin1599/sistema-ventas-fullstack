/* Asigna imagen_url a cada producto según los archivos existentes en uploads/productos.
   Uso: node scripts/asignar-imagenes.cjs */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { Client } = require('pg');

const REGLAS = [
  [/alcohol/, 'Alcohol en Gel'],
  [/[bñ]?a.{0,2}os.*gatillo|ba.*gatillo/, 'Limpia Baños Gatillo'],
  [/[bñ]?a.{0,2}os.*recarga|ba.*recarga/, 'Limpia Baños Recarga'],
  [/grasa.*gatillo/, 'Antigrasa Gatillo'],
  [/grasa.*recarga/, 'Antigrasa Recarga'],
  [/lavandina/, 'Lavandina Cloro'],
  [/piso-floral/, 'Piso Floral'],
  [/piso-lavanda/, 'Piso Lavanda'],
  [/piso-pino/, 'Piso Pino'],
  [/vajillero/, 'Lavavajillas'],
  [/vidrios.*gatillo/, 'Limpia Vidrios Gatillo'],
  [/vidrios.*recarga/, 'Limpia Vidrios Recarga'],
];

async function main() {
  const archivos = fs
    .readdirSync('uploads/productos')
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f));

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const productos = await client.query(
    `SELECT id, nombre FROM productos WHERE imagen_url IS NULL ORDER BY id`,
  );

  let asignadas = 0;
  for (const archivo of archivos) {
    const minusculas = archivo.toLowerCase();
    const regla = REGLAS.find(([patron]) => patron.test(minusculas));
    if (!regla) {
      console.warn(`Sin regla para: ${archivo}`);
      continue;
    }
    const objetivo = regla[1];
    const prod = productos.rows.find((p) =>
      p.nombre.toLowerCase().includes(objetivo.toLowerCase()),
    );
    if (!prod) {
      console.warn(`Archivo ${archivo}: no encontré producto "${objetivo}"`);
      continue;
    }
    await client.query(`UPDATE productos SET imagen_url = $1 WHERE id = $2`, [
      `/uploads/productos/${encodeURIComponent(archivo)}`,
      prod.id,
    ]);
    console.log(`${prod.nombre} → ${archivo}`);
    asignadas++;
  }

  console.log(`\nImágenes asignadas: ${asignadas}/${archivos.length}`);
  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
