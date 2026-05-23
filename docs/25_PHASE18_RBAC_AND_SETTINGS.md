# Phase 18: RBAC & Settings Center

**Goal**: Biến TradeOS thành hệ thống có phân quyền chặt chẽ, hỗ trợ multi-org, Settings Center đầy đủ, và bảo mật theo chuẩn enterprise-ready nhưng vẫn giữ UX đơn giản cho người dùng SME.

**Triết lý thiết kế**:

- Backend permission là nguồn sự thật cuối cùng.
- UI ẩn/disable action theo permission, nhưng không phải là lớp bảo vệ chính.
- Doanh nghiệp nhỏ vào nhanh, doanh nghiệp lớn mở rộng được.
- Mọi mutation đều có audit log.

---

## Phần A: Database & Migration — Nền Móng

### A1. Tách User — OrganizationMember

**File**: `packages/database/prisma/schema.prisma`

```prisma
enum MemberStatus {
  INVITED
  ACTIVE
  SUSPENDED
}

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
  mfaEnrolledAt  DateTime?
  createdAt      DateTime        @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
}
```

- `User.organizationId` hiện tại giữ lại (nullable), backfill data sau.
- Session mới sẽ đọc từ `OrganizationMember` join `Role`.
- `User.email` vẫn là unique global identity.

### A2. Role & Permission Tables

```prisma
model Role {
  id             String   @id @default(cuid())
  name           String   // OWNER, ADMIN, SALES, OPERATOR, VIEWER
  description    String?
  isSystem       Boolean  @default(false)
  organizationId String?  // null = system role, non-null = custom org role

  memberships OrganizationMember[]
  permissions  RolePermission[]
}

model Permission {
  id          String   @id @default(cuid())
  key         String   @unique   // lead.read, billing.manage
  name        String
  description String?
  group       String?

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

### A3. Seed Data

Seed 5 system roles với permission keys:

| Role     | Key Permissions                                                                                                                                                                                                                                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OWNER    | lead.read/write/delete, company.read/write, quotation.{draft,send}, approval.{review,execute}, billing.{read,manage}, privacy.{export,anonymize,legalHold}, user.{invite,roleUpdate,suspend,remove}, settings.{security,billing}, audit.read, integration.manage, ai.budget.manage, report.{generate,approve}, webhook.retry |
| ADMIN    | lead.read/write, company.read/write, quotation.{draft,send}, approval.{review,execute}, billing.read, privacy.export, user.{invite,suspend,remove}, integration.manage, ai.budget.manage, report.{generate,approve}, webhook.retry                                                                                           |
| SALES    | lead.read/write, company.read/write, quotation.draft, report.generate                                                                                                                                                                                                                                                        |
| OPERATOR | lead.read, company.read, quotation.draft, approval.review, webhook.retry, report.generate                                                                                                                                                                                                                                    |
| VIEWER   | lead.read, company.read, report.generate                                                                                                                                                                                                                                                                                     |

### A4. Invitation Model

```prisma
model Invitation {
  id             String   @id @default(cuid())
  organizationId String
  email          String
  roleId         String?
  tokenHash      String
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role         Role?        @relation(fields: [roleId], references: [id], onDelete: SetNull)

  @@index([tokenHash])
  @@index([organizationId, email])
}
```

### A5. MFA Fields

```prisma
// Trên OrganizationMember:
mfaEnrolledAt DateTime?

// Trên Organization:
mfaRequired Boolean @default(false)
```

---

## Phần B: Auth & Session

### B1. Session Resolver

`packages/auth/src/tenant.ts`:

```ts
type SessionContext = {
  userId: string;
  email: string;
  organizationId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  mfaLevel: "aal1" | "aal2";
  memberships: { organizationId: string; name: string }[];
};
```

- `resolveSessionFromEmail`: query `User` → `OrganizationMember` → `Role` → `RolePermission` → `Permission`
- Cache permissions on login, refresh periodically
- Nếu user có nhiều org, session mặc định org cuối cùng dùng, cho phép switch

### B2. Permission Gate

`packages/policy-core/src/index.ts`:

```ts
export function assertPermission(
  session: SessionContext,
  permission: string,
): void {
  if (!session.permissions.includes(permission)) {
    throw new Error("PERMISSION_DENIED");
  }
}

export function can(session: SessionContext, permission: string): boolean {
  return session.permissions.includes(permission);
}
```

Giữ `assertRole` cho backward compat trong migration, nhưng code mới dùng `assertPermission`.

### B3. API Helper

`apps/web/lib/api-errors.ts` — thêm:

```ts
export async function withApiPermission(
  request: Request,
  permission: string,
): Promise<ApiSessionResult> {
  try {
    const session = await requireSessionFromRequest(request);
    assertPermission(session, permission);
    return { session };
  } catch (error) {
    return { response: apiErrorResponse(request, error) };
  }
}
```

### B4. UI Permission Gate

`apps/web/components/permission-gate.tsx`:

```tsx
"use client";

