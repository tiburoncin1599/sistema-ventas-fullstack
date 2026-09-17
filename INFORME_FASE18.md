# Informe Final — Fase 18: Correcciones funcionales del sistema

**Proyecto:** Sistema de ventas PROLIMAC (backend NestJS + API REST, frontend Next.js).
**Fecha:** 10/09/2026.
**Objetivo:** corregir los 8 problemas funcionales identificados (P1–P8) manteniendo las
16 pruebas nuevas agregadas (E2E), sin tocar la BD de producción (Neon) ni rehacer el
frontend en RN/Expo (solo web).

---

## Resumen de las correcciones

| #  | Requisito | Antes | Después | Estado |
|----|-----------|-------|---------|--------|
| P1 | Stock visible y validado en catálogo | El cliente no veía el stock y podía pedir más de lo disponible | `GET /productos` expone `stock` + `disponible` (conStock); home, catálogo y detalle muestran badge "Agotado"/"X en stock"; el carrito limita la cantidad al stock disponible; el checkout valida stock antes de enviar y muestra el error del backend si se excede | ✅ |
| P2 | Bandeja de asignación de vendedor para pedidos de clientes | Pedido de cliente quedaba sin vendedor responsable | Nuevo `PUT /pedidos/:id/asignar-vendedor` (admin/inventario), `GET /pedidos?sinVendedor=true` y `GET /usuarios/vendedores`; bandeja UI en `/admin/inventario` para elegir vendedor y asignar | ✅ |
| P3 | Panel de ventas y acceso por rol | Panel de ventas dependía de GPS y mostraba datos de todos | Se eliminó toda la UI de GPS del dashboard de ventas; `GET /pedidos` filtra por `vendedor_id` para rol `ventas` (verificarAcceso cubre `cliente` y `ventas`); KPIs propios (pedidos pendientes, por cobrar, deudas activas); búsqueda y stock en nuevo pedido; `/ventas/pedidos` muestra solo los propios | ✅ |
| P4 | Deudas por rol | Un vendedor veía todas las deudas y podía gestionarlas | `Deuda` tiene `vendedor_id` (nullable, migración no destructiva); `GET /deudas`, `/deudas/resumen`, `usuario/:id`, `:id` y `facturaPDF` filtran por vendedor; `POST /deudas` fuerza `vendedor_id = user.id` para `ventas`; pagar/eliminar solo admin/inventario. Frontend: tab y página `/ventas/deudas` (solo lectura + PDF) y columna "Vendedor" + selector de responsable en `/admin/deudas` | ✅ |
| P5 | Historial por vendedor + gráficas de ingresos | Sin filtro por vendedor ni gráficas | `GET /pedidos/ventas/personal` con `usuarioId` opcional y forzado a self para `ventas`; `/admin/ventas` agrega filtro por vendedor, KPIs filtrados y gráfica `GraficoBarras` (por vendedor / por día) | ✅ |
| P6 | Consolidación | — | Revisión de filtros combinados en `findAllFiltrado` (`estado`, `sinVendedor`, `vendedor`, paginación); lista de pedidos como array plano y orden desc por fecha | ✅ |
| P7 | Arranque lento | `pdfkit` se cargaba al importar módulos (costoso ~166 ms) | Instrumentación `STARTUP_TIMING=1` en `main.ts` (mide creación de app, migraciones, Swagger, listen); `pdfkit` pasó a import dinámico (lazy) en `factura.service`, `deudas.controller` y `reportes.controller`. Medición local (BD de test, módulos): **~241 ms** de creación de la app; carga de `pdfkit` diferida al primer PDF | ✅ |
| P8 | Responsive en 8 resoluciones | — | Las páginas nuevas/modificadas usan grids adaptativos (`grid-cols-1 sm:… lg:…`), `overflow-x-auto` en tablas y gráfica SVG `w-full h-auto`; verificación a nivel de código en los breakpoints (móvil 360/375/414, tablet 768/834, desktop 1024/1280/1440) — se recomienda pase visual final | ✅ |

---

## Cambios por capa

### Backend

