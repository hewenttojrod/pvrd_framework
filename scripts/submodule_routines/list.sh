#!/bin/bash

cmd_list() {
    sync_current_state

    echo ""
    echo "Available modules (defined in .gitmodules):"
    echo "--------------------------------------------"

    local all
    all="$(get_all_submodule_names)"
    if [ -z "$all" ]; then
        echo "  (none)"
    else
        while IFS= read -r name; do
            local url status
            url="$(get_submodule_url "$name")"
            if is_installed "$name"; then
                status="[installed]"
            else
                status="[not installed]"
            fi
            printf "  %-20s %s  %s\n" "$name" "$status" "$url"
        done <<< "$all"
    fi

    echo ""
    echo "Current environment state (scripts/module_profiles/current.txt):"
    echo "---------------------------------------------------------------"

    local active
    active="$(read_active)"
    if [ -z "$active" ]; then
        echo "  (none recorded — run 'install' or 'profile apply' to set up)"
    else
        while IFS= read -r name; do
            echo "  $name"
        done <<< "$active"
    fi
    echo ""
}