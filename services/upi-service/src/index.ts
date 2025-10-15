import dotenv from 'dotenv';
dotenv.config();
import kafka from './kafkaClient';
import { loadType } from './avroLoader';
import { query, getClient } from './db';
import { findDeterministicMatch } from './matcher/deterministic';
import { computeMatchConfidence } from './matcher/fuzzy';
import { connectProducer, publish } from './publisher';
import express from 'express';
import client from 'prom-client';
import { writeAudit } from './audit';
import { KafkaMessage } from 'kafkajs';

const patientCreateType = loadType('io.scansure.events.PatientCreateV1-value');
const patientResolvedSchema = 'io.scansure.events.PatientResolvedV1-value';
const auditSchema = 'io.scansure.events.PatientAuditV1-value';

const HIGH = parseFloat(process.env.HIGH_THRESHOLD || '0.95');
const MID = parseFloat(process.env.MID_THRESHOLD || '0.75');

async function handleMessage(message: KafkaMessage) {
  // value is Buffer (avsc)
  const buf = message.value as Buffer;
  const obj = patientCreateType.fromBuffer(buf);
  const { event_id, idempotency_key, source_system, payload } = obj;
  const { name, dob, mobile, aadhaar, govtid } = payload;

  // 1) idempotency check
  const clientConn = await getClient();
  try {
    await clientConn.query('BEGIN');
    const res = await clientConn.query(
      `SELECT resolution FROM idempotency_keys WHERE source_system=$1 AND idempotency_key=$2 FOR UPDATE`,
      [source_system, idempotency_key]
    );
    if (res.rows.length > 0) {
      // already processed
      await clientConn.query('COMMIT');
      console.log('Duplicate idempotency - skipping', source_system, idempotency_key);
      return;
    }

    // 2) deterministic check
    const det = await findDeterministicMatch(aadhaar, mobile, govtid);
    if (det) {
      const upi_id = det.upi_id;
      // upsert association
      await clientConn.query(
        `INSERT INTO scansure_patient_association (upi_id, source_system, source_patient_id, metadata, created_by)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [upi_id, source_system, event_id, JSON.stringify(payload), 'upi-service']
      );
      const resolvedEvent = {
        event_id,
        source_system,
        timestamp: Date.now(),
        payload: { upi_id, match_confidence: 1.0, match_method: det.method, merged_records: []  }
      };
      // write idempotency
      await clientConn.query(
        `INSERT INTO idempotency_keys (source_system, idempotency_key, resolution) VALUES ($1,$2,$3)`,
        [source_system, idempotency_key, JSON.stringify(resolvedEvent)]
      );
      await clientConn.query('COMMIT');

      // publish resolved + audit
      await publish(process.env.PATIENT_RESOLVED_TOPIC!, upi_id, patientResolvedSchema, resolvedEvent);
      await writeAudit(upi_id, 'DETERMINISTIC_MATCH', { before: null, after: payload }, 'upi-service');
      return;
    }

    // 3) no deterministic -> fuzzy candidate scanning: load some candidate UPIs (simple approach: search by mobile or name similarity)
    const candidates = await clientConn.query(`SELECT upi_id, identifiers FROM scansure_patient_upi LIMIT 100`); // tune later
    let best = { upi_id: null, score: 0, identifiers: null as any };
    for (const r of candidates.rows) {
      const idents = r.identifiers || {};
      const score = computeMatchConfidence(name, idents.name, dob, idents.dob, idents.address, idents.address);
      if (score > best.score) {
        best = { upi_id: r.upi_id, score, identifiers: idents };
      }
    }

    if (best.score >= HIGH) {
      // auto-link to best.upi_id (update upi table if needed)
      await clientConn.query(
        `UPDATE scansure_patient_upi SET identifiers = jsonb_set(identifiers, '{name}', to_jsonb($1::text), true) WHERE upi_id=$2`,
        [name, best.upi_id]
      );
      const resolvedEvent = { event_id, source_system, timestamp: Date.now(), payload: { upi_id: best.upi_id, match_confidence: best.score, match_method: 'fuzzy', merged_records: [] } };
      await clientConn.query(`INSERT INTO idempotency_keys (source_system, idempotency_key, resolution) VALUES ($1,$2,$3)`, [source_system, idempotency_key, JSON.stringify(resolvedEvent)]);
      await clientConn.query('COMMIT');
      if (!best.upi_id) {
        console.warn('No valid best.upi_id found — skipping publish/audit');
        return;
      }
      await publish(process.env.PATIENT_RESOLVED_TOPIC!, best.upi_id, patientResolvedSchema, resolvedEvent);
      await writeAudit(best.upi_id, 'AUTO_MERGE_FUZZY', { before: best.identifiers, after: payload }, 'upi-service');
      return;
    }

    if (best.score >= MID) {
      // create reconciliation candidate
      const recRes = await clientConn.query(
        `INSERT INTO reconciliation_candidates (candidate_snapshot, match_candidates, match_confidence, provenance) VALUES ($1,$2,$3,$4) RETURNING id`,
        [JSON.stringify(payload), JSON.stringify([{ upi_id: best.upi_id, score: best.score }]), best.score, JSON.stringify({ source_system })]
      );
      const candidateId = recRes.rows[0].id;
      const resolvedEvent = { event_id, source_system, timestamp: Date.now(), payload: { needs_review: true, candidate_id: candidateId } };
      await clientConn.query(`INSERT INTO idempotency_keys (source_system, idempotency_key, resolution) VALUES ($1,$2,$3)`, [source_system, idempotency_key, JSON.stringify(resolvedEvent)]);
      await clientConn.query('COMMIT');
      await publish(process.env.PATIENT_RESOLVED_TOPIC!, candidateId, patientResolvedSchema, resolvedEvent);
      await writeAudit(candidateId, 'NEEDS_REVIEW', { before: null, after: payload }, 'upi-service');
      return;
    }

    // else create new UPI
    const upiRes = await clientConn.query(
      `INSERT INTO scansure_patient_upi (upi_id, identifiers, provenance, match_confidence, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING upi_id`,
      [`UPI-${Date.now()}`, JSON.stringify(payload), JSON.stringify({ source_system }), 1.0, 'upi-service']
    );
    const newUpi = upiRes.rows[0].upi_id;
    await clientConn.query(`INSERT INTO idempotency_keys (source_system, idempotency_key, resolution) VALUES ($1,$2,$3)`, [source_system, idempotency_key, JSON.stringify({ upi_id: newUpi })]);
    await clientConn.query('COMMIT');
    await publish(process.env.PATIENT_RESOLVED_TOPIC!, newUpi, patientResolvedSchema, { event_id, source_system, timestamp: Date.now(), payload: { upi_id: newUpi, match_confidence: 1.0, match_method: 'new', merged_records: [] }});
    await writeAudit(newUpi, 'CREATE_UPI', { before: null, after: payload }, 'upi-service');
  } catch (err) {
    await clientConn.query('ROLLBACK');
    console.error('Error processing message', err);
    throw err;
  } finally {
    clientConn.release();
  }
}

async function run() {
  await connectProducer();
  const consumer = kafka.consumer({ groupId: process.env.CONSUMER_GROUP || 'upi-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: process.env.PATIENT_CREATE_TOPIC!, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        await handleMessage(message);
      } catch (e) {
        console.error('processing failed', e);
      }
    }
  });
}

run().catch(console.error);

// express server for /healthz and /metrics
import { collectDefaultMetrics, Registry } from 'prom-client';
const app = express();
collectDefaultMetrics();
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
app.listen(parseInt(process.env.PORT||'4001'), () => console.log('UPI service listening'));
