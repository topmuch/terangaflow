#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting dev server..."
  npx next dev --port 3000 >> dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 2s..."
  sleep 2
done
