#!/bin/bash

cmd_install() {
    local target="${1:-}"
    if [ -z "$target" ]; then
        echo "Usage: manage_submodules.sh install <name|--all>"
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
        install_one_module "$name"
    done

    sync_current_state
}