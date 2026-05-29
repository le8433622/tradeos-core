"use client";

import { useEffect, useState } from "react";

type Integration = {
  id: string;
  channel: string;
  providerAccountId: string;
  status: string;
  createdAt: string;
  rotatedAt: string | null;
};

const CHANNELS = ["ZALO", "WHATSAPP", "EMAIL", "INBOX"] as const;

export default function IntegrationsSettingsForm() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [channel, setChannel] = useState("ZALO");
  const [providerAccountId, setProviderAccountId] = useState("");
  const [secret, setSecret] = useState("");
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateSecret, setRotateSecret] = useState("");
  const [saving, setSaving] = useState(false);

  const loadIntegrations = async () => {
    try {
      const res = await fetch("/api/settings/integrations");
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } catch {
      setError("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerAccountId.trim() || !secret.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          providerAccountId: providerAccountId.trim(),
          secret: secret.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to add integration");
      } else {
        setShowForm(false);
        setProviderAccountId("");
        setSecret("");
        await loadIntegrations();
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (integration: Integration) => {
    const newStatus = integration.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const res = await fetch(`/api/settings/integrations/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await loadIntegrations();
    } catch {
      setError("Failed to update integration");
    }
  };

  const handleRotate = async (id: string) => {
    if (!rotateSecret.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: rotateSecret.trim() }),
      });
      if (res.ok) {
        setRotatingId(null);
        setRotateSecret("");
        await loadIntegrations();
      }
    } catch {
      setError("Failed to rotate secret");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (integration: Integration) => {
    if (
      !confirm(
        `Delete ${integration.channel} integration for ${integration.providerAccountId}?`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/settings/integrations/${integration.id}`, {
        method: "DELETE",
      });
      if (res.ok) await loadIntegrations();
    } catch {
      setError("Failed to delete integration");
    }
  };

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Integrations</h1>
        <p style={{ color: "#9ca3af" }}>Loading integrations...</p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>Integrations</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: "#111827",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "+ Add Integration"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            maxWidth: 480,
          }}
        >
          <h3 style={{ margin: "0 0 16px" }}>New Webhook Integration</h3>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Provider Account ID
            </label>
            <input
              value={providerAccountId}
              onChange={(e) => setProviderAccountId(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
              placeholder="e.g. Zalo OA ID or phone number"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Secret / API Key
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !providerAccountId.trim() || !secret.trim()}
            style={{
              background: "#111827",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 14,
              cursor: saving ? "wait" : "pointer",
              opacity:
                saving || !providerAccountId.trim() || !secret.trim() ? 0.6 : 1,
            }}
          >
            {saving ? "Adding..." : "Add Integration"}
          </button>
        </form>
      )}

      {error && (
        <div
          style={{
            color: "#dc2626",
            fontSize: 14,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {integrations.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>
          No webhook integrations configured yet.
        </p>
      ) : (
        <div style={{ maxWidth: 640 }}>
          {integrations.map((integration) => (
            <div
              key={integration.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{integration.channel}</strong>
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                    {integration.providerAccountId}
                  </p>
                </div>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    background:
                      integration.status === "ACTIVE" ? "#059669" : "#9ca3af",
                  }}
                >
                  {integration.status}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                Created {new Date(integration.createdAt).toLocaleDateString()}
                {integration.rotatedAt &&
                  ` · Secret last rotated ${new Date(
                    integration.rotatedAt,
                  ).toLocaleDateString()}`}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => handleToggleStatus(integration)}
                  style={{
                    padding: "4px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 12,
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  {integration.status === "ACTIVE" ? "Disable" : "Enable"}
                </button>
                {rotatingId === integration.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRotate(integration.id);
                    }}
                    style={{ display: "flex", gap: 8 }}
                  >
                    <input
                      type="password"
                      value={rotateSecret}
                      onChange={(e) => setRotateSecret(e.target.value)}
                      placeholder="New secret"
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 12,
                        width: 160,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={saving || !rotateSecret.trim()}
                      style={{
                        padding: "4px 12px",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12,
                        background: "#111827",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotatingId(null);
                        setRotateSecret("");
                      }}
                      style={{
                        padding: "4px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 12,
                        background: "white",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setRotatingId(integration.id)}
                    style={{
                      padding: "4px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: 12,
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    Rotate Secret
                  </button>
                )}
                <button
                  onClick={() => handleDelete(integration)}
                  style={{
                    padding: "4px 12px",
                    border: "1px solid #dc2626",
                    borderRadius: 6,
                    fontSize: 12,
                    background: "white",
                    color: "#dc2626",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
