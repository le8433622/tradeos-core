-- Fix: current_user_org_id has mutable search_path (CVE warning)
--
-- Supabase Security Advisor reports:
--   "function public.current_user_org_id has mutable search_path"
--
-- This migration locks search_path to prevent search_path injection.
-- See: https://postgr.es/d/2023112311-unpriced-unbranded-8b64@mu

ALTER FUNCTION public.current_user_org_id() SET search_path = public;
