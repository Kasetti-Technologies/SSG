#!/bin/bash
set -e

SCHEMA_REGISTRY_URL="http://localhost:8081"
SCHEMAS_DIR="$(dirname "$0")/../schemas"

echo "Registering schemas..."

for schema_file in "$SCHEMAS_DIR"/*.avsc; do
  subject=$(basename "$schema_file" .avsc)
  echo "→ Registering $subject"
  
  curl -s -X POST \
    -H "Content-Type: application/vnd.schemaregistry.v1+json" \
    --data "{\"schema\": $(jq -Rs . < "$schema_file")}" \
    "$SCHEMA_REGISTRY_URL/subjects/$subject/versions" \
    | jq .
done

echo "✅ Schemas registered."

# Optional: set compatibility mode
curl -s -X PUT \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility": "BACKWARD"}' \
  "$SCHEMA_REGISTRY_URL/config" \
  | jq .
