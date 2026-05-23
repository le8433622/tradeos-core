import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { requirePagePermission } from "../../../lib/page-session";
import { revalidatePath } from "next/cache";
import "@tradeos/crm-core";

export default async function TeamSettingsPage() {
  const session = await requirePagePermission("user.invite");

  const [members, roles] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: session.organizationId },
      include: { user: { select: { name: true, email: true } }, role: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({
      where: { isSystem: true },
      orderBy: { name: "asc" },
    }),
  ]);

  async function inviteMember(formData: FormData) {
    "use server";
    const s = await requirePagePermission("user.invite");
    const email = formData.get("email") as string;
    const roleId = formData.get("roleId") as string;

    await executeAction(
      "user.invite",
      {
        organizationId: s.organizationId,
        email,
        roleId: roleId || null,
      },
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

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Team</h1>

      <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Members</h2>
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginBottom: 40 }}
      >
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "8px 12px", fontWeight: 600 }}>Name</th>
            <th style={{ padding: "8px 12px", fontWeight: 600 }}>Email</th>
            <th style={{ padding: "8px 12px", fontWeight: 600 }}>Role</th>
            <th style={{ padding: "8px 12px", fontWeight: 600 }}>Status</th>
            <th style={{ padding: "8px 12px", fontWeight: 600 }}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "8px 12px" }}>{m.user.name || "—"}</td>
              <td style={{ padding: "8px 12px" }}>{m.user.email}</td>
              <td style={{ padding: "8px 12px" }}>{m.role?.name ?? "—"}</td>
              <td style={{ padding: "8px 12px" }}>{m.status}</td>
              <td style={{ padding: "8px 12px" }}>
                {(m.acceptedAt ?? m.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td
                colSpan={5}
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

      <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Invite Member</h2>
      <form
        action={inviteMember}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
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
