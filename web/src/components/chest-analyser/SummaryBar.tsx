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

export default function SummaryBar({
  result,
  isFavorite,
  onToggleFavorite,
}: SummaryBarProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderWidth: 1,
        borderColor: "var(--border)",
      }}
    >
      {/* Chest name + favorite toggle */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={onToggleFavorite}
          className="text-lg cursor-pointer hover:scale-110 transition-transform"
          style={{ color: isFavorite ? "var(--accent)" : "var(--text-muted)" }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "★" : "☆"}
        </button>
        <h2
          className="text-xl font-bold"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-heading)",
          }}
        >
          {result.chestName}
        </h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="EV (Gold)" value={formatGold(result.totalEvGold)} color="var(--gold)" />
        <StatCard label="After Tax (Gold)" value={formatGold(result.totalEvGoldAfterTax)} color="var(--gold)" />
        <StatCard label="EV (SB)" value={formatSB(result.totalEvSB)} color="var(--sb)" />
        <StatCard label="After Tax (SB)" value={formatSB(result.totalEvSBAfterTax)} color="var(--sb)" />
        <StatCard label="SB Rate" value={formatGold(result.sbRate)} color="var(--text-secondary)" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <p
        className="text-xs uppercase tracking-wider mb-1"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p className="text-lg font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
