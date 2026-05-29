#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# TradeOS — One-time 1Password vault setup
# Run this once to create the "TradeOS Core" vault with all secret items.
# Requires 1Password CLI with an active session.
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

VAULT_NAME="TradeOS Core"

if ! op whoami &>/dev/null; then
  echo "ERROR: Not signed in. Run: op signin --account my" >&2
  exit 1
fi

# Create vault
VAULT_ID=$(op vault create "$VAULT_NAME" --allow-admins-to-manage true 2>/dev/null | grep "^ID:" | awk '{print $2}')
echo "Created vault: $VAULT_NAME ($VAULT_ID)"

create_item() {
  local title="$1"
  local field2_label="$2"
  local field2_value="$3"
  local field3_label="${4:-}"
  local field3_value="${5:-}"

  local cmd=(op item create --category password --vault "$VAULT_NAME" --title "$title")

  if [[ -n "$field2_label" && -n "$field2_value" ]]; then
    cmd+=("username=staging" "password=$field2_value")
    if [[ -n "$field3_label" && -n "$field3_value" ]]; then
      cmd+=("notes=$field3_value")
    fi
  fi

  "${cmd[@]}" &>/dev/null
  echo "  Created: $title"
}

# Supabase DB — Staging
create_item "Supabase DB - Staging" "password" "[CHANGE_ME]" "notes" "postgresql://postgres:[CHANGE_ME]@db.ulnjanlaehfmxurreibj.supabase.co:5432/postgres"

# Supabase DB — Production
create_item "Supabase DB - Production (pooler)" "password" "[CHANGE_ME]" "notes" "postgresql://postgres.okkzfmtwrjkfjzyprrwh:[CHANGE_ME]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

# Supabase DB — Production direct
create_item "Supabase DB - Production (direct)" "password" "[CHANGE_ME]" "notes" "postgresql://postgres:[CHANGE_ME]@db.okkzfmtwrjkfjzyprrwh.supabase.co:5432/postgres"

# Supabase Project
create_item "Supabase Project" "url" "https://ulnjanlaehfmxurreibj.supabase.co" "publishable key" "sb_publishable_l4cna-BDSGbrrvIObSBmAg_H5egBYE6"

# Supabase Service Role Key
create_item "Supabase Service Role Key" "password" ""

# JWT Secret
create_item "JWT Secret" "password" ""

# Webhook
create_item "Webhook Secret" "password" ""
create_item "Webhook Encryption Key" "password" ""

# Resend
create_item "Resend API Key" "password" ""

echo ""
echo "Done! Vault '$VAULT_NAME' created."
echo "Fill in empty passwords manually via 1Password desktop app."
echo ""
echo "To load secrets: ./scripts/load-env.sh > .env"
