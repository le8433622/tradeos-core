import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import DraftCaseBuilder from "../../components/draft-case-builder";
import EvidenceIntake from "../sourcing-runs/[id]/evidence-intake";

export default async function EvidenceInboxPage() {
  const session = await requirePagePermission("evidence.upload");

  const evidenceItems = await prisma.evidenceItem.findMany({
    where: {
      organizationId: session.organizationId,
      sourcingRunId: null,
    },
    orderBy: { capturedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      evidenceType: true,
      description: true,
      capturedAt: true,
      sourcingRunId: true,
    },
  });

  const mapped = evidenceItems.map((e) => ({
    id: e.id,
    title: e.title,
    evidenceType: e.evidenceType,
    description: e.description,
    capturedAt: e.capturedAt.toISOString(),
    sourcingRunId: e.sourcingRunId,
  }));

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Evidence Inbox</h1>
      <p>
        Paste raw trade evidence → parse → save as unattached evidence → build a
        draft sourcing run.
      </p>

      <EvidenceIntake />

      <h2 style={{ marginTop: 32, fontSize: 18, fontWeight: 600 }}>
        Unattached Evidence
      </h2>

      {mapped.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: 32,
            textAlign: "center",
            border: "2px dashed #e5e7eb",
            borderRadius: 12,
            color: "#9ca3af",
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
            No unattached evidence
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            Use the Evidence Intake form above to paste and parse raw trade
            evidence, then build a draft case.
          </p>
        </div>
      ) : (
        <DraftCaseBuilder evidenceItems={mapped} />
      )}
    </main>
  );
}
