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
    min_quantity INTEGER NOT NULL DEFAULT 0,
    max_quantity INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS non_tradeables (
    item_name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS favorites (
    chest_name TEXT PRIMARY KEY
);