export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const session = useSession(); // from context
  if (!session?.permissions?.includes(permission)) return null;
  return <>{children}</>;
}
```

---

## Phần C: Workspace Switcher

### C1. Login Flow

Sau login, nếu user có >1 org:

1. Hiển thị màn hình "Choose workspace"
2. Chọn 1 org → set `activeOrganizationId` trong session/localStorage
3. Redirect đến dashboard của org đó

### C2. Switcher UI

Component ở header bar (góc trái trên cùng):

```
[🏢 ACME Corp ▾]    [⚙ Settings]
 ┌─────────────────┐
 │ ACME Corp      ✓│
 │ Global Trade Co │
 │ + Join org      │
 └─────────────────┘
```

### C3. API để lấy danh sách org

`GET /api/user/memberships` — trả về danh sách org user thuộc.

---

## Phần D: Settings Center

12 trang settings, mỗi trang có permission gate riêng:

### D1. Layout

```
/settings
├── /profile         → Organization profile (name, country, type, timezone, currency)
├── /team            → Danh sách member, invite, suspend, remove, change role
├── /roles           → Read-only permission matrix theo role (custom role UI sau)
├── /security        → MFA policy, session policy, domain allowlist
├── /billing         → Plan, usage metrics, export billing
├── /privacy         → Export data, anonymize PII, legal hold toggle
├── /integrations    → Webhook integrations, status, rotate secret
├── /ai              → AI budget, eval status, model config (read-only)
├── /notifications   → Notification defaults, audience defaults
└── /audit           → Audit log viewer, export, filters
```

Sidebar navigation:

```text
[ Organization Settings ]
  Profile
  Team
  Roles
  Security
  Billing
  Privacy
  Integrations
  AI
  Notifications
  Audit
```

### D2. Permission Mapping Per Page

| Page           | Permission          | Allowed Roles                       |
| -------------- | ------------------- | ----------------------------------- |
| /profile       | settings.profile    | OWNER, ADMIN                        |
| /team          | user.invite         | OWNER, ADMIN                        |
| /roles         | settings.roles      | OWNER, ADMIN (read-only cho tất cả) |
| /security      | settings.security   | OWNER                               |
| /billing       | billing.read        | OWNER, ADMIN (manage: OWNER)        |
| /privacy       | privacy.export      | OWNER, ADMIN (anonymize: OWNER)     |
| /integrations  | integration.manage  | OWNER, ADMIN, OPERATOR              |
| /ai            | ai.budget.manage    | OWNER, ADMIN                        |
| /notifications | notification.manage | OWNER, ADMIN, OPERATOR              |
| /audit         | audit.read          | OWNER, ADMIN                        |

### D3. Profile Settings

**API**: `GET/PATCH /api/settings/profile`

Fields:

- Organization name
- Country
- Type (IMPORTER/EXPORTER/DISTRIBUTOR/LOGISTICS/SERVICE/ASSOCIATION/OTHER)
- Timezone (mới)
- Preferred currency (mới)
- Website

### D4. Team Settings

**API**: `GET /api/settings/members` — danh sách member
**API**: `POST /api/settings/invitations` — gửi invite
**API**: `PATCH /api/settings/members/[id]` — change role, suspend, reactivate
**API**: `DELETE /api/settings/members/[id]` — remove member

UI:

- Table: Name, Email, Role, Status (ACTIVE/INVITED/SUSPENDED), Joined date, Actions
- Invite: email input + role selector + send invite
- Suspend/Reactivate: confirm dialog
- Remove: confirm dialog + audit log
- Validation: không tự hạ OWNER cuối cùng, không ADMIN sửa OWNER

### D5. Roles Settings

Read-only permission matrix:

```
                   OWNER  ADMIN  SALES  OPERATOR  VIEWER
