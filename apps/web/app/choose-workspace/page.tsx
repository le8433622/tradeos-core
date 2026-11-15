import { redirect } from "next/navigation";
import { requirePageSession } from "../../lib/page-session";
import { ChooseWorkspaceList } from "./choose-workspace-list";

type SearchParams = {
  next?: string | string[];
};

function getSafeNextPath(raw: string | string[] | undefined): string {
  if (
    typeof raw !== "string" ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/\\") ||
    raw === "/choose-workspace" ||
    raw.startsWith("/choose-workspace/") ||
    raw.startsWith("/choose-workspace?") ||
    raw.startsWith("/choose-workspace#")
  ) {
    return "/";
  }

  return raw;
}

export default async function ChooseWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const session = await requirePageSession({ ignoreActiveOrganization: true });
  const memberships = session.memberships ?? [];

  if (memberships.length <= 1) {
    redirect(nextPath);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <section
        aria-labelledby="choose-workspace-title"
        style={{
          width: "100%",
          maxWidth: 560,
          padding: 32,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            color: "#6b7280",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          TradeOS
        </p>
        <h1
          id="choose-workspace-title"
          style={{
            margin: "0 0 8px",
            color: "#111827",
            fontSize: 26,
          }}
        >
          Choose a workspace
        </h1>
        <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14 }}>
          Your account has access to multiple workspaces. Select where you want
          to continue.
        </p>
        <ChooseWorkspaceList
          memberships={memberships}
          nextPath={nextPath}
        />
      </section>
    </main>
  );
}
