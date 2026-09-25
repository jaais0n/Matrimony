#!/bin/bash
set -e

echo "[build.sh] Step 1: Running Vite build..."
pnpm --filter @workspace/pentecostal-matrimony run build

echo "[build.sh] Step 2: Verifying Vite output exists..."
ls -la artifacts/pentecostal-matrimony/dist/public/

echo "[build.sh] Step 3: Creating root public/ directory..."
mkdir -p public

echo "[build.sh] Step 4: Copying build output to public/..."
cp -r artifacts/pentecostal-matrimony/dist/public/. public/

echo "[build.sh] Step 5: Verifying public/ contents..."
ls -la public/

echo "[build.sh] Done!"
