import { MigrationInterface, QueryRunner } from 'typeorm';

/** Sprint 4 — trazabilidad de notificaciones enviadas por WhatsApp. */
export class CreateNotificacionesHistorial1717000000015
  implements MigrationInterface
{
  name = 'CreateNotificacionesHistorial1717000000015';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notificaciones_historial" (
        "id" SERIAL NOT NULL,
        "tipo" VARCHAR(30) NOT NULL,
        "destinatario_telefono" VARCHAR(30),
        "mensaje" TEXT NOT NULL,
        "estado" VARCHAR(20) NOT NULL,
        "usuario_id" INTEGER,
        "creado_en" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_notificaciones_historial" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notificaciones_historial_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notificaciones_historial_tipo"
      ON "notificaciones_historial" ("tipo")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notificaciones_historial_creado_en"
      ON "notificaciones_historial" ("creado_en")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notificaciones_historial_creado_en"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notificaciones_historial_tipo"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notificaciones_historial"`);
  }
}
