"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateProductForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get("name") || ""),
      category: String(form.get("category") || ""),
      description: String(form.get("description") || ""),
      originCountry: String(form.get("originCountry") || ""),
      priceRange: String(form.get("priceRange") || ""),
      moq: String(form.get("moq") || ""),
      certification: String(form.get("certification") || ""),
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create product");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 8,
        maxWidth: 520,
        marginBottom: 24,
        padding: 20,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>Add Product</h2>
      <input
        name="name"
        placeholder="Product name *"
        required
        style={{ padding: 10 }}
      />
      <input
        name="category"
        placeholder="Category (e.g. Rice, Seafood)"
        style={{ padding: 10 }}
      />
      <textarea
        name="description"
        placeholder="Description"
        rows={3}
        style={{ padding: 10 }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          name="originCountry"
          placeholder="Origin country"
          style={{ padding: 10 }}
        />
        <input
          name="priceRange"
          placeholder="Price range (e.g. 500-700 USD/MT)"
          style={{ padding: 10 }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="moq" placeholder="Min order qty" style={{ padding: 10 }} />
        <input
          name="certification"
          placeholder="Certification"
          style={{ padding: 10 }}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: 12,
          background: loading ? "#9ca3af" : "#111827",
          color: "white",
          borderRadius: 10,
        }}
      >
        {loading ? "Adding..." : "Add Product"}
      </button>
      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>
      )}
    </form>
  );
}
