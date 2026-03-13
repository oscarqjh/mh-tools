"""Pydantic data models for mh_tools."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, computed_field


class ChestInfo(BaseModel):
    """A convertible/treasure chest."""

    id: Optional[int] = None
    name: str
    mhct_id: int


class Drop(BaseModel):
    """A single drop entry from a chest."""

    chest_id: int
    item_name: str
    drop_chance: float  # times_with_any / single_opens (0.0 to 1.0)
    avg_quantity: float  # total_items / times_with_any (avg when present)

    @computed_field
    @property
    def expected_quantity(self) -> float:
        """Expected quantity per single open."""
        return self.drop_chance * self.avg_quantity


class Price(BaseModel):
    """Market price for an item."""

    item_name: str
    markethunt_id: Optional[int] = None
    gold_price: Optional[int] = None
    sb_price: Optional[float] = None
    last_updated: Optional[datetime] = None

    def is_stale(self, ttl_seconds: int = 3600) -> bool:
        """Check if this price is older than ttl_seconds."""
        if self.last_updated is None:
            return True
        age = (datetime.now(timezone.utc) - self.last_updated).total_seconds()
        return age > ttl_seconds


class NameMapping(BaseModel):
    """Maps an MHCT item name to a MarketHunt item name."""

    mhct_name: str
    markethunt_name: str


class ItemEV(BaseModel):
    """Expected value for a single item in analysis output."""

    item_name: str
    drop_chance: float
    avg_quantity: float
    gold_price: Optional[int] = None
    sb_price: Optional[float] = None
    ev_gold: float
    ev_sb: float
    unmapped: bool = False
    price_stale: bool = False


class AnalysisResult(BaseModel):
    """Full analysis result for a chest."""

    chest_name: str
    items: list[ItemEV]
    total_ev_gold: float
    total_ev_sb: float
    total_ev_gold_after_tax: float
    total_ev_sb_after_tax: float
    sb_rate: float
    warnings: list[str]
