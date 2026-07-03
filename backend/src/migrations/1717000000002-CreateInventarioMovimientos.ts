import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventarioMovimientos1717000000002 implements MigrationInterface {
  name = 'CreateInventarioMovimientos1717000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inventario_movimientos" (
        "id" SERIAL NOT NULL,
        "producto_id" INTEGER NOT NULL,
        "tipo" VARCHAR(20) NOT NULL,
        "cantidad" INTEGER NOT NULL,
        "cantidad_anterior" INTEGER,
        "cantidad_nueva" INTEGER,
        "costo_unitario" DECIMAL(10,2),
        "motivo" VARCHAR(255),
        "referencia_id" INTEGER,
        "referencia_tipo" VARCHAR(50),
        "usuario_id" INTEGER,
        "creado_en" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_inventario_movimientos" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_movimientos_producto_id" ON "inventario_movimientos" ("producto_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "inventario_movimientos"
      ADD CONSTRAINT "FK_movimientos_producto"
      FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inventario_movimientos"
      ADD CONSTRAINT "FK_movimientos_usuario"
      FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_movimientos_producto_id"`);
    await queryRunner.query(`ALTER TABLE "inventario_movimientos" DROP CONSTRAINT "FK_movimientos_usuario"`);
    await queryRunner.query(`ALTER TABLE "inventario_movimientos" DROP CONSTRAINT "FK_movimientos_producto"`);
    await queryRunner.query(`DROP TABLE "inventario_movimientos"`);
  }
}
