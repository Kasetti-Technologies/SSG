-- V4_idempotency_reconciliation.sql

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  idempotency_key text NOT NULL,
  resolution jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (source_system, idempotency_key)
);

CREATE TABLE IF NOT EXISTS reconciliation_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_snapshot jsonb NOT NULL,
  match_candidates jsonb, -- array of candidate UPI objects with score
  match_confidence numeric,
  provenance jsonb,
  status text DEFAULT 'OPEN', -- OPEN / MERGED / CLOSED
  created_at timestamptz DEFAULT now()
);

-- optional indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_source_key ON idempotency_keys (source_system, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_recon_status ON reconciliation_candidates (status);
