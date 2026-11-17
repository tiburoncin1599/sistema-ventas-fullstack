import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePasswordColumn1717000000010 implements MigrationInterface {
  name = 'RenamePasswordColumn1717000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('usuarios');

    if (!tableExists) {
      throw new Error('La tabla "usuarios" no existe.');
    }

    const passwordExists = await queryRunner.hasColumn('usuarios', 'password');
    const passwordHashExists = await queryRunner.hasColumn('usuarios', 'password_hash');

    if (passwordExists && !passwordHashExists) {
      await queryRunner.query(
        'ALTER TABLE "usuarios" RENAME COLUMN "password" TO "password_hash"',
      );
      return;
    }

    if (!passwordExists && passwordHashExists) {
      return;
    }

    if (!passwordExists && !passwordHashExists) {
      throw new Error(
        'No existen las columnas "password" ni "password_hash" en "usuarios".',
      );
    }

    throw new Error(
      'Existen ambas columnas "password" y "password_hash". Se requiere revisión manual.',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('usuarios');

    if (!tableExists) {
      throw new Error('La tabla "usuarios" no existe.');
    }

    const passwordExists = await queryRunner.hasColumn('usuarios', 'password');
    const passwordHashExists = await queryRunner.hasColumn('usuarios', 'password_hash');

    if (!passwordExists && passwordHashExists) {
      await queryRunner.query(
        'ALTER TABLE "usuarios" RENAME COLUMN "password_hash" TO "password"',
      );
      return;
    }

    if (passwordExists && !passwordHashExists) {
      return;
    }

    throw new Error(
      'No se puede revertir la migración: estructura inesperada en la tabla "usuarios".',
    );
  }
}
