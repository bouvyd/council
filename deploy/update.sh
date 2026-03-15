#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
APP_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)

WWW_DIR=${COUNCIL_WWW_DIR:-/opt/council/www}
FRONTEND_ENV_FILE=${COUNCIL_FRONTEND_ENV_FILE:-/opt/council/env/frontend.env}
BACKEND_ENV_FILE=${COUNCIL_BACKEND_ENV_FILE:-/opt/council/env/backend.env}
BACKEND_HEALTH_URL=${COUNCIL_BACKEND_HEALTH_URL:-http://127.0.0.1:3009/health}

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

load_env_file() {
  local file_path=$1
  local line key value

  if [[ ! -f "$file_path" ]]; then
    printf 'Missing env file: %s\n' "$file_path" >&2
    exit 1
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" == \#* ]] && continue

    key=${line%%=*}
    value=${line#*=}

    if [[ -z "$key" || "$key" == "$line" ]]; then
      printf 'Invalid env line in %s: %s\n' "$file_path" "$line" >&2
      exit 1
    fi

    export "$key=$value"
  done < "$file_path"
}

if [[ $(id -un) == "root" ]]; then
  printf 'Run this script as the council user, not root.\n' >&2
  exit 1
fi

require_command git
require_command npm
require_command docker
require_command curl

if [[ ! -d "$APP_DIR/.git" ]]; then
  printf 'Expected a git checkout at %s\n' "$APP_DIR" >&2
  exit 1
fi

log "Updating git checkout"
cd "$APP_DIR"
git pull --ff-only

log "Installing workspace dependencies"
npm ci

log "Building frontend"
load_env_file "$FRONTEND_ENV_FILE"
npm run build --workspace @council/frontend

log "Publishing frontend to $WWW_DIR"
mkdir -p "$WWW_DIR"
find "$WWW_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R frontend/dist/. "$WWW_DIR/"

log "Building and restarting backend"
export COUNCIL_BACKEND_ENV_FILE="$BACKEND_ENV_FILE"
docker compose build backend
docker compose up -d backend

log "Waiting for backend health check"
for _ in $(seq 1 30); do
  if curl -fsS "$BACKEND_HEALTH_URL" >/dev/null; then
    log "Deploy succeeded"
    printf 'Frontend: %s\n' "$WWW_DIR"
    printf 'Backend health: %s\n' "$BACKEND_HEALTH_URL"
    exit 0
  fi

  sleep 1
done

printf 'Backend health check failed: %s\n' "$BACKEND_HEALTH_URL" >&2
docker compose logs --tail=100 backend >&2
exit 1