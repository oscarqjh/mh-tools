"use client";

import { useState, useMemo } from "react";
import type { ItemEV } from "@/types";

interface ResultsTableProps {
  items: ItemEV[];
}

type SortKey = "itemName" | "dropChance" | "avgQuantity" | "goldPrice" | "evGold" | "sbPrice" | "evSB" | "discordSbPrice";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey | "minMax"; label: string; align: "left" | "right"; colorVar?: string; detail?: boolean }[] = [
  { key: "itemName", label: "Item", align: "left" },
  { key: "dropChance", label: "Drop%", align: "right" },
  { key: "avgQuantity", label: "Avg Qty", align: "right" },
  { key: "minMax", label: "Min-Max", align: "right", detail: true },
  { key: "goldPrice", label: "Gold Price", align: "right", colorVar: "--gold", detail: true },
  { key: "evGold", label: "Gold EV", align: "right", colorVar: "--gold" },
  { key: "sbPrice", label: "SB Price", align: "right", colorVar: "--sb", detail: true },
  { key: "evSB", label: "SB EV", align: "right", colorVar: "--sb" },
  { key: "discordSbPrice", label: "Discord SB", align: "right", colorVar: "--discord" },
];

export default function ResultsTable({ items }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("evGold");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [detailed, setDetailed] = useState(false);

  const hasAnyDiscordData = useMemo(
    () => items.some((i) => i.discordSbPrice != null),
    [items],
  );

  const visibleColumns = useMemo(
    () =>
      COLUMNS.filter((c) => {
        if (c.key === "discordSbPrice" && !hasAnyDiscordData) return false;
        if (c.detail && !detailed) return false;
        return true;
      }),
    [hasAnyDiscordData, detailed],
  );

  const sorted = useMemo(() => {
    const active = items.filter((i) => !i.nonTradeable && !i.unmapped);
    const inactive = items.filter((i) => i.nonTradeable || i.unmapped);

    active.sort((a, b) => {
      const aVal = a[sortKey as keyof ItemEV] ?? 0;
      const bVal = b[sortKey as keyof ItemEV] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return [...active, ...inactive];
  }, [items, sortKey, sortDir]);

  const handleSort = (key: SortKey | "minMax") => {
    if (key === "minMax") return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div
        className="flex items-center justify-end px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <button
          role="switch"
          aria-checked={detailed}
          onClick={() => setDetailed((d) => !d)}
          className="group flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer select-none"
          style={{ color: detailed ? "var(--accent)" : "var(--text-muted)" }}
        >
          <span>Detailed</span>
          <span
            className="relative inline-flex items-center rounded-full transition-colors duration-200"
            style={{
              width: 32,
              height: 18,
              backgroundColor: detailed
                ? "var(--accent)"
                : "var(--bg-tertiary)",
              border: `1px solid ${detailed ? "var(--accent)" : "var(--border)"}`,
              boxShadow: detailed ? "var(--glow-gold)" : "none",
            }}
          >
            <span
              className="block rounded-full transition-all duration-200"
              style={{
                width: 12,
                height: 12,
                backgroundColor: detailed
                  ? "var(--bg-primary)"
                  : "var(--text-muted)",
                transform: detailed ? "translateX(16px)" : "translateX(3px)",
              }}
            />
          </span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
              }}
            >
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-3 font-medium text-[11px] uppercase tracking-wider whitespace-nowrap ${
                    col.align === "right" ? "text-right" : "text-left"
                  } ${col.key !== "minMax" ? "cursor-pointer select-none" : ""}`}
                  style={{
                    color:
                      col.key === sortKey
                        ? "var(--accent)"
                        : col.key === "discordSbPrice"
                          ? "var(--discord)"
                          : "var(--text-muted)",
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.key === "discordSbPrice" && <DiscordDot />}
                    {col.label}
                    {col.key === sortKey && (
                      <span className="text-[9px]">
                        {sortDir === "asc" ? "\u25B2" : "\u25BC"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const isMuted = item.nonTradeable || item.unmapped;
              // Compute per-item delta between Discord and marketplace SB prices
              const hasDelta =
                item.discordSbPrice != null && item.sbPrice != null && !isMuted;
              const priceDelta = hasDelta
                ? item.discordSbPrice! - item.sbPrice!
                : null;

              return (
                <tr
                  key={item.itemName}
                  className="transition-colors"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    color: isMuted
                      ? "var(--text-muted)"
                      : "var(--text-primary)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-tertiary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td className="px-3 py-2.5 font-medium">{item.itemName}</td>
                  <td className="px-3 py-2.5 text-right stat-value">
                    {(item.dropChance * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-right stat-value">
                    {item.avgQuantity.toFixed(1)}
                  </td>
                  {detailed && (
                    <td className="px-3 py-2.5 text-right stat-value">
                      {item.minQuantity}&ndash;{item.maxQuantity}
                    </td>
                  )}
                  {detailed && (
                    <td
                      className="px-3 py-2.5 text-right stat-value"
                      style={{ color: isMuted ? undefined : "var(--gold)" }}
                    >
                      {item.goldPrice != null
                        ? item.goldPrice.toLocaleString()
                        : "\u2014"}
                    </td>
                  )}
                  <td
                    className="px-3 py-2.5 text-right font-semibold stat-value"
                    style={{ color: isMuted ? undefined : "var(--gold)" }}
                  >
                    {isMuted ? "\u2014" : Math.round(item.evGold).toLocaleString()}
                  </td>
                  {detailed && (
                    <td
                      className="px-3 py-2.5 text-right stat-value"
                      style={{ color: isMuted ? undefined : "var(--sb)" }}
                    >
                      {item.sbPrice != null ? item.sbPrice.toFixed(2) : "\u2014"}
                    </td>
                  )}
                  <td
                    className="px-3 py-2.5 text-right font-semibold stat-value"
                    style={{ color: isMuted ? undefined : "var(--sb)" }}
                  >
                    {isMuted ? "\u2014" : item.evSB.toFixed(4)}
                  </td>
                  {hasAnyDiscordData && (
                    <td className="px-3 py-2.5 text-right stat-value">
                      {item.discordSbPrice != null ? (
                        <span className="inline-flex items-center gap-1.5 justify-end">
                          <span style={{ color: isMuted ? undefined : "var(--discord)" }}>
                            {item.discordSbPrice.toFixed(2)}
                          </span>
                          {priceDelta != null && (
                            <span
                              className={`text-[10px] font-medium ${
                                priceDelta > 0
                                  ? "delta-positive"
                                  : priceDelta < 0
                                    ? "delta-negative"
                                    : "delta-neutral"
                              }`}
                            >
                              {priceDelta > 0 ? "\u25B2" : priceDelta < 0 ? "\u25BC" : "\u25CF"}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>{"\u2014"}</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Small Discord-colored dot indicator for the column header */
function DiscordDot() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ background: "var(--discord)" }}
    />
  );
}
