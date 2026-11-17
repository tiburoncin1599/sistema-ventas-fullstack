import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleIdToUsers1717000000009 implements MigrationInterface {
  name = 'AddGoogleIdToUsers1717000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "google_id" varchar(255)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "google_id"`,
    );
  }
}