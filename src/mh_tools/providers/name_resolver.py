"""Resolves MHCT item names to MarketHunt prices with mismatch warnings."""

from __future__ import annotations

import logging
from typing import Optional

from mh_tools.database import Database
from mh_tools.models import Price
from mh_tools.providers.markethunt import MarketHuntProvider

logger = logging.getLogger(__name__)


class NameResolver:
    """Resolves MHCT item names to prices via the mappings table."""

    def __init__(self, db: Database, markethunt: MarketHuntProvider):
        self.db = db
        self.markethunt = markethunt
        self._unmapped: set[str] = set()

    def resolve_price(self, mhct_item_name: str) -> Optional[Price]:
        """Look up the price for an MHCT item name.

        Resolution order:
        1. Direct match in prices table (names are identical)
        2. Mapping table -> mapped MarketHunt name -> prices table
        3. If neither works, log WARNING and return None

        Returns Price or None.
        """
        # 1. Direct lookup
        price = self.db.get_price(mhct_item_name)
        if price is not None:
            return price

        # 2. Check mapping table
        mapped_name = self.db.get_mapping(mhct_item_name)
        if mapped_name is not None:
            return self.db.get_price(mapped_name)

        # 3. Unmapped — warn
        self._unmapped.add(mhct_item_name)
        logger.warning(
            "UNMAPPED item: '%s' — no price found in MarketHunt. "
            "Add a mapping with: mh-tools add-mapping --mhct '%s' --markethunt '<correct_name>'",
            mhct_item_name,
            mhct_item_name,
        )
        return None

    def get_unmapped_items(self) -> set[str]:
        """Return the set of MHCT item names that could not be resolved."""
        return self._unmapped.copy()

    def clear_unmapped(self) -> None:
        """Reset the unmapped tracking set."""
        self._unmapped.clear()
