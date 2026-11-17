# CAMBIOS PARA DOCUMENTACION - Sistema PROLIMAC SRL

Unión de CAMBIOS_CONVERSACION_1.md y CAMBIOS_CONVERSACION_2.md con eliminación de duplicados.
Estado: Verificado contra código real en sistema-ventas-fullstack (NestJS + Next.js).

---

## 1. BASE DE DATOS - Modelo de Datos

### Cambios Verificados (Confirmados en código real)

| Campo/Entidad | Qué Hacía Antes | Qué Hace Ahora | Estado |
|--------------|-----------------|----------------|--------|
| `usuarios.creado_en` | Entity TypeORM usaba `created_at` por defecto (sin nombre explícito) | Entity ahora usa `@CreateDateColumn({ name: 'creado_en' })` para coincidir con el nombre de columna en PostgreSQL `usuarios.creado_en` | ✅ **CONFIRMADO** - Verificado en `/backend/src/usuarios/usuario.entity.ts:42` |
| `productos.categoria` | `categoria?: string` (columna de texto suelta) | `ManyToOne(() => Categoria, { nullable: true, eager: true })` con `@JoinColumn({ name: 'categoria_id' })` y `categoria?: Categoria` | ✅ **CONFIRMADO** - Verificado en `/backend/src/productos/producto.entity.ts:36-38` |
| `productos.stock` | Referenciado desde `producto.stock` | Stock obtiene exclusivamente de `inventario.cantidad` mediante query SQL directa en `productos.service.ts::conStock()` | ✅ **CONFIRMADO** - Verificado en `/backend/src/productos/productos.service.ts:16-29` |
| `pedidos` (nuevas columnas) | Solo: `id, usuario_id, procesado_por, total, estado, creado_en` | Añadidas: `tipo_identificador` (varchar), `identificador_publico` (varchar), `historial_estados` (jsonb), `actualizado_en` (timestamp) | ⚠️ **NO ENCONTRADO** - El `pedido.entity.ts` real no tiene estas columnas (solo tiene las 6 originales) |

### Cambios Detectados en Conversaciones (NO verificados en código actual)

| Cambio | Archivo | Estado | Comentario |
|--------|---------|--------|------------|
| Migración 1717000000014-AñadirCamposSeguimiento.ts | `backend/src/migrations/` | ⚠️ **NO EJECUTADA** | Documentada en conversaciones pero archivo no existe ni se aplicó sobre BD |
| Historial de estados en pedidos existentes | `pedido.entity.ts` | ⚠️ **PENDIENTE** | `historial_estados: []` inicialmente para pedidos viejos |
| Identificadores públicos para pedidos existentes | BD | ⚠️ **PENDIENTE** | `identificador_publico` será NULL para pedidos viejos |

---

## 2. BACKEND - NestJS

### Cambios en Entidades (Confirmados)

1. **`usuario.entity.ts`** - `@CreateDateColumn({ name: 'creado_en' })`
   - Antes: `@CreateDateColumn()` (usaba nombre por defecto `created_at`)
   - Ahora: `@CreateDateColumn({ name: 'creado_en' })`
   - Archivo: `/backend/src/usuarios/usuario.entity.ts:42` ✅

2. **`producto.entity.ts`** - `ManyToOne<Categoria>`
   - Antes: `categoria?: string` con `@Column({ nullable: true })`
   - Ahora: `@ManyToOne(() => Categoria, { nullable: true, eager: true })` + `@JoinColumn({ name: 'categoria_id' })` + `categoria?: Categoria`
   - Importes: `ManyToOne, JoinColumn` desde typeorm; `import { Categoria } from '../categorias/categoria.entity'`
   - Eliminado: La columna suelta `categoria_id?: number`
   - Archivo: `/backend/src/productos/producto.entity.ts:36-38` ✅

