#!/bin/bash

# Find pvrd_framework root directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
current_dir="${PWD}"

# Check if we're already in pvrd_framework
if [ -f "$current_dir/docker/docker-compose.yaml" ]; then
    ROOT_DIR="$current_dir"
    echo "$ROOT_DIR"
    exit 0
fi

# Check from script location
if [ -f "$SCRIPT_DIR/../docker/docker-compose.yaml" ]; then
    ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
    echo "$ROOT_DIR"
    exit 0
fi

# Search up the directory tree
search_dir="$current_dir"
while [ -n "$search_dir" ] && [ "$search_dir" != "/" ]; do
    if [ -f "$search_dir/docker/docker-compose.yaml" ]; then
        echo "$search_dir"
        exit 0
    fi
    search_dir="$(dirname "$search_dir")"
done

echo "Error: Could not find pvrd_framework folder!" >&2
exit 1
