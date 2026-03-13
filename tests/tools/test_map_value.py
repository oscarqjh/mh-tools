"""Tests for the Map Value Analyser tool."""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from mh_tools.tools.map_value import MapValueAnalyser
from mh_tools.models import ChestInfo, Drop, Price, AnalysisResult


@pytest.fixture
def mhct():
    return MagicMock()


@pytest.fixture
def markethunt():
    return MagicMock()


@pytest.fixture
def analyser(db, mhct, markethunt):
    return MapValueAnalyser(db=db, mhct=mhct, markethunt=markethunt, price_ttl_seconds=3600)


class TestResolveChest:
    def test_finds_cached_chest(self, analyser):
        """If chest is in DB, don't call MHCT."""
        analyser.db.upsert_chest(ChestInfo(name="Test Chest", mhct_id=100))
        chest = analyser._resolve_chest("Test Chest")
        assert chest.mhct_id == 100
        analyser.mhct.list_convertibles.assert_not_called()

    def test_fetches_from_mhct_when_not_cached(self, analyser):
        """If chest not in DB, fetch from MHCT and cache it."""
        analyser.mhct.search_convertible.return_value = [
            {"id": 200, "name": "Rare Treasure Chest"}
        ]
        analyser.mhct.get_convertible_drops.return_value = [
            {"item_name": "Gold", "drop_chance": 1.0, "avg_quantity": 5000.0},
        ]
        chest = analyser._resolve_chest("Rare Treasure Chest")
        assert chest.mhct_id == 200
        # Should now be cached
        assert analyser.db.get_chest_by_name("Rare Treasure Chest") is not None

    def test_raises_for_unknown_chest(self, analyser):
        analyser.mhct.search_convertible.return_value = []
        with pytest.raises(ValueError, match="not found"):
            analyser._resolve_chest("Nonexistent Chest")


class TestPriceSync:
    def test_uses_cached_fresh_price(self, analyser):
        """Don't refresh if price is fresh."""
        now = datetime.now(timezone.utc)
        analyser.db.upsert_price(
            Price(item_name="Gold", markethunt_id=1, gold_price=1, sb_price=0.00006, last_updated=now)
        )
        price = analyser._get_price("Gold")
        assert price.gold_price == 1
        analyser.markethunt.get_item_price.assert_not_called()

    def test_refreshes_stale_price(self, analyser):
        """Refresh if price is older than TTL."""
        old = datetime(2020, 1, 1, tzinfo=timezone.utc)
        analyser.db.upsert_price(
            Price(item_name="Widget", markethunt_id=50, gold_price=100, sb_price=0.006, last_updated=old)
        )
        analyser.markethunt.get_item_price.return_value = {
            "item_id": 50, "name": "Widget", "gold_price": 200, "sb_price": 0.012,
        }
        price = analyser._get_price("Widget")
        assert price.gold_price == 200

    def test_stale_price_without_markethunt_id(self, analyser):
        """If stale price has no markethunt_id, return stale data without refreshing."""
        old = datetime(2020, 1, 1, tzinfo=timezone.utc)
        analyser.db.upsert_price(
            Price(item_name="OldItem", markethunt_id=None, gold_price=50, sb_price=0.003, last_updated=old)
        )
        price = analyser._get_price("OldItem")
        assert price.gold_price == 50
        analyser.markethunt.get_item_price.assert_not_called()


class TestAnalyse:
    def test_basic_ev_calculation(self, analyser):
        """EV = sum(drop_chance * avg_quantity * gold_price) for each item."""
        # Setup: chest with 2 drops
        chest_id = analyser.db.upsert_chest(ChestInfo(name="Test Chest", mhct_id=100))
        analyser.db.upsert_drops(chest_id, [
            Drop(chest_id=chest_id, item_name="Item A", drop_chance=1.0, avg_quantity=10.0),
            Drop(chest_id=chest_id, item_name="Item B", drop_chance=0.5, avg_quantity=2.0),
        ])
        now = datetime.now(timezone.utc)
        analyser.db.upsert_price(
            Price(item_name="Item A", gold_price=100, sb_price=0.006, last_updated=now)
        )
        analyser.db.upsert_price(
            Price(item_name="Item B", gold_price=1000, sb_price=0.06, last_updated=now)
        )
        # SB rate
        analyser.markethunt.get_sb_rate.return_value = 16155.0

        result = analyser.run(chest_name="Test Chest")

        assert isinstance(result, AnalysisResult)
        # Item A EV: 1.0 * 10.0 * 100 = 1000
        # Item B EV: 0.5 * 2.0 * 1000 = 1000
        # Total: 2000
        assert result.total_ev_gold == pytest.approx(2000.0)
        assert len(result.items) == 2

    def test_after_tax(self, analyser):
        """After-tax EV applies 10% marketplace tax."""
        chest_id = analyser.db.upsert_chest(ChestInfo(name="Tax Chest", mhct_id=101))
        analyser.db.upsert_drops(chest_id, [
            Drop(chest_id=chest_id, item_name="Taxable", drop_chance=1.0, avg_quantity=1.0),
        ])
        now = datetime.now(timezone.utc)
        analyser.db.upsert_price(
            Price(item_name="Taxable", gold_price=1000, sb_price=0.06, last_updated=now)
        )
        analyser.markethunt.get_sb_rate.return_value = 16155.0

        result = analyser.run(chest_name="Tax Chest")

        assert result.total_ev_gold == pytest.approx(1000.0)
        assert result.total_ev_gold_after_tax == pytest.approx(900.0)  # 10% tax

    def test_unmapped_items_in_warnings(self, analyser):
        """Items without prices should appear in warnings."""
        chest_id = analyser.db.upsert_chest(ChestInfo(name="Warn Chest", mhct_id=102))
        analyser.db.upsert_drops(chest_id, [
            Drop(chest_id=chest_id, item_name="Mystery Item", drop_chance=0.5, avg_quantity=1.0),
        ])
        analyser.markethunt.get_sb_rate.return_value = 16155.0

        result = analyser.run(chest_name="Warn Chest")

        assert result.total_ev_gold == 0.0
        assert len(result.warnings) > 0
        assert any("Mystery Item" in w for w in result.warnings)
        assert result.items[0].unmapped is True
