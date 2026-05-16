#!/bin/bash

# Script to open a Python terminal inside the Docker API container

# Find the root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

# Search up the directory tree if not found
while [ ! -f "$ROOT_DIR/docker/docker-compose.yaml" ]; do
    if [ "$ROOT_DIR" == "/" ]; then
        echo "Error: Could not find pvrd_framework folder!"
        exit 1
    fi
    ROOT_DIR="$(dirname "$ROOT_DIR")"
done

# List running containers
echo "Available running containers:"
docker ps --format "{{.Names}}"
echo ""

# Try to find the API container
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -E "^prvd_framework-api-1$|^api$" | head -n 1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "Error: Could not find API container."
    echo "Expected: prvd_framework-api-1 or api"
    exit 1
fi

# Open Python shell in the container
echo ""
echo "Opening Python shell in container '$CONTAINER_NAME'..."
docker exec -it "$CONTAINER_NAME" python manage.py shell_plus --ipython
