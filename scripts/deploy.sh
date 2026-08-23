#!/usr/bin/env bash
#
# Deploy The Fund Room.
#
# Reads credentials from the environment, runs migrations against the
# target database FIRST, then deploys. That order matters: shipping code
# that expects a column the database does not have yet produces a live
# site throwing 500s, and the fix is a redeploy rather than a rollback.
#
# Required in the environment:
#   DATABASE_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, VERCEL_TOKEN
#
set -euo pipefail

for v in DATABASE_URL CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY VERCEL_TOKEN; do
  if [ -z "${!v:-}" ]; then
    echo "Missing required variable: $v" >&2
    exit 1
  fi
done

ENVIRONMENT="${1:-preview}"

echo "==> Applying migrations to the target database"
npx drizzle-kit migrate

echo "==> Seeding reference data (idempotent)"
npx tsx src/db/seed.ts

echo "==> Verifying the build locally before shipping it"
npx next build > /tmp/predeploy-build.log 2>&1 || {
  echo "Build failed — not deploying. Log:" >&2
  tail -30 /tmp/predeploy-build.log >&2
  exit 1
}

echo "==> Pushing environment configuration"
push_env() {
  local key="$1" val="$2" target="$3"
  # Remove first so re-runs update rather than erroring on a duplicate.
  vercel env rm "$key" "$target" --yes --token "$VERCEL_TOKEN" >/dev/null 2>&1 || true
  printf '%s' "$val" | vercel env add "$key" "$target" --token "$VERCEL_TOKEN" >/dev/null
}

for target in production preview development; do
  push_env DATABASE_URL "$DATABASE_URL" "$target"
  push_env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$CLERK_PUBLISHABLE_KEY" "$target"
  push_env CLERK_SECRET_KEY "$CLERK_SECRET_KEY" "$target"
  push_env NEXT_PUBLIC_CLERK_SIGN_IN_URL "/sign-in" "$target"
  push_env NEXT_PUBLIC_CLERK_SIGN_UP_URL "/sign-up" "$target"
done

echo "==> Deploying ($ENVIRONMENT)"
if [ "$ENVIRONMENT" = "production" ]; then
  vercel deploy --prod --yes --token "$VERCEL_TOKEN"
else
  vercel deploy --yes --token "$VERCEL_TOKEN"
fi
