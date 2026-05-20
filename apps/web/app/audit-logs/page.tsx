import { prisma } from '@tradeos/database';
import { requireDemoSession } from '@tradeos/auth';

export default async function AuditLogsPage() {
  const session = await requireDemoSession();
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <main style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <a href="/" style={{ color: '#2563eb' }}>Back</a>
      <h1>Audit Logs</h1>
      <p>Every AI/manual action should leave a trace here.</p>
      {logs.map((log) => (
        <article key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <strong>{log.actionName}</strong>
          <p>Risk: {log.riskLevel} | Approved: {String(log.approved)}</p>
          <p>Actor: {log.actorUserId || 'unknown'} | Time: {log.createdAt.toISOString()}</p>
          <details>
            <summary>Input / Result</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ input: log.input, result: log.result }, null, 2)}</pre>
          </details>
        </article>
      ))}
    </main>
  );
}
