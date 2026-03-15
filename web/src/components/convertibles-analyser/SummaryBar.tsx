"use client";

import type { AnalysisResult } from "@/types";

interface SummaryBarProps {
  result: AnalysisResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function formatGold(value: number): string {
  return Math.round(value).toLocaleString();
}

function formatSB(value: number): string {
  return value.toFixed(2);
}

function formatDelta(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}

export default function SummaryBar({
  result,
  isFavorite,
  onToggleFavorite,
}: SummaryBarProps) {
  const hasLeechData = result.leechCostSB != null;
  const profitLoss = hasLeechData
    ? result.totalEvSBAfterTax - result.leechCostSB!
    : null;

  return (
    <div className="glass-card p-5">
      {/* Convertible name + favorite toggle */}
      <div className="flex items-center gap-3 mb-4">
        <h2
          className="text-xl font-bold"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--text-primary)",
          }}
        >
          {result.convertibleName}
        </h2>
        <button
          onClick={onToggleFavorite}
          className="text-lg cursor-pointer hover:scale-110 transition-transform"
          style={{ color: isFavorite ? "var(--accent)" : "var(--text-muted)" }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "\u2605" : "\u2606"}
        </button>
      </div>

      {/* Marketplace stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 stagger-in">
        <StatCard
          label="EV (Gold)"
          value={formatGold(result.totalEvGold)}
          color="var(--gold)"
          glow="glow-gold"
        />
        <StatCard
          label="After Tax"
          value={formatGold(result.totalEvGoldAfterTax)}
          color="var(--gold)"
        />
        <StatCard
          label="EV (SB)"
          value={formatSB(result.totalEvSB)}
          color="var(--sb)"
          glow="glow-blue"
        />
        <StatCard
          label="After Tax"
          value={formatSB(result.totalEvSBAfterTax)}
          color="var(--sb)"
        />
        <StatCard
          label="SB Rate"
          value={formatGold(result.sbRate)}
          color="var(--text-secondary)"
        />
      </div>

      {/* Discord Leech Profitability section */}
      {hasLeechData && (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <DiscordIcon />
            <span
              className="text-xs uppercase tracking-wider font-medium"
              style={{ color: "var(--discord)" }}
            >
              Leech Profitability
            </span>
            <span className="relative group/tip">
              <span className="badge-experimental cursor-help">
                experimental
              </span>
              <span
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 rounded-lg text-[11px] leading-snug w-56 opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-150 pointer-events-none z-20"
                style={{
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                }}
              >
                Discord prices sourced from Markethunt OTC API. Many items
                won&apos;t have prices until a dedicated data source is built.
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stagger-in">
            <StatCard
              label="Leech Cost (SB)"
              value={formatSB(result.leechCostSB!)}
              color="var(--discord)"
              glow="glow-discord"
            />
            <StatCard
              label="EV After Tax (SB)"
              value={formatSB(result.totalEvSBAfterTax)}
              color="var(--sb)"
              subtitle="expected return"
            />
            <ProfitLossCard profitLoss={profitLoss!} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  glow,
  subtitle,
}: {
  label: string;
  value: string;
  color: string;
  glow?: string;
  subtitle?: string;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "var(--bg-tertiary)" }}
    >
      <p
        className="text-[12px] uppercase tracking-wider mb-1 font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p
        className={`text-lg font-bold stat-value ${glow ?? ""}`}
        style={{ color }}
      >
        {value}
      </p>
      {subtitle && (
        <p
          className="text-[12px] mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ProfitLossCard({ profitLoss }: { profitLoss: number }) {
  const isProfit = profitLoss > 0;
  const isLoss = profitLoss < 0;
  const deltaClass = isProfit
    ? "delta-positive"
    : isLoss
      ? "delta-negative"
      : "delta-neutral";
  const glowClass = isProfit ? "glow-profit" : "";

  return (
    <div
      className="rounded-lg p-3 relative overflow-hidden"
      style={{ background: "var(--bg-tertiary)" }}
    >
      <p
        className="text-[12px] uppercase tracking-wider mb-1 font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        Profit / Loss
      </p>
      <p className={`text-lg font-bold stat-value ${deltaClass} ${glowClass}`}>
        {formatDelta(profitLoss)} SB
      </p>
      <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
        {isProfit ? "per leech" : isLoss ? "loss per leech" : "break even"}
      </p>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: "var(--discord)" }}
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
