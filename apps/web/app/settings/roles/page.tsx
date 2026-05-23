import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";

export default async function RolesSettingsPage() {
  const session = await requirePagePermission("settings.profile");
  const roles = await prisma.role.findMany({
    where: { isSystem: true },
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Roles & Permissions</h1>
      <p>System role permission matrix.</p>
      {roles.map((role) => (
        <div key={role.id} style={{ marginBottom: 20 }}>
          <h3>{role.name}</h3>
          <p style={{ color: "#6b7280", fontSize: 13 }}>{role.description}</p>
          <ul>
            {role.permissions.map((rp) => (
              <li key={rp.id} style={{ fontSize: 13 }}>
                {rp.permission.key} — {rp.permission.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
