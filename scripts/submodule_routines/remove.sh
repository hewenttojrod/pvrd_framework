#!/bin/bash

cmd_remove() {
    local target="${1:-}"
    if [ -z "$target" ]; then
        echo "Usage: manage_submodules.sh remove <name|--all>"
        exit 1
    fi

    local names=()
    if [ "$target" = "--all" ]; then
        mapfile -t names < <(get_all_submodule_names)
    else
        assert_known_module "$target"
        names=("$target")
    fi

    for name in "${names[@]}"; do
        remove_one_module "$name"
    done

    sync_current_state
}