#!/bin/bash

cmd_profile() {
    local sub="${1:-}"
    shift || true

    case "$sub" in
        list)
            echo ""
            echo "Available profiles (scripts/module_profiles/):"
            echo "-----------------------------------------------"
            ensure_profile_state
            if [ -d "$PROFILES_DIR" ] && compgen -G "$PROFILES_DIR/*.txt" > /dev/null 2>&1; then
                local found=0
                for f in "$PROFILES_DIR"/*.txt; do
                    local pname
                    pname="$(basename "$f" .txt)"
                    if [ "$pname" = "current" ]; then
                        continue
                    fi
                    found=1
                    echo "  $pname"
                    grep -v '^\s*#' "$f" | grep -v '^\s*$' | sed 's/^/    - /'
                done
                if [ "$found" -eq 0 ]; then
                    echo "  (no profiles found)"
                fi
            else
                echo "  (no profiles found)"
            fi
            echo ""
            ;;
        apply)
            local profile_name="${1:-}"
            if [ -z "$profile_name" ]; then
                echo "Usage: manage_submodules.sh profile apply <name>"
                exit 1
            fi

            local profile_file="$PROFILES_DIR/${profile_name}.txt"
            if [ ! -f "$profile_file" ]; then
                echo "Error: Profile '$profile_name' not found at $profile_file"
                exit 1
            fi

            local desired=()
            mapfile -t desired < <(grep -v '^\s*#' "$profile_file" | grep -v '^\s*$')

            for name in "${desired[@]}"; do
                assert_known_module "$name"
            done

            echo "Applying profile: $profile_name"

            for name in "${desired[@]}"; do
                if ! is_installed "$name"; then
                    install_one_module "$name"
                else
                    echo "  $name is already installed, skipping."
                fi
            done

            while IFS= read -r name; do
                if is_installed "$name"; then
                    if ! printf '%s\n' "${desired[@]}" | grep -qx "$name"; then
                        echo "  $name is not in the profile, removing..."
                        remove_one_module "$name"
                    fi
                fi
            done < <(get_all_submodule_names)

            sync_current_state

            echo ""
            echo "Profile '$profile_name' applied."
            ;;
        save)
            local profile_name="${1:-}"
            if [ -z "$profile_name" ]; then
                echo "Usage: manage_submodules.sh profile save <name>"
                exit 1
            fi
            if [ "$profile_name" = "current" ]; then
                echo "Error: 'current' is reserved for the generated environment state file."
                exit 1
            fi

            ensure_profile_state
            sync_current_state

            local profile_file="$PROFILES_DIR/${profile_name}.txt"
            local active
            active="$(read_active)"
            if [ -z "$active" ]; then
                echo "No active modules to save."
                exit 0
            fi

            echo "# Profile: $profile_name" > "$profile_file"
            echo "# Generated $(date +%Y-%m-%d) by manage_submodules.sh" >> "$profile_file"
            echo "" >> "$profile_file"
            echo "$active" >> "$profile_file"
            echo "Saved profile '$profile_name' to $profile_file"
            ;;
        *)
            echo "Usage: manage_submodules.sh profile <list|apply|save> [args]"
            exit 1
            ;;
    esac
}