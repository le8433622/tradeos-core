import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../../lib/page-session";
import { notFound } from "next/navigation";
import BuyerDecisionForm from "./buyer-decision-form";

export default async function BuyerDecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("sourcing.view");
  const { id } = await params;

  const [run, report] = await Promise.all([
    prisma.sourcingRun.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        title: true,
        status: true,
      },
    }),
    prisma.switchDecisionReport.findFirst({
      where: {
        sourcingRunId: id,
        organizationId: session.organizationId,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!run || run.organizationId !== session.organizationId) {
    notFound();
  }

  return (
    <main
      style={{
        padding: 32,
        fontFamily: "Arial, sans-serif",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <a
        href={`/sourcing-runs/${id}`}
        style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
      >
        &larr; Back to sourcing run
      </a>

      <h1 style={{ marginTop: 16 }}>Buyer Decision</h1>
      <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
        {run.title} &middot; Status: {run.status}
      </p>

      {!report ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
            marginTop: 24,
            textAlign: "center",
          }}
        >
          <p style={{ color: "#999" }}>
            No switch decision report has been generated yet. Generate one from
            the sourcing run page first.
          </p>
          <a
            href={`/sourcing-runs/${id}`}
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: "#0070f3",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              marginTop: 8,
            }}
          >
            View sourcing run
          </a>
        </div>
      ) : (
        <BuyerDecisionForm
          runId={id}
          reportId={report.id}
          recommendation={report.recommendation}
          confidence={report.confidence}
          overallScore={report.overallScore ?? 0}
          monthlySavings={
            report.monthlySavings ? Number(report.monthlySavings) : null
          }
          annualSavings={
            report.annualSavings ? Number(report.annualSavings) : null
          }
          savingsPercent={
            report.savingsPercent
              ? Math.round(Number(report.savingsPercent) * 100) / 100
              : null
          }
          currency={report.currency}
          summary={report.summary ?? ""}
          riskFlags={
            Array.isArray(report.riskFlags)
              ? (report.riskFlags as string[])
              : []
          }
          missingProof={
            Array.isArray(report.missingProof)
              ? (report.missingProof as string[])
              : []
          }
          nextActions={
            Array.isArray(report.nextActions)
              ? (report.nextActions as string[])
              : []
          }
          buyerDecision={report.buyerDecision}
        />
      )}
    </main>
  );
}
