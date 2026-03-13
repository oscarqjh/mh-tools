# MouseHunt Tools: Phase 1-3 Implementation Plan (Core + Logic + CLI)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core data layer, external API providers, Map Value Analyser logic, and CLI interface for the `mh_tools` Python package.

**Architecture:** Modular Python package with SQLite persistence (current directory), HTTP providers for MHCT and MarketHunt APIs, a tool registry pattern for extensibility, and an argparse CLI. Business logic is fully decoupled from delivery mechanism.

**Tech Stack:** Python 3.12+, uv (package manager), httpx (HTTP client), pydantic (models), pytest + respx (testing), SQLite3 (stdlib)

---

## Confirmed API Response Formats

**MarketHunt `/items`** (verified live 2026-03-13):
```json
{
  "item_info": { "item_id": 103, "name": "Maki Cheese", "currently_tradeable": true },
  "latest_market_data": { "date": "2026-03-12", "price": 16000, "sb_price": 0.990282849, "volume": 27 }
}
```

**MarketHunt `/items/search?query=...`** — same shape as above, returns array.

**MHCT `searchByItem.php?item_id=all&item_type=convertible`** (from source code):
```json
[{ "id": 123, "value": "Rare Treasure Chest" }]
```

**MHCT `searchByItem.php?item_id={id}&item_type=convertible`** (from source code):
```json
[{
  "item": "Gold",
  "total": 5000,
  "single_opens": 4500,
  "total_items": 25000000,
  "times_with_any": 4500,
  "min_item_quantity": 1000,
  "max_item_quantity": 10000
}]
```

**SB/Gold Rate:** Derived from any MarketHunt item as `price / sb_price`. E.g., Empowered SUPER|brie+ at price=16302, sb_price=1.009 → ~16,155 gold per SB.

---

## File Structure

```
mh-project/
├── src/
│   └── mh_tools/
│       ├── __init__.py               # Package version
│       ├── schema.sql                # SQLite DDL (package data for importlib.resources)
│       ├── main.py                   # CLI entry point (argparse)
│       ├── models.py                 # Pydantic data models
│       ├── database.py               # SQLite wrapper + CRUD
│       ├── providers/
│       │   ├── __init__.py
│       │   ├── mhct.py              # MHCT API client
│       │   └── markethunt.py        # MarketHunt API client
│       └── tools/
│           ├── __init__.py
│           ├── base.py              # Abstract base for tools
│           └── map_value.py         # Map Value Analyser
├── tests/
│   ├── conftest.py                  # Shared fixtures
│   ├── test_models.py
│   ├── test_database.py
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── test_mhct.py
│   │   └── test_markethunt.py
│   ├── tools/
│   │   ├── __init__.py
│   │   └── test_map_value.py
│   └── test_main.py                # CLI integration tests
├── pyproject.toml
├── .gitignore
└── docs/
    ├── RESEARCH.md
    └── plans/
```

---

## Chunk 1: Scaffolding + Models + Database

### Task 1: Project Scaffolding

**Files:**
- Create: `pyproject.toml`
- Create: `src/mh_tools/__init__.py`
- Create: `tests/conftest.py`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize uv project**

```bash
cd C:/Users/User/Documents/NTU_WORK/mh-project
uv init --lib --name mh-tools
```

If uv creates a flat `mh_tools/` dir, move it under `src/`. The goal is `src/mh_tools/`.

- [ ] **Step 2: Edit pyproject.toml**

```toml
[project]
name = "mh-tools"
version = "0.1.0"
description = "MouseHunt community tools - map value analyser and more"
requires-python = ">=3.12"
dependencies = [
    "httpx>=0.27",
    "pydantic>=2.0",
]

[project.scripts]
mh-tools = "mh_tools.main:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/mh_tools"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]

[dependency-groups]
dev = [
    "pytest>=8.0",
    "respx>=0.22",
]
```

- [ ] **Step 3: Install dependencies**

```bash
uv sync
```

- [ ] **Step 4: Create directory structure**

```bash
mkdir -p src/mh_tools/providers src/mh_tools/tools tests/providers tests/tools data
touch src/mh_tools/__init__.py src/mh_tools/providers/__init__.py src/mh_tools/tools/__init__.py
touch tests/__init__.py tests/providers/__init__.py tests/tools/__init__.py
```

- [ ] **Step 5: Write `src/mh_tools/__init__.py`**

