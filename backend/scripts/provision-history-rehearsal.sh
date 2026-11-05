#!/usr/bin/env bash
set -euo pipefail
test "${1:-}" = authorized
cd -- "$(dirname -- "$0")/../.."
test -f backend/.env.history-rehearsal.local
test -z "$(docker ps -aq --filter 'name=^/qa-control-history-rehearsal-db$')"
test -z "$(docker volume ls -q --filter 'name=^qa-control-history-rehearsal_pgdata$')"
test -z "$(docker network ls -q --filter 'name=^qa-control-history-rehearsal_default$')"
test -z "$(ss -H -ltn 'sport = :5436')"
docker compose --env-file backend/.env.history-rehearsal.local \
  -f docker-compose.history-rehearsal.yml --profile history-rehearsal \
  up -d --pull never --no-build db-history
