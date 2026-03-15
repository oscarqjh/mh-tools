import type { ChestInfo, Drop } from "@/types";
import { httpGet } from "./http-client";

const MHCT_BASE = "https://www.mhct.win";

/** Raw MHCT convertible list item */
interface MhctConvertibleEntry {
  id: number;
  value: string;
}

/** Raw MHCT drop entry */
interface MhctDropEntry {
  item: string;
  single_opens: number;
  times_with_any: number;
  total_quantity_when_any: number;
  min_item_quantity?: number;
  max_item_quantity?: number;
}

export class MhctService {
  /** Fetch all convertible chests from MHCT. */
  async listChests(signal?: AbortSignal): Promise<ChestInfo[]> {
    const raw = await httpGet<MhctConvertibleEntry[]>(
      MHCT_BASE,
      "/searchByItem.php",
      { params: { item_id: "all", item_type: "convertible" }, signal },
    );
    return raw.map((entry) => ({ id: entry.id, name: entry.value }));
  }

  /** Fetch drop statistics for a specific chest. */
  async getDrops(mhctId: number, signal?: AbortSignal): Promise<Drop[]> {
    const raw = await httpGet<MhctDropEntry[]>(
      MHCT_BASE,
      "/searchByItem.php",
      {
        params: { item_id: String(mhctId), item_type: "convertible" },
        signal,
      },
    );

    return raw
      .filter((entry) => entry.single_opens > 0 && entry.times_with_any > 0)
      .map((entry) => ({
        itemName: entry.item,
        dropChance: entry.times_with_any / entry.single_opens,
        avgQuantity: entry.total_quantity_when_any / entry.times_with_any,
        minQuantity: entry.min_item_quantity ?? 0,
        maxQuantity: entry.max_item_quantity ?? 0,
      }));
  }

  /** Filter a chest list by case-insensitive substring match. Pure function. */
  static searchChests(chests: ChestInfo[], query: string): ChestInfo[] {
    if (!query) return chests;
    const lower = query.toLowerCase();
    return chests.filter((c) => c.name.toLowerCase().includes(lower));
  }
}
