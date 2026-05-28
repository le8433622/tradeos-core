import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { requirePagePermission } from "../../../lib/page-session";
import { createLogger } from "../../../lib/logger";
import { sendInviteEmail } from "../../../lib/email";
import { revalidatePath } from "next/cache";
import "@tradeos/crm-core";
import { RoleSelect } from "./role-select";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#16a34a",
  PENDING: "#ca8a04",
  SUSPENDED: "#dc2626",
  INVITED: "#ca8a04",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        color: "#fff",
        background: STATUS_COLORS[status] ?? "#6b7280",
      }}
    >
      {status}
    </span>
  );
}

export default async function TeamSettingsPage() {
  const session = await requirePagePermission("user.invite");
  const canChangeRole = session.permissions.includes("user.roleUpdate");

  const [members, roles, org] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: session.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({
      where: { isSystem: true },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { name: true },
    }),
  ]);

  async function inviteMember(formData: FormData) {
    "use server";
    const s = await requirePagePermission("user.invite");
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const roleId = formData.get("roleId") as string;
    const logger = createLogger();

    const result = await executeAction<
      Record<string, unknown>,
      { invitationId: string; token: string }
    >(
      "user.invite",
      { organizationId: s.organizationId, email, roleId: roleId || null },
      {
        actorUserId: s.userId,
        organizationId: s.organizationId,
        role: s.role,
        source: "manual",
        mfaLevel: s.mfaLevel,
      },
    );

    const appUrl = process.env.APP_URL ?? "https://tradeos-core.vercel.app";
    const inviteLink = `${appUrl}/invite/${result.token}`;

    try {
      await sendInviteEmail(
        email,
        org?.name ?? "a TradeOS organization",
        inviteLink,
      );
    } catch (mailErr) {
      logger.error("invitation_email_failed", {
        code: mailErr instanceof Error ? mailErr.message : "UNKNOWN_ERROR",
      });
      throw new Error("INVITATION_EMAIL_SEND_FAILED");
    }

    revalidatePath("/settings/team");
  }

  async function changeRole(formData: FormData) {
    "use server";
    const s = await requirePagePermission("user.roleUpdate");
    const userId = formData.get("userId") as string;
    const roleId = formData.get("roleId") as string;

    await executeAction(
      "user.roleUpdate",
      { userId, organizationId: s.organizationId, roleId },
      {
        actorUserId: s.userId,
        organizationId: s.organizationId,
        role: s.role,
        source: "manual",
        mfaLevel: s.mfaLevel,
      },
    );
    revalidatePath("/settings/team");
  }

  const currentMemberId = session.userId;

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Team</h1>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          marginBottom: 40,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <th
                style={{
                  padding: "10px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: "left",
                  color: "#374151",
                }}
              >
                Name
              </th>
              <th
                style={{
                  padding: "10px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: "left",
                  color: "#374151",
                }}
              >
                Email
              </th>
              <th
                style={{
                  padding: "10px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: "left",
                  color: "#374151",
                }}
              >
                Role
              </th>
              <th
                style={{
                  padding: "10px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: "left",
                  color: "#374151",
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: "10px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: "left",
                  color: "#374151",
                }}
              >
                Joined
              </th>
              {canChangeRole && (
                <th
                  style={{
                    padding: "10px 16px",
                    fontWeight: 600,
                    fontSize: 13,
                    textAlign: "left",
                    color: "#374151",
                  }}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.user.id === currentMemberId;
              return (
                <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 16px", fontSize: 14 }}>
                    {m.user.name || "—"}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 14 }}>
                    {m.user.email}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 14 }}>
                    {canChangeRole && !isSelf ? (
                      <RoleSelect
                        userId={m.user.id}
                        currentRoleId={m.roleId ?? ""}
                        roles={roles}
                        changeRoleAction={changeRole}
                      />
                    ) : (
                      (m.role?.name ?? "—")
                    )}
                    {isSelf && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          marginLeft: 6,
                        }}
                      >
                        (you)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <StatusBadge status={m.status} />
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: 14,
                      color: "#6b7280",
                    }}
                  >
                    {(m.acceptedAt ?? m.createdAt).toLocaleDateString()}
                  </td>
                  {canChangeRole && (
                    <td style={{ padding: "10px 16px" }}>
                      {!isSelf && m.status === "ACTIVE" && (
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          Remove
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={canChangeRole ? 6 : 5}
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Invite Member</h2>
      <form
        action={inviteMember}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#fafafa",
        }}
      >
        <div>
          <label
            htmlFor="email"
            style={{
              display: "block",
              fontSize: 13,
              marginBottom: 4,
              fontWeight: 500,
            }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="colleague@company.com"
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              width: 260,
            }}
          />
        </div>
        <div>
          <label
            htmlFor="roleId"
            style={{
              display: "block",
              fontSize: 13,
              marginBottom: 4,
              fontWeight: 500,
            }}
          >
            Role
          </label>
          <select
            id="roleId"
            name="roleId"
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              minWidth: 140,
            }}
          >
            <option value="">Default role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          style={{
            padding: "8px 24px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Invite
        </button>
      </form>
    </div>
  );
}
