import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Categoriza el catálogo de limpieza en líneas reconocibles sin tocar la
 * lógica de conversión de paquetes (`factorConversionPorNombre` sigue igual).
 *
 * Es idempotente: inserta cada categoría sólo si no existe (comparación
 * insensible a mayúsculas) y solo reasigna productos que no tenían categoría o
 * que estaban en la categoría genérica "Limpieza". Así no se pisan
 * reclasificaciones hechas a mano desde el panel de administración.
 */
export class CategoriasProductosGranulares1717000000020
  implements MigrationInterface
{
  name = 'CategoriasProductosGranulares1717000000020';

  private static readonly NOMBRES = [
    'Hogar',
    'Desinfección',
    'Alcohol en Gel',
    'Lavandina',
    'Pisos',
    'Antigrasa',
    'Limpiavidrios',
    'Limpia Baños',
    'Lavavajillas',
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO categorias (nombre, descripcion)
      SELECT m.nombre, m.descripcion
      FROM (VALUES
        ('Hogar', 'Artículos de uso general para el hogar'),
        ('Desinfección', 'Productos de desinfección y saneamiento'),
        ('Alcohol en Gel', 'Alcohol en gel y cuidado de manos'),
        ('Lavandina', 'Lavandina y cloro'),
        ('Pisos', 'Limpiadores de pisos'),
        ('Antigrasa', 'Desengrasantes y antigrasa'),
        ('Limpiavidrios', 'Limpiadores de vidrios'),
        ('Limpia Baños', 'Limpiadores de baños'),
        ('Lavavajillas', 'Lavavajillas')
      ) AS m(nombre, descripcion)
      WHERE NOT EXISTS (
        SELECT 1 FROM categorias c
        WHERE LOWER(c.nombre) = LOWER(m.nombre)
      )
    `);

    await queryRunner.query(`
      WITH mapeo(nombre_categoria, patron_producto) AS (
        VALUES
          ('Alcohol en Gel', 'Alcohol en Gel%'),
          ('Limpia Baños', 'Limpia Baños%'),
          ('Antigrasa', 'Antigrasa%'),
          ('Lavandina', 'Lavandina%'),
          ('Pisos', 'Piso %'),
          ('Lavavajillas', 'Lavavajillas%'),
          ('Limpiavidrios', 'Limpia Vidrios%')
      )
      UPDATE productos p
      SET categoria_id = c.id
      FROM mapeo m
      JOIN categorias c ON LOWER(c.nombre) = LOWER(m.nombre_categoria)
      WHERE p.nombre ILIKE m.patron_producto
        AND (
          p.categoria_id IS NULL
          OR EXISTS (
            SELECT 1 FROM categorias categoria_actual
            WHERE categoria_actual.id = p.categoria_id
              AND LOWER(categoria_actual.nombre) = 'limpieza'
          )
        )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const nombres = CategoriasProductosGranulares1717000000020.NOMBRES.map(
      (nombre) => `'${nombre}'`,
    ).join(', ');

    await queryRunner.query(`
      UPDATE productos p
      SET categoria_id = limpieza.id
      FROM categorias limpieza
      WHERE LOWER(limpieza.nombre) = 'limpieza'
        AND EXISTS (
          SELECT 1 FROM categorias granular
          WHERE granular.id = p.categoria_id
            AND granular.nombre IN (${nombres})
        )
    `);

    await queryRunner.query(`
      DELETE FROM categorias c
      WHERE c.nombre IN (${nombres})
        AND NOT EXISTS (
          SELECT 1 FROM productos p WHERE p.categoria_id = c.id
        )
    `);
  }
}