```python
"""MouseHunt community tools."""

__version__ = "0.1.0"
```

- [ ] **Step 6: Write `tests/conftest.py`**

```python
"""Shared test fixtures."""

import sqlite3
import pytest
from mh_tools.database import Database


@pytest.fixture
def db(tmp_path):
    """Provide a fresh in-memory-like Database for each test."""
    db_path = str(tmp_path / "test.db")
    database = Database(db_path)
    database.initialize()
    return database
```

- [ ] **Step 7: Update `.gitignore`**

Append:
```
__pycache__/
*.pyc
.venv/
*.egg-info/
dist/
data/*.db
.pytest_cache/
```

- [ ] **Step 8: Verify setup**

```bash
uv run pytest --co -q
```

Expected: `no tests ran` (no test files yet), exit 0 or 5 (no tests collected).

- [ ] **Step 9: Commit**

```bash
git add pyproject.toml src/ tests/ data/ .gitignore uv.lock
git commit -m "feat: project scaffolding with uv, pytest, and directory structure"
```

---

### Task 2: Data Models (Pydantic)

**Files:**
- Create: `src/mh_tools/models.py`
- Create: `tests/test_models.py`

- [ ] **Step 1: Write failing tests for models**

`tests/test_models.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_models.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'mh_tools.models'`

- [ ] **Step 3: Implement models**

`src/mh_tools/models.py`:
```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/test_models.py -v
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/mh_tools/models.py tests/test_models.py
git commit -m "feat: add pydantic data models with EV calculation"
```

---

### Task 3: SQLite Database Layer

**Files:**
- Create: `src/mh_tools/schema.sql`
- Create: `src/mh_tools/database.py`
- Create: `tests/test_database.py`

- [ ] **Step 1: Write schema.sql**

`src/mh_tools/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS chests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    mhct_id INTEGER UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS drops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chest_id INTEGER NOT NULL REFERENCES chests(id),
    item_name TEXT NOT NULL,
    drop_chance REAL NOT NULL,
    avg_quantity REAL NOT NULL DEFAULT 1.0,
    UNIQUE(chest_id, item_name)
);

CREATE TABLE IF NOT EXISTS prices (
    item_name TEXT PRIMARY KEY,
    markethunt_id INTEGER,
    gold_price INTEGER,
    sb_price REAL,
    last_updated TEXT
);

CREATE TABLE IF NOT EXISTS mappings (
    mhct_name TEXT PRIMARY KEY,
    markethunt_name TEXT NOT NULL
);
```

- [ ] **Step 2: Write failing database tests**

`tests/test_database.py`:
```python
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
uv run pytest tests/test_database.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'mh_tools.database'`

- [ ] **Step 4: Implement database.py**

`src/mh_tools/database.py`:
```python
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
        self.conn = sqlite3.connect(db_path)
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
uv run pytest tests/test_database.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/mh_tools/schema.sql src/mh_tools/database.py tests/test_database.py
git commit -m "feat: add SQLite database layer with CRUD for chests, drops, prices, mappings"
```

---

## Chunk 2: Providers (MHCT + MarketHunt)

### Task 4: MHCT Provider

**Files:**
- Create: `src/mh_tools/providers/mhct.py`
- Create: `tests/providers/test_mhct.py`

- [ ] **Step 1: Write failing tests**

`tests/providers/test_mhct.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/providers/test_mhct.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement MHCT provider**

`src/mh_tools/providers/mhct.py`:
```python
"""MHCT (mhct.win) API provider."""

from __future__ import annotations

import httpx

MHCT_BASE = "https://www.mhct.win"


