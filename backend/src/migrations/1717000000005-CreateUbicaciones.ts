import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUbicaciones1717000000005 implements MigrationInterface {
  name = 'CreateUbicaciones1717000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vendedor_ubicaciones" (
        "id" SERIAL NOT NULL,
        "usuario_id" INTEGER NOT NULL,
        "latitud" DOUBLE PRECISION NOT NULL,
        "longitud" DOUBLE PRECISION NOT NULL,
        "precision" DOUBLE PRECISION,
        "creado_en" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_vendedor_ubicaciones" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_vendedor_ubicaciones_usuario" ON "vendedor_ubicaciones" ("usuario_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_vendedor_ubicaciones_creado" ON "vendedor_ubicaciones" ("creado_en")
    `);
    await queryRunner.query(`
      CREATE TABLE "seguimientos" (
        "usuario_id" INTEGER NOT NULL,
        "activo" BOOLEAN NOT NULL DEFAULT FALSE,
        "iniciado_en" TIMESTAMP,
        "ultima_actualizacion_en" TIMESTAMP,
        "latitud" DOUBLE PRECISION,
        "longitud" DOUBLE PRECISION,
        "precision" DOUBLE PRECISION,
        CONSTRAINT "PK_seguimientos" PRIMARY KEY ("usuario_id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "seguimientos"`);
    await queryRunner.query(`DROP TABLE "vendedor_ubicaciones"`);
  }
}
