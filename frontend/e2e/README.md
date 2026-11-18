# E2E — PROLIMAC SRL (Playwright)

## Requisitos

Stack levantado (los tests usan datos reales del entorno local):

```bash
cd ..
docker compose up -d --build
```

En `frontend/`:

```bash
npm install
npx playwright install chromium   # una sola vez
npm run test:e2e
```

URLs (configurables con `E2E_FRONTEND_URL` / `E2E_BACKEND_URL`):

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001` (`/health`)

## Casos cubiertos

| Spec | Verificación |
|------|--------------|
| `roles.spec.ts` | ADMIN ve el panel completo; VENDEDOR solo POS/ventas (y login real por `/ventas/login`); INVENTARIO ve stock/movimientos; CLIENTE ve catálogo. Se comprueban también respuestas 200/403 de la API. |
| `venta-stock.spec.ts` | Venta al contado desde el POS, stock de 12 → 7 verificado por API y por UI, alerta visual `Stock bajo` cuando `<= 10`, y presencia en `GET /inventario/alertas`. |
| `comprobantes.spec.ts` | PDF invocado desde el modal de fin de venta y desde `/ventas/pedidos`; `application/pdf`, `%PDF`, `Content-Disposition` correcto, acceso del cliente dueño y 401 sin token. |
| `admin-productos-stock.spec.ts` | Edición de **Stock Actual** desde `/admin/productos`: badge actualizado, ajuste de `inventario.cantidad` y movimiento `AJUSTE` en el Kardex con motivo `Ajuste manual desde edición de producto`. |

## Sesiones y datos

- `global-setup.ts` valida ambos servicios y crea `e2e/.auth/{admin,ventas,inventario,cliente}.json`
  con `storageState` (cookies + localStorage). Los tokens se reutilizan mientras
  no estén próximos a expirar, para no disparar el throttler de `POST /auth/login`.
- `beforeAll` crea productos con nombres únicos (`E2E Stock <ts>`, `E2E PDF <ts>`,
  `E2E Ajuste <ts>`) y stock conocido.
- **Teardown automático:** cada spec que siembra datos tiene un `test.afterAll`
  que llama a `DELETE /productos/e2e` (solo `admin`). Ese endpoint eliminó
  transaccionalmente los productos `E2E %`, su inventario, movimientos y los
  pedidos **exclusivamente** vinculados a ellos. `global-teardown.ts` repite la
  limpieza como red de seguridad si una corrida se interrumpe. Los productos
  reales y los pedidos mixtos nunca se tocan.
- Limpieza manual equivalente: `scripts/limpiar-e2e.sql` (ver raíz del repo).
- Un solo worker (`workers: 1`) porque las pruebas de venta mutan stock real.

## Reportes

```bash
npm run test:e2e:report   # abre el reporte HTML generado en playwright-report/
```

Los resultados, videos y trazas se guardan en `test-results/` (ignorados por git).
