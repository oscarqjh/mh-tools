"""MarketHunt (api.markethunt.win) API provider."""

from __future__ import annotations

import httpx

MARKETHUNT_BASE = "https://api.markethunt.win"


class MarketHuntProvider:
    """Client for MarketHunt's REST API."""

    def __init__(self, client: httpx.Client | None = None):
        self.client = client or httpx.Client(timeout=30)

    def get_all_items(self) -> list[dict]:
        """Fetch all marketplace items with latest prices.

        Returns list of dicts with keys:
            item_id, name, gold_price, sb_price, volume, currently_tradeable
        """
        resp = self.client.get(f"{MARKETHUNT_BASE}/items")
        resp.raise_for_status()
        raw = resp.json()
        return [self._flatten_item(entry) for entry in raw]

    def search_items(self, query: str) -> list[dict]:
        """Search items by name or acronym.

        Returns same shape as get_all_items.
        """
        resp = self.client.get(
            f"{MARKETHUNT_BASE}/items/search",
            params={"query": query},
        )
        resp.raise_for_status()
        raw = resp.json()
        return [self._flatten_item(entry) for entry in raw]

    def get_item_price(self, item_id: int) -> dict:
        """Fetch price history for a specific item. Returns latest price.

        Returns dict with keys: item_id, name, gold_price, sb_price
        """
        resp = self.client.get(f"{MARKETHUNT_BASE}/items/{item_id}")
        resp.raise_for_status()
        data = resp.json()
        info = data["item_info"]
        # Sort by date descending to ensure we get the most recent entry
        market_data = sorted(
            data.get("market_data", []),
            key=lambda x: x.get("date", ""),
            reverse=True,
        )
        latest = market_data[0] if market_data else {}
        return {
            "item_id": info["item_id"],
            "name": info["name"],
            "gold_price": latest.get("price"),
            "sb_price": latest.get("sb_price"),
        }

    def get_sb_rate(self) -> float:
        """Derive the current SB/Gold exchange rate.

        Looks up SUPER|brie+ (the canonical SB item) by searching MarketHunt.
        Returns gold per 1 SUPER|brie+.
        """
        sb_items = self.search_items("SUPER|brie+")
        for item in sb_items:
            if item["name"] == "SUPER|brie+" and item["sb_price"] and item["gold_price"]:
                return item["gold_price"] / item["sb_price"]

        # Fallback: use any item with a valid sb_price
        items = self.get_all_items()
        for item in items:
            if item["sb_price"] and item["sb_price"] > 0 and item["gold_price"]:
                return item["gold_price"] / item["sb_price"]
        raise ValueError("Could not derive SB rate: no items with valid prices found")

    @staticmethod
    def _flatten_item(entry: dict) -> dict:
        """Flatten MarketHunt's nested response into a flat dict."""
        info = entry.get("item_info", {})
        market = entry.get("latest_market_data") or {}
        return {
            "item_id": info.get("item_id"),
            "name": info.get("name"),
            "currently_tradeable": info.get("currently_tradeable"),
            "gold_price": market.get("price"),
            "sb_price": market.get("sb_price"),
            "volume": market.get("volume"),
        }
