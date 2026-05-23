import { prisma } from "@tradeos/database";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { requirePageSession } from "../../../lib/page-session";

async function acceptInvite(formData: FormData) {
  "use server";
  const token = formData.get("token") as string;
  if (!token) throw new Error("INVALID_REQUEST_BODY");

  const session = await requirePageSession();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash },
  });
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.expiresAt < new Date()
  ) {
    throw new Error("INVITATION_INVALID_OR_EXPIRED");
  }
  if (session.email !== invitation.email) {
    throw new Error("INVITATION_EMAIL_MISMATCH");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.userId,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (!existing) {
      await tx.organizationMember.create({
        data: {
          userId: session.userId,
          organizationId: invitation.organizationId,
          roleId: invitation.roleId,
          status: "ACTIVE",
          invitedAt: invitation.createdAt,
          acceptedAt: new Date(),
        },
      });
    } else if (existing.status === "INVITED") {
      await tx.organizationMember.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", acceptedAt: new Date() },
      });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        actorUserId: session.userId,
        actionName: "user.acceptInvite",
        riskLevel: "LOW",
        input: { invitationId: invitation.id, email: invitation.email },
        result: { accepted: true },
        approved: true,
      },
    });
  });

  redirect("/");
}

function layout(children: React.ReactNode) {
  return (
    <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center" }}>
      {children}
    </div>
  );
}

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash },
  });

  if (!invitation || invitation.expiresAt < new Date()) {
    return layout(
      <>
        <h1>Invalid or expired invitation</h1>
        <p>
          This invitation link is no longer valid. Please ask your organization
          admin to send a new invitation.
        </p>
      </>,
    );
  }

  if (invitation.acceptedAt) {
    return layout(
      <>
        <h1>Already accepted</h1>
        <p>
          This invitation has already been accepted. You are already a member of
          the organization.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: 16,
            padding: "10px 24px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          Go to Dashboard
        </a>
      </>,
    );
  }

  const session = await requirePageSession();

  if (session.email !== invitation.email) {
    return layout(
      <>
        <h1>Invitation mismatch</h1>
        <p>
          This invitation was sent to <strong>{invitation.email}</strong>, but
          you are signed in as <strong>{session.email}</strong>.
        </p>
        <p>Please sign in with the invited email address and try again.</p>
      </>,
    );
  }

  return layout(
    <>
      <h1>You are invited to join</h1>
      <p>
        You have been invited to join the organization as a team member. Click
        below to accept.
      </p>
      <form action={acceptInvite}>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          style={{
            marginTop: 16,
            padding: "10px 24px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Accept Invitation
        </button>
      </form>
    </>,
  );
}
