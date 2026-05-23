import { ReactNode } from "react";

type PermissionGateProps = {
  permissions: string[];
  required: string;
  fallback?: ReactNode;
  children: ReactNode;
};

export function PermissionGate({
  permissions,
  required,
  fallback,
  children,
}: PermissionGateProps) {
  if (!permissions.includes(required)) {
    return fallback ?? null;
  }
  return <>{children}</>;
}

export function can(permissions: string[], required: string): boolean {
  return permissions.includes(required);
}
