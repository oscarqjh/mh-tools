"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ConvertibleInfo, MarketItem } from "@/types";
import { MarketHuntService } from "@/lib/services/markethunt-service";
import { mhctService, marketHuntService, storage } from "@/lib/services";

interface MarketDataState {
  items: MarketItem[];
  convertibles: ConvertibleInfo[];
  sbRate: number;
  priceMap: Map<string, { goldPrice: number | null; sbPrice: number | null }>;
  /** Tradeable OTC index: item name → item ID */
  otcTradeableIndex: Map<string, number>;
  /** Leech OTC index: convertible name → item ID */
  otcLeechIndex: Map<string, number>;
  loading: boolean;
  error: string | null;
  canRefresh: boolean;
  cooldownRemaining: number;
  refresh: () => Promise<void>;
}

export function useMarketData(): MarketDataState {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [convertibles, setConvertibles] = useState<ConvertibleInfo[]>([]);
  const [sbRate, setSbRate] = useState(0);
  const [priceMap, setPriceMap] = useState<
    Map<string, { goldPrice: number | null; sbPrice: number | null }>
  >(new Map());
  const [otcTradeableIndex, setOtcTradeableIndex] = useState<
    Map<string, number>
  >(new Map());
  const [otcLeechIndex, setOtcLeechIndex] = useState<
    Map<string, number>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canRefresh, setCanRefresh] = useState(true);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const initialised = useRef(false);

  const loadPrices = useCallback(async (signal?: AbortSignal) => {
    const marketItems = await marketHuntService.getAllItems(signal);
    const rate = MarketHuntService.getSBRate(marketItems);
    const map = MarketHuntService.buildPriceMap(marketItems);
    setItems(marketItems);
    setSbRate(rate);
    setPriceMap(map);
    return marketItems;
  }, []);

  const loadConvertibles = useCallback(async (signal?: AbortSignal) => {
    const convertibleList = await mhctService.listConvertibles(signal);
    setConvertibles(convertibleList);
    return convertibleList;
  }, []);

  const loadOtcIndex = useCallback(async (signal?: AbortSignal) => {
    try {
      const index = await marketHuntService.getOtcIndex(signal);
      const tradeableIndex = MarketHuntService.buildOtcTradeableIndex(index);
      const leechIndex = MarketHuntService.buildOtcLeechIndex(index);
      setOtcTradeableIndex(tradeableIndex);
      setOtcLeechIndex(leechIndex);
    } catch {
      // OTC is best-effort — don't fail the whole load
      console.warn("Failed to load OTC index — Discord prices unavailable");
    }
  }, []);

  const updateCooldown = useCallback(() => {
    const remaining = storage.getRefreshCooldownRemaining();
    setCooldownRemaining(remaining);
    setCanRefresh(remaining === 0);
  }, []);

  // Initial load
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          loadPrices(controller.signal),
          loadConvertibles(controller.signal),
          loadOtcIndex(controller.signal),
        ]);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load market data",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          updateCooldown();
        }
      }
    };
    load();

    return () => controller.abort();
  }, [loadPrices, loadConvertibles, loadOtcIndex, updateCooldown]);

  const refresh = useCallback(async () => {
    if (!storage.canRefreshPrices()) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadPrices(), loadOtcIndex()]);
      storage.markPriceRefresh();
      updateCooldown();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh prices",
      );
    } finally {
      setLoading(false);
    }
  }, [loadPrices, loadOtcIndex, updateCooldown]);

  return {
    items,
    convertibles,
    sbRate,
    priceMap,
    otcTradeableIndex,
    otcLeechIndex,
    loading,
    error,
    canRefresh,
    cooldownRemaining,
    refresh,
  };
}
