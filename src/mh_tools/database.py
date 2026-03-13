"""SQLite database wrapper for mh_tools."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from importlib import resources
from pathlib import Path
from typing import Optional

from mh_tools.models import ChestInfo, Drop, NameMapping, Price


class Database:
    """SQLite database for caching MHCT and MarketHunt data."""

    def __init__(self, db_path: str = "./data/mh_tools.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")

    def initialize(self) -> None:
        """Create tables if they don't already exist."""
        schema = resources.files("mh_tools").joinpath("schema.sql").read_text()
        self.conn.executescript(schema)

    def clear_cache(self) -> None:
        """Delete all cached data from all tables."""
        for table in ("drops", "chests", "prices", "mappings"):
            self.conn.execute(f"DELETE FROM {table}")
        self.conn.commit()

    # --- Chests ---

    def upsert_chest(self, chest: ChestInfo) -> int:
        """Insert or update a chest. Returns the row id."""
        self.conn.execute(
            "INSERT INTO chests (name, mhct_id) VALUES (?, ?) "
            "ON CONFLICT(name) DO UPDATE SET mhct_id=excluded.mhct_id",
            (chest.name, chest.mhct_id),
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT id FROM chests WHERE name = ?", (chest.name,)
        ).fetchone()
        return row["id"]

    def get_chest_by_name(self, name: str) -> Optional[ChestInfo]:
        """Look up a chest by name. Returns None if not found."""
        row = self.conn.execute(
            "SELECT id, name, mhct_id FROM chests WHERE name = ?", (name,)
        ).fetchone()
        if row is None:
            return None
        return ChestInfo(id=row["id"], name=row["name"], mhct_id=row["mhct_id"])

    # --- Drops ---

    def upsert_drops(self, chest_id: int, drops: list[Drop]) -> None:
        """Replace all drops for a chest."""
        self.conn.execute("DELETE FROM drops WHERE chest_id = ?", (chest_id,))
        self.conn.executemany(
            "INSERT INTO drops (chest_id, item_name, drop_chance, avg_quantity) "
            "VALUES (?, ?, ?, ?)",
            [(d.chest_id, d.item_name, d.drop_chance, d.avg_quantity) for d in drops],
        )
        self.conn.commit()

    def get_drops_for_chest(self, chest_id: int) -> list[Drop]:
        """Get all drops for a chest."""
        rows = self.conn.execute(
            "SELECT chest_id, item_name, drop_chance, avg_quantity "
            "FROM drops WHERE chest_id = ? ORDER BY drop_chance DESC",
            (chest_id,),
        ).fetchall()
        return [
            Drop(
                chest_id=row["chest_id"],
                item_name=row["item_name"],
                drop_chance=row["drop_chance"],
                avg_quantity=row["avg_quantity"],
            )
            for row in rows
        ]

    # --- Prices ---

    def upsert_price(self, price: Price) -> None:
        """Insert or update a price entry."""
        ts = price.last_updated.isoformat() if price.last_updated else None
        self.conn.execute(
            "INSERT INTO prices (item_name, markethunt_id, gold_price, sb_price, last_updated) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(item_name) DO UPDATE SET "
            "markethunt_id=excluded.markethunt_id, gold_price=excluded.gold_price, "
            "sb_price=excluded.sb_price, last_updated=excluded.last_updated",
            (price.item_name, price.markethunt_id, price.gold_price, price.sb_price, ts),
        )
        self.conn.commit()

    def bulk_upsert_prices(self, prices: list[Price]) -> None:
        """Insert or update multiple prices in a single transaction."""
        data = []
        for p in prices:
            ts = p.last_updated.isoformat() if p.last_updated else None
            data.append((p.item_name, p.markethunt_id, p.gold_price, p.sb_price, ts))
        self.conn.executemany(
            "INSERT INTO prices (item_name, markethunt_id, gold_price, sb_price, last_updated) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(item_name) DO UPDATE SET "
            "markethunt_id=excluded.markethunt_id, gold_price=excluded.gold_price, "
            "sb_price=excluded.sb_price, last_updated=excluded.last_updated",
            data,
        )
        self.conn.commit()

    def get_price(self, item_name: str) -> Optional[Price]:
        """Look up a price by item name."""
        row = self.conn.execute(
            "SELECT item_name, markethunt_id, gold_price, sb_price, last_updated "
            "FROM prices WHERE item_name = ?",
            (item_name,),
        ).fetchone()
        if row is None:
            return None
        last_updated = None
        if row["last_updated"]:
            last_updated = datetime.fromisoformat(row["last_updated"])
        return Price(
            item_name=row["item_name"],
            markethunt_id=row["markethunt_id"],
            gold_price=row["gold_price"],
            sb_price=row["sb_price"],
            last_updated=last_updated,
        )

    # --- Mappings ---

    def add_mapping(self, mhct_name: str, markethunt_name: str) -> None:
        """Add or update a name mapping."""
        self.conn.execute(
            "INSERT INTO mappings (mhct_name, markethunt_name) VALUES (?, ?) "
            "ON CONFLICT(mhct_name) DO UPDATE SET markethunt_name=excluded.markethunt_name",
            (mhct_name, markethunt_name),
        )
        self.conn.commit()

    def get_mapping(self, mhct_name: str) -> Optional[str]:
        """Get the MarketHunt name for an MHCT name. Returns None if unmapped."""
        row = self.conn.execute(
            "SELECT markethunt_name FROM mappings WHERE mhct_name = ?", (mhct_name,)
        ).fetchone()
        return row["markethunt_name"] if row else None

    def get_all_mappings(self) -> list[NameMapping]:
        """Get all name mappings."""
        rows = self.conn.execute("SELECT mhct_name, markethunt_name FROM mappings").fetchall()
        return [NameMapping(mhct_name=r["mhct_name"], markethunt_name=r["markethunt_name"]) for r in rows]

    # --- Non-tradeables ---

    def add_non_tradeable(self, item_name: str) -> None:
        """Mark an item as non-tradeable."""
        self.conn.execute(
            "INSERT OR IGNORE INTO non_tradeables (item_name) VALUES (?)",
            (item_name,),
        )
        self.conn.commit()

    def is_non_tradeable(self, item_name: str) -> bool:
        """Check if an item is marked non-tradeable."""
        row = self.conn.execute(
            "SELECT 1 FROM non_tradeables WHERE item_name = ?", (item_name,)
        ).fetchone()
        return row is not None

    def get_all_non_tradeables(self) -> list[str]:
        """Get all non-tradeable item names."""
        rows = self.conn.execute("SELECT item_name FROM non_tradeables ORDER BY item_name").fetchall()
        return [r["item_name"] for r in rows]
