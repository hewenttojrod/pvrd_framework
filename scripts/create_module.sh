#!/bin/bash

# Used for building a module for the framework. Sets things in the correct folders and adds any files the app needs to function

# File: scripts/create_module.sh

if [ -z "$1" ]; then
    echo "Error: App name is required"
    echo "Usage: create_module.sh <app_name>"
    exit 1
fi

APP_NAME="$1"

# Find the root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Search up the directory tree if not found
while [ ! -f "$PROJECT_ROOT/docker/docker-compose.yaml" ]; do
    if [ "$PROJECT_ROOT" == "/" ]; then
        echo "Error: Could not find pvrd_framework folder!"
        exit 1
    fi
    PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

# Create the module directory structure locally
MODULE_PATH="$PROJECT_ROOT/modules/$APP_NAME/server"
if [ ! -d "$MODULE_PATH" ]; then
    mkdir -p "$MODULE_PATH"
    echo "Created: $MODULE_PATH"
fi

# Run startapp in the Django container
echo "Creating Django app '$APP_NAME' in container..."
docker exec prvd_framework-api-1 bash -c "python manage.py startapp $APP_NAME /modules/$APP_NAME/server"

if [ $? -eq 0 ]; then
    echo ""
    echo "Successfully created app: $MODULE_PATH"
    echo "App files:"
    if [ -d "$MODULE_PATH" ]; then
        ls -1 "$MODULE_PATH" | sed 's/^/  - /'
    fi
else
    echo "Error creating app"
    exit 1
fi
