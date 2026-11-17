import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUbicacionToUsers1717000000013 implements MigrationInterface {
  name = 'AddUbicacionToUsers1717000000013';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "ubicacion" varchar(255)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "ubicacion"`,
    );
  }
}