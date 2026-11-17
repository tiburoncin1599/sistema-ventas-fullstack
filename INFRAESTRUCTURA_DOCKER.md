# INFRAESTRUCTURA DOCKER - Sistema PROLIMAC SRL

## 1. Servicios definidos en docker-compose.yml

El archivo `docker-compose.yml` (versión 3.9) define **3 servicios** principales que componen el sistema:

### Servicio `db` (Base de datos PostgreSQL)
- **Imagen**: `postgres:18-alpine`
- **Nombre de contenedor**: `sistema_ventas_db`
- **Política de reinicio**: `unless-stopped`
- **Puertos**: `${POSTGRES_PORT:-5433}:5432` (host:container)
- **Volumes**: `postgres_data:/var/lib/postgresql` (persistencia de datos de BD)
- **Redes**: `app_network`
- **Healthcheck**: `pg_isready -U ${POSTGRES_USER:-ventas_user} -d ${POSTGRES_DB:-sistema_ventas}` cada 10s, timeout 5s, 5 reintentos, start_period 10s

### Servicio `backend` (NestJS API)
- **Build**: Contexto `./backend`, Dockerfile `Dockerfile` (build multi-stage)
- **Nombre de contenedor**: `sistema_ventas_backend`
- **Política de reinicio**: `unless-stopped`
- **Dependencias**: `depends_on db` con condición `service_healthy` (espere a que la BD esté lista)
- **Puertos**: `${BACKEND_PORT:-3001}:3001` (host:container)
- **Volumes**: `./backend/uploads:/app/uploads` (sincronización de uploads)
- **Redes**: `app_network`
- **Healthcheck**: `wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1` cada 10s, timeout 10s, 5 reintentos, start_period 60s
- **Variables de entorno injectadas** (ver sección 2)

### Servicio `frontend` (Next.js standalone)
- **Build**: Contexto `./frontend`, Dockerfile `Dockerfile` (build multi-stage con 3 etapas: deps → builder → runner)
- **Nombre de contenedor**: `sistema_ventas_frontend`
- **Política de reinicio**: `unless-stopped`
- **Dependencias**: `depends_on backend` con condición `service_healthy`
- **Puertos**: `${FRONTEND_PORT:-3000}:3000` (host:container)
- **Redes**: `app_network`
- **Args de build**: `INTERNAL_API_URL=http://backend:3001` (inyectado como ENV `NEXT_PUBLIC_API_URL=/api` en runtime)

### Redes
- **app_network**: Red bridge interna que permite comunicación entre servicios usando nombres de host (db, backend, frontend)

---

## 2. Variables de entorno necesarias

Archivos: `.env`, `.env.example`

### Variables PostgreSQL (BD)
| Variable | Valor por defecto | Descripción |
|----------|------------------|-------------|
| `POSTGRES_USER` | `ventas_user` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | `ventas_pass` | Contraseña de PostgreSQL |
| `POSTGRES_DB` | `sistema_ventas` | Nombre de la base de datos |
| `POSTGRES_PORT` | `5433` | Puerto host mapeado al contenedor 5432 |
| `DB_SSL` | `false` | `false` = local/Docker, `true` = producción con Neon/Render |
| `DATABASE_SSL` | `false` | Igual que DB_SSL (redundancia) |

### Variables Backend (NestJS)
| Variable | Valor por defecto | Descripción |
|----------|------------------|-------------|
| `NODE_ENV` | `development` | Modo entorno |
| `PORT` | `3001` | Puerto del servidor NestJS |
| `DATABASE_URL` | `postgresql://ventas_user:ventas_pass@db:5432/sistema_ventas` | URL de conexión TypeORM (construida automáticamente) |
| `DB_SSL` | `false` | Controla SSL en TypeORM (rejectUnauthorized: true si es true y no es localhost) |
| `JWT_SECRET` | `dev_jwt_secret_change_me_in_production_min_32_chars` | Clave secreta para firmar JWT (mínimo 32 chars en prod) |
| `FRONTEND_URL` | `http://localhost:3000` | URL pública del frontend (usado en CORS) |
| `ADMIN_EMAILS` | vacío | Correos separados por coma para notificaciones admin |
| `GOOGLE_CLIENT_ID` | vacío | OAuth Google - ID |
| `GOOGLE_CLIENT_SECRET` | vacío | OAuth Google - Secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3001/auth/google/callback` | Callback URL Google OAuth |
| `TZ` | `America/La_Paz` | Zona horaria |

### Variables Frontend (Next.js)
| Variable | Valor por defecto | Descripción |
|----------|------------------|-------------|
| `NODE_ENV` | `production` | Modo producción en Next.js |
| `PORT` | `3000` | Puerto del servidor Next.js standalone |
| `HOSTNAME` | `0.0.0.0` | Binding hostname |
| `INTERNAL_API_URL` | `http://backend:3001` | URL interna del backend (usado para generar URLs absolutas) |
| `NEXT_PUBLIC_API_URL` | `/api` | Prefijo de API pública (inyectado en el frontend) |

