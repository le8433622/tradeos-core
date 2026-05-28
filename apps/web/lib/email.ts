// Shared email sending service via Resend API.
// Uses raw fetch (no SDK dependency). Configure via env vars:
//   RESEND_API_KEY    — required
//   APP_URL           — used as base for links
//   EMAIL_FROM        — optional, defaults to TradeOS Core <noreply@tradeos.core>

const FROM = process.env.EMAIL_FROM ?? "TradeOS Core <noreply@tradeos.core>";
const APP_URL = process.env.APP_URL ?? "https://tradeos-core.vercel.app";

function htmlWrapper(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
          <tr>
            <td style="padding:32px 32px 8px">
              <h1 style="font-size:20px;font-weight:700;margin:0;color:#111827">TradeOS Core</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;font-size:15px;line-height:1.6;color:#374151">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#9ca3af;text-align:center">
              TradeOS — Độc lập · Tự do · Hạnh phúc
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function textWrapper(body: string): string {
  return `${body}\n\n— TradeOS Core\nĐộc lập · Tự do · Hạnh phúc`;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — email not sent");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "unknown");
    throw new Error(`EMAIL_SEND_FAILED: ${res.status} ${body}`);
  }
}

// ── Templates ─────────────────────────────────────────────────────────────

export function inviteEmail(opts: {
  to: string;
  inviterOrg: string;
  inviteLink: string;
}) {
  const text = textWrapper(
    `You have been invited to join ${opts.inviterOrg} on TradeOS Core.\n\nClick the link below to accept:\n${opts.inviteLink}\n\nThis invitation expires in 7 days.`,
  );

  const html = htmlWrapper(`
    <p style="margin:0 0 16px">You have been invited to join <strong>${opts.inviterOrg}</strong> on TradeOS Core.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr>
        <td align="center" style="background:#2563eb;border-radius:8px;padding:12px 24px">
          <a href="${opts.inviteLink}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#6b7280">Or copy this link: <a href="${opts.inviteLink}" style="color:#2563eb">${opts.inviteLink}</a></p>
    <p style="margin:12px 0 0;font-size:13px;color:#6b7280">This invitation expires in 7 days.</p>
  `);

  return {
    subject: `You have been invited to join ${opts.inviterOrg}`,
    text,
    html,
  };
}

export function reportDeliveryEmail(opts: {
  to: string;
  title: string;
  orgName: string;
  reportUrl: string;
  note?: string;
}) {
  const text = textWrapper(
    `A sourcing report has been shared with you by ${opts.orgName}.\n\nTitle: ${opts.title}\n${opts.note ? `Note: ${opts.note}\n\n` : ""}View the report at:\n${opts.reportUrl}\n\nSign in to review, decide, and record the outcome.`,
  );

  const html = htmlWrapper(`
    <p style="margin:0 0 16px">A sourcing report has been shared with you by <strong>${opts.orgName}</strong>.</p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Title</p>
    <p style="margin:0 0 16px;font-weight:600">${opts.title}</p>
    ${opts.note ? `<p style="margin:0 0 16px;padding:12px;background:#f9fafb;border-radius:8px;font-size:13px;color:#6b7280">${opts.note}</p>` : ""}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr>
        <td align="center" style="background:#2563eb;border-radius:8px;padding:12px 24px">
          <a href="${opts.reportUrl}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">
            View Report &amp; Decide
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#6b7280">Sign in to review the full comparison, evidence, risk assessment, and record your decision.</p>
  `);

  return { subject: `Sourcing report: ${opts.title}`, text, html };
}

// ── Send helpers ──────────────────────────────────────────────────────────

export async function sendInviteEmail(
  to: string,
  inviterOrg: string,
  inviteLink: string,
) {
  const { subject, text, html } = inviteEmail({
    to,
    inviterOrg,
    inviteLink,
  });
  await sendEmail({ to, subject, text, html });
}

export async function sendReportDeliveryNotification(
  to: string,
  title: string,
  orgName: string,
  reportUrl: string,
  note?: string,
) {
  const { subject, text, html } = reportDeliveryEmail({
    to,
    title,
    orgName,
    reportUrl,
    note,
  });
  await sendEmail({ to, subject, text, html });
}
