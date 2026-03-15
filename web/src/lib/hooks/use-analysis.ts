"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult, ChestInfo } from "@/types";
import { calculateEV } from "@/lib/analysis/ev-calculator";
import { mhctService } from "@/lib/services";

interface AnalysisState {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  analyse: (
    chest: ChestInfo,
    priceMap: Map<string, { goldPrice: number | null; sbPrice: number | null }>,
    sbRate: number,
  ) => Promise<void>;
}

export function useAnalysis(): AnalysisState {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = useCallback(
    async (
      chest: ChestInfo,
      priceMap: Map<string, { goldPrice: number | null; sbPrice: number | null }>,
      sbRate: number,
    ) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const drops = await mhctService.getDrops(chest.id);
        const evResult = calculateEV(drops, priceMap, sbRate);
        setResult({ chestName: chest.name, ...evResult });
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
