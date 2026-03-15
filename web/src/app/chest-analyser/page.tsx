"use client";

import { useState, useCallback, useEffect } from "react";
import type { ChestInfo } from "@/types";
import TopBar from "@/components/layout/TopBar";
import ChestSearch from "@/components/chest-analyser/ChestSearch";
import FavoritesList from "@/components/chest-analyser/FavoritesList";
import SummaryBar from "@/components/chest-analyser/SummaryBar";
import ResultsTable from "@/components/chest-analyser/ResultsTable";
import WarningsPanel from "@/components/chest-analyser/WarningsPanel";
import { useMarketData } from "@/lib/hooks/use-market-data";
import { useAnalysis } from "@/lib/hooks/use-analysis";
import { storage } from "@/lib/services";

export default function ChestAnalyserPage() {
  const market = useMarketData();
  const analysis = useAnalysis();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(storage.getFavorites());
  }, []);

  const handleSelectChest = useCallback(
    (chest: ChestInfo) => {
      analysis.analyse(chest, market.priceMap, market.sbRate);
    },
    [analysis, market.priceMap, market.sbRate],
  );

  const handleToggleFavorite = useCallback(() => {
    if (!analysis.result) return;
    const name = analysis.result.chestName;
    if (storage.isFavorite(name)) {
      storage.removeFavorite(name);
    } else {
      storage.addFavorite(name);
    }
    setFavorites(storage.getFavorites());
  }, [analysis.result]);

  const handleRemoveFavorite = useCallback((name: string) => {
    storage.removeFavorite(name);
    setFavorites(storage.getFavorites());
  }, []);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Chest Analyser"
        canRefresh={market.canRefresh}
        cooldownRemaining={market.cooldownRemaining}
        onRefresh={market.refresh}
      />

      {/* Error banner */}
      {market.error && (
        <div
          className="px-6 py-3 text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            color: "var(--error)",
          }}
        >
          {market.error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div
          className="w-72 flex-shrink-0 overflow-y-auto p-4 border-r"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Favorites section */}
          <h3
            className="text-xs uppercase tracking-wider mb-2 font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Favorites
          </h3>
          <FavoritesList
            favorites={favorites}
            chests={market.chests}
            onSelect={handleSelectChest}
            onRemove={handleRemoveFavorite}
          />

          <hr className="my-4" style={{ borderColor: "var(--border)" }} />

          {/* Search section */}
          <h3
            className="text-xs uppercase tracking-wider mb-2 font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Search
          </h3>
          <ChestSearch
            chests={market.chests}
            onSelect={handleSelectChest}
            disabled={market.loading}
          />
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {market.loading && !analysis.result && (
            <div className="space-y-4">
              <div className="skeleton h-24 w-full rounded-lg" />
              <div className="skeleton h-64 w-full rounded-lg" />
            </div>
          )}

          {analysis.loading && (
            <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <span className="animate-spin">&#x27F3;</span>
              <span>Analysing...</span>
            </div>
          )}

          {analysis.error && (
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
                color: "var(--error)",
              }}
            >
              {analysis.error}
            </div>
          )}

          {analysis.result && !analysis.loading && (
            <>
              <SummaryBar
                result={analysis.result}
                isFavorite={storage.isFavorite(analysis.result.chestName)}
                onToggleFavorite={handleToggleFavorite}
              />
              <div className="mt-4">
                <ResultsTable items={analysis.result.items} />
              </div>
              <WarningsPanel warnings={analysis.result.warnings} />
            </>
          )}

          {!analysis.result && !analysis.loading && !market.loading && (
            <div
              className="flex items-center justify-center h-64 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              <p>Select a chest from your favorites or search to begin analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
