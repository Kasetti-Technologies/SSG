CREATE ROLE scansure_app_role NOLOGIN;
CREATE ROLE scansure_admin_role NOLOGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO scansure_app_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO scansure_admin_role;

ALTER TABLE scansure_patient_association ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON scansure_patient_association
  USING ((current_setting('scansure.tenant_id', true) IS NULL)
         OR (metadata->>'tenant_id' = current_setting('scansure.tenant_id')));
