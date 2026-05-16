#!/bin/bash

# Script to start the Docker containers

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

cd "$ROOT_DIR" || exit 1

docker-compose -f docker/docker-compose.yaml up -d

if [ $? -eq 0 ]; then
    bash "$SCRIPT_DIR/util/echo_started_containers.sh"
fi
