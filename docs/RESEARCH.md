# MouseHunt Research Report

Comprehensive research on the MouseHunt browser game, its HTTP endpoints, and community tools (MarketHunt & MHCT).

---

## Table of Contents

1. [MouseHunt Game Overview](#1-mousehunt-game-overview)
2. [MouseHunt HTTP Endpoints](#2-mousehunt-http-endpoints)
3. [Community Read-Only API (api.mouse.rip)](#3-community-read-only-api-apimouserip)
4. [MarketHunt (markethunt.win)](#4-markethunt-markethuntwin)
5. [MHCT - MouseHunt Community Tools (mhct.win)](#5-mhct---mousehunt-community-tools-mhctwin)
6. [Key GitHub Repositories](#6-key-github-repositories)

---

## 1. MouseHunt Game Overview

MouseHunt is a passive browser RPG developed by **HitGrab, Inc.** Players are hunters commissioned by the King of Gnawnia to catch mice.

### Core Gameplay Loop

1. **Arm a trap** consisting of four components:
   - **Weapon** (trap) - determines power and power type
   - **Base** - modifies trap stats
   - **Cheese** (bait) - determines which mice are attracted
   - **Charm** (trinket, optional) - provides special bonuses
2. **Sound the Hunter's Horn** (available every ~15 minutes) to trigger a hunt
3. Each hunt has a chance of **catching a mouse**, awarding **gold** and **points** (experience)
4. Automatic "Trap Checks" happen hourly (up to 5/hour), but require sounding the horn at least once every 24 hours
5. Use gold to buy better equipment, use points to rank up and unlock new areas

### Key Game Concepts

- **50+ locations** with different mice requiring different trap setups
- **1000+ unique mice** to catch
- **Ranks** from Novice to Fabled, unlocking progressively harder areas
- **Marketplace** for trading items with other players
- **Treasure Maps** for cooperative hunting objectives
- **Events** (seasonal content with limited-time mice and items)

### Client-Side Data (Browser `user` Object)

The game exposes a global `user` JavaScript object with key fields:

| Field | Description |
|---|---|
| `user.user_id` | Player's unique numeric ID |
| `user.unique_hash` | Session authentication token (required for all API calls) |
| `user.trap_power` | Current trap power stat |
| `user.trap_luck` | Current trap luck stat |
| `user.trap_power_type_name` | Power type (e.g., "Shadow", "Arcane") |
| `user.weapon_item_id` / `user.weapon_name` | Equipped weapon |
| `user.base_item_id` / `user.base_name` | Equipped base |
| `user.bait_item_id` / `user.bait_name` / `user.bait_quantity` | Equipped cheese |
| `user.trinket_item_id` / `user.trinket_name` | Equipped charm |
| `user.environment_name` / `user.environment_id` | Current location |
| `user.title_name` | Current rank title |
| `user.next_activeturn_seconds` | Seconds until next horn availability |

### Client-Side Utility Objects

The game also exposes an `hg` global with utility methods:

- `hg.utils.UserInventory.getItems()` - Query inventory
- `hg.utils.TrapControl` - Change trap components
- `hg.utils.User.getUserData()` - Get user fields
- `hg.utils.MouseUtil.getMouseNames()` - Get mouse data

---

## 2. MouseHunt HTTP Endpoints

> **There is no official public API.** All endpoints below have been reverse-engineered by the community.

### Base URL

```
https://www.mousehuntgame.com/
```

### Authentication / Required Parameters

All POST requests to `managers/ajax/*` endpoints require these form-data fields:

| Field | Value | Description |
|---|---|---|
| `sn` | `"Hitgrab"` | Service name identifier |
| `hg_is_ajax` | `1` | Flags the request as AJAX |
| `uh` | `user.unique_hash` | Session authentication token |
| `last_read_journal_entry_id` | integer | ID of the last journal entry the client has seen |

Additional action-specific parameters are appended per endpoint.

### Request Format

- **Method:** `POST`
- **Content-Type:** `application/x-www-form-urlencoded`
- **Body:** URL-encoded form data
- **Response:** JSON with a `success` boolean field

### Canonical Request Pattern

From the [mousehunt-utils](https://github.com/MHCommunity/mousehunt-utils) `doRequest` function:

```javascript
const form = new FormData();
form.append('sn', 'Hitgrab');
form.append('hg_is_ajax', 1);
form.append('last_read_journal_entry_id', lastReadJournalEntryId);
form.append('uh', user.unique_hash);
// ... additional endpoint-specific params ...

const response = await fetch(
  'https://www.mousehuntgame.com/' + endpoint,
  {
    method: 'POST',
    body: new URLSearchParams(form).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }
);
const data = await response.json();
```

### Known Endpoints

#### Core Gameplay

| Endpoint | Purpose | Extra Parameters |
|---|---|---|
| `managers/ajax/turns/activeturn.php` | Sound the horn / trigger a hunt | Standard auth params only |
| `managers/ajax/users/changetrap.php` | Change trap components (weapon, base, bait, charm) | Item IDs for each component |
| `managers/ajax/users/gettrapcomponents.php` | Get available trap components from inventory | Returns weapons, bases, baits, trinkets with `item_id` and `thumbnail` |
| `managers/ajax/users/changeenvironment.php` | Travel to a different location | Target `environment_id` |

#### Inventory & Items

| Endpoint | Purpose | Extra Parameters |
|---|---|---|
| `managers/ajax/users/userInventory.php` | Get user inventory data | Item types/classes to query |
| `managers/ajax/users/useconvertible.php` | Open convertible items | `item_id`, quantity |

#### Marketplace

| Endpoint | Purpose | Extra Parameters |
|---|---|---|
| `managers/ajax/users/marketplace.php` | Marketplace operations (buy/sell/search) | Various marketplace action params |

#### Game Mechanics

| Endpoint | Purpose | Extra Parameters |
|---|---|---|
| `managers/ajax/users/getmiceeffectiveness.php` | Get trap effectiveness against mice (TEM) | Standard auth params |
| `managers/ajax/users/questsprogress.php` | Quest progress data | Standard auth params |

#### Treasure Maps

| Endpoint | Purpose | Extra Parameters |
|---|---|---|
| `managers/ajax/users/treasuremap_v2.php` | Treasure map data operations | Various map actions |
| `managers/ajax/users/relichunter.php` | Relic Hunter / map operations | `action: 'info'` or `action: 'discard'` |

#### Pages & Social

| Endpoint | Purpose | Extra Parameters |
|---|---|---|
| `managers/ajax/pages/page.php` | Load page data | `page_class` (e.g., `'HunterProfile'`), `tab`, `sub_tab` |
| `managers/ajax/pages/friends.php` | Friend/hunter search | `action: 'community_search_by_id'`, `user_id` |

#### Session

| Endpoint | Purpose | Extra Parameters |
|---|---|---|
| `managers/ajax/users/session.php` | Session management | Session tokens |

### Newer REST-Style API (`/api/`)

There is also a newer API path (likely used by the mobile app):

```
https://www.mousehuntgame.com/api/get/user/{userId}/{fields}
```

Where `{fields}` is a comma-separated list of user data fields to retrieve. This path is treated separately from the `managers/ajax/*` endpoints by community extensions.

---

## 3. Community Read-Only API (api.mouse.rip)

A community-maintained read-only API providing game reference data (not account interaction).

### Base URL

```
https://api.mouse.rip/
```

### Documentation

Full docs at: [api-docs.mouse.rip](https://api-docs.mouse.rip/)

### Endpoints

| Endpoint | Description |
|---|---|
| `/mice` | All mice data |
| `/mouse/:id` | Single mouse data |
| `/items` | All items |
| `/items/:id` | Single item |
| `/environments` | All locations |
| `/environments-events` | Event locations |
| `/hunter/:id` | Public hunter profile |
| `/hunter/:id/setup` | Hunter's current trap setup |
| `/hunter/:id/items` | Hunter's items |
| `/minlucks` | Minimum luck values for catching mice |
| `/wisdom` | Wisdom/sage data |
| `/effs` | Trap effectiveness data |
| `/scoreboards` | Leaderboard data |
| `/titles` | All rank titles |
| `/relic-hunter` | Current Relic Hunter location |
| `/relic-hunter-hints` | Relic Hunter hints |

---

## 4. MarketHunt (markethunt.win)

MarketHunt tracks in-game marketplace prices, trade volumes, and order book data.

### URLs

| Resource | URL |
|---|---|
| Website | `https://markethunt.win/` |
| API | `https://api.markethunt.win/` |
| Dev instance | `https://dev.markethunt.win/` |
| DB backups | `https://cdn.markethunt.win/db_backups/` |
| GitHub | [github.com/vsong/markethunt](https://github.com/vsong/markethunt) |
| Userscript | [Greasy Fork](https://greasyfork.org/en/scripts/441382-markethunt-plugin-for-mousehunt) |

### Tech Stack

PHP backend, MariaDB database, Vue.js frontend, Docker deployment. MIT license.

### API Overview

**No authentication required.** All endpoints are `GET` requests returning JSON.

### API Endpoints

#### Item Data

| Endpoint | Description |
|---|---|
| `GET /items` | All marketplace items with latest price and volume |
| `GET /items/{itemId}` | Daily average price and trade volume history for one item |
| `GET /items/{itemId}/stock` | Bid/ask/supply data (bi-hourly for last 180 days, daily before that) |
| `GET /items/search?query={text}` | Search items by name or acronym |

**`/items/{itemId}/stock` optional query params:**
- `from` (yyyy-mm-dd) - Start date filter
- `to` (yyyy-mm-dd) - End date filter

#### Analytics

| Endpoint | Description |
|---|---|
| `GET /analytics/total-volumes/{from}/{to}` | Total trade volume of all active items between two dates |
| `GET /analytics/movers/{from}/{to}` | Price movement data of all active items between two dates |

#### OTC (Over-The-Counter / Discord Trading)

| Endpoint | Description |
|---|---|
| `GET /otc/listings` | All listing type/item combinations |
| `GET /otc/listings/{typeId}/{itemId}` | Listing data for a specific type and item |

#### Misc

| Endpoint | Description |
|---|---|
| `GET /events` | Game event start/end dates (from August 2020 onward) |

### Response Formats

**`/items` response:**
```json
[
  {
    "item_info": {
      "item_id": 926,
      "name": "Rare Map Dust",
      "currently_tradeable": true
    },
    "latest_market_data": {
      "date": "2026-03-09",
      "price": 14100000,
      "sb_price": 865.56,
      "volume": 1
    }
  }
]
```

**`/items/{id}` response:**
```json
{
  "item_info": {
    "item_id": 926,
    "name": "Rare Map Dust",
    "currently_tradeable": true
  },
  "market_data": [
    {
      "date": "2020-08-23",
      "price": 2812682,
      "sb_price": 227.62,
      "volume": null
    }
  ]
}
```

**`/items/{id}/stock` response:**
```json
{
  "item_info": { "..." : "..." },
  "stock_data": [
    {
      "timestamp": 1638403200000,
      "bid": 5060000,
      "ask": 5340000,
      "supply": 943
    }
  ]
}
```

### Field Definitions

| Field | Description |
|---|---|
| `price` | Average daily price in gold |
| `sb_price` | Price expressed in SUPER\|brie+ equivalent |
| `volume` | Daily trade count (null before December 2021) |
| `timestamp` | Unix milliseconds |
| `bid` | Highest buy order price (gold) |
| `ask` | Lowest sell order price (gold) |
| `supply` | Total quantity listed on marketplace |

### Example Requests

```bash
# Get all items with latest prices
curl https://api.markethunt.win/items

# Get price history for a specific item
curl https://api.markethunt.win/items/926

# Get bid/ask data with date range
curl "https://api.markethunt.win/items/926/stock?from=2025-01-01&to=2025-03-01"

# Search items by name
curl "https://api.markethunt.win/items/search?query=gold"

# Get price movers
curl https://api.markethunt.win/analytics/movers/2025-01-01/2025-03-01

# Get game events
curl https://api.markethunt.win/events
```

---

## 5. MHCT - MouseHunt Community Tools (mhct.win)

MHCT is a crowdsourced data collection and analysis platform for MouseHunt.

### What It Provides

- **Attraction rates** - Which mice are attracted at which locations, with which cheese, and at what rate
- **Loot/drop rates** - What items mice drop, how often, and in what quantities
- **Map data** - Which mice appear on treasure maps and where to find them
- **Convertible data** - What items come from opening chests, gift boxes, and other convertibles
- **Population data** - Mouse population distributions at specific location/setup combinations

### Architecture

- **Browser extension** (Chrome + Firefox) passively collects hunt data from players
- **PHP backend** aggregates and serves the data
- **Website** presents data through tools and calculators

### URLs

| Resource | URL |
|---|---|
| Website | `https://www.mhct.win` |
| GitHub Org | [github.com/m-h-c-t](https://github.com/m-h-c-t) |

### API Endpoints

**No authentication required.** All data endpoints return JSON. CORS is enabled.

#### `searchByItem.php` (Primary Data Endpoint)

The main endpoint for querying all data types.

**Method:** `GET`

**Parameters:**

| Parameter | Required | Description |
|---|---|---|
| `item_id` | Yes | Numeric item/mouse ID, or `"all"` to list all items of that type |
| `item_type` | Yes | Data category (see below) |
| `timefilter` | No | Time range filter (e.g., `"all_time"`) |
| `min_hunts` | No | Minimum hunt count for filtering results |

**Supported `item_type` values:**

| Value | Description |
|---|---|
| `mouse` | Attraction rate data (which locations/cheese attract a given mouse) |
| `loot` | Drop rate data (where a loot item drops and at what rate) |
| `map` | Map mice data (which mice appear on a map) |
| `mousemaps` | Reverse map lookup (which maps a given mouse appears on) |
| `convertible` | Convertible opening results |
| `itemconvertibles` | Reverse convertible lookup (which convertibles yield a given item) |

**Response when `item_id=all`:**
```json
[
  { "id": 1, "value": "Mouse Name" },
  { "id": 2, "value": "Another Mouse" }
]
```

**Response when `item_id` is a specific ID (attraction example):**
```json
[
  {
    "location": "Town of Gnawnia",
    "stage": "",
    "cheese": "Cheddar",
    "rate": 2500,
    "total_hunts": 10000
  }
]
```

> **Note:** The `rate` field is an integer that must be **divided by 100** to get a percentage (e.g., `2500` = 25.00%).

#### `searchByMouse.php` (Bulk Mouse Lookup)

**Method:** `GET` or `POST`

| Parameter | Description |
|---|---|
| `mice` | Newline-separated list of mouse names |

**Response:**
```json
{
  "found": ["Mouse A", "Mouse B"],
  "results": {
    "Location Name": {
      "Stage": {
        "Mouse A": {
          "Cheddar": { "rate": 1500, "total_hunts": 5000 }
        }
      }
    }
  },
  "not_found": []
}
```

#### `searchByDrop.php` (Bulk Loot Lookup)

**Method:** `GET` or `POST`

| Parameter | Description |
|---|---|
| `items` | Newline-separated list of item names |

**Response includes:** `total_hunts`, `total_catches`, `drop_count`, `drop_rate` organized by location, stage, item, cheese.

#### `filters.php` (Time Filter Options)

**Method:** `GET`

Returns a JSON array of available time filter options for use with other endpoints.

#### Data Submission Endpoints (Used by Extension)

| Endpoint | Purpose |
|---|---|
| `hunt-intake.php` | Submit hunt data |
| `convertible_intake.php` | Submit convertible opening data |
| `map_intake.php` | Submit map data |

### Example Requests

```bash
# List all mice
curl "https://www.mhct.win/searchByItem.php?item_id=all&item_type=mouse&timefilter=all_time"

# Get attraction rates for a specific mouse (ID 1)
curl "https://www.mhct.win/searchByItem.php?item_id=1&item_type=mouse&timefilter=all_time&min_hunts=100"

# List all loot items
curl "https://www.mhct.win/searchByItem.php?item_id=all&item_type=loot&timefilter=all_time"

# Get drop rates for a specific loot item (ID 3)
curl "https://www.mhct.win/searchByItem.php?item_id=3&item_type=loot&timefilter=all_time"

# Get available time filters
curl "https://www.mhct.win/filters.php"

# Bulk mouse lookup
curl -X POST "https://www.mhct.win/searchByMouse.php" -d "mice=White Mouse
Grey Mouse"
```

### Database Access

MHCT also provides:
- **SQL database dumps** available from backup directories for offline analysis
- **Docker setup** (`mhct-db-docker`) to run the database locally
- **CLI client** (`db-client` npm package) with commands: `attr`, `loot`, `pop`, `power`, `id`

---

## 6. Key GitHub Repositories

### Official Community

| Repository | Description |
|---|---|
| [MHCommunity/mousehunt-utils](https://github.com/MHCommunity/mousehunt-utils) | Canonical userscript utility library; contains `doRequest()` and `onRequest()` |
| [MHCommunity/mousehunt-improved](https://github.com/MHCommunity/mousehunt-improved) | Major browser extension enhancing the MouseHunt UI |

### MHCT Organization

| Repository | Description |
|---|---|
| [m-h-c-t/mh-helper-extension](https://github.com/m-h-c-t/mh-helper-extension) | Chrome/Firefox extension for data collection (TypeScript) |
| [mh-community-tools/mh-hunt-helper](https://github.com/mh-community-tools/mh-hunt-helper) | PHP backend powering mhct.win |
| [m-h-c-t/db-client](https://github.com/m-h-c-t/db-client) | CLI tool for querying MHCT database |

### MarketHunt

| Repository | Description |
|---|---|
| [vsong/markethunt](https://github.com/vsong/markethunt) | MarketHunt backend API (PHP, MIT license) |

### Other Tools

| Repository | Description |
|---|---|
| [tsitu/MH-Tools](https://github.com/tsitu/MH-Tools) | Catch rate estimator, map solver, best setup tools |
| [nobodyrandom/mhAutobot](https://github.com/nobodyrandom/mhAutobot) | Autobot demonstrating endpoint usage |

### Reference

| Resource | URL |
|---|---|
| MouseHunt Wiki | [mhwiki.hitgrab.com](https://mhwiki.hitgrab.com/wiki/index.php/MouseHunt) |
| Community API Docs | [api-docs.mouse.rip](https://api-docs.mouse.rip/) |
| Greasy Fork Scripts | [greasyfork.org (mousehuntgame.com)](https://greasyfork.org/en/scripts/by-site/mousehuntgame.com) |
