import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persiste el factor de conversión y las unidades físicas de cada ítem, y
 * permite overridear el factor por producto desde el catálogo.
 */
export class AddConversionPaquetesDetallePedido1717000000019
  implements MigrationInterface
{
  name = 'AddConversionPaquetesDetallePedido1717000000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "detalle_pedido"
      ADD COLUMN IF NOT EXISTS "unidades" INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "factor_conversion" INTEGER NOT NULL DEFAULT 1
    `);

    // Los detalles existentes son históricos: 1 presentación = 1 unidad.
    await queryRunner.query(`
      UPDATE "detalle_pedido"
      SET "unidades" = "cantidad", "factor_conversion" = 1
    `);

    await queryRunner.query(`
      ALTER TABLE "productos"
      ADD COLUMN IF NOT EXISTS "factor_paquete" INTEGER
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "productos" DROP COLUMN IF EXISTS "factor_paquete"
    `);
    await queryRunner.query(`
      ALTER TABLE "detalle_pedido"
      DROP COLUMN IF EXISTS "factor_conversion",
      DROP COLUMN IF EXISTS "unidades"
    `);
  }
}
