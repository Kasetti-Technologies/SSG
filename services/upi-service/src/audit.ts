import { query } from './db';
import { publish } from './publisher';

export async function writeAudit(
  upi_id: string,
  action: string,
  snapshot: any,
  performed_by: string
) {
  // save JSON snapshot in DB (stringify it here too)
  await query(
    `INSERT INTO scansure_patient_audit (upi_id, action, snapshot, performed_by)
     VALUES ($1,$2,$3,$4)`,
    [upi_id, action, JSON.stringify(snapshot), performed_by]
  );

  // build Avro event
  const event = {
    event_id: snapshot.event_id || new Date().toISOString(),
    source_system: 'upi-service',
    timestamp: Date.now(),
    payload: {
      upi_id,
      action,
      snapshot: JSON.stringify(snapshot),   // ✅ must be string
      performed_by
    }
  };

  await publish(
    process.env.PATIENT_AUDIT_TOPIC!,
    upi_id,
    'io.scansure.events.PatientAuditV1-value',
    event
  );
}
