import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import EmptyState from "../../components/empty-state";
import { ProposeIntroductionForm } from "./ProposeIntroductionForm";

export default async function IntroductionsPage() {
  const session = await requirePagePermission("introduction.read");

  const introductions = await prisma.introductionRequest.findMany({
    where: {
      OR: [
        { buyerOrgId: session.organizationId },
        { sellerOrgId: session.organizationId },
        { proposerOrgId: session.organizationId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      proposerOrg: { select: { id: true, name: true } },
      buyerOrg: { select: { id: true, name: true } },
      sellerOrg: { select: { id: true, name: true } },
    },
  });

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { introductionsEnabled: true, type: true },
  });

  const statusColors: Record<string, string> = {
    PENDING_BUYER_APPROVAL: "#fef3c7",
    PENDING_SELLER_APPROVAL: "#fef3c7",
    APPROVED: "#dcfce7",
    REJECTED: "#fee2e2",
    DISPUTED: "#fce7f3",
  };

  const statusTextColors: Record<string, string> = {
    PENDING_BUYER_APPROVAL: "#92400e",
    PENDING_SELLER_APPROVAL: "#92400e",
    APPROVED: "#166534",
    REJECTED: "#991b1b",
    DISPUTED: "#9d174d",
  };

  const isAssociation = org?.type === "ASSOCIATION";

  return (
    <main
      style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 960 }}
    >
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Partner Introductions</h1>
      <p>
        Tenant: {session.organizationId}. Introductions allow association
        operators to propose buyer/seller matches between opted-in tenants.
      </p>

      {org && !org.introductionsEnabled && !isAssociation && (
        <p
          style={{
            color: "#92400e",
            background: "#fef3c7",
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          Introductions are disabled. An OWNER can enable them in Settings to
          allow your organization to participate in partner matching.
        </p>
      )}

      {isAssociation && <ProposeIntroductionForm />}

      {introductions.length === 0 ? (
        <EmptyState
          title="No introductions yet"
          description={
            isAssociation
              ? "Propose a buyer/seller match between opted-in tenants using the form above."
              : "Introduction requests will appear here when an association operator proposes a match for your organization."
          }
        />
      ) : (
        introductions.map((intro) => {
          const needsBuyerAction =
            intro.status === "PENDING_BUYER_APPROVAL" &&
            intro.buyerOrgId === session.organizationId;
          const needsSellerAction =
            intro.status === "PENDING_SELLER_APPROVAL" &&
            intro.sellerOrgId === session.organizationId;
          const needsAction = needsBuyerAction || needsSellerAction;

          return (
            <a
              key={intro.id}
              href={`/introductions/${intro.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
              }}
            >
              <article
                style={{
                  border: `1px solid ${needsAction ? "#f59e0b" : "#e5e7eb"}`,
                  borderLeft: `4px solid ${needsAction ? "#f59e0b" : "transparent"}`,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  background: needsAction ? "#fffbeb" : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong style={{ fontSize: 16 }}>
                    {intro.buyerOrg.name} ⟷ {intro.sellerOrg.name}
                  </strong>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background: statusColors[intro.status] || "#f3f4f6",
                      color: statusTextColors[intro.status] || "#374151",
                    }}
                  >
                    {intro.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p
                  style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13 }}
                >
                  Proposed by {intro.proposerOrg.name} &middot;{" "}
                  {intro.createdAt.toLocaleDateString()}
                  {intro.valueGenerated && (
                    <> &middot; Value: {intro.valueGenerated}</>
                  )}
                  {needsAction && (
                    <strong style={{ color: "#92400e" }}>
                      {" "}
                      &middot; Action required!
                    </strong>
                  )}
                </p>
              </article>
            </a>
          );
        })
      )}
    </main>
  );
}
