import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tradeos/database", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../supabase", () => ({
  getBearerToken: vi.fn(),
  getAccessTokenFromRequestCookies: vi.fn(),
  getSupabaseUserFromToken: vi.fn(),
  getSessionAal: vi.fn().mockReturnValue("aal1"),
}));

vi.mock("../demo", () => ({
  allowDemoAuth: vi.fn(),
  getDemoSession: vi.fn(),
}));

import { prisma, UserRole } from "@tradeos/database";
import {
  requireSessionFromRequest,
  resolveSessionFromEmail,
  assertSameOrganization,
  assertRole,
} from "../tenant";
import {
  getBearerToken,
  getAccessTokenFromRequestCookies,
  getSupabaseUserFromToken,
  getSessionAal,
} from "../supabase";
import { allowDemoAuth, getDemoSession } from "../demo";

const mockUser = {
  id: "user-1",
  email: "user@tradeos.local",
  organizationId: "org-legacy",
  role: "VIEWER" as UserRole,
  name: "Test User",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockActiveMembership = {
  id: "mem-1",
  userId: "user-1",
  organizationId: "org-actual",
  roleId: "role-1",
  status: "ACTIVE" as const,
  invitedAt: null,
  acceptedAt: null,
  suspendedAt: null,
  mfaEnrolledAt: null,
  createdAt: new Date(),
  organization: { id: "org-actual", name: "Actual Org" },
  role: {
    id: "role-1",
    name: "ADMIN",
    description: null,
    isSystem: false,
    organizationId: "org-actual",
    createdAt: new Date(),
    updatedAt: new Date(),
    permissions: [
      {
        permission: { key: "read:users" },
        roleId: "role-1",
        permissionId: "perm-1",
        createdAt: new Date(),
      },
      {
        permission: { key: "write:users" },
        roleId: "role-1",
        permissionId: "perm-2",
        createdAt: new Date(),
      },
    ],
  },
};

function makeJwt(payload: Record<string, unknown>) {
  return [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "signature",
  ].join(".");
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// requireSessionFromRequest
// ---------------------------------------------------------------------------
describe("requireSessionFromRequest", () => {
  it("returns SessionContext when a valid JWT cookie is present", async () => {
    const token = makeJwt({ sub: "auth-uid", email: "user@tradeos.local" });
    vi.mocked(getBearerToken).mockReturnValue(null);
    vi.mocked(getAccessTokenFromRequestCookies).mockReturnValue(token);
    vi.mocked(getSupabaseUserFromToken).mockResolvedValue({
      email: "user@tradeos.local",
    } as any);
    vi.mocked(getSessionAal).mockReturnValue("aal1");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      mockActiveMembership,
    ]);

    const request = new Request("https://tradeos.local");
    const session = await requireSessionFromRequest(request);

    expect(session.userId).toBe("user-1");
    expect(session.organizationId).toBe("org-actual");
    expect(session.role).toBe("ADMIN");
    expect(session.permissions).toEqual(["read:users", "write:users"]);
    expect(session.email).toBe("user@tradeos.local");
    expect(session.authProvider).toBe("supabase");
    expect(session.mfaLevel).toBe("aal1");
  });

  it("throws AUTH_REQUIRED when no cookie or bearer token is present and demo auth is off", async () => {
    vi.mocked(getBearerToken).mockReturnValue(null);
    vi.mocked(getAccessTokenFromRequestCookies).mockReturnValue(null);
    vi.mocked(allowDemoAuth).mockReturnValue(false);

    const request = new Request("https://tradeos.local");
    await expect(requireSessionFromRequest(request)).rejects.toThrow(
      "AUTH_REQUIRED",
    );
  });

  it("throws SUPABASE_TOKEN_INVALID when Supabase token is expired/invalid", async () => {
    const token = makeJwt({
      sub: "auth-uid",
      email: "user@tradeos.local",
      exp: 1000000000,
    });
    vi.mocked(getBearerToken).mockReturnValue(token);
    vi.mocked(getSupabaseUserFromToken).mockRejectedValue(
      new Error("SUPABASE_TOKEN_INVALID"),
    );

    const request = new Request("https://tradeos.local", {
      headers: { authorization: `Bearer ${token}` },
    });
    await expect(requireSessionFromRequest(request)).rejects.toThrow(
      "SUPABASE_TOKEN_INVALID",
    );
  });

  it("throws SUPABASE_TOKEN_INVALID for malformed JWT", async () => {
    vi.mocked(getBearerToken).mockReturnValue("not-a-valid-jwt");
    vi.mocked(getSupabaseUserFromToken).mockRejectedValue(
      new Error("SUPABASE_TOKEN_INVALID"),
    );

    const request = new Request("https://tradeos.local", {
      headers: { authorization: "Bearer not-a-valid-jwt" },
    });
    await expect(requireSessionFromRequest(request)).rejects.toThrow(
      "SUPABASE_TOKEN_INVALID",
    );
  });

  it("throws USER_NOT_MAPPED_TO_TENANT when JWT email maps to no user in the database", async () => {
    const token = makeJwt({ sub: "auth-uid", email: "unknown@tradeos.local" });
    vi.mocked(getBearerToken).mockReturnValue(token);
    vi.mocked(getSupabaseUserFromToken).mockResolvedValue({
      email: "unknown@tradeos.local",
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = new Request("https://tradeos.local", {
      headers: { authorization: `Bearer ${token}` },
    });
    await expect(requireSessionFromRequest(request)).rejects.toThrow(
      "USER_NOT_MAPPED_TO_TENANT",
    );
  });

  it("returns demo session when no token is present and demo auth is allowed", async () => {
    vi.mocked(getBearerToken).mockReturnValue(null);
    vi.mocked(getAccessTokenFromRequestCookies).mockReturnValue(null);
    vi.mocked(allowDemoAuth).mockReturnValue(true);
    vi.mocked(getDemoSession).mockResolvedValue({
      userId: "demo-user",
      organizationId: "demo-org",
      role: "OWNER",
      permissions: [],
      memberships: [],
      email: "owner@tradeos.local",
      authProvider: "demo",
      mfaLevel: "aal1",
    });

    const request = new Request("https://tradeos.local");
    const session = await requireSessionFromRequest(request);

    expect(session.authProvider).toBe("demo");
    expect(session.role).toBe("OWNER");
  });

  it("falls back to legacy User.role and User.organizationId when no active membership exists", async () => {
    const token = makeJwt({ sub: "auth-uid", email: "user@tradeos.local" });
    vi.mocked(getBearerToken).mockReturnValue(token);
    vi.mocked(getAccessTokenFromRequestCookies).mockReturnValue(null);
    vi.mocked(getSupabaseUserFromToken).mockResolvedValue({
      email: "user@tradeos.local",
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);

    const request = new Request("https://tradeos.local", {
      headers: { authorization: `Bearer ${token}` },
    });
    const session = await requireSessionFromRequest(request);

    expect(session.organizationId).toBe("org-legacy");
    expect(session.role).toBe("VIEWER");
    expect(session.roleName).toBe("VIEWER");
    expect(session.permissions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveSessionFromEmail
// ---------------------------------------------------------------------------
describe("resolveSessionFromEmail", () => {
  it("returns session with membership org when email matches active OrganizationMember", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      mockActiveMembership,
    ]);

    const session = await resolveSessionFromEmail("user@tradeos.local");

    expect(session.userId).toBe("user-1");
    expect(session.organizationId).toBe("org-actual");
    expect(session.role).toBe("ADMIN");
    expect(session.permissions).toEqual(["read:users", "write:users"]);
    expect(session.memberships).toEqual([
      { organizationId: "org-actual", organizationName: "Actual Org" },
    ]);
  });

  it("throws ORGANIZATION_ACCESS_DENIED when targetOrgId is specified but membership is not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      mockActiveMembership,
    ]);

    await expect(
      resolveSessionFromEmail("user@tradeos.local", "org-nonexistent"),
    ).rejects.toThrow("ORGANIZATION_ACCESS_DENIED");
  });

  it("falls back to legacy User fields when no ACTIVE memberships exist and no targetOrgId", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);

    const session = await resolveSessionFromEmail("user@tradeos.local");

    expect(session.organizationId).toBe("org-legacy");
    expect(session.role).toBe("VIEWER");
    expect(session.roleName).toBe("VIEWER");
    expect(session.permissions).toEqual([]);
  });

  it("throws AUTH_REQUIRED when email is not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      resolveSessionFromEmail("unknown@tradeos.local"),
    ).rejects.toThrow("USER_NOT_MAPPED_TO_TENANT");
  });

  it("returns correct org when email matches multiple orgs and targetOrgId is specified", async () => {
    const secondMembership = {
      ...mockActiveMembership,
      id: "mem-2",
      organizationId: "org-second",
      roleId: "role-2",
      organization: { id: "org-second", name: "Second Org" },
      role: {
        id: "role-2",
        name: "OPERATOR",
        description: null,
        isSystem: false,
        organizationId: "org-second",
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: [
          {
            permission: { key: "read:trades" },
            roleId: "role-2",
            permissionId: "perm-3",
            createdAt: new Date(),
          },
        ],
      },
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      mockActiveMembership,
      secondMembership,
    ]);

    const session = await resolveSessionFromEmail(
      "user@tradeos.local",
      "org-second",
    );

    expect(session.organizationId).toBe("org-second");
    expect(session.role).toBe("OPERATOR");
    expect(session.permissions).toEqual(["read:trades"]);
  });

  it("trims and lowercases email before lookup", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);

    await resolveSessionFromEmail("  USER@TRADEOS.LOCAL  ");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@tradeos.local" },
    });
  });
});

