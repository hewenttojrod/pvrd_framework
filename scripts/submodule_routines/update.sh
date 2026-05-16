#!/bin/bash

cmd_update() {
    local target="${1:---all}"

    local names=()
    if [ "$target" = "--all" ]; then
        while IFS= read -r name; do
            is_installed "$name" && names+=("$name")
        done < <(get_all_submodule_names)
    else
        assert_known_module "$target"
        if ! is_installed "$target"; then
            echo "Module '$target' is not installed. Run 'install $target' first."
            exit 1
        fi
        names=("$target")
    fi

    if [ ${#names[@]} -eq 0 ]; then
        echo "No installed modules to update."
        exit 0
    fi

    for name in "${names[@]}"; do
        update_one_module "$name"
    done

    sync_current_state
}