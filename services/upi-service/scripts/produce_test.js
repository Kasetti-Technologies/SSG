const { Kafka } = require('kafkajs');
const avro = require('avsc');
const fs = require('fs');
const kafka = new Kafka({ clientId: 'test-producer', brokers: ['localhost:29092'] });
(async () => {
  const producer = kafka.producer();
  await producer.connect();
  const schema = JSON.parse(fs.readFileSync('./schemas/io.scansure.events.PatientCreateV1-value.avsc').toString());
  const type = avro.Type.forSchema(schema);
  const payload = {
    event_id: 'evt-6',
    idempotency_key: 'id-6',
    source_system: 'test-hospital-6',
    timestamp: Date.now(),
    payload: { name: 'Test User 6', dob: '1990-01-06', mobile: '9999999996', aadhaar: '111122223336' }
  };
  const buf = type.toBuffer(payload);
  await producer.send({ topic: 'patient.create', messages: [{ key: 'k1', value: buf }] });
  console.log('sent');
  await producer.disconnect();
})();
