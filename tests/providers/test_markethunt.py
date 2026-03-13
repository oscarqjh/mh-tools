"""Tests for MarketHunt provider."""

import httpx
import respx
import pytest
from mh_tools.providers.markethunt import MarketHuntProvider

MH_BASE = "https://api.markethunt.win"

SAMPLE_ITEMS = [
    {
        "item_info": {"item_id": 114, "name": "SUPER|brie+", "currently_tradeable": True},
        "latest_market_data": {"date": "2026-03-12", "price": 16155, "sb_price": 1.0, "volume": 5000},
    },
    {
        "item_info": {"item_id": 200, "name": "Rare Map Dust", "currently_tradeable": True},
        "latest_market_data": {"date": "2026-03-12", "price": 14100000, "sb_price": 872.89, "volume": 1},
    },
]


class TestGetAllItems:
    @respx.mock
    def test_returns_parsed_items(self):
        respx.get(f"{MH_BASE}/items").mock(
            return_value=httpx.Response(200, json=SAMPLE_ITEMS)
        )
        provider = MarketHuntProvider()
        result = provider.get_all_items()
        assert len(result) == 2
        assert result[0]["name"] == "SUPER|brie+"
        assert result[0]["item_id"] == 114
        assert result[0]["gold_price"] == 16155
        assert result[0]["sb_price"] == 1.0


class TestSearchItems:
    @respx.mock
    def test_search(self):
        respx.get(f"{MH_BASE}/items/search").mock(
            return_value=httpx.Response(200, json=[SAMPLE_ITEMS[0]])
        )
        provider = MarketHuntProvider()
        result = provider.search_items("SUPER")
        assert len(result) == 1
        assert result[0]["name"] == "SUPER|brie+"


class TestGetItemPrice:
    @respx.mock
    def test_get_latest_price(self):
        respx.get(f"{MH_BASE}/items/114").mock(
            return_value=httpx.Response(200, json={
                "item_info": {"item_id": 114, "name": "SUPER|brie+", "currently_tradeable": True},
                "market_data": [
                    {"date": "2026-03-12", "price": 16155, "sb_price": 1.0, "volume": 5000},
                    {"date": "2026-03-11", "price": 16100, "sb_price": 1.0, "volume": 4800},
                ],
            })
        )
        provider = MarketHuntProvider()
        result = provider.get_item_price(114)
        assert result["name"] == "SUPER|brie+"
        assert result["gold_price"] == 16155  # most recent date


class TestGetSBRate:
    @respx.mock
    def test_derives_rate_from_sb_item(self):
        respx.get(f"{MH_BASE}/items/search").mock(
            return_value=httpx.Response(200, json=[SAMPLE_ITEMS[0]])
        )
        provider = MarketHuntProvider()
        rate = provider.get_sb_rate()
        # rate = price / sb_price for SUPER|brie+
        # 16155 / 1.0 = 16155.0
        assert rate == pytest.approx(16155.0, rel=0.01)

    @respx.mock
    def test_falls_back_to_all_items(self):
        # search returns no matching item
        respx.get(f"{MH_BASE}/items/search").mock(
            return_value=httpx.Response(200, json=[])
        )
        respx.get(f"{MH_BASE}/items").mock(
            return_value=httpx.Response(200, json=SAMPLE_ITEMS)
        )
        provider = MarketHuntProvider()
        rate = provider.get_sb_rate()
        assert rate == pytest.approx(16155.0, rel=0.01)