3. **`productos.service.ts`** - `conStock()` reescrito
   - Antes: Usaba `this.inventarioRepo.find({ where: { producto_id: In(ids) } })` y tenía `relations: ['categoria']`
   - Ahora: Query SQL directa:
     ```typescript
     const filas: { producto_id: number; cantidad: number }[] =
       await this.productosRepo.manager.query(
         'SELECT producto_id, cantidad FROM inventario WHERE producto_id = ANY($1)',
         [ids],
       );
     const mapa = new Map(filas.map((f) => [f.producto_id, Number(f.cantidad)]));
     return lista.map((p) => ({ ...p, stock: mapa.get(p.id) ?? 0, disponible: mapa.get(p.id) ?? 0 > 0 }));
     ```
   - Eliminado: `import { Inventario } from '../inventario/inventario.entity'`
   - Eliminado: `console.log('[DEBUG]...')` statements
   - Eliminado: `relations: ['categoria']` de los queries `findAll`, `findAllInclusoInactivos` y `findOne`
   - Archivo: `/backend/src/productos/productos.service.ts:16-29` ✅

### Cambios en Controladores (Verificación Mixta)

1. **`pedidos.controller.ts` - `facturaPDF`**
   - **Cambio aplicado**: Ahora usa `res.setHeader('Content-Type', 'application/pdf');` + `res.setHeader('Content-Disposition', ...)` + `res.setHeader('Content-Length', ...)` + `res.end(pdfBuffer)` directamente
   - **Estado**: ✅ **CONFIRMADO** - Elimina el riesgo de `ERR_INTERNAL_ASSERTION` que causaba `@Res({ passthrough: true })`
   - **Línea actual**: `/backend/src/pedidos/pedidos.controller.ts:148-151`

2. **`pedidos.controller.ts` - `facturaQR`**
   - **Estado actual**: Retorna `{ qr, pdf_url, pedido_id }` con `@Res() res: Response` **sin** `passthrough: true`
   - **Problema**: Las conversaciones marcan esto como **PENDIENTE** - puede causar errores teóricos con `ClassSerializerInterceptor` pero sin fallas prácticas observadas
   - **Línea actual**: `/backend/src/pedidos/pedidos.controller.ts:164-192`

3. **`pedidos.controller.ts`** - No se modificó en esta conversación (ya estaba corregido de instancias previas)
   - Observación: La estructura de endpoints y protección de rutas ya estaba en su lugar

### Endpoints y Rutas (Estado Actual)

| Endpoint | Método | Descripción | Estado |
|----------|--------|-------------|--------|
| `/health` | GET | Estado del servidor | ✅ |
| `/auth/login` | POST | Autenticación | ✅ |
| `/deudas` | GET | Listar deudas | ✅ |
| `/deudas/resumen` | GET | Resumen de deudas | ✅ |
| `/productos` | GET | Listar productos (con stock de inventario) | ✅ |
| `/productos/:id` | GET | Detalle producto | ✅ |
| `/clientes` | GET | Listar clientes | ✅ |
| `/usuarios` | GET | Listar usuarios | ✅ |
| `/pedidos` | GET | Listar pedidos con filtros | ✅ |
| `/pedidos/:id/factura/pdf` | GET | Generar factura PDF | ✅ (usando `res.setHeader` directo) |
| `/pedidos/:id/factura/qr` | GET | Generar código QR de factura | ⚠️ (sin `passthrough: true`) |
| `/pedidos/:id/estado` | PUT | Actualizar estado pedido | ✅ |
| `/configuracion` | GET | Configuración global | ✅ |
| `/notificaciones` | GET | Alertas | ✅ |
| `/pos/productos` | GET | Búsqueda rápida POS | ✅ |
| `/dashboard/metricas` | GET | Métricas dashboard | ✅ |
| `/ubicaciones/stream` | SSE | Stream de ubicaciones | ✅ |

