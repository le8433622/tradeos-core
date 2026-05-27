import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";
import { OrgProfileForm } from "./org-profile-form";

export default async function ProfileSettingsPage() {
  const session = await requirePagePermission("settings.profile");
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { id: true, name: true, type: true, country: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true },
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Organization Profile</h1>
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
        }}
      >
        <OrgProfileForm
          org={{ id: org?.id ?? "", name: org?.name ?? "", type: org?.type ?? "ASSOCIATION", country: org?.country ?? "" }}
          user={{ name: user?.name ?? session.email, email: session.email }}
        />
      </div>
    </div>
  );
}
