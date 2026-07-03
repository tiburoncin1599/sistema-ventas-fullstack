import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditoria1717000000000 implements MigrationInterface {
  name = 'CreateAuditoria1717000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auditoria" (
        "id" SERIAL NOT NULL,
        "accion" VARCHAR(50) NOT NULL,
        "entidad" VARCHAR(100) NOT NULL,
        "entidad_id" INTEGER,
        "valor_anterior" JSONB,
        "valor_nuevo" JSONB,
        "usuario_id" INTEGER,
        "usuario_nombre" VARCHAR(100),
        "usuario_rol" VARCHAR(50),
        "ip" VARCHAR(45),
        "creado_en" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_auditoria" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auditoria_accion" ON "auditoria" ("accion")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auditoria_usuario_id" ON "auditoria" ("usuario_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_auditoria_usuario_id"`);
    await queryRunner.query(`DROP INDEX "IDX_auditoria_accion"`);
    await queryRunner.query(`DROP TABLE "auditoria"`);
  }
}
