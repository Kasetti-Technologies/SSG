#!/usr/bin/env bash
set -euo pipefail
KAFKA_BROKER="kafka:9092"
sleep 5
docker compose exec kafka bash -c "kafka-topics --create --topic patient.create --bootstrap-server ${KAFKA_BROKER} --replication-factor 1 --partitions 3 || true"
docker compose exec kafka bash -c "kafka-topics --create --topic patient.resolved --bootstrap-server ${KAFKA_BROKER} --replication-factor 1 --partitions 3 || true"
docker compose exec kafka bash -c "kafka-configs --bootstrap-server ${KAFKA_BROKER} --entity-type topics --entity-name patient.resolved --alter --add-config cleanup.policy=compact || true"
docker compose exec kafka bash -c "kafka-topics --create --topic booking.payment.success --bootstrap-server ${KAFKA_BROKER} --replication-factor 1 --partitions 3 || true"
docker compose exec kafka bash -c "kafka-topics --create --topic order.created --bootstrap-server ${KAFKA_BROKER} --replication-factor 1 --partitions 3 || true"
docker compose exec kafka bash -c "kafka-topics --create --topic report.ready --bootstrap-server ${KAFKA_BROKER} --replication-factor 1 --partitions 3 || true"
docker compose exec kafka bash -c "kafka-topics --create --topic patient.audit --bootstrap-server ${KAFKA_BROKER} --replication-factor 1 --partitions 3 || true"
echo "✅ Topics created."
