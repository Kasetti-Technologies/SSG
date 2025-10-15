#!/usr/bin/env bash
set -euo pipefail
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-scansure}"
PGDATABASE="${PGDATABASE:-scansure_db}"
PGPASSWORD="${PGPASSWORD:-scansurepass}"

for f in ./migrations/*.sql; do
  echo "Applying $f"
  PGPASSWORD=${PGPASSWORD} psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -f "$f"
done
echo "✅ Migrations applied."
