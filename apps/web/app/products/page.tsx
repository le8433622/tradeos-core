import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import { CreateProductForm } from "./CreateProductForm";

export default async function ProductsPage() {
  const session = await requirePagePermission("product.read");
  const products = await prisma.product.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <main
      style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 960 }}
    >
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Product Catalog</h1>
      <p>
        Tenant: {session.organizationId}. Products are used in quotations and
        partner suggestions.
      </p>

      <CreateProductForm />

      {products.length === 0 && (
        <p style={{ color: "#9ca3af", marginTop: 24 }}>
          No products yet. Add one above.
        </p>
      )}

      {products.map((product) => (
        <article
          key={product.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong style={{ fontSize: 16 }}>{product.name}</strong>
            {product.category && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                {product.category}
              </span>
            )}
          </div>
          {product.description && (
            <p style={{ margin: "8px 0 0", color: "#374151" }}>
              {product.description}
            </p>
          )}
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#6b7280",
              display: "flex",
              gap: 16,
            }}
          >
            {product.originCountry && (
              <span>Origin: {product.originCountry}</span>
            )}
            {product.priceRange && <span>Price: {product.priceRange}</span>}
            {product.moq && <span>MOQ: {product.moq}</span>}
            {product.certification && (
              <span>Cert: {product.certification}</span>
            )}
          </div>
        </article>
      ))}
    </main>
  );
}
