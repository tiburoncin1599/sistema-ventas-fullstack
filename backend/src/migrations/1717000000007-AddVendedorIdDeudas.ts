import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega la columna `vendedor_id` (personal que registra/gestiona la deuda)
 * a la tabla `deudas`. Es nullable para no romper los registros existentes.
 *
 * La BD de PRUEBA se actualiza regenerando el esquema con
 * `node scripts/crear-schema-test.cjs` (synchronize en localhost:5433).
 * Esta migración queda registrada para el próximo despliegue en producción
 * y es no destructiva (solo agrega una columna nullable).
 */
export class AddVendedorIdDeudas1717000000007 implements MigrationInterface {
  name = 'AddVendedorIdDeudas1717000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deudas" ADD COLUMN "vendedor_id" INTEGER`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_deudas_vendedor" ON "deudas" ("vendedor_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_deudas_vendedor"`);
    await queryRunner.query(
      `ALTER TABLE "deudas" DROP COLUMN "vendedor_id"`,
    );
  }
}