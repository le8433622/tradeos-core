"use client";

import { usePathname } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

interface AppSidebarProps {
  orgName?: string;
  userEmail?: string;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "▦" },
  { label: "Sourcing Runs", href: "/sourcing-runs", icon: "◎" },
  { label: "Leads", href: "/leads", icon: "⊙" },
  { label: "Companies", href: "/companies", icon: "▨" },
  { label: "Products", href: "/products", icon: "◈" },
  { label: "Conversations", href: "/conversations", icon: "💬" },
  { label: "Approvals", href: "/approvals", icon: "◆" },
  { label: "Settings", href: "/settings/profile", icon: "⚙" },
];

export function AppSidebar({ orgName, userEmail }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      style={{
        width: 240,
        minWidth: 240,
        padding: "24px 16px",
        borderRight: "1px solid #e5e7eb",
        background: "#f9fafb",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <div style={{ padding: "0 8px", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-0.5px",
          }}
        >
          TradeOS
        </div>
        {orgName && (
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {orgName}
          </div>
        )}
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          flex: 1,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} style={{ marginBottom: 2 }}>
              <a
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#111827" : "#4b5563",
                  textDecoration: "none",
                  background: isActive ? "#e5e7eb" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background =
                      "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>
                  {item.icon}
                </span>
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>

      {userEmail && (
        <div
          style={{
            padding: "12px 8px",
            borderTop: "1px solid #e5e7eb",
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 8,
          }}
        >
          {userEmail}
        </div>
      )}

      <SignOutButton />
    </nav>
  );
}
