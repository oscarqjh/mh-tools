"use client";

import { useState, useCallback, useEffect } from "react";
import type { ConvertibleInfo } from "@/types";
import TopBar from "@/components/layout/TopBar";
import ConvertibleSearch from "@/components/convertibles-analyser/ConvertibleSearch";
import FavoritesList from "@/components/convertibles-analyser/FavoritesList";
import SummaryBar from "@/components/convertibles-analyser/SummaryBar";
import ResultsTable from "@/components/convertibles-analyser/ResultsTable";
import WarningsPanel from "@/components/convertibles-analyser/WarningsPanel";
import { useMarketData } from "@/lib/hooks/use-market-data";
import { useAnalysis } from "@/lib/hooks/use-analysis";
import { storage } from "@/lib/services";

export default function ConvertiblesAnalyserPage() {
  const market = useMarketData();
  const analysis = useAnalysis();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(storage.getFavorites());
  }, []);

  const handleSelectConvertible = useCallback(
    (convertible: ConvertibleInfo) => {
      analysis.analyse(
        convertible,
        market.priceMap,
        market.sbRate,
        market.otcTradeableIndex,
        market.otcLeechIndex,
      );
    },
    [
      analysis,
      market.priceMap,
      market.sbRate,
      market.otcTradeableIndex,
      market.otcLeechIndex,
    ],
  );

  const handleToggleFavorite = useCallback(() => {
    if (!analysis.result) return;
    const name = analysis.result.convertibleName;
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
    <div className="page-gradient min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <TopBar
          title="Convertibles"
          canRefresh={market.canRefresh}
          cooldownRemaining={market.cooldownRemaining}
          onRefresh={market.refresh}
        />

        {/* Error banner */}
        {market.error && (
          <div
            className="glass-card px-4 py-3 mb-6 text-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--error) 30%, transparent)",
              color: "var(--error)",
            }}
          >
            {market.error}
          </div>
        )}

        <div className="flex gap-6">
          {/* Left panel */}
          <div className="w-72 flex-shrink-0 space-y-4">
            {/* Search card */}
            <div className="glass-card p-4">
              <h3
                className="text-xs uppercase tracking-wider mb-3 font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Search Convertibles
              </h3>
              <ConvertibleSearch
                convertibles={market.convertibles}
                onSelect={handleSelectConvertible}
                disabled={market.loading}
              />
            </div>

            {/* Favorites card */}
            <div className="glass-card p-4">
              <h3
                className="text-xs uppercase tracking-wider mb-3 font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Favorites
              </h3>
              <FavoritesList
                favorites={favorites}
                convertibles={market.convertibles}
                onSelect={handleSelectConvertible}
                onRemove={handleRemoveFavorite}
              />
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0">
            {market.loading && !analysis.result && (
              <div className="space-y-4 animate-fade-in">
                <div className="skeleton h-28 w-full" />
                <div className="skeleton h-64 w-full" />
              </div>
            )}

            {analysis.loading && (
              <div
                className="glass-card p-6 flex items-center gap-3 animate-fade-in"
                style={{ color: "var(--text-secondary)" }}
              >
                <svg
                  className="animate-spin"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Analysing convertible contents...</span>
              </div>
            )}

            {analysis.error && (
              <div
                className="glass-card p-4 animate-fade-in"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--error) 30%, transparent)",
                  color: "var(--error)",
                }}
              >
                {analysis.error}
              </div>
            )}

            {analysis.result && !analysis.loading && (
              <div className="space-y-4 animate-fade-in">
                <SummaryBar
                  result={analysis.result}
                  isFavorite={storage.isFavorite(analysis.result.convertibleName)}
                  onToggleFavorite={handleToggleFavorite}
                />
                <ResultsTable items={analysis.result.items} />
                <WarningsPanel warnings={analysis.result.warnings} />
              </div>
            )}

            {!analysis.result && !analysis.loading && !market.loading && (
              <div className="glass-card flex flex-col items-center justify-center h-72 text-center animate-fade-in">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a4 4 0 0 0-8 0v2" />
                  <circle cx="12" cy="15" r="2" />
                </svg>
                <p
                  className="text-sm max-w-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Select a convertible from your favorites or search to begin
                  analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
