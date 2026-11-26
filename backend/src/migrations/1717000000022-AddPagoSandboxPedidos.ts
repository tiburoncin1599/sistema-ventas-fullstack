import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persiste el resultado de un pago simulado (Sandbox) sin inventar un nuevo
 * valor para `tipo_pago`: la transacción se contabiliza como CONTADO y la
 * referencia queda disponible para facturas, comprobantes e idempotencia.
 */
export class AddPagoSandboxPedidos1717000000022 implements MigrationInterface {
  name = 'AddPagoSandboxPedidos1717000000022';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pedidos"
      ADD COLUMN IF NOT EXISTS "monto_pagado" NUMERIC(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "fecha_pago" TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS "referencia_transaccion" VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS "metodo_pago" VARCHAR(30) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "deudas"
      ADD COLUMN IF NOT EXISTS "referencia_transaccion" VARCHAR(100) NULL
    `);

    // Históricos: lo que ya estaba saldado en la deuda o era contado entregado
    // pasa a reflejarse también en el pedido para que los comprobantes coincidan.
    await queryRunner.query(`
      UPDATE "pedidos" p
      SET "monto_pagado" = LEAST(
        GREATEST(COALESCE(d."monto_pagado", 0), 0),
        p."total"
      ),
      "fecha_pago" = COALESCE(d."fecha_pago", p."fecha_pago")
      FROM "deudas" d
      WHERE d."pedido_id" = p."id"
    `);

    await queryRunner.query(`
      UPDATE "pedidos" p
      SET "monto_pagado" = p."total",
          "fecha_pago" = COALESCE(p."fecha_pago", p."actualizado_en")
      WHERE p."estado" = 'entregado'
        AND p."tipo_pago" = 'CONTADO'
        AND p."monto_pagado" = 0
        AND NOT EXISTS (
          SELECT 1 FROM "deudas" d WHERE d."pedido_id" = p."id"
        )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pedidos_referencia_pago"
      ON "pedidos" ("referencia_transaccion")
      WHERE "referencia_transaccion" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_pedidos_referencia_pago"
    `);
    await queryRunner.query(`
      ALTER TABLE "deudas" DROP COLUMN IF EXISTS "referencia_transaccion"
    `);
    await queryRunner.query(`
      ALTER TABLE "pedidos"
      DROP COLUMN IF EXISTS "metodo_pago",
      DROP COLUMN IF EXISTS "referencia_transaccion",
      DROP COLUMN IF EXISTS "fecha_pago",
      DROP COLUMN IF EXISTS "monto_pagado"
    `);
  }
}
