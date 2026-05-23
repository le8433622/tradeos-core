import { requirePagePermission } from "../../../lib/page-session";

export default async function NotificationSettingsPage() {
  const session = await requirePagePermission("notification.manage");
  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Notifications</h1>
      <p>Notification defaults and audience management.</p>
    </div>
  );
}