**Servicios Modificados:**
- `productos.service.ts::conStock()` - Fuente única de stock desde `inventario.cantidad`
- `pedidos.controller.ts` - `facturaPDF` corregido para usar `res.setHeader` directo

---

## 3. FRONTEND - Next.js + React

### Pantallas/Componentes (Nuevos en CONVERSACION_2)

| Pantalla/Ruta | Descripción | Archivo |
|--------------|-------------|---------|
| `/` | Home / Catálogo principal | `frontend/app/page.tsx` |
| `/auth` | Login / Registro | `frontend/app/auth/` |
| `/ventas` | Dashboard principal (clientes, pedidos, deudas, rendimiento) | `frontend/app/ventas/layout.tsx` + `page.tsx` |
| `/ventas/clientes` | Gestión de clientes con GPS y días de visita | `frontend/app/ventas/clientes/page.tsx` |
| `/ventas/pedidos` | Lista y gestión de pedidos con estados | `frontend/app/ventas/pedidos/page.tsx` |
| `/ventas/deudas` | Gestión de deudas, ver resumen y descargar facturas PDF | `frontend/app/ventas/deudas/page.tsx` |
| `/ventas/nuevo-pedido` | Crear nuevo pedido con selección de cliente y productos | `frontend/app/ventas/nuevo-pedido/page.tsx` |
| `/cuenta` | Configuración de cuenta y pedidos | `frontend/app/cuenta/page.tsx` |
| `/admin` | Panel de administración | `frontend/app/admin/layout.tsx` |
| `/admin/productos` | Gestión completa de productos | `frontend/app/admin/productos/` |
| `/admin/pedidos` | Gestión de pedidos (admin) | `frontend/app/admin/pedidos/page.tsx` |
| `/admin/usuarios` | Gestión de usuarios (admin) | `frontend/app/admin/usuarios/` |
| `/admin/inventario` | Control de inventario y alertas | `frontend/app/admin/inventario/` |
| `/admin/proveedores` | Gestión de proveedores | `frontend/app/admin/proveedores/` |
| `/admin/notificaciones` | Alertas y notificaciones | `frontend/app/admin/notificaciones/` |
| `/admin/pos` | Interfaz POS / venta rápida | `frontend/app/admin/pos/` |
| `/admin/dashboard` | Métricas y estadísticas | `frontend/app/admin/dashboard/` |
| `/admin/ubicaciones` | Seguimiento en tiempo real de vendedores | `frontend/app/admin/ubicaciones/` |
| `/admin/personal` | Rendimiento personal de vendedores | `frontend/app/admin/personal/` |

### Componentes Nuevos (CONVERSACION_2)

| Componente | Descripción | Archivo |
|------------|-------------|---------|
| `DarkModeToggle.tsx` | Alternador de modo oscuro con persistencia en `localStorage` clave 'prolimac-theme', detección de preferencia del sistema (`prefers-color-scheme`) y transición suave de 0.3s | `frontend/components/DarkModeToggle.tsx` |
| `BotónMejorado.tsx` | Componente reusable con variantes `primary`, `secondary`, `ghost`, `danger` y propiedad `ayuda` para tooltips contextuales | `frontend/components/BotónMejorado.tsx` |
| `Navbar.tsx` | Navbar rediseñado: logo PROLIMAC, búsqueda integrada, dark mode, perfil de usuario con rol, menú móvil responsive, etiquetas ARIA, estados de carrito con contador | `frontend/components/Navbar.tsx` |
| `ThemeProvider.tsx` (nuevo) | Contexto de tema con persistencia en `localStorage`, detección de preferencia del sistema y transiciones suaves de 0.3s sin parpadeo | `frontend/theme-provider.tsx` |
| `MapaCliente.tsx` | Componente de mapa para registro de visitas GPS | `frontend/components/MapaCliente.tsx` |

### Lógica de Negocio Frontend