// ---------------------------------------------------------------------------
// assertSameOrganization
// ---------------------------------------------------------------------------
describe("assertSameOrganization", () => {
  it("passes when organizationId matches", () => {
    const session: Parameters<typeof assertSameOrganization>[0] = {
      userId: "user-1",
      organizationId: "org-a",
      role: "VIEWER",
      permissions: [],
      memberships: [],
      email: "user@tradeos.local",
      authProvider: "supabase",
      mfaLevel: "aal1",
    };

    expect(() => assertSameOrganization(session, "org-a")).not.toThrow();
  });

  it("throws ORGANIZATION_ACCESS_DENIED when organizationId does not match", () => {
    const session: Parameters<typeof assertSameOrganization>[0] = {
      userId: "user-1",
      organizationId: "org-a",
      role: "VIEWER",
      permissions: [],
      memberships: [],
      email: "user@tradeos.local",
      authProvider: "supabase",
      mfaLevel: "aal1",
    };

    expect(() => assertSameOrganization(session, "org-b")).toThrow(
      "ORGANIZATION_ACCESS_DENIED",
    );
  });
});

// ---------------------------------------------------------------------------
// assertRole
// ---------------------------------------------------------------------------
describe("assertRole", () => {
  it("passes when user has the required role", () => {
    const session: Parameters<typeof assertRole>[0] = {
      userId: "user-1",
      organizationId: "org-a",
      role: "ADMIN",
      permissions: [],
      memberships: [],
      email: "user@tradeos.local",
      authProvider: "supabase",
      mfaLevel: "aal1",
    };

    expect(() => assertRole(session, ["ADMIN"])).not.toThrow();
    expect(() => assertRole(session, ["OWNER", "ADMIN"])).not.toThrow();
  });

  it("throws ROLE_ACCESS_DENIED when user has a lower role than required", () => {
    const session: Parameters<typeof assertRole>[0] = {
      userId: "user-1",
      organizationId: "org-a",
      role: "VIEWER",
      permissions: [],
      memberships: [],
      email: "user@tradeos.local",
      authProvider: "supabase",
      mfaLevel: "aal1",
    };

    expect(() => assertRole(session, ["ADMIN"])).toThrow("ROLE_ACCESS_DENIED");
    expect(() => assertRole(session, ["OWNER"])).toThrow("ROLE_ACCESS_DENIED");
  });
});

// ---------------------------------------------------------------------------
// getBearerToken (from supabase.ts)
// ---------------------------------------------------------------------------
describe("getBearerToken", () => {
  it("returns token from valid Authorization header", async () => {
    const { getBearerToken: rawGetBearerToken } =
      await vi.importActual<typeof import("../supabase")>("../supabase");

    const request = new Request("https://tradeos.local", {
      headers: { authorization: "Bearer my-test-token" },
    });
    expect(rawGetBearerToken(request)).toBe("my-test-token");
  });

  it("returns null when there is no Authorization header", async () => {
    const { getBearerToken: rawGetBearerToken } =
      await vi.importActual<typeof import("../supabase")>("../supabase");

    const request = new Request("https://tradeos.local");
    expect(rawGetBearerToken(request)).toBeNull();
  });

  it("returns null when header does not start with Bearer", async () => {
    const { getBearerToken: rawGetBearerToken } =
      await vi.importActual<typeof import("../supabase")>("../supabase");

    const request = new Request("https://tradeos.local", {
      headers: { authorization: "Basic dG9rZW4=" },
    });
    expect(rawGetBearerToken(request)).toBeNull();
  });
});
