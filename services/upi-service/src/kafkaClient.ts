import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
dotenv.config();

const kafka = new Kafka({
  clientId: 'upi-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

export default kafka;