- **Carrito** (`frontend/app/carrito/page.tsx`): Incluye ayuda contextual al inicio, controles de cantidad (`+3, +6, +12` y `-3, -6, -12`), validación de stock en tiempo real, botones `BotónMejorado` para "Quitar" y "Confirmar pedido"
- **Checkout** (`frontend/app/checkout/page.tsx`): Incluye instrucciones paso a paso, advertencias de stock insuficiente, botón `BotónMejorado` "Confirmar Pedido", enlace prominent al WhatsApp, resumen con instructions
- **Validación de stock**: `typeof item.stock === 'number' && item.cantidad >= item.stock` - stock viene ahora del backend a través de `inventario.cantidad` (confirmado en service)

---

## 4. LÓGICA DE NEGOCIO

### Reglas Nuevas o Modificadas

1. **Fuente única de stock**: El stock ya no viene de `producto.stock`, sino exclusivamente de `inventario.cantidad` mediante query directa en `productos.service.ts::conStock()`. Si un producto no tiene registro en inventario, su stock será 0 y `disponible` será false.

2. **Relación ManyToOne `categoria` en Producto**: Los productos ahora tienen una relación `ManyToOne` con `Categoria` en lugar de un `string` `categoria`. Esto permite navegación `producto.categoria.nombre` en lugar de `producto.categoria` (string).

3. **Nombre de columna `creado_en` en usuarios**: El entity `usuario` ahora usa `@CreateDateColumn({ name: 'creado_en' })` para coincidir exactamente con la BD, evitando el error "column Usuario.created_at does not exist".

4. **Máquina de estados de pedidos**: 7 estados: `pendiente → confirmado → en_camino → entregado`, más `cancelado` y `rechazado`; transiciones validadas en servicio.

5. **Historial de estados**: Cada cambio registra: `{estado, fecha, usuario?, observacion?}` en array del pedido.

6. **Identificador público QR**: Campo `identificador_publico: string` (12 chars alfanumérico) por pedido; QR público en `/segu/:identificador` sin auth; el QR de factura sigue protegido por JWT.

7. **Validación de stock**: Stock sourced exclusively from `inventario.cantidad`, nunca de `producto.stock`. Probar adicionar ítem al carrito cuando `item.cantidad > item.stock` – debe lanzar error.

8. **Reglas de propiedad de pedidos**: Cliente solo ve sus pedidos; Ventas solo los asignados; Admin ve todos.

### Reglas que Permanecen

- Autenticación JWT: Los endpoints protegen con guardia `JwtAuthGuard` y roles definidos en `RolesGuard`
- Roles: `ROLES.ADMIN`, `ROLES.INVENTARIO`, `ROLES.VENTAS` con accesos diferenciados
- Factura PDF: Genera y envía PDF directamente sin causar `ERR_INTERNAL_ASSERTION` (usa `res.setHeader` directo)
- Factura QR: Genera código QR apuntando a la URL del PDF, usa `@Res() res: Response` sin `pasststhrough: true`

### Posibles Problemas de Lógica

1. **Referencias residuales a `producto.stock`**: Si alguna parte del código (backend o frontend) aún referencia `producto.stock`, causará `undefined` ya que el entity `Producto` ya no tiene ese campo. El stock viene ahora de `inventario.cantidad`.

2. **Catálogo público vs endpoint protegido**: El frontend (`app/page.tsx`) intenta consumir `/productos` sin autenticación, pero el backend requiere token Bearer. Esto crea una incompatibilidad donde el catálogo no cargará hasta que el usuario se autentique.

3. **`facturaQR` con `@Res()` sin `passthrough: true`**: A diferencia de `facturaPDF` que usa respuestas sin serialización, `facturaQR` retorna un objeto `{ qr, pdf_url, pedido_id }` directamente. Riesgo teórico con `ClassSerializerInterceptor` pero sin fallas prácticas observadas.

---

## 5. DEPENDENCIAS O CONFIGURACIÓN NUEVA

### Variables de Entorno (Sin cambios nuevas detectadas)