### Variables Opcionales (Google OAuth)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- Si no se proveen, el login con Google estará desactivado

---

## 3. Cómo construir y levantar el sistema

### Comandos exactos (desde la raíz del proyecto)

```bash
# 1. Levantar todos los servicios (db, backend, frontend) en segundo plano
docker compose up -d

# 2. Ver logs de todos los servicios
docker compose logs -f

# 3. Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# 4 Detener todos los servicios
docker compose down

# 5 Reiniciar un servicio específico
docker compose restart backend

# 6 Entrar al contenedor de la base de datos
docker compose exec db sh

# 7 Reiniciar todo desde cero (quita volúmenes de BD)
docker compose down -v
docker compose up -d
```

### Flujo de levantamiento
1. `docker compose up -d` inicia el servicio `db` primero
2. Healthcheck de PostgreSQL asegura que la BD esté lista (`pg_isready`)
3. Inicia el servicio `backend`, que depende de que `db` esté healthy
4. Inicia el servicio `frontend`, que depende de que `backend` esté healthy
5. El backend se conecta a la BD usando `DATABASE_URL` con las credenciales

---

## 4. Cómo se conecta el backend a la base de datos dentro de Docker

La conexión se establece a través de `DATABASE_URL` en las variables de entorno del backend, construido como:

```
postgresql://${POSTGRES_USER:-ventas_user}:${POSTGRES_PASSWORD:-ventas_pass}@db:5432/${POSTGRES_DB:-sistema_ventas}
```

### Lógica de SSL (`isLocalDatabase`)

El backend (`src/app.module.ts`) tiene lógica inteligente para detectar si es una base de datos local o remota:

```typescript
const isLocalDatabase =
  dbSslEnv === 'false' ||
  /localhost|127\.0\.0\.1|^postgresql:\/\/[^@]+@db[:/]|^postgresql:\/\/[^@]+@postgres[:/]/.test(
    rawDatabaseUrl,
  ) ||
  /@db:|@postgres:/.test(rawDatabaseUrl);

const useSsl = dbSslEnv === 'true' ? true : dbSslEnv === 'false' ? false : !isLocalDatabase;
```

### Comportamiento en Docker

- **En Docker local** (este compose): `DB_SSL: 'false'` y `DATABASE_URL` apunta a `db:5432` (nombre de servicio en la red interna)
  - Como `db` es el hostname del servicio dentro de `app_network`, y `DB_SSL=false`, TypeORM usa `ssl: false`
  - Esto es consistente con la lógica `isLocalDatabase` que detecta `db` en la URL y lo trata como local

- **En producción con Neon/Render**: `DB_SSL: 'true'` y `DATABASE_URL` apuntaría a una URL de Neon
  - TypeORM configuraría `ssl: { rejectUnauthorized: true }`

### Puerto de conexión
- Host: `localhost:5433` (mapeado desde el container port 5432)
- Container interno: `db:5432` (resuelto por Docker Compose red network)

---

## 5. Migraciones y datos iniciales (seed)

### Migraciones TypeORM

- **Archivos**: `backend/src/migrations/*.ts` (archivos de migración versionados)
- **Configuración**: En `app.module.ts`:
  ```typescript
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  ```
- **Ejecución**: `npm run typeorm migration:run` o mediante `docker compose up` que ejecuta `await dataSource.runMigrations()` al arrancar (`main.ts:79`)

### Estado actual de migraciones (verificado en la BD)

El archivo `neon.sql` (dump de la base de datos) muestra que la tabla `migrations` tiene 23 registros (IDs 15-37 con timestamps 1717000000000 a 1717000000013), lo que indica que las migraciones están aplicadas sobre la BD.

