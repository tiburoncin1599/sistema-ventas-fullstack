/* Setup de la suite E2E.
 *
 * La suite E2E CREA datos de prueba (usuarios, productos, pedidos, deudas...).
 * Para no contaminar la BD de producción, esta suite:
 *   1) Si existe test/.env.test → la carga ANTES de que AppModule lea DATABASE_URL.
 *   2) Si no existe → aborta la ejecución, salvo que E2E_ALLOW=1 lo fuerce.
 */
import { existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

const envTest = join(__dirname, '.env.test');
const tieneEnvTest = existsSync(envTest);

if (tieneEnvTest) {
  config({ path: envTest, override: true });
}

const permitido = tieneEnvTest || process.env.E2E_ALLOW === '1';

if (!permitido) {
  throw new Error(
    [
      '[E2E] La suite de pruebas crea datos de prueba y NO debe ejecutarse contra la BD de producción.',
      'Creá una base de datos de prueba y configurá backend/test/.env.test (ver test/.env.test.example).',
      'Si sabés lo que hacés, podés forzarla con E2E_ALLOW=1.',
    ].join('\n'),
  );
}

// Red de seguridad: bloquea explícitamente la BD de producción de Prolimac (Neon).
const url = process.env.DATABASE_URL ?? '';
if (/neon\.tech/i.test(url) && !/localhost|127\.0\.0\.1/.test(url) && process.env.E2E_ALLOW !== '1') {
  throw new Error(
    '[E2E] DATABASE_URL apunta a Neon (producción). Usá la BD de prueba local (test/.env.test).',
  );
}