export default function PendingOnboardingPage() {
  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <h1>Tenant access pending</h1>
      <p>
        Your Supabase account is signed in, but your email is not mapped to a
        TradeOS organization yet.
      </p>
      <p>
        Ask an admin to create a row in the TradeOS User table with your email,
        organizationId, and role.
      </p>
      <pre style={{ background: "#f3f4f6", padding: 16, borderRadius: 12 }}>
        {`User.email = your Supabase Auth email
User.organizationId = target tenant organization
User.role = OWNER | ADMIN | SALES | OPERATOR | VIEWER`}
      </pre>
      <a href="/login" style={{ color: "#2563eb" }}>
        Back to login
      </a>
    </main>
  );
}
