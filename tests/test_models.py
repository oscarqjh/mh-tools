"""Tests for Pydantic data models."""

from datetime import datetime, timezone
from mh_tools.models import ChestInfo, Drop, Price, NameMapping, ItemEV, AnalysisResult


class TestChestInfo:
    def test_create(self):
        chest = ChestInfo(name="Rare Treasure Chest", mhct_id=2905)
        assert chest.name == "Rare Treasure Chest"
        assert chest.mhct_id == 2905
        assert chest.id is None

    def test_with_id(self):
        chest = ChestInfo(id=1, name="Rare Treasure Chest", mhct_id=2905)
        assert chest.id == 1


class TestDrop:
    def test_create(self):
        drop = Drop(
            chest_id=1,
            item_name="Gold",
            drop_chance=1.0,
            avg_quantity=5000.0,
        )
        assert drop.drop_chance == 1.0
        assert drop.avg_quantity == 5000.0

    def test_expected_quantity(self):
        drop = Drop(chest_id=1, item_name="Rare Item", drop_chance=0.25, avg_quantity=2.0)
        assert drop.expected_quantity == 0.5


class TestPrice:
    def test_create_with_defaults(self):
        price = Price(item_name="Gold")
        assert price.gold_price is None
        assert price.sb_price is None
        assert price.last_updated is None
        assert price.markethunt_id is None

    def test_is_stale_when_no_timestamp(self):
        price = Price(item_name="Gold")
        assert price.is_stale(ttl_seconds=3600) is True

    def test_is_stale_when_old(self):
        old_time = datetime(2020, 1, 1, tzinfo=timezone.utc)
        price = Price(item_name="Gold", gold_price=100, last_updated=old_time)
        assert price.is_stale(ttl_seconds=3600) is True

    def test_is_not_stale_when_fresh(self):
        now = datetime.now(timezone.utc)
        price = Price(item_name="Gold", gold_price=100, last_updated=now)
        assert price.is_stale(ttl_seconds=3600) is False


class TestNameMapping:
    def test_create(self):
        m = NameMapping(mhct_name="SB+", markethunt_name="SUPER|brie+")
        assert m.mhct_name == "SB+"
        assert m.markethunt_name == "SUPER|brie+"


class TestItemEV:
    def test_ev_calculation(self):
        item = ItemEV(
            item_name="Gold",
            drop_chance=1.0,
            avg_quantity=5000.0,
            gold_price=1,
            ev_gold=5000.0,
            ev_sb=0.31,
        )
        assert item.ev_gold == 5000.0


class TestAnalysisResult:
    def test_create(self):
        result = AnalysisResult(
            chest_name="Test Chest",
            items=[],
            total_ev_gold=0.0,
            total_ev_sb=0.0,
            total_ev_gold_after_tax=0.0,
            total_ev_sb_after_tax=0.0,
            sb_rate=16155.0,
            warnings=[],
        )
        assert result.chest_name == "Test Chest"
        assert result.warnings == []
