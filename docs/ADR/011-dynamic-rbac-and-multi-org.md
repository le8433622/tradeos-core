# ADR 011: Dynamic RBAC and Multi-Organization Membership

**Status**: Draft
**Risk Area**: Database schema, Auth, Security
**Reviewer**: CTO, CISO, CCO

## Context

TradeOS currently has:

- `User` model with `organizationId` (1 user → 1 org)
- Hardcoded `UserRole` enum with 5 roles
- Role check via `assertRole(session, allowedRoles)`
- No permission-level granularity
- No user invitation/invite flow
- No user status (active/suspended/invited)
- No MFA integration
- No workspace switching for multi-org users

As the platform grows toward enterprise and association operators, these limitations block:

1. **Association operator** — needs to serve multiple tenant organizations from one account
2. **Enterprise buyer** — requires custom roles, permission granularity, SOC 2 evidence
3. **Security compliance** — needs user lifecycle (invite, suspend, remove), MFA policy, audit trail
4. **Product scalability** — adding new features requires changing UI + DB + policy instead of just permission keys

## Decision

### 1. Multi-Organization Membership

Separate `User` (global identity) from `OrganizationMember` (membership in an org).

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  memberships OrganizationMember[]
}

model OrganizationMember {
  id             String          @id @default(cuid())
  userId         String
  organizationId String
  roleId         String?
  status         MemberStatus    @default(INVITED)
  invitedAt      DateTime?
  acceptedAt     DateTime?
  suspendedAt    DateTime?
  createdAt      DateTime        @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role         Role?        @relation(fields: [roleId], references: [id], onDelete: SetNull)

  @@unique([userId, organizationId])
}

enum MemberStatus {
  INVITED
  ACTIVE
  SUSPENDED
}
```

Each `User` can have multiple `OrganizationMember` records. After login, the user selects an active workspace. The session includes `userId`, `organizationId`, `membershipId`, `roleId`, `permissions[]`, `mfaLevel`.

### 2. Dynamic RBAC

Replace hardcoded `UserRole` enum with a dynamic permission system:

```prisma
model Role {
  id          String   @id @default(cuid())
  name        String
  description String?
  isSystem    Boolean  @default(false)  // seed roles are system
  organizationId String?  // null = global system role, non-null = custom org role

  memberships OrganizationMember[]
  permissions RolePermission[]
}

model Permission {
  id          String   @id @default(cuid())
  key         String   @unique  // e.g. "lead.read", "billing.manage"
  name        String
  description String?
  group       String?  // "leads", "billing", "security", etc.

  rolePermissions RolePermission[]
}

