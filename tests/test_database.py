"""Tests for SQLite database layer."""

import pytest
from datetime import datetime, timezone
from mh_tools.database import Database
from mh_tools.models import ChestInfo, Drop, Price, NameMapping


class TestDatabaseInit:
    def test_initialize_creates_tables(self, db):
        cursor = db.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row[0] for row in cursor.fetchall()]
        assert "chests" in tables
        assert "drops" in tables
        assert "prices" in tables
        assert "mappings" in tables

    def test_clear_cache(self, db):
        db.upsert_chest(ChestInfo(name="Test", mhct_id=1))
        db.clear_cache()
        assert db.get_chest_by_name("Test") is None


class TestChestCRUD:
    def test_upsert_and_get(self, db):
        chest = ChestInfo(name="Rare Treasure Chest", mhct_id=2905)
        chest_id = db.upsert_chest(chest)
        assert chest_id > 0

        result = db.get_chest_by_name("Rare Treasure Chest")
        assert result is not None
        assert result.mhct_id == 2905
        assert result.id == chest_id

    def test_get_nonexistent_returns_none(self, db):
        assert db.get_chest_by_name("Nonexistent") is None

    def test_upsert_updates_existing(self, db):
        db.upsert_chest(ChestInfo(name="Test", mhct_id=100))
        db.upsert_chest(ChestInfo(name="Test", mhct_id=200))
        result = db.get_chest_by_name("Test")
        assert result.mhct_id == 200


class TestDropCRUD:
    def test_upsert_and_get(self, db):
        chest_id = db.upsert_chest(ChestInfo(name="Test Chest", mhct_id=1))
        drops = [
            Drop(chest_id=chest_id, item_name="Gold", drop_chance=1.0, avg_quantity=5000.0),
            Drop(chest_id=chest_id, item_name="Rare Item", drop_chance=0.1, avg_quantity=1.0),
        ]
        db.upsert_drops(chest_id, drops)

        result = db.get_drops_for_chest(chest_id)
        assert len(result) == 2
        assert result[0].item_name == "Gold"
        assert result[1].drop_chance == 0.1

    def test_get_empty(self, db):
        assert db.get_drops_for_chest(999) == []


class TestPriceCRUD:
    def test_upsert_and_get(self, db):
        now = datetime.now(timezone.utc)
        price = Price(
            item_name="Gold", markethunt_id=10, gold_price=1, sb_price=0.00006, last_updated=now,
        )
        db.upsert_price(price)

        result = db.get_price("Gold")
        assert result is not None
        assert result.gold_price == 1
        assert result.markethunt_id == 10

    def test_get_nonexistent_returns_none(self, db):
        assert db.get_price("Nonexistent") is None

    def test_bulk_upsert_prices(self, db):
        now = datetime.now(timezone.utc)
        prices = [
            Price(item_name="Item A", gold_price=100, last_updated=now),
            Price(item_name="Item B", gold_price=200, last_updated=now),
        ]
        db.bulk_upsert_prices(prices)
        assert db.get_price("Item A").gold_price == 100
        assert db.get_price("Item B").gold_price == 200


class TestMappingCRUD:
    def test_add_and_get(self, db):
        db.add_mapping("SB+", "SUPER|brie+")
        assert db.get_mapping("SB+") == "SUPER|brie+"

    def test_get_nonexistent_returns_none(self, db):
        assert db.get_mapping("Nonexistent") is None

    def test_get_all(self, db):
        db.add_mapping("A", "B")
        db.add_mapping("C", "D")
        mappings = db.get_all_mappings()
        assert len(mappings) == 2
