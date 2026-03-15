/** A convertible chest from MHCT */
export interface ChestInfo {
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
}

/** Full analysis result for a chest */
export interface AnalysisResult {
  chestName: string;
  items: ItemEV[];
  totalEvGold: number;
  totalEvSB: number;
  totalEvGoldAfterTax: number;
  totalEvSBAfterTax: number;
  sbRate: number;
  warnings: string[];
}

/** localStorage schema */
export interface UserSettings {
  theme: string;
  chestAnalyserConfigs: ChestAnalyserConfigs;
}

export interface ChestAnalyserConfigs {
  favorites: string[];
  lastPriceRefresh: string | null;
}

/** Theme token definition */
export interface ThemeTokens {
  id: string;
  name: string;
  tokens: Record<string, string>;
}
