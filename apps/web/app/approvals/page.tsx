import { prisma } from '@tradeos/database';
import { requirePageSession } from '../../lib/page-session';

async function createSendQuotationApproval(formData: FormData) {
  'use server';
  const session = await requirePageSession();
  await prisma.approvalRequest.create({
    data: {
      organizationId: session.organizationId,
      requestedById: session.userId,
      actionName: 'trade.sendQuotation',
      riskLevel: 'HIGH',
      status: 'PENDING',
      reason: 'Human approval required before sending quotation.',
      input: {
        quotationId: String(formData.get('quotationId') || ''),
      },
    },
  });
}

async function approveApproval(formData: FormData) {
  'use server';
  const session = await requirePageSession();
  await prisma.approvalRequest.update({
    where: { id: String(formData.get('id')) },
    data: {
      status: 'APPROVED',
      reviewedById: session.userId,
      reviewNote: 'Approved from approvals page',
      reviewedAt: new Date(),
    },
  });
}

async function rejectApproval(formData: FormData) {
  'use server';
  const session = await requirePageSession();
  await prisma.approvalRequest.update({
    where: { id: String(formData.get('id')) },
    data: {
      status: 'REJECTED',
      reviewedById: session.userId,
      reviewNote: 'Rejected from approvals page',
      reviewedAt: new Date(),
    },
  });
}

export default async function ApprovalsPage() {
  const session = await requirePageSession();
  const [approvals, quotations] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.quotation.findMany({
      where: { organizationId: session.organizationId, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Approval Queue</h1>
      <p>Tenant: {session.organizationId}. AI or operators can request approval for high-risk actions.</p>

      <form action={createSendQuotationApproval} style={{ display: 'grid', gap: 8, maxWidth: 520, marginBottom: 24 }}>
        <label>Create approval request for sending quotation</label>
        <select name="quotationId" required style={{ padding: 10 }}>
          <option value="">Select draft quotation</option>
          {quotations.map((quote) => (
            <option key={quote.id} value={quote.id}>{quote.title}</option>
          ))}
        </select>
        <button type="submit" style={{ padding: 12, background: '#111827', color: 'white', borderRadius: 10 }}>Request send approval</button>
      </form>

      {approvals.map((approval) => (
        <article key={approval.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <strong>{approval.actionName}</strong>
          <p>Status: {approval.status} | Risk: {approval.riskLevel}</p>
          <p>Reason: {approval.reason}</p>
          <details>
            <summary>Input / Result</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ input: approval.input, result: approval.result }, null, 2)}</pre>
          </details>
          {approval.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <form action={approveApproval}>
                <input type="hidden" name="id" value={approval.id} />
                <button type="submit" style={{ padding: 10, background: '#166534', color: 'white', borderRadius: 8 }}>Approve</button>
              </form>
              <form action={rejectApproval}>
                <input type="hidden" name="id" value={approval.id} />
                <button type="submit" style={{ padding: 10, background: '#991b1b', color: 'white', borderRadius: 8 }}>Reject</button>
              </form>
            </div>
          )}
        </article>
      ))}
    </main>
  );
}
