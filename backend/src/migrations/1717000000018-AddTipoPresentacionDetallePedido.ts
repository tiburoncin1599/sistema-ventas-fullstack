import { MigrationInterface, QueryRunner } from 'typeorm';

/** Registra si cada ítem se pide por UNIDAD (mín. 3) o PAQUETE (mín. 1). */
export class AddTipoPresentacionDetallePedido1717000000018
  implements MigrationInterface
{
  name = 'AddTipoPresentacionDetallePedido1717000000018';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "detalle_pedido"
      ADD COLUMN IF NOT EXISTS "tipo_presentacion" VARCHAR(10) NOT NULL DEFAULT 'UNIDAD'
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CHK_detalle_pedido_tipo_presentacion'
        ) THEN
          ALTER TABLE "detalle_pedido"
          ADD CONSTRAINT "CHK_detalle_pedido_tipo_presentacion"
          CHECK ("tipo_presentacion" IN ('UNIDAD', 'PAQUETE'));
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "detalle_pedido"
      DROP CONSTRAINT IF EXISTS "CHK_detalle_pedido_tipo_presentacion"
    `);
    await queryRunner.query(`
      ALTER TABLE "detalle_pedido" DROP COLUMN IF EXISTS "tipo_presentacion"
    `);
  }
}
