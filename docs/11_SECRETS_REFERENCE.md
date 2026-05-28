# Secrets Reference

All secrets managed via 1Password vault **TradeOS Core**.

## Vault Location

| Service   | Account                          | Vault          |
| --------- | -------------------------------- | -------------- |
| 1Password | `earthkingdomuniverse@gmail.com` | `TradeOS Core` |

## Secrets Inventory

### Supabase (Autonomous)

| Secret                                 | 1Password Item                      | Usage                      | Environments              |
| -------------------------------------- | ----------------------------------- | -------------------------- | ------------------------- |
| `DATABASE_URL`                         | `Supabase DB - Production (pooler)` | Prisma — session pooler    | Production                |
| `DIRECT_URL`                           | `Supabase DB - Production (direct)` | Prisma — direct connection | Production                |
| `DATABASE_URL` (staging)               | `Supabase DB - Staging`             | Prisma — staging           | Staging / Local dev       |
| `NEXT_PUBLIC_SUPABASE_URL`             | `Supabase Project`                  | Auth client — public       | All                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `Supabase Project`                  | Auth client — anon key     | All                       |
| `SUPABASE_URL`                         | `Supabase Project`                  | Supabase admin             | All                       |
| `SUPABASE_SERVICE_ROLE_KEY`            | `Supabase Service Role Key`         | Supabase admin operations  | All (encrypted in Vercel) |

### Authentication & Webhooks

| Secret                   | 1Password Item           | Usage                      | Environments |
| ------------------------ | ------------------------ | -------------------------- | ------------ |
| `JWT_SECRET`             | `JWT Secret`             | Auth token signing         | All          |
| `ALLOW_DEMO_AUTH`        | (config, not secret)     | Demo auth bypass           | Local only   |
| `WEBHOOK_SECRET`         | `Webhook Secret`         | Webhook payload validation | Production   |
| `WEBHOOK_ENCRYPTION_KEY` | `Webhook Encryption Key` | Webhook payload encryption | Production   |

### Email & Notifications

| Secret           | 1Password Item   | Usage          | Environments |
| ---------------- | ---------------- | -------------- | ------------ |
| `RESEND_API_KEY` | `Resend API Key` | Email delivery | Production   |

### E2E Testing

| Secret              | 1Password Item      | Usage                    | Environments |
| ------------------- | ------------------- | ------------------------ | ------------ |
| `E2E_USER_PASSWORD` | `E2E User Password` | Playwright Supabase Auth | CI / Local   |

### External AI / Tools

| Secret               | 1Password Item       | Usage                | Environments   |
| -------------------- | -------------------- | -------------------- | -------------- |
| `OPENAI_API_KEY`     | `OpenAI API Key`     | AI agent execution   | Staging / Prod |
| `OPENROUTER_API_KEY` | `OpenRouter API Key` | AI fallback provider | Staging / Prod |

## Loading Secrets

### Local Development

Use the 1Password CLI to load secrets:

```bash
# One-time setup: authenticate with 1Password CLI
op account add --address my.1password.com --email earthkingdomuniverse@gmail.com

# Load env from 1Password
op run --env-file=".env.1password" -- pnpm dev
```

Or create a `.env` from 1Password items:

```bash
pnpm env:load
```

### Production (Vercel)

Secrets are set as **Encrypted** environment variables in Vercel project settings:

```
https://vercel.com/earthkingdomuniverse-6943s-projects/tradeos-core/settings/environment-variables
```

To update a production secret:

```bash
npx vercel env add SECRET_NAME production
```

### CI/CD (GitHub Actions)

Secrets are set in GitHub Actions secrets for the repository:

```
https://github.com/anomalyco/tradeos-core/settings/secrets/actions
```

## Adding a New Secret

1. Create an item in 1Password vault `TradeOS Core`
2. Add the secret to Vercel environment variables (production)
3. Add the secret to GitHub Actions secrets (CI)
4. Add a reference to `.env.example`
5. Update this document
6. Add secret to the load script if applicable
