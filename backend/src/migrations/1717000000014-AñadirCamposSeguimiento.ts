import { MigrationInterface, QueryRunner } from 'typeorm';

export class AñadirCamposSeguimiento1717000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pedidos
      ADD COLUMN tipo_identificador varchar(20) NOT NULL DEFAULT 'publico',
      ADD COLUMN identificador_publico varchar(255),
      ADD COLUMN historial_estados jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN actualizado_en timestamp WITH TIME ZONE NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pedidos
      DROP COLUMN tipo_identificador,
      DROP COLUMN identificador_publico,
      DROP COLUMN historial_estados,
      DROP COLUMN actualizado_en
    `);
  }
}