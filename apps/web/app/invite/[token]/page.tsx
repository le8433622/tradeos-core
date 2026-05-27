import {
  ensureSystemRoles,
  prisma,
  type Prisma,
  type UserRole,
} from "@tradeos/database";
import { redactForAudit } from "@tradeos/policy-core";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function legacyRoleFor(roleName?: string | null): UserRole {
  if (
    roleName === "OWNER" ||
    roleName === "ADMIN" ||
    roleName === "SALES" ||
    roleName === "OPERATOR" ||
    roleName === "VIEWER"
  ) {
    return roleName;
  }
  return "VIEWER";
}

async function acceptInvite(formData: FormData) {
  "use server";
  const token = formData.get("token") as string;
  if (!token) throw new Error("INVALID_REQUEST_BODY");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email) {
    redirect(`/login?next=/invite/${token}`);
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash },
    include: { role: { select: { id: true, name: true } } },
  });
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.expiresAt < new Date()
  ) {
    throw new Error("INVITATION_INVALID_OR_EXPIRED");
  }
  const authEmail = normalizeEmail(authUser.email);
  const invitedEmail = normalizeEmail(invitation.email);

  if (authEmail !== invitedEmail) {
    throw new Error("INVITATION_EMAIL_MISMATCH");
  }

  await ensureSystemRoles(prisma);

  await prisma.$transaction(async (tx) => {
    let appUser = await tx.user.findUnique({ where: { email: authEmail } });
    if (!appUser) {
      appUser = await tx.user.create({
        data: {
          organizationId: invitation.organizationId,
          email: authEmail,
          name: authUser.user_metadata?.name ?? authEmail.split("@")[0],
          role: legacyRoleFor(invitation.role?.name),
        },
      });
    }

    const claim = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        organizationId: invitation.organizationId,
        acceptedAt: null,
      },
      data: { acceptedAt: new Date() },
    });
    if (claim.count !== 1) {
      throw new Error("INVITATION_INVALID_OR_EXPIRED");
    }

    const existing = await tx.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: appUser.id,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (!existing) {
      await tx.organizationMember.create({
        data: {
          userId: appUser.id,
          organizationId: invitation.organizationId,
          roleId: invitation.roleId ?? "system-viewer",
          status: "ACTIVE",
          invitedAt: invitation.createdAt,
          acceptedAt: new Date(),
        },
      });
    } else if (existing.status === "INVITED") {
      await tx.organizationMember.update({
        where: {
          userId_organizationId: {
            userId: appUser.id,
            organizationId: invitation.organizationId,
          },
        },
        data: { status: "ACTIVE", acceptedAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        actorUserId: appUser.id,
        actionName: "user.acceptInvite",
        riskLevel: "LOW",
        input: redactForAudit({
          invitationId: invitation.id,
          email: invitation.email,
          roleId: invitation.roleId,
        }) as Prisma.InputJsonValue,
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
    include: {
      organization: { select: { name: true } },
      role: { select: { name: true } },
    },
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return layout(
      <>
        <h1>Sign in to accept invitation</h1>
        <p>
          This invitation was sent to <strong>{invitation.email}</strong>. Sign
          in with that email to accept.
        </p>
        <a
          href={`/login?next=/invite/${token}`}
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
          Sign in
        </a>
      </>,
    );
  }

  if (normalizeEmail(authUser.email) !== normalizeEmail(invitation.email)) {
    return layout(
      <>
        <h1>Invitation mismatch</h1>
        <p>
          This invitation was sent to <strong>{invitation.email}</strong>, but
          you are signed in as <strong>{authUser.email}</strong>.
        </p>
        <p>Please sign in with the invited email address and try again.</p>
      </>,
    );
  }

  return layout(
    <>
      <h1>You are invited to join</h1>
      <p>
        You have been invited to join{" "}
        <strong>{invitation.organization.name}</strong>
        {invitation.role?.name ? ` as ${invitation.role.name}` : ""}. Click
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
