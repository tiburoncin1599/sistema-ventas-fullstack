import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClienteVisitas1717000000006 implements MigrationInterface {
  name = 'CreateClienteVisitas1717000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cliente_visitas" (
        "id" SERIAL NOT NULL,
        "vendedor_id" INTEGER NOT NULL,
        "cliente_id" INTEGER,
        "nombre_cliente" VARCHAR(150) NOT NULL,
        "pedido_id" INTEGER,
        "latitud" DOUBLE PRECISION NOT NULL,
        "longitud" DOUBLE PRECISION NOT NULL,
        "precision" DOUBLE PRECISION,
        "dias_visita" TEXT NOT NULL DEFAULT '',
        "creado_en" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_cliente_visitas" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_cliente_visitas_vendedor" ON "cliente_visitas" ("vendedor_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_cliente_visitas_creado" ON "cliente_visitas" ("creado_en")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_cliente_visitas_pedido" ON "cliente_visitas" ("pedido_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cliente_visitas"`);
  }
}
