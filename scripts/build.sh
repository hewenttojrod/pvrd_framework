#!/bin/bash

# Script to build the project using Docker

# Find the root directory by looking for docker-compose.yaml
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

cd "$ROOT_DIR/docker" || exit 1

docker-compose build --no-cache
docker-compose -f docker-compose.yaml up -d

if [ $? -eq 0 ]; then
    bash "$SCRIPT_DIR/util/echo_started_containers.sh"
fi
