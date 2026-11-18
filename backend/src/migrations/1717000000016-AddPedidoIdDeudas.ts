import { MigrationInterface, QueryRunner } from 'typeorm';

/** Vincula cada deuda con el pedido que la originó (crédito / pago parcial). */
export class AddPedidoIdDeudas1717000000016 implements MigrationInterface {
  name = 'AddPedidoIdDeudas1717000000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "deudas"
      ADD COLUMN IF NOT EXISTS "pedido_id" INTEGER
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_deudas_pedido_id"
      ON "deudas" ("pedido_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deudas_pedido_id"`);
    await queryRunner.query(`
      ALTER TABLE "deudas" DROP COLUMN IF EXISTS "pedido_id"
    `);
  }
}