lead.read           ✓      ✓      ✓      ✓         ✓
lead.write          ✓      ✓      ✓      ✓
lead.delete         ✓      ✓
company.read        ✓      ✓      ✓      ✓         ✓
company.write       ✓      ✓      ✓      ✓
quotation.draft     ✓      ✓      ✓      ✓
quotation.send      ✓      ✓
approval.review     ✓      ✓             ✓
...
```

### D6. Security Settings

**API**: `GET/PATCH /api/settings/security`

Fields:

- MFA Required (boolean toggle)
- Allowed email domains for invites (comma-separated)
- Session timeout (minutes)
- Demo auth warning banner config
- IP allowlist (future)

### D7. Billing Settings

API hiện tại: `GET /api/organization/billing`
API hiện tại: `PATCH /api/organization/settings` (plan)

Thêm:

- Usage chart UI
- Plan upgrade/downgrade with confirmation
- Invoice history placeholder

### D8. Privacy Settings

API hiện tại: `GET /api/privacy/export`, `POST /api/privacy/anonymize`

Thêm:

- Legal hold toggle (OWNER only)
- Export last generated date
- Anonymize button (OWNER only, with confirm dialog)
- DPA download placeholder

### D9. Integrations Settings

API hiện tại: `GET/POST /api/webhooks/integrations`

Thêm:

- List webhook integrations với status badge
- Add new integration form
- Rotate secret button
- Disable/enable toggle
- Last event timestamp

### D10. AI Settings

API hiện tại: `GET/PATCH /api/organization/settings` (budget)

Thêm:

- AI budget slider
- Current MTD spend
- Model config display (read-only)
- Eval last run status
- Prompt injection policy version

---

## Phần E: Page-Level Permission Audit

Danh sách page hiện tại và permission gate cần thêm:

| Page                | Current Guard          | New Permission Gate               |
| ------------------- | ---------------------- | --------------------------------- |
| /dashboard          | auth only              | — (viewable bởi tất cả)           |
| /leads              | auth only              | lead.read                         |
| /leads/[id]         | auth only              | lead.read                         |
| /companies          | auth only              | company.read                      |
| /conversations      | auth only              | message.read                      |
| /conversations/[id] | auth only              | message.read                      |
| /quotations         | auth only              | quotation.draft (view + draft)    |
| /quotations/[id]    | auth only              | quotation.draft                   |
| /products           | auth only              | product.read                      |
| /approvals          | auth only              | approval.review                   |
| /approvals/[id]     | auth only              | approval.review                   |
| /introductions      | auth only              | introduction.read                 |
| /introductions/[id] | auth only              | introduction.read                 |
| /webhook-events     | auth only              | webhook.retry                     |
| /audit-logs         | auth only              | audit.read                        |
| /notifications      | auth only              | notification.manage               |
| /reports            | auth only              | report.generate                   |
| /reports/[id]       | auth only              | report.generate                   |
| /settings/\*        | OWNER/ADMIN            | settings.{profile,team,roles,...} |
| /privacy/\*         | OWNER/ADMIN            | privacy.export                    |
| /api/leads (POST)   | auth only → lead.write | assertPermission(lead.write)      |
| /api/leads (GET)    | auth only → lead.read  | assertPermission(lead.read)       |
| ...                 | ...                    | ...                               |

---

## Phần F: MFA Enforcement

| Action                  | MFA Requirement                             |
| ----------------------- | ------------------------------------------- |
| Login                   | Không bắt buộc                              |
| Xem dashboard           | Không bắt buộc                              |
| Tạo lead                | Không bắt buộc                              |
| Draft quotation         | Không bắt buộc                              |
| Send quotation          | Yêu cầu nếu org bật MFA hoặc user đã enroll |
| Approve/reject approval | Yêu cầu nếu org bật MFA                     |
| Anonymize PII           | Luôn yêu cầu MFA                            |
| Change plan             | Luôn yêu cầu MFA                            |
| Change role             | Luôn yêu cầu MFA                            |
| Export data             | Yêu cầu nếu user đã enroll                  |
| Add user                | Yêu cầu nếu user đã enroll                  |

High-risk MFA check:

```ts
async function requireMfa(session: SessionContext): Promise<void> {
  if (session.mfaLevel === "aal2") return;
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { mfaRequired: true },
  });
  if (org?.mfaRequired) {
    throw new Error("MFA_REQUIRED");
  }
}
```

---

## Phần G: Task Execution Plan

| Phase | Task                                                                          | File changes                                   | Dependencies |
| ----- | ----------------------------------------------------------------------------- | ---------------------------------------------- | ------------ |
| G1    | T18.DB.001: Thêm User/Member/Role/Permission/Invitation model                 | schema.prisma                                  | —            |
| G1    | T18.DB.002: Seed script: 5 roles, permissions, role-permission mapping        | seed.ts, schema.prisma                         | G1           |
| G1    | T18.DB.003: Migration backfill: User → OrganizationMember                     | migration.sql                                  | G1           |
| G2    | T18.Auth.001: Update session resolver (multi-org, permission cache)           | packages/auth/src/tenant.ts                    | G1           |
| G2    | T18.Auth.002: Thêm `assertPermission`, `can`, `withApiPermission`             | packages/policy-core/src/index.ts              | G2           |
| G2    | T18.Auth.003: Thêm `usePermission`, `PermissionGate` UI component             | apps/web/components/permission-gate.tsx        | G2           |
| G3    | T18.Migration.001: Update all API routes từ `assertRole` → `assertPermission` | Tất cả route.ts                                | G2           |
| G3    | T18.Migration.002: Update all pages thêm page-level permission check          | apps/web/app/\*\*/page.tsx                     | G2           |
| G4    | T18.Workspace.001: API `GET /api/user/memberships`                            | apps/web/app/api/user/memberships/route.ts     | G2           |
| G4    | T18.Workspace.002: Workspace selector component                               | apps/web/components/workspace-switcher.tsx     | G4           |
| G4    | T18.Workspace.003: Choose workspace page sau login                            | apps/web/app/workspace/page.tsx                | G4           |
| G5    | T18.Settings.001: Settings layout với sidebar                                 | apps/web/app/settings/layout.tsx               | G2           |
| G5    | T18.Settings.002: Profile settings page                                       | apps/web/app/settings/profile/page.tsx         | G5           |
| G5    | T18.Settings.003: Team/member management                                      | apps/web/app/settings/team/page.tsx            | G1, G2       |
| G5    | T18.Settings.004: Roles read-only matrix                                      | apps/web/app/settings/roles/page.tsx           | G1           |
| G5    | T18.Settings.005: Security settings                                           | apps/web/app/settings/security/page.tsx        | —            |
| G5    | T18.Settings.006: Billing settings (refactor)                                 | apps/web/app/settings/page.tsx → billing       | —            |
| G5    | T18.Settings.007: Privacy settings                                            | apps/web/app/settings/privacy/page.tsx         | —            |
| G5    | T18.Settings.008: Integrations settings                                       | apps/web/app/settings/integrations/page.tsx    | —            |
| G5    | T18.Settings.009: AI settings                                                 | apps/web/app/settings/ai/page.tsx              | —            |
| G5    | T18.Settings.010: Audit log viewer                                            | apps/web/app/settings/audit/page.tsx           | —            |
| G6    | T18.MFA.001: MFA enrollment UI                                                | apps/web/app/settings/security/page.tsx        | G2           |
| G6    | T18.MFA.002: MFA enforce ở high-risk action                                   | packages/policy-core/src/index.ts              | G2           |
| G7    | T18.Invite.001: Invitation model + API                                        | apps/web/app/api/settings/invitations/route.ts | G1           |
| G7    | T18.Invite.002: Invite accept flow                                            | apps/web/app/invite/[token]/page.tsx           | G7           |
| G8    | T18.Audit.001: Audit log cho user/role/settings mutation                      | All PATCH/POST/DELETE settings routes          | G2           |
| G9    | T18.Tests.001: Permission matrix test                                         | packages/policy-core/src/**tests**             | G2           |
| G9    | T18.Tests.002: API negative test 403                                          | apps/web/\*\*/**tests**                        | G3           |
| G9    | T18.Tests.003: Build + db:generate                                            | —                                              | All          |
| G10   | T18.Docs.001: Update SECURITY_AND_TENANCY.md                                  | docs/06_SECURITY_AND_TENANCY.md                | G2           |
| G10   | T18.Docs.002: Update DEVELOPER_ONBOARDING.md                                  | docs/20_DEVELOPER_ONBOARDING.md                | All          |
| G10   | T18.Docs.003: ADR 011 đã viết                                                 | docs/adr/011-dynamic-rbac-and-multi-org.md     | G1           |

---

## Acceptance Criteria

1. ✅ 1 user thuộc nhiều organization, switch workspace được
2. ✅ Permission được check trên API (nếu thiếu → 403)
3. ✅ Page hiển thị theo permission (VIEWER không thấy nút Create/Tạo)
4. ✅ Settings Center có 10+ tab, mỗi tab có permission riêng
5. ✅ Invitation flow: email → accept → tạo member
6. ✅ MFA optional, nhưng high-risk action yêu cầu MFA nếu user đã enroll
7. ✅ OWNER là role duy nhất có full quyền (kể cả privacy anonymize, billing manage)
8. ✅ ADMIN không thể xóa/sửa OWNER cuối cùng
9. ✅ Mọi mutation đều có audit log
10. ✅ `pnpm db:generate`, `pnpm build`, tests pass

## Non-Goals

- ❌ Custom role UI (Phase 19+ nếu có demand)
- ❌ SCIM provisioning (Phase 20+ cho enterprise)
- ❌ Billing integration với Stripe/Paddle (vẫn là manual như hiện tại)
- ❌ SAML/SSO (Phase 20+)
- ❌ Real-time permission sync (cần Redis/pubsub)

## References

- [ADR 011: Dynamic RBAC and Multi-Organization Membership](./adr/011-dynamic-rbac-and-multi-org.md)
- [Database Contract](../docs/03_DATABASE_CONTRACT.md)
- [Security and Tenancy](../docs/06_SECURITY_AND_TENANCY.md)
- [Developer Onboarding](../docs/20_DEVELOPER_ONBOARDING.md)
- [Checkpoints](../docs/13_CHECKPOINTS.md)
