"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";

const AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth",
  "/onboarding",
  "/invite",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
