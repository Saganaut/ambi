#!/usr/bin/env bash
# Run once after `docker compose up -d` to set up Garage for the first time.
# Copies the generated key values to stdout — paste them into .env.
set -euo pipefail

echo "Waiting for Garage to be ready..."
until docker compose exec -T garage /garage status >/dev/null 2>&1; do
  sleep 2
done

echo "Fetching node ID..."
NODE_ID=$(docker compose exec -T garage /garage node id | grep -oE '^[a-f0-9]+')

echo "Assigning layout for node $NODE_ID..."
docker compose exec -T garage /garage layout assign --zone dc1 --capacity 1G "$NODE_ID"
docker compose exec -T garage /garage layout apply --version 1

echo "Creating access key..."
KEY_OUTPUT=$(docker compose exec -T garage /garage key create brainflex-key)
echo "$KEY_OUTPUT"
ACCESS_KEY=$(echo "$KEY_OUTPUT" | grep "Key ID:" | awk '{print $3}')
SECRET_KEY=$(echo "$KEY_OUTPUT" | grep "Secret key:" | awk '{print $3}')

echo "Creating bucket..."
docker compose exec -T garage /garage bucket create brainflex-images

echo "Granting key access to bucket..."
docker compose exec -T garage /garage bucket allow brainflex-images --read --write --key brainflex-key

echo ""
echo "=== Add the following to your .env ==="
echo "S3_ACCESS_KEY=$ACCESS_KEY"
echo "S3_SECRET_KEY=$SECRET_KEY"
