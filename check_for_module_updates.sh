#!/usr/bin/env bash
#
# check_module_updates.sh
# - Prints lines of the form: modulename|N  (N = commits behind remote)
# - Diagnostics go to stderr (when DEBUG=1)
# - Must be executable and should only write the required output to stdout.
#
set -euo pipefail

# Ensure a sensible PATH for non-interactive shells (PM2)
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Configurable via env or defaults
DEBUG=${DEBUG:-0}
MM_MODULES_DIR=${MM_MODULES_DIR:-/home/pi/MagicMirror/modules}

exit_code=0
declare -a results=()

# ERR trap logs a short message to stderr and records a non-zero exit_code.
# It will not print to stdout so stdout remains parseable.
trap 'rc=$?; if [ $rc -ne 0 ]; then echo "ERROR: script aborted at line ${LINENO} (rc=$rc)" >&2; exit_code=$rc; fi' ERR

# Collect module directories safely (NUL-separated)
# mapfile/read with -d '' can return non-zero at EOF; disable set -e temporarily,
# capture the return value, then restore set -e so a harmless EOF doesn't abort the script【2】【3】.
set +e
mapfile -d '' -t modulepaths < <(find "$MM_MODULES_DIR" -maxdepth 1 -mindepth 1 -type d -print0)
mapfile_rc=$?
set -e
if [ "$DEBUG" -eq 1 ] && [ "$mapfile_rc" -ne 0 ]; then
  echo "DEBUG: mapfile returned $mapfile_rc (ignored)" >&2
fi

# If no modules found, just exit successfully (no stdout)
if [ "${#modulepaths[@]}" -eq 0 ]; then
  [ "$DEBUG" -eq 1 ] && echo "DEBUG: no modules found in $MM_MODULES_DIR" >&2
  exit 0
fi

# Helper: get number of commits local is behind remote (0 if none / cannot determine)
get_behind_count() {
  local modulename=$1
  local behind=0
  local status_line upstream origin_head

  # Try git status porcelain=2 branch parsing first (fast, commonly available)
  status_line=$(git status --porcelain=2 --branch 2>/dev/null || true)
  if echo "$status_line" | grep -q '^# branch.ab'; then
    # branch.ab format: "# branch.ab +<ahead> -<behind>"
    behind=$(echo "$status_line" | grep '^# branch.ab' | sed -n 's/.*-//p' | tr -dc '0-9')
    behind=${behind:-0}
    echo "$behind"
    return 0
  fi

  # Fallback: try @{u} (upstream) if set
  upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
  if [ -n "$upstream" ]; then
    behind=$(git rev-list --count HEAD.."$upstream" 2>/dev/null || echo 0)
    echo "${behind:-0}"
    return 0
  fi

  # Fallback: attempt to use origin's default branch (if origin exists)
  origin_head=$(git remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p' || true)
  if [ -n "$origin_head" ]; then
    behind=$(git rev-list --count HEAD.."origin/$origin_head" 2>/dev/null || echo 0)
    echo "${behind:-0}"
    return 0
  fi

  # Last resort: return 0 (can't determine)
  echo 0
  return 0
}

# Iterate modules
for modulepath in "${modulepaths[@]}"; do
  # normalize
  [ -z "$modulepath" ] && continue
  modulename=$(basename "$modulepath")

  # Optionally skip the default folder (match your preferences)
  if [ "$modulename" = "default" ]; then
    [ "$DEBUG" -eq 1 ] && echo "DEBUG: skipping $modulename" >&2
    continue
  fi

  # Skip non-git modules
  if [ ! -d "${modulepath}/.git" ]; then
    [ "$DEBUG" -eq 1 ] && echo "DEBUG: skip ${modulename} (no .git)" >&2
    continue
  fi

  # cd into module; if it fails, record but continue with others
  if ! cd "$modulepath"; then
    echo "DEBUG: cd failed for ${modulename}" >&2
    exit_code=2
    continue
  fi

  # Ensure remote refs are up-to-date; a failing fetch is non-fatal here but logged.
  if ! git fetch --all --prune --quiet 2>/dev/null; then
    [ "$DEBUG" -eq 1 ] && echo "DEBUG: git fetch failed for ${modulename} (continuing)" >&2
  fi

  # Compute behind count using helper (robust fallbacks)
  behind=$(get_behind_count "$modulename" 2>/dev/null || echo 0)
  # sanitize to integer
  if ! echo "$behind" | grep -Eq '^[0-9]+$'; then
    behind=0
  fi

  if [ "$behind" -gt 0 ]; then
    results+=("${modulename}|${behind}")
    [ "$DEBUG" -eq 1 ] && echo "DEBUG: ${modulename} behind by ${behind}" >&2
  else
    [ "$DEBUG" -eq 1 ] && echo "DEBUG: ${modulename} up to date" >&2
  fi
done

# Output only the required results to stdout, one per line
for line in "${results[@]}"; do
  echo "$line"
done

# Explicitly exit with the tracked exit code (0 on normal success)
exit "$exit_code"
