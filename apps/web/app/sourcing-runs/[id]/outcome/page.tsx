import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../../lib/page-session";
import { notFound } from "next/navigation";
import "@tradeos/sourcing-core";
import OutcomeForm from "./outcome-form";

export default async function OutcomePage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("sourcing.view");
  const { id } = await paramsPromise;

  const [run, existing] = await Promise.all([
    prisma.sourcingRun.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        title: true,
        status: true,
      },
    }),
    prisma.outcomeRecord.findFirst({
      where: { organizationId: session.organizationId, sourcingRunId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!run || run.organizationId !== session.organizationId) {
    notFound();
  }

  if (existing) {
    return (
      <main
        style={{
          padding: 32,
          maxWidth: 720,
          margin: "0 auto",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <a
          href={`/sourcing-runs/${id}`}
          style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
        >
          &larr; Back to sourcing run
        </a>
        <h1 style={{ marginTop: 16 }}>Outcome Recorded</h1>
        <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>{run.title}</p>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
            marginTop: 16,
          }}
        >
          <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
            <Row label="Buyer Action" value={existing.buyerAction} />
            <Row
              label="Actual Supplier"
              value={existing.actualSupplier ?? "—"}
            />
            <Row
              label="Actual Unit Price"
              value={
                existing.actualUnitPrice
                  ? String(existing.actualUnitPrice)
                  : "—"
              }
            />
            <Row
              label="Delivery Days"
              value={existing.actualDeliveryDays?.toString() ?? "—"}
            />
            <Row label="Quality Result" value={existing.qualityResult ?? "—"} />
            <Row
              label="Dispute"
              value={existing.disputeOccurred ? "Yes" : "No"}
            />
            <Row
              label="Re-ordered"
              value={existing.reorderOccurred ? "Yes" : "No"}
            />
            <Row
              label="Satisfaction"
              value={
                existing.buyerSatisfaction != null
                  ? `${existing.buyerSatisfaction}/5`
                  : "—"
              }
            />
            <Row label="Note" value={existing.learningNote ?? "—"} />
            <Row
              label="Recorded"
              value={existing.createdAt.toLocaleDateString()}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 32,
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <a
        href={`/sourcing-runs/${id}`}
        style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
      >
        &larr; Back to sourcing run
      </a>

      <h1 style={{ marginTop: 16 }}>Record Outcome</h1>
      <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
        {run.title} &middot; Status: {run.status}
      </p>
      <p style={{ color: "#9ca3af", fontSize: 13 }}>
        Document what happened after the buyer decision. This closes the
        learning loop.
      </p>

      <OutcomeForm runId={id} />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
        {value}
      </span>
    </div>
  );
}
