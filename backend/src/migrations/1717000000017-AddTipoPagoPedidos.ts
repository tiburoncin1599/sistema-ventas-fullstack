import { MigrationInterface, QueryRunner } from 'typeorm';

/** Persiste el tipo de pago del pedido y lo acota a CONTADO / CREDITO. */
export class AddTipoPagoPedidos1717000000017 implements MigrationInterface {
  name = 'AddTipoPagoPedidos1717000000017';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pedidos"
      ADD COLUMN IF NOT EXISTS "tipo_pago" VARCHAR(10) NOT NULL DEFAULT 'CONTADO'
    `);

    // Pedidos históricos con saldo pendiente se clasifican como crédito.
    await queryRunner.query(`
      UPDATE "pedidos" p
      SET "tipo_pago" = 'CREDITO'
      WHERE EXISTS (
        SELECT 1 FROM "deudas" d
        WHERE d."pedido_id" = p."id" AND d."estado" <> 'pagado'
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CHK_pedidos_tipo_pago'
        ) THEN
          ALTER TABLE "pedidos"
          ADD CONSTRAINT "CHK_pedidos_tipo_pago"
          CHECK ("tipo_pago" IN ('CONTADO', 'CREDITO'));
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pedidos" DROP CONSTRAINT IF EXISTS "CHK_pedidos_tipo_pago"
    `);
    await queryRunner.query(`
      ALTER TABLE "pedidos" DROP COLUMN IF EXISTS "tipo_pago"
    `);
  }
}
