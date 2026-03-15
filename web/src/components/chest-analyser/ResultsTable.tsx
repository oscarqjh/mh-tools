"use client";

import { useState, useMemo } from "react";
import type { ItemEV } from "@/types";

interface ResultsTableProps {
  items: ItemEV[];
}

type SortKey = "itemName" | "dropChance" | "avgQuantity" | "goldPrice" | "evGold" | "sbPrice" | "evSB";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey | "minMax"; label: string; align: "left" | "right" }[] = [
  { key: "itemName", label: "Item", align: "left" },
  { key: "dropChance", label: "Drop%", align: "right" },
  { key: "avgQuantity", label: "Avg Qty", align: "right" },
  { key: "minMax", label: "Min-Max", align: "right" },
  { key: "goldPrice", label: "Gold Price", align: "right" },
  { key: "evGold", label: "Gold EV", align: "right" },
  { key: "sbPrice", label: "SB Price", align: "right" },
  { key: "evSB", label: "SB EV", align: "right" },
];

export default function ResultsTable({ items }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("evGold");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const active = items.filter((i) => !i.nonTradeable && !i.unmapped);
    const inactive = items.filter((i) => i.nonTradeable || i.unmapped);

    active.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
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
    <div className="overflow-x-auto rounded-lg" style={{ borderWidth: 1, borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "var(--bg-secondary)" }}>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`px-3 py-2 font-medium text-xs uppercase tracking-wider ${
                  col.align === "right" ? "text-right" : "text-left"
                } ${col.key !== "minMax" ? "cursor-pointer select-none hover:opacity-80" : ""}`}
                style={{ color: "var(--text-secondary)" }}
              >
                {col.label}
                {col.key === sortKey && (
                  <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => {
            const isMuted = item.nonTradeable || item.unmapped;
            return (
              <tr
                key={item.itemName}
                style={{
                  backgroundColor:
                    i % 2 === 0 ? "var(--bg-primary)" : "var(--bg-secondary)",
                  color: isMuted ? "var(--text-muted)" : "var(--text-primary)",
                }}
                className="hover:brightness-110 transition-all"
              >
                <td className="px-3 py-2">{item.itemName}</td>
                <td className="px-3 py-2 text-right">
                  {(item.dropChance * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right">
                  {item.avgQuantity.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right">
                  {item.minQuantity}–{item.maxQuantity}
                </td>
                <td
                  className="px-3 py-2 text-right"
                  style={{ color: isMuted ? undefined : "var(--gold)" }}
                >
                  {item.goldPrice != null
                    ? item.goldPrice.toLocaleString()
                    : "—"}
                </td>
                <td
                  className="px-3 py-2 text-right font-medium"
                  style={{ color: isMuted ? undefined : "var(--gold)" }}
                >
                  {isMuted ? "—" : Math.round(item.evGold).toLocaleString()}
                </td>
                <td
                  className="px-3 py-2 text-right"
                  style={{ color: isMuted ? undefined : "var(--sb)" }}
                >
                  {item.sbPrice != null ? item.sbPrice.toFixed(2) : "—"}
                </td>
                <td
                  className="px-3 py-2 text-right font-medium"
                  style={{ color: isMuted ? undefined : "var(--sb)" }}
                >
                  {isMuted ? "—" : item.evSB.toFixed(4)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
