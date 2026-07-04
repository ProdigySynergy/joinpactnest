#!/usr/bin/env bash
set -euo pipefail

echo "Starting Vowbird local MySQL..."
docker compose up -d mysql

echo "Waiting for MySQL..."
sleep 8

echo "Running migrations..."
pnpm db:migrate:deploy

echo "Seeding database..."
pnpm db:seed

echo "Done! Run: pnpm dev"
