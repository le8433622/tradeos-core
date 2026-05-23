type EmptyStateProps = {
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
};

export default function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        border: "1px dashed #d1d5db",
        borderRadius: 12,
        marginTop: 16,
      }}
    >
      <p
        style={{
          fontSize: 18,
          color: "#6b7280",
          margin: "0 0 4px",
          fontWeight: 500,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 14,
          color: "#9ca3af",
          margin: 0,
          maxWidth: 400,
          marginInline: "auto",
        }}
      >
        {description}
      </p>
      {action &&
        (action.href ? (
          <a
            href={action.href}
            style={{
              display: "inline-block",
              marginTop: 16,
              padding: "8px 20px",
              background: "#111827",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            {action.label}
          </a>
        ) : (
          <button
            onClick={action.onClick}
            style={{
              marginTop: 16,
              padding: "8px 20px",
              background: "#111827",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
