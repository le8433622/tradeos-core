#!/usr/bin/env node
const { execSync } = require('child_process');

// Staging secrets from .env (since they are constant/known staging config)
const STAGING_DB_URL = "postgresql://postgres:rokrC02ESnw7JWKx@db.ulnjanlaehfmxurreibj.supabase.co:5432/postgres";

// Verify we are signed in to 1Password
try {
  execSync('op whoami', { stdio: 'ignore' });
} catch (e) {
  console.error("ERROR: You are not signed in to 1Password CLI.");
  console.error("Please run: op signin --account my");
  console.error("in your terminal, authenticate via Touch ID, and then try again.");
  process.exit(1);
}

const vault = "TradeOS Core";

function runOp(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    const out = execSync(cmd, { stdio: 'inherit' });
    return out;
  } catch (e) {
    console.error(`Failed to execute: ${cmd}`);
    throw e;
  }
}

// Read from process.env (passed via Vercel env run)
const prodDbUrl = process.env.DATABASE_URL;
const prodDirectUrl = process.env.DIRECT_URL;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const webhookSecret = process.env.WEBHOOK_SECRET;
const webhookEncryptionKey = process.env.WEBHOOK_ENCRYPTION_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!prodDbUrl) {
  console.error("ERROR: Production environment variables not loaded.");
  console.error("Make sure to run this script via Vercel env run:");
  console.error("  npx vercel env run -e production -- node scripts/fill-vault.js");
  process.exit(1);
}

console.log("Found production secrets from Vercel. Updating 1Password items...");

// Helper to escape values for shell command
function escape(str) {
  if (!str) return '""';
  return `"${str.replace(/"/g, '\\"')}"`;
}

// 1. Supabase DB - Staging
runOp(`op item edit "Supabase DB - Staging" --vault ${escape(vault)} password=${escape(STAGING_DB_URL)} notes=${escape(STAGING_DB_URL)}`);

// 2. Supabase DB - Production (pooler)
runOp(`op item edit "Supabase DB - Production (pooler)" --vault ${escape(vault)} password=${escape(prodDbUrl)} notes=${escape(prodDirectUrl)}`);

// 3. Supabase DB - Production (direct)
runOp(`op item edit "Supabase DB - Production (direct)" --vault ${escape(vault)} password=${escape(prodDirectUrl)}`);

// 4. Supabase Project
runOp(`op item edit "Supabase Project" --vault ${escape(vault)} url=${escape(supabaseUrl)} "publishable key"=${escape(supabaseAnonKey)}`);

// 5. Supabase Service Role Key
runOp(`op item edit "Supabase Service Role Key" --vault ${escape(vault)} password=${escape(supabaseServiceRole)}`);

// 6. JWT Secret
runOp(`op item edit "JWT Secret" --vault ${escape(vault)} password=${escape(jwtSecret)}`);

// 7. Webhook Secret
runOp(`op item edit "Webhook Secret" --vault ${escape(vault)} password=${escape(webhookSecret)}`);

// 8. Webhook Encryption Key
runOp(`op item edit "Webhook Encryption Key" --vault ${escape(vault)} password=${escape(webhookEncryptionKey)}`);

// 9. Resend API Key
runOp(`op item edit "Resend API Key" --vault ${escape(vault)} password=${escape(resendApiKey)}`);

console.log("All vault items successfully updated!");
