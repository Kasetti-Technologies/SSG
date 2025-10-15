CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS scansure_patient_upi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text UNIQUE NOT NULL,
  identifiers jsonb,
  provenance jsonb,
  metadata jsonb,
  match_confidence numeric,
  match_method text,
  merge_version uuid,
  soft_delete boolean DEFAULT false,
  created_by text,
  created_at timestamptz DEFAULT now(),
  last_updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scansure_upi_aadhaar ON scansure_patient_upi((identifiers->>'aadhaar')) WHERE (identifiers->>'aadhaar') IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_scansure_upi_mobile ON scansure_patient_upi((identifiers->>'mobile')) WHERE (identifiers->>'mobile') IS NOT NULL;

CREATE TABLE IF NOT EXISTS scansure_patient_association (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text NOT NULL,
  source_system text NOT NULL,
  source_patient_id text NOT NULL,
  hospital_instance text,
  metadata jsonb,
  created_by text,
  created_at timestamptz DEFAULT now(),
  last_updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assoc_source_system_patient ON scansure_patient_association (source_system, source_patient_id);

CREATE TABLE IF NOT EXISTS scansure_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  upi_id text,
  facility_id text,
  service_items jsonb,
  billing jsonb,
  status text,
  bahmni_instance_id text,
  bahmni_order_id text,
  idempotency_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scansure_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text NOT NULL,
  consent_type text,
  scope jsonb,
  given_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  granted_by text
);

CREATE TABLE IF NOT EXISTS scansure_patient_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text,
  action text,
  snapshot jsonb,
  emitted_at timestamptz DEFAULT now(),
  performed_by text
);
