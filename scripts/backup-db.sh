#!/usr/bin/env bash
# Backup automatizado de la base de datos PROLIMAC SRL (Sprint 5).
# Ejecuta pg_dump DENTRO del contenedor de PostgreSQL y guarda el resultado
# comprimido en el host con fecha y hora.
#
# Uso:
#   bash scripts/backup-db.sh
#   DB_CONTAINER=sistema_ventas_db BACKUP_DIR=/var/backups/prolimac bash scripts/backup-db.sh
#
# Variables (se leen desde .env.production si existe; se pueden sobreescribir):
#   DB_CONTAINER, POSTGRES_USER, POSTGRES_DB, BACKUP_DIR, BACKUP_RETENTION_DAYS

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env.production}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

CONTAINER="${DB_CONTAINER:-sistema_ventas_db}"
DB_USER="${POSTGRES_USER:-ventas_user}"
DB_NAME="${POSTGRES_DB:-sistema_ventas}"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_DIR}/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/prolimac_${DB_NAME}_${TIMESTAMP}.sql.gz"

if ! command -v docker >/dev/null 2>&1; then
  echo "[backup] ERROR: docker no está disponible en el PATH." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
  echo "[backup] ERROR: el contenedor '$CONTAINER' no está corriendo." >&2
  echo "[backup] Levantá el stack con: docker compose up -d" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[backup] Contenedor : $CONTAINER"
echo "[backup] Base de datos: $DB_NAME (usuario $DB_USER)"
echo "[backup] Destino     : $BACKUP_FILE"

# pg_dump se ejecuta dentro del contenedor; la salida se comprime en el host.
# pipefail garantiza que un fallo de pg_dump no se oculte detrás de gzip.
docker exec -i "$CONTAINER" sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' \
  | gzip -c > "$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "[backup] ERROR: el archivo generado está vacío; eliminándolo." >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
echo "[backup] OK: $BACKUP_FILE ($SIZE)"

# Retención: eliminar backups con más de RETENTION_DAYS días.
OLD="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'prolimac_*.sql.gz' \
  -mtime "+${RETENTION_DAYS}" -print -delete)"
if [[ -n "$OLD" ]]; then
  echo "[backup] Backups eliminados por retención (${RETENTION_DAYS} días):"
  echo "$OLD"
fi

echo "[backup] Restaurar con:"
echo "  gunzip -c \"$BACKUP_FILE\" | docker exec -i \"$CONTAINER\" psql -U \"$DB_USER\" -d \"$DB_NAME\""
