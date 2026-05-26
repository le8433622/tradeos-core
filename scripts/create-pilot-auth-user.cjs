#!/usr/bin/env node
/**
 * Creates or confirms a Supabase Auth user for pilot Supplier Switch testing.
 *
 * Required env:
 *   SUPABASE_URL           — https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service_role key (keep secret)
 *   PILOT_OWNER_EMAIL      — defaults to pilot-owner@tradeos.local
 *   PILOT_OWNER_PASSWORD   — password for the auth user
 *
 * Idempotent: if user already exists with confirmed email, skips creation.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.PILOT_OWNER_EMAIL || "pilot-owner@tradeos.local";
const PASSWORD = process.env.PILOT_OWNER_PASSWORD;

if (!SUPABASE_URL || !SERVICE_KEY || !PASSWORD) {
  console.error("Missing required env vars:");
  if (!SUPABASE_URL) console.error("  SUPABASE_URL");
  if (!SERVICE_KEY) console.error("  SUPABASE_SERVICE_ROLE_KEY");
  if (!PASSWORD) console.error("  PILOT_OWNER_PASSWORD");
  process.exit(1);
}

const API_URL = `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1`;

async function main() {
  // 1. Check if user already exists
  const listRes = await fetch(
    `${API_URL}/admin/users?filter%5Bemail%5D=${encodeURIComponent(EMAIL)}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );

  if (!listRes.ok) {
    const text = await listRes.text();
    console.error(`Failed to list users: ${listRes.status} ${text}`);
    process.exit(1);
  }

  const { users } = await listRes.json();

  if (users && users.length > 0) {
    const existing = users[0];
    if (existing.email_confirmed_at) {
      console.log(`✅ Auth user already exists and confirmed: ${EMAIL}`);
      console.log(`  ID: ${existing.id}`);
      console.log(`  Confirmed: ${existing.email_confirmed_at}`);
      return;
    }
    // User exists but not confirmed — confirm them
    console.log(`User exists but not confirmed. Confirming...`);
    const confirmRes = await fetch(`${API_URL}/admin/users/${existing.id}`, {
      method: "PUT",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_confirm: true,
        // Don't update password unless needed
      }),
    });
    if (!confirmRes.ok) {
      const text = await confirmRes.text();
      console.error(`Failed to confirm user: ${confirmRes.status} ${text}`);
      process.exit(1);
    }
    console.log(`✅ Auth user confirmed: ${EMAIL}`);
    return;
  }

  // 2. Create new auth user
  console.log(`Creating auth user: ${EMAIL}...`);
  const createRes = await fetch(`${API_URL}/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error(`Failed to create user: ${createRes.status} ${text}`);
    process.exit(1);
  }

  const created = await createRes.json();
  console.log(`✅ Auth user created: ${EMAIL}`);
  console.log(`  ID: ${created.id}`);
  console.log(`  Confirmed: ${created.email_confirmed_at}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});