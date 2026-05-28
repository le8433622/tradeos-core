#!/usr/bin/env bash
set -euo pipefail

# Load TradeOS environment secrets from 1Password.
# Requires 1Password CLI (op) and a signed-in session.
#
# Usage:
#   ./scripts/load-env.sh              # print env vars to stdout
#   ./scripts/load-env.sh > .env        # write to .env
#   eval $(./scripts/load-env.sh)       # export into current shell
#
# 1Password items referenced:
#   "Supabase DB - Staging"        → DATABASE_URL, DIRECT_URL
#   "Supabase Service Role Key"    → SUPABASE_SERVICE_ROLE_KEY
#   "Supabase Project"             → NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL, keys
#   "Resend API Key"               → RESEND_API_KEY
#   "JWT Secret"                   → JWT_SECRET
#   "Webhook Secret"               → WEBHOOK_SECRET
#   "Webhook Encryption Key"       → WEBHOOK_ENCRYPTION_KEY

if ! command -v op &>/dev/null; then
  echo "ERROR: 1Password CLI (op) not found. Install from https://1password.com/downloads/command-line/" >&2
  exit 1
fi

# Verify session
if ! op whoami &>/dev/null; then
  echo "ERROR: Not signed in to 1Password CLI. Run: op signin --account my" >&2
  exit 1
fi

get() {
  op read "op://TradeOS Core/$1/$2" 2>/dev/null
}

cat <<ENV
# === Database (Staging — local dev) ===
DATABASE_URL="$(get 'Supabase DB - Staging' password)"
DIRECT_URL="$(get 'Supabase DB - Staging' notes)"

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL="$(get 'Supabase Project' url)"
SUPABASE_URL="$(get 'Supabase Project' url)"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$(get 'Supabase Project' 'publishable key')"
SUPABASE_PUBLISHABLE_KEY="$(get 'Supabase Project' 'publishable key')"
SUPABASE_PUBLISHABLE_KEY="$(get 'Supabase Project' 'publishable key')"
SUPABASE_SERVICE_ROLE_KEY="$(get 'Supabase Service Role Key' password)"

# === Auth ===
JWT_SECRET="$(get 'JWT Secret' password)"
ALLOW_DEMO_AUTH="true"

# === Webhooks ===
WEBHOOK_SECRET="$(get 'Webhook Secret' password)"
WEBHOOK_ENCRYPTION_KEY="$(get 'Webhook Encryption Key' password)"

# === Email ===
RESEND_API_KEY="$(get 'Resend API Key' password)"

# === App ===
APP_URL="http://localhost:3000"

# === Kill Switches (local dev safe to enable) ===
AI_EXECUTION_ENABLED="false"
EXTERNAL_TOOLCALL_ENABLED="false"
WEBHOOK_PROCESSING_ENABLED="false"
WORKER_CONSUMING_ENABLED="false"
BILLING_SIDE_EFFECTS_ENABLED="false"
PLUGIN_EXECUTION_ENABLED="false"
ENV
