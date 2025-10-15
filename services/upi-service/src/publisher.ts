import kafka from './kafkaClient';
import { loadType } from './avroLoader';
import dotenv from 'dotenv';
dotenv.config();

const producer = kafka.producer();

export async function connectProducer(){ await producer.connect(); }
export async function publish(topic: string, key: string, schemaName: string, payload: any){
  const type = loadType(schemaName);
  const buf = type.toBuffer(payload); // avsc buffer
  // kafkajs uses Buffer for messages
  await producer.send({ topic, messages: [{ key, value: buf }] });
}
export async function disconnectProducer(){ await producer.disconnect(); }