### Seed (datos iniciales)

- **Archivo**: `neon.sql` contiene `COPY` statements para poblar las tablas principales
- **Datos insertados**: Usuarios (admin, inventario, noemi, andres, angel, Juan Perez), categorías, productos (39 productos), proveedores, configuración (vacía - por llenar), pedidos, deudas, inventario, etc.
- **Usuarios seed**: 
  - ID 1: Admin (admin@sistema.com, rol: admin)
  - ID 2: Inventario (inventario@sistema.com, rol: inventario)
  - ID 50: noemi (ven1@gmail.com, rol: ventas)
  - ID 51: andres (cliente, con teléfono 70000000, ubicación "punata y lanza")
  - ID 52: angel (cliente)
  - ID 53: Juan Perez (cliente)

### Scripts de package.json

- No hay scripts específicos de `npm` para migraciones o seed en el `package.json` raíz
- Las migraciones se ejecutan típicamente desde el backend: `cd backend && npm run typeorm migration:run`
- El `docker-compose.yml` no incluye automáticamente la ejecución de migraciones al levantar; esto se hace típicamente manualmente o mediante un script de entrypoint

---

## 6. Qué falta o está incompleto

### Producción vs Desarrollo

- **Desarrollo**: `docker compose up -d` levanta los 3 servicios con `NODE_ENV: development` en backend y `production` en frontend
- **Producción**: El `render.yaml` sugiere desplegar como un solo servicio Node en Render, pero el `docker-compose.yml` está diseñado para 3 servicios separados (db + backend + frontend)
- **Falta**: No hay configuración específica de producción en el `docker-compose.yml` (no hay perfiles `prod`/`dev`)

### Healthchecks

- ✅ **db**: Healthcheck configurado y funcionando (`pg_isready`)
- ✅ **backend**: Healthcheck configurado (`wget` a `/health`)
- ✅ **frontend**: Healthcheck no configurado explícitamente en docker-compose (el `render.yaml` tiene `healthCheckPath: /`)
- **Nota**: El frontend usa `restart: unless-stopped` pero no tiene healthcheck en compose

### Persistencia de datos

- ✅ **BD**: Volume `postgres_data` montado en `/var/lib/postgresql`
- ⚠️ **Uploads**: Volume `./backend/uploads:/app/uploads` - esto es un bind mount, no persiste si se reconstruye la imagen, pero sí si solo se reinicia el contenedor
- ⚠️ **Next.js standalone**: La carpeta `.next/standalone` se genera en el build y se copia en la producción, pero no hay volumen persistente definido para datos de Next.js en compose

### Configuración que falta

- No hay `entrypoint` o `script` automatizado para correr migraciones al iniciar
- No hay configuración de backup/restore de la BD en los archivos
- Las variables `GOOGLE_CLIENT_ID/SECRET` suelen estar vacías y requieren configuración en consolas de Google Cloud
- El `DB_SSL` está hardcodeado en `false` en `.env` y `.env.example`

---

## 7. ¿Está probado y funcionando Docker?

### Evidencia disponible

- **Archivos de configuración**: Todos los archivos existen y están coherentes (`docker-compose.yml`, `Dockerfile` backend, `Dockerfile` frontend, `.dockerignore`)
- **Dump de BD**: `neon.sql` existe con esquema y datos completos
- **Variables de entorno**: `.env` y `.env.example` tienen valores coherentes
- **Blueprint Render**: `render.yaml` está configurado para despliegue alternativo en Render

### Limitaciones

- **No se ejecutó `docker compose up -d`** en este análisis para verificar estado runtime
- No hay logs de pruebas de ejecución
- El `.env` actual tiene `JWT_SECRET` con valor real (debe cambiarse en producción)
- La versión de Node especificada en `package.json` raíz: `>=22.0.0 <23.0.0`, mientras que los Dockerfiles usan `node:22-alpine`

### Conclusión

La infraestructura Docker **está configurada y es coherente**, pero **no fue verificada ejecutándose**. Los componentes principales (DB, backend, frontend) tienen sus Dockerfiles y composición correcta, y las variables de entorno están documentadas. Se recomienda ejecutar `docker compose up -d` y verificar que todos los servicios queden en estado `healthy`.

---
*Documento generado basado exclusivamente en archivos encontrados en el repositorio sistema-ventas-fullstack.*