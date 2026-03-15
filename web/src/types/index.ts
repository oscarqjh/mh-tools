/** A convertible item from MHCT */
export interface ConvertibleInfo {
  id: number;
  name: string;
}

/** Raw drop entry from MHCT */
export interface Drop {
  itemName: string;
  dropChance: number;
  avgQuantity: number;
  minQuantity: number;
  maxQuantity: number;
}

/** Market price for an item from MarketHunt */
export interface MarketItem {
  itemId: number;
  name: string;
  goldPrice: number | null;
  sbPrice: number | null;
  volume: number | null;
  currentlyTradeable: boolean;
}

/** OTC listing index entry from /otc/listings */
export interface OtcIndexEntry {
  itemId: number;
  itemName: string;
  listingType: number;
  listingTypeDescription: string;
}

/** Individual OTC listing from /otc/listings/{typeId}/{itemId} */
export interface OtcListing {
  itemId: number;
  sbPrice: number;
  listingType: number;
  isSelling: boolean;
  amount: number | null;
  timestamp: number;
}

/** EV calculation result for a single item */
export interface ItemEV {
  itemName: string;
  dropChance: number;
  avgQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  goldPrice: number | null;
  sbPrice: number | null;
  evGold: number;
  evSB: number;
  unmapped: boolean;
  nonTradeable: boolean;
  discordSbPrice: number | null;
  discordEvSB: number;
}

/** Full analysis result for a convertible */
export interface AnalysisResult {
  convertibleName: string;
  items: ItemEV[];
  totalEvGold: number;
  totalEvSB: number;
  totalEvGoldAfterTax: number;
  totalEvSBAfterTax: number;
  sbRate: number;
  warnings: string[];
  /** Discord EV for items that have OTC prices (SB) */
  discordCoveredEvSB: number;
  /** Marketplace EV for those same items (SB), for comparison */
  marketCoveredEvSB: number;
  /** Number of tradeable items with Discord OTC prices */
  discordItemCount: number;
  /** Discord leech cost for this convertible in SB (null if not tracked) */
  leechCostSB: number | null;
}

/** localStorage schema */
export interface UserSettings {
  theme: string;
  analyserConfigs: AnalyserConfigs;
}

export interface AnalyserConfigs {
  favorites: string[];
  lastPriceRefresh: string | null;
}

/** Theme token definition */
export interface ThemeTokens {
  id: string;
  name: string;
  tokens: Record<string, string>;
}
