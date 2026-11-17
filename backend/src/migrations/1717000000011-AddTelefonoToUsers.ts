import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelefonoToUsers1717000000011 implements MigrationInterface {
  name = 'AddTelefonoToUsers1717000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "telefono" varchar(255)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "telefono"`,
    );
  }
}