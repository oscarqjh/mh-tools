import type { ConvertibleInfo, Drop } from "@/types";
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
  /** Fetch all convertibles from MHCT. */
  async listConvertibles(signal?: AbortSignal): Promise<ConvertibleInfo[]> {
    const raw = await httpGet<MhctConvertibleEntry[]>(
      MHCT_BASE,
      "/searchByItem.php",
      { params: { item_id: "all", item_type: "convertible" }, signal },
    );
    return raw.map((entry) => ({ id: entry.id, name: entry.value }));
  }

  /** Fetch drop statistics for a specific convertible. */
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

  /** Filter a convertible list by case-insensitive substring match. Pure function. */
  static searchConvertibles(convertibles: ConvertibleInfo[], query: string): ConvertibleInfo[] {
    if (!query) return convertibles;
    const lower = query.toLowerCase();
    return convertibles.filter((c) => c.name.toLowerCase().includes(lower));
  }
}