class MHCTProvider:
    """Client for MHCT's searchByItem.php endpoint."""

    def __init__(self, client: httpx.Client | None = None):
        self.client = client or httpx.Client(timeout=30)

    def list_convertibles(self) -> list[dict]:
        """Fetch all convertible items from MHCT.

        Returns list of {"id": int, "name": str}.
        """
        resp = self.client.get(
            f"{MHCT_BASE}/searchByItem.php",
            params={"item_id": "all", "item_type": "convertible"},
        )
        resp.raise_for_status()
        raw = resp.json()
        return [{"id": item["id"], "name": item["value"]} for item in raw]

    def get_convertible_drops(self, mhct_id: int) -> list[dict]:
        """Fetch drop data for a specific convertible.

        Returns list of dicts with keys:
            item_name, drop_chance, avg_quantity

        Note: MHCT also returns item_gold_value and item_sb_value per drop,
        but we intentionally fetch prices from MarketHunt instead for fresher data.
        """
        resp = self.client.get(
            f"{MHCT_BASE}/searchByItem.php",
            params={"item_id": str(mhct_id), "item_type": "convertible"},
        )
        resp.raise_for_status()
        raw = resp.json()

        drops = []
        for entry in raw:
            single_opens = entry.get("single_opens", 0)
            times_with_any = entry.get("times_with_any", 0)
            total_items = entry.get("total_items", 0)

            if single_opens == 0 or times_with_any == 0:
                continue

            drops.append({
                "item_name": entry["item"],
                "drop_chance": times_with_any / single_opens,
                "avg_quantity": total_items / times_with_any,
            })
        return drops

    def search_convertible(self, query: str) -> list[dict]:
        """Search convertibles by name (case-insensitive substring match).

        Fetches the full list and filters client-side since MHCT has no search param.
        Returns list of {"id": int, "name": str}.
        """
        all_convertibles = self.list_convertibles()
        query_lower = query.lower()
        return [c for c in all_convertibles if query_lower in c["name"].lower()]
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/providers/test_mhct.py -v
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/mh_tools/providers/mhct.py tests/providers/test_mhct.py
git commit -m "feat: add MHCT provider for convertible drop data"
```

---

### Task 5: MarketHunt Provider

**Files:**
- Create: `src/mh_tools/providers/markethunt.py`
- Create: `tests/providers/test_markethunt.py`

- [ ] **Step 1: Write failing tests**

`tests/providers/test_markethunt.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/providers/test_markethunt.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement MarketHunt provider**

`src/mh_tools/providers/markethunt.py`:
```python
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
        market = entry.get("latest_market_data", {})
        return {
            "item_id": info.get("item_id"),
            "name": info.get("name"),
            "currently_tradeable": info.get("currently_tradeable"),
            "gold_price": market.get("price"),
            "sb_price": market.get("sb_price"),
            "volume": market.get("volume"),
        }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/providers/test_markethunt.py -v
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/mh_tools/providers/markethunt.py tests/providers/test_markethunt.py
git commit -m "feat: add MarketHunt provider for item prices and SB rate"
```

---

### Task 6: Name Mapping with Mismatch Warnings

This task adds the logic that resolves MHCT item names to MarketHunt prices, and warns when a name can't be resolved.

**Files:**
- Create: `src/mh_tools/providers/name_resolver.py`
- Create: `tests/providers/test_name_resolver.py`

- [ ] **Step 1: Write failing tests**

`tests/providers/test_name_resolver.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/providers/test_name_resolver.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement NameResolver**

`src/mh_tools/providers/name_resolver.py`:
```python
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
        2. Mapping table → mapped MarketHunt name → prices table
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/providers/test_name_resolver.py -v
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/mh_tools/providers/name_resolver.py tests/providers/test_name_resolver.py
git commit -m "feat: add name resolver with unmapped item warnings"
```

---

## Chunk 3: Map Value Analyser + CLI

### Task 7: Map Value Analyser

**Files:**
- Create: `src/mh_tools/tools/base.py`
- Create: `src/mh_tools/tools/map_value.py`
- Create: `tests/tools/test_map_value.py`

- [ ] **Step 1: Write the abstract base class**

`src/mh_tools/tools/base.py`:
```python
"""Abstract base class for all mh_tools tools."""

from __future__ import annotations

from abc import ABC, abstractmethod

from mh_tools.database import Database


class BaseTool(ABC):
    """Base class that all tools must inherit from."""

    name: str = ""
    description: str = ""

    def __init__(self, db: Database):
        self.db = db

    @abstractmethod
    def run(self, **kwargs):
        """Execute the tool's main logic."""
        ...
