#!/bin/bash

PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

while [ ! -f "$PROJECT_ROOT/docker/docker-compose.yaml" ]; do
    if [ "$PROJECT_ROOT" = "/" ]; then
        echo "Error: Could not find pvrd_framework root (no docker/docker-compose.yaml found)"
        exit 1
    fi
    PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

GITMODULES="$PROJECT_ROOT/.gitmodules"
PROFILES_DIR="$SCRIPT_DIR/module_profiles"
CURRENT_FILE="$PROFILES_DIR/current.txt"

ensure_profile_state() {
    mkdir -p "$PROFILES_DIR"
    touch "$CURRENT_FILE"
}

get_all_submodule_keys() {
    git -C "$PROJECT_ROOT" config --file "$GITMODULES" --name-only --get-regexp '^submodule\..*\.path$' | sed 's/^submodule\.//; s/\.path$//'
}

get_module_name_from_key() {
    basename "$1" | tr '[:upper:]' '[:lower:]'
}

get_all_submodule_names() {
    while IFS= read -r key; do
        get_module_name_from_key "$key"
    done < <(get_all_submodule_keys)
}

resolve_module_key() {
    local target="$1"
    local lowered_target
    lowered_target="$(printf '%s' "$target" | tr '[:upper:]' '[:lower:]')"

    while IFS= read -r key; do
        local basename_key lowered_basename lowered_key
        basename_key="$(basename "$key")"
        lowered_basename="$(printf '%s' "$basename_key" | tr '[:upper:]' '[:lower:]')"
        lowered_key="$(printf '%s' "$key" | tr '[:upper:]' '[:lower:]')"

        if [ "$target" = "$key" ] || [ "$target" = "$basename_key" ] || [ "$lowered_target" = "$lowered_basename" ] || [ "$lowered_target" = "$lowered_key" ]; then
            printf '%s\n' "$key"
            return 0
        fi
    done < <(get_all_submodule_keys)

    return 1
}

get_submodule_path() {
    local key
    key="$(resolve_module_key "$1")" || return 1
    git -C "$PROJECT_ROOT" config --file "$GITMODULES" "submodule.${key}.path"
}

get_submodule_url() {
    local key
    key="$(resolve_module_key "$1")" || return 1
    git -C "$PROJECT_ROOT" config --file "$GITMODULES" "submodule.${key}.url"
}

is_tracked_gitlink() {
    local path="$1"
    local mode
    mode="$(git -C "$PROJECT_ROOT" ls-files --stage -- "$path" | awk 'NR==1 {print $1}')"
    [ "$mode" = "160000" ]
}

is_installed() {
    local path
    path="$(get_submodule_path "$1")" || return 1
    [ -d "$PROJECT_ROOT/$path" ] && [ -n "$(ls -A "$PROJECT_ROOT/$path" 2>/dev/null)" ]
}

sync_current_state() {
    ensure_profile_state

    local installed=()
    while IFS= read -r name; do
        if is_installed "$name"; then
            installed+=("$name")
        fi
    done < <(get_all_submodule_names)

    if [ ${#installed[@]} -eq 0 ]; then
        : > "$CURRENT_FILE"
        return
    fi

    printf '%s\n' "${installed[@]}" > "$CURRENT_FILE"
}

read_active() {
    ensure_profile_state
    grep -v '^\s*#' "$CURRENT_FILE" | grep -v '^\s*$' || true
}

assert_known_module() {
    if ! resolve_module_key "$1" >/dev/null; then
        echo "Error: Unknown module '$1'. Run 'list' to see available modules."
        exit 1
    fi
}

install_one_module() {
    local module="$1"
    local key path url

    key="$(resolve_module_key "$module")"
    path="$(get_submodule_path "$module")"
    url="$(get_submodule_url "$module")"

    if is_tracked_gitlink "$path"; then
        echo ">> Installing tracked submodule: $(get_module_name_from_key "$key") ($path)"
        git -C "$PROJECT_ROOT" submodule update --init --recursive -- "$path"
        echo "   Done."
        return
    fi

    if is_installed "$module"; then
        echo ">> Module already present: $(get_module_name_from_key "$key") ($path)"
        return
    fi

    echo ">> Cloning declared module: $(get_module_name_from_key "$key") ($path)"
    mkdir -p "$(dirname "$PROJECT_ROOT/$path")"
    git clone --recursive "$url" "$PROJECT_ROOT/$path"
    echo "   Done."
}

remove_one_module() {
    local module="$1"
    local path

    path="$(get_submodule_path "$module")"

    echo ">> Removing module: $module ($path)"
    if is_tracked_gitlink "$path"; then
        git -C "$PROJECT_ROOT" submodule deinit -f -- "$path"
        rm -rf "$PROJECT_ROOT/$path"
        mkdir -p "$PROJECT_ROOT/$path"
    else
        rm -rf "$PROJECT_ROOT/$path"
    fi
    echo "   Done."
}

update_one_module() {
    local module="$1"
    local path

    path="$(get_submodule_path "$module")"
    echo ">> Updating module: $module ($path)"

    if is_tracked_gitlink "$path"; then
        git -C "$PROJECT_ROOT" submodule update --remote --recursive -- "$path"
    else
        git -C "$PROJECT_ROOT/$path" pull --ff-only
        git -C "$PROJECT_ROOT/$path" submodule update --init --recursive
    fi

    echo "   Done."
}