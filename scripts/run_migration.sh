#!/bin/bash

# Script to run Django migrations for selected modules

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

COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.yaml"
WORKSPACE_DIR="$PROJECT_ROOT/modules"
API_CONTAINER=""
SELECTED_APPS=""
MIGRATE_ALL=0

if [ ! -d "$WORKSPACE_DIR" ]; then
    echo "[ERROR] Workspace directory not found: $WORKSPACE_DIR"
    exit 1
fi

# Find all available apps
declare -a APPS
APP_COUNT=0

for dir in "$WORKSPACE_DIR"/*; do
    if [ -f "$dir/server/apps.py" ]; then
        APP_COUNT=$((APP_COUNT + 1))
        APPS[$((APP_COUNT - 1))]="$(basename "$dir")"
    fi
done

if [ $APP_COUNT -eq 0 ]; then
    echo "[ERROR] No Django module apps were found under $WORKSPACE_DIR"
    exit 1
fi

# Parse command line arguments or prompt for selection
if [ $# -eq 0 ]; then
    # Prompt for selection
    echo "Available apps for migrations:"
    for i in "${!APPS[@]}"; do
        echo "  $((i + 1)). ${APPS[$i]}"
    done
    echo "  A. all"
    echo "  Q. quit"
    read -p "Choose app numbers or names separated by spaces or commas: " USER_SELECTION

    if [ -z "$USER_SELECTION" ]; then
        echo "[ERROR] No selection provided."
        exit 1
    fi

    if [[ "$USER_SELECTION" == "Q" ]] || [[ "$USER_SELECTION" == "q" ]]; then
        echo "[INFO] Migration cancelled."
        exit 1
    fi

    # Process the selection
    USER_SELECTION="${USER_SELECTION//,/ }"
else
    USER_SELECTION="$@"
fi

# Parse selected apps
for token in $USER_SELECTION; do
    token_lower=$(echo "$token" | tr '[:upper:]' '[:lower:]')
    
    if [[ "$token_lower" == "all" ]] || [[ "$token_lower" == "a" ]]; then
        MIGRATE_ALL=1
        SELECTED_APPS=""
        break
    fi
    
    # Check if it's a number
    if [[ "$token" =~ ^[0-9]+$ ]]; then
        index=$((token - 1))
        if [ $index -ge 0 ] && [ $index -lt $APP_COUNT ]; then
            app_name="${APPS[$index]}"
            # Check if already selected
            if [[ ! " $SELECTED_APPS " =~ " $app_name " ]]; then
                SELECTED_APPS="$SELECTED_APPS $app_name"
            fi
        fi
    else
        # Check if it's an app name
        found=0
        for app in "${APPS[@]}"; do
            if [[ "$app" == "$token" ]]; then
                if [[ ! " $SELECTED_APPS " =~ " $app " ]]; then
                    SELECTED_APPS="$SELECTED_APPS $app"
                fi
                found=1
                break
            fi
        done
        if [ $found -eq 0 ]; then
            echo "[ERROR] Unknown app selection: $token"
            exit 1
        fi
    fi
done

if [ $MIGRATE_ALL -eq 0 ] && [ -z "$SELECTED_APPS" ]; then
    echo "[ERROR] No valid apps were selected."
    exit 1
fi

# Get API container ID
API_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q api 2>/dev/null)

# Run migrations
run_manage() {
    if [ -n "$API_CONTAINER" ]; then
        docker compose -f "$COMPOSE_FILE" exec -T api python manage.py "$@"
    else
        docker compose -f "$COMPOSE_FILE" run --rm api python manage.py "$@"
    fi
}

# Execute migrations
if [ $MIGRATE_ALL -eq 1 ]; then
    echo "[INFO] Running makemigrations for all apps..."
    run_manage makemigrations
    if [ $? -ne 0 ]; then
        echo "[ERROR] Migration command failed."
        exit 1
    fi

    echo "[INFO] Running migrate for all apps..."
    run_manage migrate
    if [ $? -ne 0 ]; then
        echo "[ERROR] Migration command failed."
        exit 1
    fi
else
    echo "[INFO] Selected apps: $SELECTED_APPS"
    for app in $SELECTED_APPS; do
        echo "[INFO] Running makemigrations for $app..."
        run_manage makemigrations "$app"
        if [ $? -ne 0 ]; then
            echo "[ERROR] Migration command failed."
            exit 1
        fi
    done

    for app in $SELECTED_APPS; do
        echo "[INFO] Running migrate for $app..."
        run_manage migrate "$app"
        if [ $? -ne 0 ]; then
            echo "[ERROR] Migration command failed."
            exit 1
        fi
    done
fi

echo "[SUCCESS] Migration commands completed."
exit 0
