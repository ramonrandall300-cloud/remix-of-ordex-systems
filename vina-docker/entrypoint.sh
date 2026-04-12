#!/bin/bash
set -e

MODE="${1:-server}"

case "$MODE" in
  server)
    echo "Starting Vina JSON API server on port 8080..."
    exec gunicorn -b 0.0.0.0:8080 -w 2 --timeout 600 server:app
    ;;
  cli)
    shift
    echo "Running Vina CLI mode..."
    exec python3 dock.py "$@"
    ;;
  shell)
    echo "Entering shell..."
    exec /bin/bash
    ;;
  *)
    echo "Usage: entrypoint.sh {server|cli|shell}"
    exit 1
    ;;
esac
