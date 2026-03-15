"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ChestInfo, MarketItem } from "@/types";
import { MarketHuntService } from "@/lib/services/markethunt-service";
import { mhctService, marketHuntService, storage } from "@/lib/services";

interface MarketDataState {
  items: MarketItem[];
  chests: ChestInfo[];
  sbRate: number;
  priceMap: Map<string, { goldPrice: number | null; sbPrice: number | null }>;
  loading: boolean;
  error: string | null;
  canRefresh: boolean;
  cooldownRemaining: number;
  refresh: () => Promise<void>;
}

export function useMarketData(): MarketDataState {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [chests, setChests] = useState<ChestInfo[]>([]);
  const [sbRate, setSbRate] = useState(0);
  const [priceMap, setPriceMap] = useState<
    Map<string, { goldPrice: number | null; sbPrice: number | null }>
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

  const loadChests = useCallback(async (signal?: AbortSignal) => {
    const chestList = await mhctService.listChests(signal);
    setChests(chestList);
    return chestList;
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
          loadChests(controller.signal),
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
  }, [loadPrices, loadChests, updateCooldown]);

  const refresh = useCallback(async () => {
    if (!storage.canRefreshPrices()) return;
    setLoading(true);
    setError(null);
    try {
      await loadPrices();
      storage.markPriceRefresh();
      updateCooldown();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh prices",
      );
    } finally {
      setLoading(false);
    }
  }, [loadPrices, updateCooldown]);

  return {
    items,
    chests,
    sbRate,
    priceMap,
    loading,
    error,
    canRefresh,
    cooldownRemaining,
    refresh,
  };
}
