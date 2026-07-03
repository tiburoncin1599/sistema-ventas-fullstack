import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokens1717000000004 implements MigrationInterface {
  name = 'CreateRefreshTokens1717000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" SERIAL NOT NULL,
        "usuario_id" INTEGER NOT NULL,
        "token" VARCHAR(500) NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "revocado" BOOLEAN DEFAULT FALSE,
        "creado_en" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_usuario" ON "refresh_tokens" ("usuario_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