```

- [ ] **Step 2: Write failing tests for MapValueAnalyser**

`tests/tools/test_map_value.py`:
```python
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
uv run pytest tests/tools/test_map_value.py -v
```

Expected: FAIL

- [ ] **Step 4: Implement MapValueAnalyser**

`src/mh_tools/tools/map_value.py`:
```python
"""Map Value Analyser — calculates expected value of treasure chests."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from mh_tools.database import Database
from mh_tools.models import AnalysisResult, ChestInfo, Drop, ItemEV, Price
from mh_tools.providers.markethunt import MarketHuntProvider
from mh_tools.providers.mhct import MHCTProvider
from mh_tools.providers.name_resolver import NameResolver
from mh_tools.tools.base import BaseTool

logger = logging.getLogger(__name__)

MARKETPLACE_TAX = 0.10


class MapValueAnalyser(BaseTool):
    """Calculates the expected gold/SB value of opening a treasure chest."""

    name = "map-analyser"
    description = "Analyse the expected value of a treasure chest"

    def __init__(
        self,
        db: Database,
        mhct: MHCTProvider,
        markethunt: MarketHuntProvider,
        price_ttl_seconds: int = 3600,
    ):
        super().__init__(db)
        self.mhct = mhct
        self.markethunt = markethunt
        self.price_ttl = price_ttl_seconds
        self.name_resolver = NameResolver(db=db, markethunt=markethunt)

    def run(self, *, chest_name: str) -> AnalysisResult:
        """Run the analysis for a given chest name."""
        # 1. Resolve chest → get drops
        chest = self._resolve_chest(chest_name)
        drops = self.db.get_drops_for_chest(chest.id)

        # 2. Get SB rate
        sb_rate = self.markethunt.get_sb_rate()

        # 3. Calculate EV per item
        items: list[ItemEV] = []
        warnings: list[str] = []
        total_ev_gold = 0.0
        total_ev_sb = 0.0

        for drop in drops:
            price = self._get_price(drop.item_name)

            if price is None or price.gold_price is None:
                # Unmapped or unpriced
                items.append(ItemEV(
                    item_name=drop.item_name,
                    drop_chance=drop.drop_chance,
                    avg_quantity=drop.avg_quantity,
                    gold_price=None,
                    sb_price=None,
                    ev_gold=0.0,
                    ev_sb=0.0,
                    unmapped=True,
                ))
                warnings.append(f"No price for '{drop.item_name}' — skipped in EV calculation")
                continue

            ev_gold = drop.drop_chance * drop.avg_quantity * price.gold_price
            ev_sb = ev_gold / sb_rate if sb_rate > 0 else 0.0
            is_stale = price.is_stale(self.price_ttl)

            if is_stale:
                warnings.append(f"Price for '{drop.item_name}' is stale (older than {self.price_ttl}s)")

            items.append(ItemEV(
                item_name=drop.item_name,
                drop_chance=drop.drop_chance,
                avg_quantity=drop.avg_quantity,
                gold_price=price.gold_price,
                sb_price=price.sb_price,
                ev_gold=ev_gold,
                ev_sb=ev_sb,
                price_stale=is_stale,
            ))
            total_ev_gold += ev_gold
            total_ev_sb += ev_sb

        return AnalysisResult(
            chest_name=chest.name,
            items=items,
            total_ev_gold=total_ev_gold,
            total_ev_sb=total_ev_sb,
            total_ev_gold_after_tax=total_ev_gold * (1 - MARKETPLACE_TAX),
            total_ev_sb_after_tax=total_ev_sb * (1 - MARKETPLACE_TAX),
            sb_rate=sb_rate,
            warnings=warnings,
        )

    def _resolve_chest(self, name: str) -> ChestInfo:
        """Find chest in DB or fetch from MHCT."""
        cached = self.db.get_chest_by_name(name)
        if cached is not None:
            return cached

        # Search MHCT
        matches = self.mhct.search_convertible(name)
        if not matches:
            raise ValueError(f"Chest '{name}' not found on MHCT")

        # Use first match
        match = matches[0]
        chest = ChestInfo(name=match["name"], mhct_id=match["id"])
        chest_id = self.db.upsert_chest(chest)
        chest = ChestInfo(id=chest_id, name=match["name"], mhct_id=match["id"])

        # Fetch and cache drops
        raw_drops = self.mhct.get_convertible_drops(match["id"])
        drops = [
            Drop(
                chest_id=chest_id,
                item_name=d["item_name"],
                drop_chance=d["drop_chance"],
                avg_quantity=d["avg_quantity"],
            )
            for d in raw_drops
        ]
        self.db.upsert_drops(chest_id, drops)

        return chest

    def _get_price(self, mhct_item_name: str) -> Optional[Price]:
        """Resolve price for an MHCT item name, refreshing if stale."""
        price = self.name_resolver.resolve_price(mhct_item_name)

        if price is None:
            return None

        if price.is_stale(self.price_ttl) and price.markethunt_id:
            # Refresh from MarketHunt
            try:
                fresh = self.markethunt.get_item_price(price.markethunt_id)
                updated = Price(
                    item_name=price.item_name,
                    markethunt_id=price.markethunt_id,
                    gold_price=fresh.get("gold_price"),
                    sb_price=fresh.get("sb_price"),
                    last_updated=datetime.now(timezone.utc),
                )
                self.db.upsert_price(updated)
                return updated
            except Exception:
                logger.warning("Failed to refresh price for '%s', using stale data", mhct_item_name)

        return price
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
uv run pytest tests/tools/test_map_value.py -v
```

Expected: all PASS

- [ ] **Step 6: Run full test suite**

```bash
uv run pytest -v
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/mh_tools/tools/base.py src/mh_tools/tools/map_value.py tests/tools/test_map_value.py
git commit -m "feat: add Map Value Analyser with EV calculation and tax handling"
```

---

### Task 8: CLI with argparse

**Files:**
- Create: `src/mh_tools/main.py`
- Create: `tests/test_main.py`

- [ ] **Step 1: Write failing CLI tests**

`tests/test_main.py`:
```python
"""Tests for CLI entry point."""

import pytest
from unittest.mock import patch, MagicMock

from mh_tools.main import build_parser, run_analyse, run_clear_cache


class TestParser:
    def test_analyse_subcommand(self):
        parser = build_parser()
        args = parser.parse_args(["analyse", "--chest", "Rare Treasure Chest"])
        assert args.command == "analyse"
        assert args.chest == "Rare Treasure Chest"

    def test_analyse_with_tax(self):
        parser = build_parser()
        args = parser.parse_args(["analyse", "--chest", "Test", "--after-tax"])
        assert args.after_tax is True

    def test_clear_cache(self):
        parser = build_parser()
        args = parser.parse_args(["clear-cache"])
        assert args.command == "clear-cache"

    def test_add_mapping(self):
        parser = build_parser()
        args = parser.parse_args(["add-mapping", "--mhct", "SB+", "--markethunt", "SUPER|brie+"])
        assert args.command == "add-mapping"
        assert args.mhct == "SB+"
        assert args.markethunt == "SUPER|brie+"


class TestRunAnalyse:
    @patch("mh_tools.main.MapValueAnalyser")
    @patch("mh_tools.main.MarketHuntProvider")
    @patch("mh_tools.main.MHCTProvider")
    @patch("mh_tools.main.Database")
    def test_prints_result(self, MockDB, MockMHCT, MockMH, MockAnalyser, capsys):
        from mh_tools.models import AnalysisResult, ItemEV

        mock_result = AnalysisResult(
            chest_name="Test Chest",
            items=[
                ItemEV(item_name="Gold", drop_chance=1.0, avg_quantity=5000.0, gold_price=1, ev_gold=5000.0, ev_sb=0.31),
            ],
            total_ev_gold=5000.0,
            total_ev_sb=0.31,
            total_ev_gold_after_tax=4500.0,
            total_ev_sb_after_tax=0.279,
            sb_rate=16155.0,
            warnings=[],
        )
        MockAnalyser.return_value.run.return_value = mock_result

        args = MagicMock()
        args.chest = "Test Chest"
        args.after_tax = False
        args.db_path = "./data/mh_tools.db"

        run_analyse(args)

        captured = capsys.readouterr()
        assert "Test Chest" in captured.out
        assert "Gold" in captured.out
        assert "5000" in captured.out or "5,000" in captured.out
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_main.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement main.py**

`src/mh_tools/main.py`:
```python
"""CLI entry point for mh-tools."""

from __future__ import annotations

import argparse
import logging
import sys

from mh_tools.database import Database
from mh_tools.models import AnalysisResult
from mh_tools.providers.markethunt import MarketHuntProvider
from mh_tools.providers.mhct import MHCTProvider
from mh_tools.tools.map_value import MapValueAnalyser


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mh-tools",
        description="MouseHunt community tools",
    )
    parser.add_argument(
        "--db-path", default="./data/mh_tools.db",
        help="Path to SQLite database (default: ./data/mh_tools.db)",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true",
        help="Enable verbose logging",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # analyse
    analyse_parser = subparsers.add_parser("analyse", help="Analyse chest expected value")
    analyse_parser.add_argument("--chest", required=True, help="Chest name to analyse")
    analyse_parser.add_argument("--after-tax", action="store_true", help="Show after 10%% marketplace tax")

    # clear-cache
    subparsers.add_parser("clear-cache", help="Clear all cached data")

    # add-mapping
    mapping_parser = subparsers.add_parser("add-mapping", help="Add a name mapping (MHCT → MarketHunt)")
    mapping_parser.add_argument("--mhct", required=True, help="MHCT item name")
    mapping_parser.add_argument("--markethunt", required=True, help="MarketHunt item name")

    return parser


def run_analyse(args) -> None:
    """Execute the analyse command."""
    db = Database(args.db_path)
    db.initialize()
    mhct = MHCTProvider()
    markethunt = MarketHuntProvider()
    analyser = MapValueAnalyser(db=db, mhct=mhct, markethunt=markethunt)

    try:
        result = analyser.run(chest_name=args.chest)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    _print_result(result, show_after_tax=getattr(args, "after_tax", False))


def run_clear_cache(args) -> None:
    """Execute the clear-cache command."""
    db = Database(args.db_path)
    db.initialize()
    db.clear_cache()
    print("Cache cleared.")


def run_add_mapping(args) -> None:
    """Execute the add-mapping command."""
    db = Database(args.db_path)
    db.initialize()
    db.add_mapping(args.mhct, args.markethunt)
    print(f"Mapping added: '{args.mhct}' → '{args.markethunt}'")


def _print_result(result: AnalysisResult, show_after_tax: bool = False) -> None:
    """Pretty-print an analysis result to stdout."""
    print(f"\n{'=' * 60}")
    print(f"  Chest: {result.chest_name}")
    print(f"  SB Rate: {result.sb_rate:,.0f} gold/SB")
    print(f"{'=' * 60}\n")

    # Header
    print(f"  {'Item':<30} {'Drop%':>7} {'AvgQty':>8} {'Price':>12} {'EV (Gold)':>12}")
    print(f"  {'-' * 30} {'-' * 7} {'-' * 8} {'-' * 12} {'-' * 12}")

    for item in result.items:
        if item.unmapped:
            price_str = "UNMAPPED"
            ev_str = "—"
        else:
            price_str = f"{item.gold_price:>12,}" if item.gold_price else "N/A"
            ev_str = f"{item.ev_gold:>12,.0f}"

        name = item.item_name[:30]
        print(f"  {name:<30} {item.drop_chance * 100:>6.1f}% {item.avg_quantity:>8.1f} {price_str:>12} {ev_str:>12}")

    print(f"\n  {'─' * 60}")
    print(f"  Total EV (Gold):          {result.total_ev_gold:>12,.0f}")
    print(f"  Total EV (SB):            {result.total_ev_sb:>12,.2f}")

    if show_after_tax:
        print(f"  After Tax EV (Gold):      {result.total_ev_gold_after_tax:>12,.0f}")
        print(f"  After Tax EV (SB):        {result.total_ev_sb_after_tax:>12,.2f}")

    if result.warnings:
        print(f"\n  Warnings:")
        for w in result.warnings:
            print(f"    ⚠ {w}")

    print()


def main() -> None:
    """Main CLI entry point."""
    parser = build_parser()
    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG, format="%(levelname)s: %(message)s")
    else:
        logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

    commands = {
        "analyse": run_analyse,
        "clear-cache": run_clear_cache,
        "add-mapping": run_add_mapping,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/test_main.py -v
```

Expected: all PASS

- [ ] **Step 5: Run the full test suite**

```bash
uv run pytest -v
```

Expected: ALL tests across all files PASS

- [ ] **Step 6: Smoke test the CLI**

```bash
uv run mh-tools --help
uv run mh-tools analyse --help
```

Expected: Help text prints correctly.

- [ ] **Step 7: Commit**

```bash
git add src/mh_tools/main.py tests/test_main.py
git commit -m "feat: add CLI with analyse, clear-cache, and add-mapping commands"
```

---

### Task 9: Price Cache Population (Bootstrap) + CLI Functional Tests

The analyser needs MarketHunt prices to exist in the DB before resolving names. This task adds a `sync-prices` CLI command and functional tests for all CLI commands.

**Files:**
- Modify: `src/mh_tools/main.py`
- Modify: `tests/test_main.py`

- [ ] **Step 1: Write failing tests first (TDD)**

In `tests/test_main.py`, add:
```python
class TestSyncPricesParser:
    def test_sync_prices(self):
        parser = build_parser()
        args = parser.parse_args(["sync-prices"])
        assert args.command == "sync-prices"


class TestRunSyncPrices:
    @patch("mh_tools.main.MarketHuntProvider")
    @patch("mh_tools.main.Database")
    def test_syncs_prices(self, MockDB, MockMarkethunt, capsys):
        from mh_tools.main import run_sync_prices

        mock_db = MockDB.return_value
        mock_mh = MockMarkethunt.return_value
        mock_mh.get_all_items.return_value = [
            {"item_id": 1, "name": "Gold", "gold_price": 1, "sb_price": 0.00006},
            {"item_id": 2, "name": "Cheese", "gold_price": 100, "sb_price": 0.006},
        ]

        args = MagicMock()
        args.db_path = "./data/mh_tools.db"
        run_sync_prices(args)

        mock_db.bulk_upsert_prices.assert_called_once()
        prices = mock_db.bulk_upsert_prices.call_args[0][0]
        assert len(prices) == 2
        captured = capsys.readouterr()
        assert "Synced 2 item prices" in captured.out


class TestRunClearCache:
    @patch("mh_tools.main.Database")
    def test_clears_cache(self, MockDB, capsys):
        from mh_tools.main import run_clear_cache

        args = MagicMock()
        args.db_path = "./data/mh_tools.db"
        run_clear_cache(args)

        MockDB.return_value.clear_cache.assert_called_once()
        captured = capsys.readouterr()
        assert "Cache cleared" in captured.out


class TestRunAddMapping:
    @patch("mh_tools.main.Database")
    def test_adds_mapping(self, MockDB, capsys):
        from mh_tools.main import run_add_mapping

        args = MagicMock()
        args.db_path = "./data/mh_tools.db"
        args.mhct = "SB+"
        args.markethunt = "SUPER|brie+"
        run_add_mapping(args)

        MockDB.return_value.add_mapping.assert_called_once_with("SB+", "SUPER|brie+")
        captured = capsys.readouterr()
        assert "Mapping added" in captured.out
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_main.py -v
```

Expected: FAIL (sync-prices parser and run_sync_prices not yet implemented)

- [ ] **Step 3: Add sync-prices subparser to `build_parser()`**

In `src/mh_tools/main.py`, add to `build_parser()`:
```python
    # sync-prices
    subparsers.add_parser("sync-prices", help="Fetch all MarketHunt prices into local cache")
```

- [ ] **Step 4: Add `run_sync_prices` function**

```python
def run_sync_prices(args) -> None:
    """Fetch all MarketHunt prices and store in local DB."""
    from datetime import datetime, timezone
    from mh_tools.models import Price

    db = Database(args.db_path)
    db.initialize()
    markethunt = MarketHuntProvider()

    print("Fetching all MarketHunt items...")
    items = markethunt.get_all_items()

    now = datetime.now(timezone.utc)
    prices = [
        Price(
            item_name=item["name"],
            markethunt_id=item["item_id"],
            gold_price=item["gold_price"],
            sb_price=item["sb_price"],
            last_updated=now,
        )
        for item in items
        if item.get("name")
    ]

    db.bulk_upsert_prices(prices)
    print(f"Synced {len(prices)} item prices.")
```

- [ ] **Step 5: Register in the commands dict**

```python
    commands = {
        "analyse": run_analyse,
        "clear-cache": run_clear_cache,
        "add-mapping": run_add_mapping,
        "sync-prices": run_sync_prices,
    }
```

- [ ] **Step 6: Run tests**

```bash
uv run pytest tests/test_main.py -v
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add src/mh_tools/main.py tests/test_main.py
git commit -m "feat: add sync-prices command with functional tests for all CLI commands"
```

---

## Usage Summary (After Phase 1-3)

```bash
# First time: sync prices from MarketHunt
uv run mh-tools sync-prices

# Analyse a chest
uv run mh-tools analyse --chest "Rare Treasure Chest"
uv run mh-tools analyse --chest "Rare Treasure Chest" --after-tax

# If warnings appear about unmapped items:
uv run mh-tools add-mapping --mhct "SB+" --markethunt "SUPER|brie+"

# Clear everything and start fresh
uv run mh-tools clear-cache
```
