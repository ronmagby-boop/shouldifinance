#!/usr/bin/env bash
# Vercel's Ignored Build Step (vercel.json "ignoreCommand"). Exit 0 cancels the
# build; exit 1 builds.
#
# Cancels only a fresh push in which every file changed since the last
# successful deployment is content/instagram-facts.json, which the site never
# reads: Instagram review sign-offs, committed by the review workflow, and fact
# edits. Everything else builds, and so does anything this script cannot be
# sure about:
#   - no VERCEL_GIT_PREVIOUS_SHA (first deployment of the branch);
#   - that commit not in the clone (Vercel clones shallow);
#   - no difference at all (a redeploy of the deployed commit);
#   - a newest commit older than FRESH_SECONDS. A push starts its build within
#     moments of the commit; the daily rates deploy hook (refresh-rates.yml)
#     rebuilds whatever is newest, often hours old, and must not be canceled
#     just because the newest commit was a sign-off.
#
# Vercel counts a canceled build as a deployment for its quotas, but it stops
# before installing or building anything.
set -u
FRESH_SECONDS="${FRESH_SECONDS:-900}"
prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$prev" ]; then echo "No previous deployment SHA: building."; exit 1; fi
if ! git cat-file -e "${prev}^{commit}" 2>/dev/null; then echo "Previous deployment ${prev} is not in the clone: building."; exit 1; fi
changed="$(git diff --name-only "$prev" HEAD)" || { echo "git diff failed: building."; exit 1; }
if [ -z "$changed" ]; then echo "Nothing changed since ${prev} (a redeploy): building."; exit 1; fi
if printf '%s\n' "$changed" | grep -qv '^content/instagram-facts\.json$'; then
  echo "Site files changed since ${prev}: building."
  exit 1
fi
age=$(( $(date +%s) - $(git log -1 --format=%ct HEAD) ))
if [ "$age" -gt "$FRESH_SECONDS" ]; then
  echo "Only content/instagram-facts.json changed, but the newest commit is ${age}s old: not a fresh push (likely the rates deploy hook). Building."
  exit 1
fi
echo "Only content/instagram-facts.json changed since ${prev} (Instagram sign-offs; the site does not read it): skipping the build."
exit 0
