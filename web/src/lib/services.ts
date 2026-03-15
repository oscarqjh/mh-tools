import { MhctService } from "@/lib/services/mhct-service";
import { MarketHuntService } from "@/lib/services/markethunt-service";
import { StorageService } from "@/lib/storage";

/** Singleton service instances. Import these instead of creating new instances. */
export const mhctService = new MhctService();
export const marketHuntService = new MarketHuntService();
export const storage = new StorageService();
