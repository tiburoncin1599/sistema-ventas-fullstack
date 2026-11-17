import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCarnetToUsers1717000000012 implements MigrationInterface {
  name = 'AddCarnetToUsers1717000000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "carnet" varchar(50)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "carnet"`,
    );
  }
}