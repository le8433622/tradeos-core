import { prisma, type CompanyType } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { requirePagePermission } from "../../lib/page-session";
import EmptyState from "../../components/empty-state";
import "@tradeos/crm-core";

async function createCompany(formData: FormData) {
  "use server";
  const session = await requirePagePermission("company.write");
  await executeAction(
    "crm.createCompany",
    {
      organizationId: session.organizationId,
      name: String(formData.get("name") || ""),
      country: String(formData.get("country") || ""),
      industry: String(formData.get("industry") || ""),
      type: String(formData.get("type") || "OTHER") as CompanyType,
      website: String(formData.get("website") || ""),
      notes: String(formData.get("notes") || ""),
    },
    {
      actorUserId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      source: "manual",
      mfaLevel: session.mfaLevel,
    },
  );
}

export default async function CompaniesPage() {
  const session = await requirePagePermission("company.read");
  const companies = await prisma.company.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Companies</h1>
      <p>
        Tenant: {session.organizationId}. Buyer, seller, distributor, logistics,
        and service partner database.
      </p>

      <form
        action={createCompany}
        style={{ display: "grid", gap: 8, maxWidth: 520, marginBottom: 24 }}
      >
        <input
          name="name"
          placeholder="Company name"
          required
          style={{ padding: 10 }}
        />
        <input name="country" placeholder="Country" style={{ padding: 10 }} />
        <input name="industry" placeholder="Industry" style={{ padding: 10 }} />
        <select name="type" defaultValue="OTHER" style={{ padding: 10 }}>
          <option value="BUYER">Buyer</option>
          <option value="SELLER">Seller</option>
          <option value="PARTNER">Partner</option>
          <option value="LOGISTICS">Logistics</option>
          <option value="SERVICE">Service</option>
          <option value="OTHER">Other</option>
        </select>
        <input name="website" placeholder="Website" style={{ padding: 10 }} />
        <textarea name="notes" placeholder="Notes" style={{ padding: 10 }} />
        <button
          type="submit"
          style={{
            padding: 12,
            background: "#111827",
            color: "white",
            borderRadius: 10,
          }}
        >
          Create company
        </button>
      </form>

      {companies.length === 0 ? (
        <EmptyState
          title="No companies yet"
          description="Companies represent buyers, sellers, partners, and service providers in your trade network. Add one above to get started."
        />
      ) : (
        <ul>
          {companies.map((company) => (
            <li key={company.id} style={{ marginBottom: 12 }}>
              <strong>{company.name}</strong> — {company.type} —{" "}
              {company.country || "Unknown"}
              <br />
              <span>{company.industry}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
