import type { MarketItem, OtcIndexEntry, OtcListing } from "@/types";
import { httpGet } from "./http-client";

const MARKETHUNT_BASE = "https://api.markethunt.win";

/** Raw MarketHunt item response */
interface MarketHuntEntry {
  item_info: {
    item_id: number;
    name: string;
    currently_tradeable: boolean;
  };
  latest_market_data: {
    price: number | null;
    sb_price: number | null;
    volume: number | null;
  } | null;
}

/** Raw OTC index entry from /otc/listings */
interface RawOtcIndexEntry {
  item: {
    item_id: number;
    name: string;
    currently_tradeable: boolean;
  };
  listing_type: number;
  listing_type_description: string;
}

/** Raw OTC listing entry from /otc/listings/{typeId}/{itemId} */
interface RawOtcListing {
  item_id: number;
  sb_price: number;
  listing_type: number;
  is_selling: boolean;
  amount: number | null;
  timestamp: number;
}

export class MarketHuntService {
  /** Fetch all marketplace items with latest prices. */
  async getAllItems(signal?: AbortSignal): Promise<MarketItem[]> {
    const raw = await httpGet<MarketHuntEntry[]>(
      MARKETHUNT_BASE,
      "/items",
      { signal },
    );
    return raw.map(MarketHuntService.flattenItem);
  }

  /** Derive the SB rate from a list of market items. Pure function. */
  static getSBRate(items: MarketItem[]): number {
    const sb = items.find(
      (item) =>
        item.name === "SUPER|brie+" &&
        item.goldPrice != null &&
        item.sbPrice != null &&
        item.sbPrice > 0,
    );
    if (sb) {
      return sb.goldPrice! / sb.sbPrice!;
    }
    throw new Error(
      "Could not derive SB rate: SUPER|brie+ not found or has no price",
    );
  }

  /** Build a price lookup map keyed by item name. Pure function. */
  static buildPriceMap(
    items: MarketItem[],
  ): Map<string, { goldPrice: number | null; sbPrice: number | null }> {
    const map = new Map<
      string,
      { goldPrice: number | null; sbPrice: number | null }
    >();
    for (const item of items) {
      map.set(item.name, {
        goldPrice: item.goldPrice,
        sbPrice: item.sbPrice,
      });
    }
    return map;
  }

  /** Fetch the OTC listings index (all tracked items). */
  async getOtcIndex(signal?: AbortSignal): Promise<OtcIndexEntry[]> {
    const raw = await httpGet<RawOtcIndexEntry[]>(
      MARKETHUNT_BASE,
      "/otc/listings",
      { signal },
    );
    return raw.map((entry) => ({
      itemId: entry.item.item_id,
      itemName: entry.item.name,
      listingType: entry.listing_type,
      listingTypeDescription: entry.listing_type_description,
    }));
  }

  /** Fetch historical OTC listings for a specific item and type. */
  async getOtcListings(
    typeId: number,
    itemId: number,
    signal?: AbortSignal,
  ): Promise<OtcListing[]> {
    const raw = await httpGet<RawOtcListing[]>(
      MARKETHUNT_BASE,
      `/otc/listings/${typeId}/${itemId}`,
      { signal },
    );
    return raw.map((entry) => ({
      itemId: entry.item_id,
      sbPrice: entry.sb_price,
      listingType: entry.listing_type,
      isSelling: entry.is_selling,
      amount: entry.amount,
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Build a lookup of tradeable items (type 5) from the OTC index.
   * Returns a map of item name → item ID for items with Discord OTC data.
   */
  static buildOtcTradeableIndex(
    index: OtcIndexEntry[],
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const entry of index) {
      if (entry.listingType === 5) {
        map.set(entry.itemName, entry.itemId);
      }
    }
    return map;
  }

  /**
   * Build a lookup of leech items (type 4) from the OTC index.
   * Returns a map of convertible name → item ID.
   * Leech listing names are the exact convertible names in the OTC API.
   */
  static buildOtcLeechIndex(
    index: OtcIndexEntry[],
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const entry of index) {
      if (entry.listingType === 4) {
        map.set(entry.itemName, entry.itemId);
      }
    }
    return map;
  }

  /**
   * Derive the latest Discord price from a list of OTC listings.
   * Uses the most recent listing's SB price.
   */
  static deriveLatestOtcPrice(listings: OtcListing[]): number | null {
    if (listings.length === 0) return null;
    const sorted = [...listings].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].sbPrice;
  }

  /**
   * Fetch Discord OTC prices for a set of item names.
   * Only fetches items that exist in the tradeable OTC index.
   * Returns a map of item name → latest SB price.
   */
  async fetchOtcPricesForItems(
    itemNames: string[],
    otcTradeableIndex: Map<string, number>,
    signal?: AbortSignal,
  ): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    const fetchPromises: Promise<void>[] = [];

    for (const name of itemNames) {
      const itemId = otcTradeableIndex.get(name);
      if (itemId == null) continue;

      fetchPromises.push(
        this.getOtcListings(5, itemId, signal)
          .then((listings) => {
            const price = MarketHuntService.deriveLatestOtcPrice(listings);
            if (price != null) {
              priceMap.set(name, price);
            }
          })
          .catch(() => {
            // Silently skip — OTC data is best-effort
          }),
      );
    }

    await Promise.all(fetchPromises);
    return priceMap;
  }

  /** Flatten a raw MarketHunt response entry into our MarketItem type. */
  private static flattenItem(entry: MarketHuntEntry): MarketItem {
    const info = entry.item_info;
    const market = entry.latest_market_data;
    return {
      itemId: info.item_id,
      name: info.name,
      currentlyTradeable: info.currently_tradeable,
      goldPrice: market?.price ?? null,
      sbPrice: market?.sb_price ?? null,
      volume: market?.volume ?? null,
    };
  }
}
