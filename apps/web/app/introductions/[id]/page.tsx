import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";
import { IntroductionActions } from "./IntroductionActions";

export default async function IntroductionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("introduction.read");
  const { id } = await params;

  const intro = await prisma.introductionRequest.findUnique({
    where: { id },
    include: {
      proposerOrg: { select: { id: true, name: true } },
      buyerOrg: { select: { id: true, name: true } },
      sellerOrg: { select: { id: true, name: true } },
    },
  });

  if (!intro) {
    return (
      <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        <a href="/introductions" style={{ color: "#2563eb" }}>
          Back
        </a>
        <h1>Introduction Not Found</h1>
      </main>
    );
  }

  const isParticipant =
    intro.buyerOrgId === session.organizationId ||
    intro.sellerOrgId === session.organizationId ||
    intro.proposerOrgId === session.organizationId;

  if (!isParticipant) {
    return (
      <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        <a href="/introductions" style={{ color: "#2563eb" }}>
          Back
        </a>
        <h1>Access Denied</h1>
      </main>
    );
  }

  const statusColors: Record<string, string> = {
    PENDING_BUYER_APPROVAL: "#fef3c7",
    PENDING_SELLER_APPROVAL: "#fef3c7",
    APPROVED: "#dcfce7",
    REJECTED: "#fee2e2",
    DISPUTED: "#fce7f3",
  };

  const isBuyer = intro.buyerOrgId === session.organizationId;
  const isSeller = intro.sellerOrgId === session.organizationId;
  const canBuyerApprove = isBuyer && intro.status === "PENDING_BUYER_APPROVAL";
  const canSellerApprove =
    isSeller && intro.status === "PENDING_SELLER_APPROVAL";

  return (
    <main
      style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 720 }}
    >
      <a href="/introductions" style={{ color: "#2563eb" }}>
        Back to Introductions
      </a>

      <h1>Introduction Request</h1>

      <div
        style={{
          background: statusColors[intro.status] || "#f3f4f6",
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Status: {intro.status.replace(/_/g, " ")}
      </div>

      <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        <div
          style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}
        >
          <strong>Proposer</strong>
          <p style={{ margin: "4px 0 0", color: "#374151" }}>
            {intro.proposerOrg.name}
          </p>
        </div>
        <div
          style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}
        >
          <strong>Buyer</strong>
          <p style={{ margin: "4px 0 0", color: "#374151" }}>
            {intro.buyerOrg.name}
          </p>
          {intro.buyerNote && (
            <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13 }}>
              Note: {intro.buyerNote}
            </p>
          )}
        </div>
        <div
          style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}
        >
          <strong>Seller</strong>
          <p style={{ margin: "4px 0 0", color: "#374151" }}>
            {intro.sellerOrg.name}
          </p>
          {intro.sellerNote && (
            <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13 }}>
              Note: {intro.sellerNote}
            </p>
          )}
        </div>
        {intro.valueGenerated && (
          <div
            style={{
              border: "1px solid #dcfce7",
              borderRadius: 12,
              padding: 16,
              background: "#f0fdf4",
            }}
          >
            <strong>Value Generated</strong>
            <p style={{ margin: "4px 0 0", color: "#166534" }}>
              {intro.valueGenerated}
            </p>
          </div>
        )}
        {intro.disputeReason && (
          <div
            style={{
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 16,
              background: "#fef2f2",
            }}
          >
            <strong>Dispute / Issue</strong>
            <p style={{ margin: "4px 0 0", color: "#991b1b" }}>
              {intro.disputeReason}
            </p>
          </div>
        )}
      </div>

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        Created: {intro.createdAt.toLocaleString()}
        {intro.updatedAt > intro.createdAt && (
          <> &middot; Updated: {intro.updatedAt.toLocaleString()}</>
        )}
      </p>

      {(canBuyerApprove || canSellerApprove || intro.status === "APPROVED") && (
        <IntroductionActions
          introductionId={intro.id}
          status={intro.status}
          isBuyer={isBuyer}
          isSeller={isSeller}
        />
      )}
    </main>
  );
}
