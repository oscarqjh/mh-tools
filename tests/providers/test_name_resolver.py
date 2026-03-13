"""Tests for name resolution between MHCT and MarketHunt."""

import logging
import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone

from mh_tools.providers.name_resolver import NameResolver
from mh_tools.models import Price


@pytest.fixture
def resolver(db):
    """NameResolver with a real DB and mock MarketHunt."""
    mock_markethunt = MagicMock()
    return NameResolver(db=db, markethunt=mock_markethunt)


class TestResolvePrice:
    def test_exact_match_in_prices_table(self, resolver):
        """If item_name exists in prices table, return it directly."""
        now = datetime.now(timezone.utc)
        resolver.db.upsert_price(
            Price(item_name="Gold", gold_price=1, sb_price=0.00006, last_updated=now)
        )
        price = resolver.resolve_price("Gold")
        assert price is not None
        assert price.gold_price == 1

    def test_uses_mapping_table(self, resolver):
        """If MHCT name differs, use mapping to find MarketHunt name."""
        now = datetime.now(timezone.utc)
        resolver.db.add_mapping("SB+", "SUPER|brie+")
        resolver.db.upsert_price(
            Price(item_name="SUPER|brie+", gold_price=16155, last_updated=now)
        )
        price = resolver.resolve_price("SB+")
        assert price is not None
        assert price.item_name == "SUPER|brie+"
        assert price.gold_price == 16155

    def test_unmapped_name_returns_none_and_warns(self, resolver, caplog):
        """If no match and no mapping, return None and log a warning."""
        with caplog.at_level(logging.WARNING):
            price = resolver.resolve_price("Nonexistent Widget XYZ")
        assert price is None
        assert "UNMAPPED" in caplog.text
        assert "Nonexistent Widget XYZ" in caplog.text

    def test_no_warning_for_gold(self, resolver, caplog):
        """Gold is a universal item and should never warn."""
        now = datetime.now(timezone.utc)
        resolver.db.upsert_price(
            Price(item_name="Gold", gold_price=1, last_updated=now)
        )
        with caplog.at_level(logging.WARNING):
            resolver.resolve_price("Gold")
        assert "UNMAPPED" not in caplog.text


class TestCollectUnmapped:
    def test_tracks_unmapped_names(self, resolver):
        """Unmapped names are collected for user review."""
        resolver.resolve_price("Unknown Item A")
        resolver.resolve_price("Unknown Item B")
        resolver.resolve_price("Unknown Item A")  # duplicate
        assert resolver.get_unmapped_items() == {"Unknown Item A", "Unknown Item B"}
