#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROUTINES_DIR="$SCRIPT_DIR/submodule_routines"

for routine in common.sh list.sh install.sh remove.sh update.sh profile.sh; do
    # shellcheck source=/dev/null
    source "$ROUTINES_DIR/$routine"
done

usage() {
    cat <<EOF

Usage: manage_submodules.sh <command> [args]

Commands:
  list                        Show all modules and their install status
  install <name|--all>        Install one module or all declared modules
  remove  <name|--all>        Remove one module or all installed modules
  update  [name|--all]        Update installed module(s)
  profile list                List saved named profiles
  profile apply <name>        Install modules in profile; remove modules outside it
  profile save  <name>        Save currently active modules as a named profile

Environment-specific workflow:
  Shared profiles live in scripts/module_profiles/*.txt.
  The local environment state is always written to scripts/module_profiles/current.txt.
  To set up a new environment, run:  manage_submodules.sh profile apply <name>
  To save your current setup as a profile: manage_submodules.sh profile save myenv

EOF
}

COMMAND="${1:-}"
shift || true

case "$COMMAND" in
    list)    cmd_list ;;
    install) cmd_install "${1:-}" ;;
    remove)  cmd_remove "${1:-}" ;;
    update)  cmd_update "${1:---all}" ;;
    profile) cmd_profile "${@:-}" ;;
    *)       usage; exit 1 ;;
esac
