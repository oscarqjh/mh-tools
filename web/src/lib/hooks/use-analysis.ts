"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult, ConvertibleInfo } from "@/types";
import { calculateEV } from "@/lib/analysis/ev-calculator";
import { MarketHuntService } from "@/lib/services/markethunt-service";
import { mhctService, marketHuntService } from "@/lib/services";

interface AnalysisState {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  analyse: (
    convertible: ConvertibleInfo,
    priceMap: Map<string, { goldPrice: number | null; sbPrice: number | null }>,
    sbRate: number,
    otcTradeableIndex: Map<string, number>,
    otcLeechIndex: Map<string, number>,
  ) => Promise<void>;
}

export function useAnalysis(): AnalysisState {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = useCallback(
    async (
      convertible: ConvertibleInfo,
      priceMap: Map<string, { goldPrice: number | null; sbPrice: number | null }>,
      sbRate: number,
      otcTradeableIndex: Map<string, number>,
      otcLeechIndex: Map<string, number>,
    ) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const drops = await mhctService.getDrops(convertible.id);

        // Fetch per-item Discord OTC prices and leech cost in parallel (best-effort)
        const itemNames = drops.map((d) => d.itemName);
        let otcPrices: Map<string, number> | undefined;
        let leechCostSB: number | null = null;

        const otcFetches: Promise<void>[] = [];

        // Per-item tradeable prices
        if (otcTradeableIndex.size > 0) {
          otcFetches.push(
            marketHuntService
              .fetchOtcPricesForItems(itemNames, otcTradeableIndex)
              .then((prices) => { otcPrices = prices; })
              .catch(() => {
                console.warn("Failed to fetch OTC item prices");
              }),
          );
        }

        // Leech cost for this convertible (exact name match)
        const leechItemId = otcLeechIndex.get(convertible.name);
        if (leechItemId != null) {
          otcFetches.push(
            marketHuntService
              .getOtcListings(4, leechItemId)
              .then((listings) => {
                leechCostSB = MarketHuntService.deriveLatestOtcPrice(listings);
              })
              .catch(() => {
                console.warn("Failed to fetch leech cost");
              }),
          );
        }

        await Promise.all(otcFetches);

        const evResult = calculateEV(drops, priceMap, sbRate, otcPrices);
        setResult({ convertibleName: convertible.name, ...evResult, leechCostSB });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Analysis failed",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { result, loading, error, analyse };
}