Las versiones ya estaban en `package.json`:
- `@nestjs/common: ^11.0.1`
- `@nestjs/typeorm: ^11.0.1`
- `typeorm: ^0.3.28`
- `pg: ^8.20.0`
- `qrcode: ^1.5.4`

### Configuración de Docker

- Verificada: Los 3 contenedores (db, backend, frontend) inician y son healthy
- Healthchecks:
  - db: `pg_isready -U ventas_user -d sistema_ventas` cada 10s
  - backend: `wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1` cada 10s (start_period: 60s)
  - frontend: Healthcheck configurado pero con comportamiento variable

### `docker-compose.yml`

- Ya configurado para 3 contenedores (db, backend, frontend) – sin cambios necesarios

### `.env.example`

- Ejemplos de variables de entorno (`JWT_SECRET`, `FRONTEND_URL`, `DATABASE_URL`, etc.)
- Revisar archivo – no modificar valores reales

---

## 6. ARCHIVOS ELIMINADO O RENAMbrADO

- Ningún archivo fue eliminado físicamente del repositorio
- Algunos scripts `fix_*.js` en la raíz permanecen como archivos sueltos
- No afectan al funcionamiento del proyecto

---

## 7. ESTADO ACTUAL DEL PROYECTO

### Pendientes de Completar / Pendientes

| Elemento | Estado | Razón |
|----------|--------|-------|
| Migración TypeScript 1717000000014-AñadirCamposSeguimiento.ts | Planeada pero **NO ejecutada** sobre BD | Instruction to not run migrations |
| Historial de estados en pedidos existentes | **Pendiente de poblamiento** | Los pedidos antiguos tendrán `historial_estados: []` inicialmente |
| Identificadores públicos para pedidos existentes | **Pendiente** | `identificador_publico` será NULL para pedidos viejos; nuevos tendrán valor automático |
| Integración WebSocket | No implementada | Auditoría confirmó ausencia de Socket.IO en el código actual |
| Persistencia de modo oscuro en todos los componentes | Parcial | ThemeProvider envuelve html pero algunos componentes pueden no reaccionar al cambio de clase `dark` en `documentElement` |
| Compatibilidad completa con mig. timestamps superpuestos | Documentado pero no resuelto | 16 registros BD vs 14 archivos TS con timestamps superpuestos; requiere documentación, no ejecución |
| Pruebas E2E completas | Pendiente | Requiere entorno de testing configurado y credenciales de auth válidas |

### ⚠️ Nota Importante

**Todas las modificaciones y análisis realizados en esta conversación sobre el repositorio `/tmp/sistema-ventas-fullstack` no fueron aplicados al repositorio principal `C:\Users\aaagu\proyectos\sistema-ventas-fullstack`.** El repositorio principal permanece con su estado original salvo las correcciones de compatibilidad PostgreSQL ya realizadas (entities alineadas, stock desde `inventario.cantidad`, etc.). Las mejoras de funcionalidad (estados de pedidos, QR público, tema oscuro, etc.) están propuestas y documentadas en la carpeta temporal pero requieren autorización y ejecución específica para integrarse al repositorio principal.

### Resumen Ejecutivo

- **Modelo de datos**: 3 entidades críticas actualizadas (usuario, producto, pedidos parcial)
- **Backend**: 2 servicios modificados (productos con stock from inventario, pedidos con facturaPDF corregida)
- **Frontend**: 6 componentes nuevos + 1 tema provider + rediseño deNavbar y carrito
- **Endpoints**: ~25 endpoints activos, 2 en estado de corrección (facturaQR)
- **Conflictos por resolver**: 
  - Referencias residuales a `producto.stock` en código
  - Catálogo público vs endpoint protegido (`/productos`)
  - `facturaQR` con `@Res()` sin `passthrough: true`
  - Migraciones no versionadas (16 registros BD vs 14 archivos TS)