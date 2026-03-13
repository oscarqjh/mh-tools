"""Tests for MHCT provider."""

import httpx
import respx
import pytest
from mh_tools.providers.mhct import MHCTProvider

MHCT_BASE = "https://www.mhct.win"


class TestListConvertibles:
    @respx.mock
    def test_returns_list(self):
        respx.get(f"{MHCT_BASE}/searchByItem.php").mock(
            return_value=httpx.Response(200, json=[
                {"id": 100, "value": "Rare Treasure Chest"},
                {"id": 200, "value": "Arduous Treasure Chest"},
            ])
        )
        provider = MHCTProvider()
        result = provider.list_convertibles()
        assert len(result) == 2
        assert result[0] == {"id": 100, "name": "Rare Treasure Chest"}

    @respx.mock
    def test_empty_response(self):
        respx.get(f"{MHCT_BASE}/searchByItem.php").mock(
            return_value=httpx.Response(200, json=[])
        )
        provider = MHCTProvider()
        assert provider.list_convertibles() == []


class TestGetConvertibleDrops:
    @respx.mock
    def test_returns_parsed_drops(self):
        respx.get(f"{MHCT_BASE}/searchByItem.php").mock(
            return_value=httpx.Response(200, json=[
                {
                    "item": "Gold",
                    "total": 5000,
                    "single_opens": 4500,
                    "total_items": 22500000,
                    "times_with_any": 4500,
                    "min_item_quantity": 1000,
                    "max_item_quantity": 10000,
                },
                {
                    "item": "Rare Widget",
                    "total": 5000,
                    "single_opens": 4500,
                    "total_items": 450,
                    "times_with_any": 450,
                    "min_item_quantity": 1,
                    "max_item_quantity": 1,
                },
            ])
        )
        provider = MHCTProvider()
        drops = provider.get_convertible_drops(mhct_id=100)

        assert len(drops) == 2

        gold = drops[0]
        assert gold["item_name"] == "Gold"
        assert gold["drop_chance"] == 4500 / 4500  # 1.0
        assert gold["avg_quantity"] == 22500000 / 4500  # 5000.0

        rare = drops[1]
        assert rare["item_name"] == "Rare Widget"
        assert rare["drop_chance"] == 450 / 4500  # 0.1
        assert rare["avg_quantity"] == 450 / 450  # 1.0

    @respx.mock
    def test_skips_zero_single_opens(self):
        """If single_opens is 0, skip the entry to avoid division by zero."""
        respx.get(f"{MHCT_BASE}/searchByItem.php").mock(
            return_value=httpx.Response(200, json=[
                {"item": "Broken", "total": 0, "single_opens": 0, "total_items": 0, "times_with_any": 0, "min_item_quantity": 0, "max_item_quantity": 0},
            ])
        )
        provider = MHCTProvider()
        assert provider.get_convertible_drops(mhct_id=100) == []


class TestSearchConvertible:
    @respx.mock
    def test_find_by_name(self):
        respx.get(f"{MHCT_BASE}/searchByItem.php").mock(
            return_value=httpx.Response(200, json=[
                {"id": 100, "value": "Rare Treasure Chest"},
                {"id": 200, "value": "Relic Hunter Treasure Chest"},
            ])
        )
        provider = MHCTProvider()
        result = provider.search_convertible("Relic Hunter")
        assert len(result) == 1
        assert result[0]["id"] == 200

    @respx.mock
    def test_case_insensitive(self):
        respx.get(f"{MHCT_BASE}/searchByItem.php").mock(
            return_value=httpx.Response(200, json=[
                {"id": 100, "value": "Rare Treasure Chest"},
            ])
        )
        provider = MHCTProvider()
        result = provider.search_convertible("rare treasure")
        assert len(result) == 1
