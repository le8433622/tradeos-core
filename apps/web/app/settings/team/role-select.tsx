"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Role = { id: string; name: string };

export function RoleSelect({
  userId,
  currentRoleId,
  roles,
  changeRoleAction,
}: {
  userId: string;
  currentRoleId: string;
  roles: Role[];
  changeRoleAction: (formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("roleId", e.target.value);
    startTransition(async () => {
      await changeRoleAction(formData);
      router.refresh();
    });
  }

  return (
    <select
      name="roleId"
      defaultValue={currentRoleId}
      disabled={pending}
      onChange={handleChange}
      style={{
        padding: "4px 8px",
        border: "1px solid #d1d5db",
        borderRadius: 4,
        fontSize: 13,
        opacity: pending ? 0.5 : 1,
      }}
    >
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