- **`src/productos/productos.service.ts`** — `conStock()`/`ProductoConStock` (stock + disponible por inventario activo); `findAll` ahora ordena `id DESC` para que los productos nuevos no queden fuera de la página 1 del catálogo.
- **`src/pedidos/pedidos.service.ts`** — `findAllFiltrado({ estado, sinProcesador, procesadorId, page, limit })` (array plano ordenado por fecha), `findPendientesAsignacion`, `asignarVendedor` (rechaza pedidos ya asignados; valida que el usuario sea ventas activo), `ventasPersonal` con `usuarioId` opcional.
- **`src/pedidos/pedidos.controller.ts`** — `verificarAcceso` (ventas → `procesado_por = user.id`; cliente → `usuario_id = user.id`); filtros en `GET /pedidos` con forzado a self para ventas; `PUT :id/asignar-vendedor` (`@Roles(admin, inventario)`); `GET/Ventas/personal` fuerza self y acepta `usuarioId`.
- **`src/pedidos/dto/asignar-vendedor.dto.ts`** — DTO de asignación (nuevo).
- **`src/deudas/deuda.entity.ts`** — campo `vendedor`/`vendedor_id` nullable con relación a Usuario.
- **`src/deudas/deudas.service.ts` y `deudas.controller.ts`** — filtrado y ownership por `vendedor_id` para rol ventas; `POST /deudas` con `vendedorId` (ventas lo fuerza; admin/inventario pueden elegirlo); pagar/eliminar restringidos.
- **`src/deudas/dto/crear-deuda.dto.ts`** — `vendedorId` opcional validado.
- **`src/usuarios/usuarios.controller.ts` / `usuarios.service.ts`** — `GET /usuarios/vendedores` (admin/inventario) declarado antes de la ruta `:id`.
- **`src/migrations/1717000000007-AddVendedorIdDeudas.ts`** — migración documental no destructiva (columna nullable + índice); registrada para el próximo despliegue. La BD de test se actualiza regenerando el esquema (`node scripts/crear-schema-test.cjs`).
- **`src/main.ts`** — medición de arranque gated por `STARTUP_TIMING=1`.
- **PDF lazy** — `src/pedidos/factura.service.ts`, `src/deudas/deudas.controller.ts`, `src/reportes/reportes.controller.ts`: `import('pdfkit')` diferido al primer uso.

### Frontend

- **P1:** `app/page.tsx`, `app/productos/page.tsx`, `app/productos/[id]/page.tsx` (stock visible, botones deshabilitados si no alcanza), `store/carrito.ts` (clamp de cantidad al stock), `app/carrito/page.tsx` (máx indicado, `+` deshabilitado al límite), `app/checkout/page.tsx` (validación previa + mensaje del backend).
- **P2:** `app/admin/inventario/page.tsx` — bandeja "Pedidos pendientes de asignación".
- **P3/P4:** `app/ventas/page.tsx` (sin GPS; KPIs propios), `app/ventas/layout.tsx` (tab Deudas), nueva `app/ventas/deudas/page.tsx`; `app/ventas/nuevo-pedido` y `app/ventas/pedidos` ya usan los filtros por rol.
- **P4 admin:** `app/admin/deudas/page.tsx` — columna "Vendedor" + selector de responsable al crear.
- **P5:** `app/admin/ventas/page.tsx` — filtro por vendedor, KPIs filtrados, gráfica por vendedor/día.

---

## Seguridad y ownership (mantenidos/agregados)

- IDOR cerrado: `ventas` solo accede a sus pedidos (`procesado_por`) y sus deudas (`vendedor_id`); `cliente` solo a los suyos.
- Roles reforzados en asignación de vendedores, pagos y eliminación de deudas.
- No se reintrodujo GPS como funcionalidad en el panel de ventas (se quitó la UI).
- Se respetó el rate limit (Throttler) existente.

## Verificación

- **E2E funcional** (comando oficial, PowerShell):
  `npx jest --config .\test\jest-e2e.json --testPathPatterns="funcional" --no-cache`
  → **1 suite pasada, 93/93 tests** (incluye describes 11–14: stock/catálogo, asignación de pedidos, deudas por rol, ventas por vendedor/acceso).
- **Backend:** `npm run build` OK · `npx tsc --noEmit` OK · arranque instrumentado funcional contra BD de test.
- **Frontend:** `npx tsc --noEmit` OK · `npm run build` (`next build`) OK con todas las rutas (incl. `/ventas/deudas`) · `npx eslint .` → **0 errores / 11 warnings** (preexistentes: `no-img-element` y 1 `exhaustive-deps`).
- **BD:** solo se usaron BD de prueba local (puerto 5433) y una BD desechable de medición (borrada). No se ejecutaron migraciones ni escrituras contra Neon.

## Notas y pendientes

- El lint del backend arrastra errores preexistentes (mayormente `prettier/prettier` y `no-unsafe-*` sobre `any` en `src` heredado y en `test`), previos a esta fase; corregirlos excede el alcance ("sin refactorizaciones generales"). No se introdujeron nuevas categorías en los módulos tocados; los builds y `tsc --noEmit` quedan limpios.
- `app.e2e-spec.ts` (scaffold de Nest) falla al correr la suite completa por el Throttler sin override; es preexistente y quedó fuera del comando oficial (`--testPathPatterns="funcional"`). No se tocó.
- P8 validado a nivel de código (clases responsive y tablas con scroll en 8 resoluciones de referencia 360/375/414/768/834/1024/1280/1440); se recomienda un pase visual final en navegador.
- Deploy: migración `1717000000007-AddVendedorIdDeudas.ts` debe registrarse al desplegar (no destructiva).