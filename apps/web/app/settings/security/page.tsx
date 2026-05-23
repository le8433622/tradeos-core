import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";

export default async function SecuritySettingsPage() {
  const session = await requirePagePermission("settings.security");
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { mfaRequired: true },
  });
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.userId, organizationId: session.organizationId },
    select: { mfaEnrolledAt: true },
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Security</h1>

      <section
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>
          Multi-Factor Authentication
        </h2>
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>
            Require MFA for all members of this organization.
          </p>
          <p style={{ fontSize: 14 }}>
            <strong>Status:</strong>{" "}
            {org?.mfaRequired ? "Required for all members" : "Optional"}
          </p>
          <p style={{ fontSize: 14 }}>
            <strong>Your enrollment:</strong>{" "}
            {membership?.mfaEnrolledAt
              ? `Enrolled (${membership.mfaEnrolledAt.toLocaleDateString()})`
              : "Not enrolled"}
          </p>
        </div>
      </section>

      <section
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>MFA Policy</h2>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
          When MFA is required, high-risk actions (anonymize PII, change plan,
          change role, export data) will be blocked for users who have not
          enrolled MFA.
        </p>
        <ul style={{ fontSize: 14, color: "#374151" }}>
          <li>
            <strong>Send quotation</strong> — requires MFA if org policy enabled
          </li>
          <li>
            <strong>Approve/reject approval</strong> — requires MFA if org
            policy enabled
          </li>
          <li>
            <strong>Anonymize PII</strong> — always requires MFA
          </li>
          <li>
            <strong>Change plan</strong> — always requires MFA
          </li>
          <li>
            <strong>Change role</strong> — always requires MFA
          </li>
          <li>
            <strong>Export data</strong> — requires MFA if user has enrolled
          </li>
        </ul>
      </section>
    </div>
  );
}
