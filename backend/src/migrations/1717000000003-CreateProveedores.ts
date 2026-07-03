import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProveedores1717000000003 implements MigrationInterface {
  name = 'CreateProveedores1717000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "proveedores" (
        "id" SERIAL NOT NULL,
        "nombre" VARCHAR(200) NOT NULL,
        "nit" VARCHAR(20),
        "telefono" VARCHAR(50),
        "email" VARCHAR(100),
        "direccion" VARCHAR(200),
        "contacto_nombre" VARCHAR(200),
        "contacto_telefono" VARCHAR(50),
        "notas" VARCHAR(500),
        "activo" BOOLEAN DEFAULT TRUE,
        "creado_en" TIMESTAMP NOT NULL DEFAULT NOW(),
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_proveedores" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "proveedores"`);
  }
}
