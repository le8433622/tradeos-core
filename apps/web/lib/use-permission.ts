"use client";

import { useState, useEffect } from "react";

type Membership = {
  organizationId: string;
  organizationName: string;
};

type SessionData = {
  userId: string;
  organizationId: string;
  role: string;
  permissions: string[];
  memberships: Membership[];
  email: string;
};

let cachedSession: SessionData | null = null;
let fetchPromise: Promise<SessionData | null> | null = null;

async function fetchSession(): Promise<SessionData | null> {
  if (cachedSession) return cachedSession;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch("/api/user/memberships");
      if (!res.ok) return null;
      const data = await res.json();
      const orgId =
        document.cookie
          .split("; ")
          .find((c) => c.startsWith("activeOrganizationId="))
          ?.split("=")[1] ?? data.memberships?.[0]?.organizationId;

      cachedSession = {
        userId: data.userId ?? "",
        organizationId: orgId ?? data.organizationId ?? "",
        role: data.role ?? "",
        permissions: data.permissions ?? [],
        memberships: data.memberships ?? [],
        email: data.email ?? "",
      };
      return cachedSession;
    } catch {
      return null;
    }
  })();

  return fetchPromise;
}

export function usePermission(required: string): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    fetchSession().then((session) => {
      setAllowed(session?.permissions?.includes(required) ?? false);
    });
  }, [required]);

  return allowed;
}

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession().then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, []);

  return { session, loading };
}
