import { query } from '../db';

export async function findDeterministicMatch(aadhaar?: string | null, mobile?: string | null, govtid?: string | null) {
  if (aadhaar) {
    const res = await query(
      `SELECT upi_id FROM scansure_patient_upi WHERE identifiers->>'aadhaar' = $1 LIMIT 1`, [aadhaar]
    );
    if (res.rows[0]) return { upi_id: res.rows[0].upi_id, method: 'aadhaar' };
  }
  if (govtid) {
    const res = await query(`SELECT upi_id FROM scansure_patient_upi WHERE identifiers->>'govt_id' = $1 LIMIT 1`, [govtid]);
    if (res.rows[0]) return { upi_id: res.rows[0].upi_id, method: 'govtid' };
  }
  if (mobile) {
    const res = await query(`SELECT upi_id FROM scansure_patient_upi WHERE identifiers->>'mobile' = $1 LIMIT 1`, [mobile]);
    if (res.rows[0]) return { upi_id: res.rows[0].upi_id, method: 'mobile' };
  }
  return null;
}
