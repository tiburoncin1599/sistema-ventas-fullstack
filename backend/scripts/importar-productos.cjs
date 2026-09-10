/* Importa productos desde un CSV y crea sus registros de inventario.
   Crea las categorías que no existan.

   Uso:  node scripts/importar-productos.cjs ruta/al/archivo.csv

   Formato del CSV (la primera fila son los encabezados):
     nombre;descripcion;precio;precio_costo;precio_por_docena;tamano;categoria;stock;cantidad_minima
   - Separador: detecta automáticamente ';' o ','
   - Solo 'nombre' y 'precio' son obligatorios
   - 'stock' va en unidades individuales (si vendés por docena de 12, poné docenas*12)
   - Si el producto ya existe (mismo nombre) se actualiza precio/stock en vez de duplicarlo
*/
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function parsearLinea(linea, sep) {
  const campos = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') { actual += '"'; i++; }
      else entreComillas = !entreComillas;
    } else if (c === sep && !entreComillas) {
      campos.push(actual.trim());
      actual = '';
    } else actual += c;
  }
  campos.push(actual.trim());
  return campos;
}

function numero(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.').replace('Bs', '').trim());
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const archivo = process.argv[2];
  if (!archivo || !fs.existsSync(archivo)) {
    console.error('Uso: node scripts/importar-productos.cjs archivo.csv');
    process.exit(1);
  }

  // Detecta codificación: si no es UTF-8 válido, asume latin1 (Excel clásico)
  const buffer = fs.readFileSync(archivo);
  let contenido = buffer.toString('utf8');
  if (contenido.includes('\uFFFD')) contenido = buffer.toString('latin1');
  contenido = contenido.replace(/^\uFEFF/, '');
  const lineas = contenido.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lineas.length < 2) {
    console.error('El CSV está vacío o solo tiene encabezados.');
    process.exit(1);
  }

  const sep = (lineas[0].match(/;/g) || []).length >= (lineas[0].match(/,/g) || []).length ? ';' : ',';
  const headers = parsearLinea(lineas[0], sep).map((h) => h.toLowerCase().trim());
  const idx = (n) => headers.indexOf(n);

  const filas = lineas.slice(1).map((l) => {
    const c = parsearLinea(l, sep);
    return {
      nombre: c[idx('nombre')],
      descripcion: idx('descripcion') >= 0 ? c[idx('descripcion')] : null,
      precio: numero(c[idx('precio')]),
      precio_costo: idx('precio_costo') >= 0 ? numero(c[idx('precio_costo')]) : null,
      precio_por_docena: idx('precio_por_docena') >= 0 ? numero(c[idx('precio_por_docena')]) : null,
      tamano: idx('tamano') >= 0 ? c[idx('tamano')] || null : null,
      categoria: idx('categoria') >= 0 ? c[idx('categoria')] || null : null,
      stock: idx('stock') >= 0 ? numero(c[idx('stock')]) ?? 0 : 0,
      cantidad_minima: idx('cantidad_minima') >= 0 ? numero(c[idx('cantidad_minima')]) : null,
    };
  });

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const cacheCategorias = new Map();
  const catRows = await client.query('SELECT id, nombre FROM categorias');
  catRows.rows.forEach((r) => cacheCategorias.set(r.nombre.toLowerCase(), r.id));

  let creados = 0;
  let actualizados = 0;
  let errores = 0;

  for (const [i, f] of filas.entries()) {
    try {
      if (!f.nombre || f.precio === null) {
        console.warn(`Fila ${i + 2} ignorada (falta nombre o precio): ${f.nombre}`);
        errores++;
        continue;
      }

      let categoriaId = null;
      if (f.categoria) {
        const clave = f.categoria.toLowerCase();
        if (!cacheCategorias.has(clave)) {
          const nueva = await client.query(
            'INSERT INTO categorias (nombre) VALUES ($1) RETURNING id',
            [f.categoria],
          );
          cacheCategorias.set(clave, nueva.rows[0].id);
          console.log(`  + categoría creada: ${f.categoria}`);
        }
        categoriaId = cacheCategorias.get(clave);
      }

      const existente = await client.query(
        'SELECT id FROM productos WHERE lower(nombre) = lower($1) LIMIT 1',
        [f.nombre],
      );

      let productoId;
      if (existente.rows.length > 0) {
        productoId = existente.rows[0].id;
        await client.query(
          `UPDATE productos SET precio = $1, precio_costo = $2, precio_por_docena = $3,
             descripcion = COALESCE($4, descripcion), tamano = COALESCE($5, tamano),
             categoria_id = COALESCE($6, categoria_id)
           WHERE id = $7`,
          [f.precio, f.precio_costo, f.precio_por_docena, f.descripcion, f.tamano, categoriaId, productoId],
        );
        actualizados++;
      } else {
        const ins = await client.query(
          `INSERT INTO productos (nombre, descripcion, precio, precio_costo, precio_por_docena, tamano, categoria_id, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
          [f.nombre, f.descripcion, f.precio, f.precio_costo, f.precio_por_docena, f.tamano, categoriaId],
        );
        productoId = ins.rows[0].id;
        creados++;
      }

      const invExistente = await client.query(
        'SELECT id FROM inventario WHERE producto_id = $1',
        [productoId],
      );
      if (invExistente.rows.length > 0) {
        await client.query('UPDATE inventario SET cantidad = $1 WHERE producto_id = $2', [
          f.stock,
          productoId,
        ]);
      } else {
        await client.query(
          'INSERT INTO inventario (producto_id, cantidad, cantidad_minima) VALUES ($1, $2, $3)',
          [productoId, f.stock, f.cantidad_minima ?? 5],
        );
      }
    } catch (e) {
      console.error(`Fila ${i + 2} ERROR (${f.nombre}): ${e.message}`);
      errores++;
    }
  }

  console.log(`\nListo ✅  Creados: ${creados} | Actualizados: ${actualizados} | Errores: ${errores}`);
  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
