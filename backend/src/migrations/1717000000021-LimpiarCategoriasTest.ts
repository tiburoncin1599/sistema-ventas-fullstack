import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Elimina categorías huérfanas creadas por corridas E2E antiguas
 * (p. ej. "Categ Actualizada 1788535717400"). Solo borra nombres con el
 * patrón de prueba y sin productos asociados, para no tocar reclasificaciones
 * reales ni categorías válidas del catálogo PROLIMAC. Es idempotente.
 */
export class LimpiarCategoriasTest1717000000021 implements MigrationInterface {
  name = 'LimpiarCategoriasTest1717000000021';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM categorias c
      WHERE c.nombre ~* '^Categ(or[ií]a)? (Test|Actualizada|Prueba) [0-9]{10,}$'
        AND NOT EXISTS (
          SELECT 1 FROM productos p WHERE p.categoria_id = c.id
        )
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // No es seguro reconstruir los nombres originales: los únicos registros
    // borrados son categorías de prueba que no tenían productos asociados.
  }
}
