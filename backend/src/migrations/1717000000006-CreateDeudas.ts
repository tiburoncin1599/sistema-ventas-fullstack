import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeudas1717000000006 implements MigrationInterface {
  name = 'CreateDeudas1717000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "deudas" (
        "id" SERIAL NOT NULL,
        "monto" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "fecha_vencimiento" TIMESTAMP,
        "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
        "descripcion" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_deudas" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_deudas_estado" ON "deudas" ("estado")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_deudas_estado"`);
    await queryRunner.query(`DROP TABLE "deudas"`);
  }
}