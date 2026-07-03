import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConfiguracion1717000000001 implements MigrationInterface {
  name = 'CreateConfiguracion1717000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "configuracion" (
        "id" SERIAL NOT NULL,
        "nombre_empresa" VARCHAR(200),
        "logo_url" VARCHAR(500),
        "moneda" VARCHAR(20) DEFAULT 'Bs',
        "moneda_simbolo" VARCHAR(20),
        "impuesto_porcentaje" DECIMAL(5,2) DEFAULT 0,
        "nit" VARCHAR(20),
        "direccion" VARCHAR(200),
        "telefono" VARCHAR(50),
        "whatsapp" VARCHAR(50),
        "email_empresa" VARCHAR(100),
        "qr_bancario_url" VARCHAR(500),
        "terminos_condiciones" VARCHAR(500),
        "notificaciones_stock" BOOLEAN DEFAULT TRUE,
        "stock_minimo_alerta" INTEGER DEFAULT 5,
        "modo_oscuro" BOOLEAN DEFAULT FALSE,
        CONSTRAINT "PK_configuracion" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "configuracion" ("id", "nombre_empresa", "moneda")
      VALUES (1, 'SUPER ACTIVO', 'Bs')
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "configuracion"`);
  }
}
