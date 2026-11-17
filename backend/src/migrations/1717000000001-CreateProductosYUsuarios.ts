import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductosYUsuarios1717000000001 implements MigrationInterface {
  name = 'CreateProductosYUsuarios1717000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "productos" (
        "id" SERIAL NOT NULL,
        "nombre" VARCHAR(200) NOT NULL,
        "descripcion" TEXT,
        "precio" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "stock" INTEGER NOT NULL DEFAULT 0,
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "imagen_url" VARCHAR(500),
        "categoria" VARCHAR(100),
        "codigo" VARCHAR(50),
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_productos" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_productos_nombre" ON "productos" ("nombre")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_productos_codigo" ON "productos" ("codigo")
    `);

    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id" SERIAL NOT NULL,
        "nombre" VARCHAR(100) NOT NULL,
        "email" VARCHAR(150) NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "rol" VARCHAR(50) NOT NULL DEFAULT 'cliente',
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_usuarios" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_usuarios_email" ON "usuarios" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_usuarios_rol" ON "usuarios" ("rol")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_usuarios_rol"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_usuarios_email"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_productos_codigo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_productos_nombre"`);
    await queryRunner.query(`DROP TABLE "productos"`);
  }
}