"""Map Value Analyser — calculates expected value of treasure chests."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from mh_tools.database import Database
from mh_tools.models import AnalysisResult, ChestInfo, Drop, ItemEV, Price
from mh_tools.providers.markethunt import MarketHuntProvider
from mh_tools.providers.mhct import MHCTProvider
from mh_tools.providers.name_resolver import NameResolver
from mh_tools.tools.base import BaseTool

logger = logging.getLogger(__name__)

MARKETPLACE_TAX = 0.10

# Gold is the base currency — 1 Gold = 1 Gold value
GOLD_ITEM_NAME = "Gold"


class MapValueAnalyser(BaseTool):
    """Calculates the expected gold/SB value of opening a treasure chest."""

    name = "map-analyser"
    description = "Analyse the expected value of a treasure chest"

    def __init__(
        self,
        db: Database,
        mhct: MHCTProvider,
        markethunt: MarketHuntProvider,
        price_ttl_seconds: int = 3600,
    ):
        super().__init__(db)
        self.mhct = mhct
        self.markethunt = markethunt
        self.price_ttl = price_ttl_seconds
        self.name_resolver = NameResolver(db=db, markethunt=markethunt)

    def run(self, *, chest_name: str) -> AnalysisResult:
        """Run the analysis for a given chest name."""
        # 1. Resolve chest -> get drops
        chest = self._resolve_chest(chest_name)
        drops = self.db.get_drops_for_chest(chest.id)

        # 2. Get SB rate
        sb_rate = self.markethunt.get_sb_rate()

        # 3. Calculate EV per item
        items: list[ItemEV] = []
        warnings: list[str] = []
        total_ev_gold = 0.0
        total_ev_sb = 0.0

        for drop in drops:
            # Gold is base currency: 1 Gold = 1 Gold
            if drop.item_name == GOLD_ITEM_NAME:
                ev_gold = drop.drop_chance * drop.avg_quantity
                ev_sb = ev_gold / sb_rate if sb_rate > 0 else 0.0
                items.append(ItemEV(
                    item_name=drop.item_name,
                    drop_chance=drop.drop_chance,
                    avg_quantity=drop.avg_quantity,
                    gold_price=1,
                    sb_price=1.0 / sb_rate if sb_rate > 0 else 0.0,
                    ev_gold=ev_gold,
                    ev_sb=ev_sb,
                ))
                total_ev_gold += ev_gold
                total_ev_sb += ev_sb
                continue

            # Non-tradeable items: skip without warning
            if self.db.is_non_tradeable(drop.item_name):
                items.append(ItemEV(
                    item_name=drop.item_name,
                    drop_chance=drop.drop_chance,
                    avg_quantity=drop.avg_quantity,
                    gold_price=None,
                    sb_price=None,
                    ev_gold=0.0,
                    ev_sb=0.0,
                    non_tradeable=True,
                ))
                continue

            price = self._get_price(drop.item_name)

            if price is None or price.gold_price is None:
                # Unmapped or unpriced
                items.append(ItemEV(
                    item_name=drop.item_name,
                    drop_chance=drop.drop_chance,
                    avg_quantity=drop.avg_quantity,
                    gold_price=None,
                    sb_price=None,
                    ev_gold=0.0,
                    ev_sb=0.0,
                    unmapped=True,
                ))
                warnings.append(f"No price for '{drop.item_name}' -- skipped in EV calculation")
                continue

            ev_gold = drop.drop_chance * drop.avg_quantity * price.gold_price
            ev_sb = ev_gold / sb_rate if sb_rate > 0 else 0.0
            is_stale = price.is_stale(self.price_ttl)

            if is_stale:
                warnings.append(f"Price for '{drop.item_name}' is stale (older than {self.price_ttl}s)")

            items.append(ItemEV(
                item_name=drop.item_name,
                drop_chance=drop.drop_chance,
                avg_quantity=drop.avg_quantity,
                gold_price=price.gold_price,
                sb_price=price.sb_price,
                ev_gold=ev_gold,
                ev_sb=ev_sb,
                price_stale=is_stale,
            ))
            total_ev_gold += ev_gold
            total_ev_sb += ev_sb

        return AnalysisResult(
            chest_name=chest.name,
            items=items,
            total_ev_gold=total_ev_gold,
            total_ev_sb=total_ev_sb,
            total_ev_gold_after_tax=total_ev_gold * (1 - MARKETPLACE_TAX),
            total_ev_sb_after_tax=total_ev_sb * (1 - MARKETPLACE_TAX),
            sb_rate=sb_rate,
            warnings=warnings,
        )

    def _resolve_chest(self, name: str) -> ChestInfo:
        """Find chest in DB or fetch from MHCT."""
        cached = self.db.get_chest_by_name(name)
        if cached is not None:
            return cached

        # Search MHCT
        matches = self.mhct.search_convertible(name)
        if not matches:
            raise ValueError(f"Chest '{name}' not found on MHCT")

        # Use first match
        match = matches[0]
        chest = ChestInfo(name=match["name"], mhct_id=match["id"])
        chest_id = self.db.upsert_chest(chest)
        chest = ChestInfo(id=chest_id, name=match["name"], mhct_id=match["id"])

        # Fetch and cache drops
        raw_drops = self.mhct.get_convertible_drops(match["id"])
        drops = [
            Drop(
                chest_id=chest_id,
                item_name=d["item_name"],
                drop_chance=d["drop_chance"],
                avg_quantity=d["avg_quantity"],
            )
            for d in raw_drops
        ]
        self.db.upsert_drops(chest_id, drops)

        return chest

    def _get_price(self, mhct_item_name: str) -> Optional[Price]:
        """Resolve price for an MHCT item name, refreshing if stale."""
        price = self.name_resolver.resolve_price(mhct_item_name)

        if price is None:
            return None

        if price.is_stale(self.price_ttl) and price.markethunt_id:
            # Refresh from MarketHunt
            try:
                fresh = self.markethunt.get_item_price(price.markethunt_id)
                updated = Price(
                    item_name=price.item_name,
                    markethunt_id=price.markethunt_id,
                    gold_price=fresh.get("gold_price"),
                    sb_price=fresh.get("sb_price"),
                    last_updated=datetime.now(timezone.utc),
                )
                self.db.upsert_price(updated)
                return updated
            except Exception:
                logger.warning("Failed to refresh price for '%s', using stale data", mhct_item_name)

        return price
