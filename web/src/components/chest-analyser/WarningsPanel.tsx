interface WarningsPanelProps {
  warnings: string[];
}

export default function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) return null;

  return (
    <div
      className="rounded-lg p-3 mt-4"
      style={{
        backgroundColor: "color-mix(in srgb, var(--warning) 10%, transparent)",
        borderWidth: 1,
        borderColor: "color-mix(in srgb, var(--warning) 30%, transparent)",
      }}
    >
      {warnings.map((w, i) => (
        <p key={i} className="text-sm" style={{ color: "var(--warning)" }}>
          {w}
        </p>
      ))}
    </div>
  );
}
