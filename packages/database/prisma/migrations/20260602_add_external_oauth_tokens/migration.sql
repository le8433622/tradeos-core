-- Add ExternalOAuthToken model and OAuthProvider enum for per-org OAuth token storage
-- Supports eBay user-delegated OAuth tokens with refresh_token grant

DO $$ BEGIN
  CREATE TYPE "OAuthProvider" AS ENUM ('EBAY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "external_oauth_tokens" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "scope" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "providerUserId" TEXT,
    "providerUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_oauth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "external_oauth_tokens_organization_id_provider_key"
    ON "external_oauth_tokens"("organizationId", "provider");

ALTER TABLE "external_oauth_tokens"
    ADD CONSTRAINT "external_oauth_tokens_organization_id_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
