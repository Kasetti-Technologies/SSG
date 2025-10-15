INSERT INTO scansure_patient_upi (upi_id, identifiers, provenance, metadata, match_confidence)
VALUES ('UPI-0001', '{"name":"Test User","mobile":"9999999999","aadhaar":"111122223333"}', '{"source":"seed"}', '{}', 1.0)
ON CONFLICT (upi_id) DO NOTHING;

INSERT INTO scansure_patient_association (upi_id, source_system, source_patient_id, hospital_instance)
VALUES ('UPI-0001','bahmni-demo-01','BH-PT-0001','bahmni-demo-01')
ON CONFLICT DO NOTHING;

INSERT INTO scansure_order (order_id, upi_id, facility_id, service_items, billing, status)
VALUES ('ORDER-0001','UPI-0001','FAC-001','[{"code":"CBC","price":200}]','{"amount":200}','BOOKED')
ON CONFLICT DO NOTHING;