model RolePermission {
  id           String @id @default(cuid())
  roleId       String
  permissionId String

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
}
```

Seed 5 system roles with fixed permission sets. The `assertRole` pattern evolves to `assertPermission(session, 'lead.write')`.

### 3. Permission Keys

All capabilities are expressed as string permission keys:

| Group        | Permission           | OWNER | ADMIN | SALES | OPERATOR | VIEWER |
| ------------ | -------------------- | ----- | ----- | ----- | -------- | ------ |
| lead         | `lead.read`          | ✓     | ✓     | ✓     | ✓        | ✓      |
| lead         | `lead.write`         | ✓     | ✓     | ✓     | ✓        |        |
| lead         | `lead.delete`        | ✓     | ✓     |       |          |        |
| company      | `company.read`       | ✓     | ✓     | ✓     | ✓        | ✓      |
| company      | `company.write`      | ✓     | ✓     | ✓     | ✓        |        |
| quotation    | `quotation.draft`    | ✓     | ✓     | ✓     | ✓        |        |
| quotation    | `quotation.send`     | ✓     | ✓     |       |          |        |
| approval     | `approval.review`    | ✓     | ✓     |       | ✓        |        |
| approval     | `approval.execute`   | ✓     | ✓     |       |          |        |
| webhook      | `webhook.retry`      | ✓     | ✓     | ✓     | ✓        |        |
| billing      | `billing.read`       | ✓     | ✓     |       |          |        |
| billing      | `billing.manage`     | ✓     |       |       |          |        |
| privacy      | `privacy.export`     | ✓     | ✓     |       |          |        |
| privacy      | `privacy.anonymize`  | ✓     |       |       |          |        |
| privacy      | `privacy.legalHold`  | ✓     |       |       |          |        |
| user         | `user.invite`        | ✓     | ✓     |       |          |        |
| user         | `user.role.update`   | ✓     |       |       |          |        |
| user         | `user.suspend`       | ✓     | ✓     |       |          |        |
| user         | `user.remove`        | ✓     | ✓     |       |          |        |
| settings     | `settings.security`  | ✓     |       |       |          |        |
| settings     | `settings.billing`   | ✓     | ✓     |       |          |        |
| audit        | `audit.read`         | ✓     | ✓     |       |          |        |
| integrations | `integration.manage` | ✓     | ✓     | ✓     |          |        |
| ai           | `ai.budget.manage`   | ✓     | ✓     |       |          |        |
| report       | `report.generate`    | ✓     | ✓     | ✓     | ✓        |        |
| report       | `report.approve`     | ✓     | ✓     |       |          |        |

### 4. Session Evolution

```ts
type SessionContext = {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string; // role name for display
  roleId: string; // for RBAC lookup
  permissions: string[]; // cached permission keys
  mfaLevel: "aal1" | "aal2";
  memberships: { organizationId: string; organizationName: string }[];
};
```

### 5. Permission Gate

```ts
function assertPermission(session: SessionContext, permission: string): void {
  if (!session.permissions.includes(permission)) {
    throw new Error("PERMISSION_DENIED");
  }
}
```

UI side:

```tsx
function usePermission(permission: string): boolean;
<PermissionGate permission="billing.manage">...</PermissionGate>;
```

### 6. MFA Integration

- Add `mfaEnabled` boolean on `OrganizationMember` (user-level opt-in)
- Add `mfaRequired` boolean on `Organization` (org-level policy)
- High-risk defined actions require `aal2` if user has MFA enrolled
- Supabase Auth MFA API for enrollment/verification
- Session carries `mfaLevel` from JWT `aal` claim

### 7. User Invitation

- `Invitation` model stores pending invites with token hash
- Invitation email contains magic link to accept
- On accept, creates `OrganizationMember` with `ACTIVE` status
- Expired/unused invitations are cleaned up

## Migration Path

1. Drop NOT NULL from `User.organizationId`, make nullable
2. Create `OrganizationMember` table, backfill from `User`
3. Create `Role` and `Permission` tables, seed 5 system roles
4. Update session resolver to read from `OrganizationMember` + `Role`
5. Migrate all `assertRole` calls to `assertPermission`
6. Add workspace switcher to UI
7. Deprecate old `User.organizationId` (remove after migration verified)

## Consequences

### Positive

- Association operators can work across tenant orgs with one account
- Enterprise buyers can get custom roles without DB schema changes
- Permission audit is queryable (which role has what permission)
- Adding new feature = add permission key + assign to roles
- SOC 2 evidence: access control matrix is explicit and machine-readable
- User lifecycle is traceable (invited → active → suspended → removed)

### Negative

- Migration complexity: backfill `OrganizationMember`, update all session code
- Slightly more DB queries per request (cache permissions in session JWT or Redis)
- UI needs workspace switcher component
- Existing `User.organizationId` references must be updated

### Risk Mitigation

- Keep backward compatibility during migration: `User.organizationId` stays nullable, code falls back to first membership
- Phase rollout: multi-org DB first → session + permission gates → workspace switcher → settings center
- Permission check is a single function — easy to audit and test

## References

- [ADR 005: Audit Log Immutability](./005-audit-log-immutability.md)
- [ADR 006: Registered Actions for All Mutations](./006-registered-actions.md)
- GitHub predefined organization roles
- Slack workspace switching pattern
- Supabase Auth MFA / AAL
