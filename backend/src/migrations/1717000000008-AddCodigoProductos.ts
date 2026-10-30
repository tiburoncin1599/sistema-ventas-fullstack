import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega la columna `codigo` a la tabla `productos`.
 *
 * El servicio de punto de venta (`pos.service.ts`) busca productos por nombre
 * o por código, y el POS registra la venta escribiendo el código leído en el
 * producto o etiqueta. La columna no existía en la entidad, por lo que la
 * consulta fallaba en tiempo de ejecución.
 *
 * La columna es nullable para no romper los productos ya registrados, y el
 * índice es único: PostgreSQL admite varios NULL en una columna única, de modo
 * que los productos que todavía no tienen código siguen siendo válidos.
 *
 * `up` es idempotente: si la columna o el índice ya existen, no falla. Esto
 * importa porque el esquema de algunas bases se genera con `synchronize`, que
 * ya crea la columna a partir de la entidad, y en ese caso correr la migración
 * debe ser inocuo.
 *
 * La carga de códigos de los productos que la empresa ya tiene anotados en sus
 * planillas se hace por `scripts/importar-productos.cjs`, que acepta la columna
 * opcional `codigo`. Un producto sin código sigue apareciendo en la búsqueda
 * del punto de venta por nombre; solo deja de poder leerse por código.
 *
 * La BD de PRUEBA se actualiza regenerando el esquema con
 * `node scripts/crear-schema-test.cjs` (synchronize en localhost:5433).
 * Esta migración queda registrada para el próximo despliegue en producción
 * y es no destructiva (solo agrega una columna nullable con su índice).
 */
export class AddCodigoProductos1717000000008 implements MigrationInterface {
  name = 'AddCodigoProductos1717000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "codigo" varchar(50)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_productos_codigo" ON "productos" ("codigo")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_productos_codigo"`);
    await queryRunner.query(
      `ALTER TABLE "productos" DROP COLUMN IF EXISTS "codigo"`,
    );
  }
}