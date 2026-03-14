# MH Tools TUI — Design System

## Aesthetic Direction: **Midnight Terminal**

A refined, data-focused dark interface inspired by financial terminals and
modern CLI tools (lazygit, btop). The design prioritises **information density
without clutter**, using colour strategically to encode meaning rather than
decoration. Every colour choice maps to a domain concept.

---

## 1. Colour Palette

All colours are defined as Textual theme tokens so widgets use `$primary`,
`$accent`, etc. instead of raw hex values.

| Token          | Hex       | Role                                           |
|----------------|-----------|-------------------------------------------------|
| `background`   | `#0d1117` | Deep blue-black canvas (GitHub dark feel)       |
| `surface`      | `#161b22` | Raised panels, cards                            |
| `panel`        | `#1c2129` | Borders, separators, subtle elevation           |
| `foreground`   | `#c9d1d9` | Primary readable text                           |
| `primary`      | `#e3b341` | **Gold** — maps to gold currency, headers       |
| `secondary`    | `#58a6ff` | **SB Blue** — maps to Super|Brie+ currency      |
| `accent`       | `#f78166` | Warm orange — warnings, attention, hover states |
| `success`      | `#3fb950` | Positive values, confirmations                  |
| `warning`      | `#d29922` | Caution states, stale data indicators           |
| `error`        | `#f85149` | Errors, negative values, unmapped items         |

### Semantic Colour Usage

- **Gold prices/EV** → `$primary` (warm gold `#e3b341`)
- **SB prices/EV** → `$secondary` (cool blue `#58a6ff`)
- **Non-tradeable items** → `dim` / `$text-muted`
- **Unmapped items** → `$error` (red, needs attention)
- **Stale prices** → `$warning` with italic
- **Drop percentages** → `$foreground` (neutral, factual)
- **Section headers** → `$primary` bold uppercase
- **Keyboard hints** → `dim` text in brackets

---

## 2. Typography & Text Hierarchy

Terminal UIs rely on weight, case, and colour — not font choice.

| Level             | Style                                        | Example             |
|-------------------|----------------------------------------------|---------------------|
| **App title**     | Bold, `$primary`                             | `MH TOOLS`          |
| **Section header**| Bold uppercase, `$primary`                   | `CHEST SEARCH`      |
| **Field label**   | Normal, `$foreground`                        | `After Tax:`        |
| **Data value**    | Normal, semantic colour                      | `12,450` in gold    |
| **Secondary info**| `dim`, smaller visual weight                 | `(10% tax applied)` |
| **Keyboard hint** | `dim`, brackets                              | `[t] toggle tax`    |
| **Placeholder**   | Italic, `dim`                                | `type to search...` |

---

## 3. Border Language

Borders encode panel hierarchy and state.

| Border style    | Usage                                        |
|-----------------|----------------------------------------------|
| `heavy`         | Active/focused panel outline                 |
| `round`         | Default panel outline                        |
| `tall`          | Input fields                                 |
| `none`          | Interior elements (avoid nested borders)     |

### Focus Indication

- Focused panel: border colour shifts to `$primary`
- Unfocused panel: border colour stays `$panel`
- Active input: border becomes `$primary` with `tall` style

---

## 4. Layout Architecture

```
+--[ MH TOOLS ]----------------------------------------------+
|                                                             |
| +--- CHEST SEARCH ---+  +--- ANALYSIS ----------------+    |
| |                     |  |                              |    |
| | > search input___   |  | Chest: Rare Map Dust        |    |
| |                     |  | EV: 34,200 Gold / 2.14 SB   |    |
| | > Chrome Charm Ch.. |  | SB Rate: 15,981 gold/SB     |    |
| |   Chrome Charm Pa.. |  |                              |    |
| |   Rare Map Dust     |  | Item      Drop% Gold EV ... |    |
| |   Simple Orb        |  | --------- ----- -------- -- |    |
| |                     |  | Chrome..  12.3% 4,200    .. |    |
| |                     |  | Simple..   8.1% 1,050    .. |    |
| |                     |  |                              |    |
| +---------------------+  +------------------------------+   |
|                                                             |
| [t] tax  [/] search  [q] quit           v0.1.0             |
+-------------------------------------------------------------+
```

### Panel Proportions

- **Search panel**: fixed `width: 38` — enough for chest names
- **Analysis panel**: `width: 1fr` — expands to fill remaining space
- **Footer**: standard Textual footer with keybindings
- **Header**: app title bar with `$primary` title

### Spacing Rules

- Panel inner padding: `1 2` (vertical horizontal)
- Between panels: `1` character gap (Textual gutter)
- Section headers: `0 0 1 0` margin below
- Controls row: compact `height: 3`

---

## 5. Component Specifications

### 5.1 Chest Search Widget

```
+--- CHEST SEARCH ------+
| > type to search...   |  <- Input with ">" prompt indicator
|                        |
|   Chrome Charm Chest   |  <- Unselected option (normal)
| > Rare Map Dust     <  |  <- Highlighted option (inverted bg + arrows)
|   Simple Orb           |  <- Unselected option (normal)
|   Treasure Chest       |
+------------------------+
```

**Behaviours:**
- Input field has `>` prefix rendered as border title or prompt
- OptionList highlights use `$primary` background with dark text (inverted)
- Arrow indicators `>` and `<` on highlighted row (via Rich markup)
- Typing filters list with case-insensitive substring matching
- Down arrow from input focuses list; Up at top returns to input
- Selected item name appears in input field after selection
- Border title: `CHEST SEARCH` in `$primary`

### 5.2 Analysis Panel

```
+--- ANALYSIS ------------------------------------+
|                                                  |
|  CHROME CHARM CHEST                              |  <- Chest name, bold $primary
|  EV  34,200 Gold  |  2.14 SB  |  Rate 15,981    |  <- Summary bar
|                                                  |
|  Item           Drop%  Qty  Gold Price  Gold EV  |  <- Column headers, dim
|  ─────────────  ─────  ───  ──────────  ───────  |
|  Chrome Charm   12.3%  1.0     4,200     517     |  <- Normal row
|  Simple Orb      8.1%  1.0     1,050      85     |  <- Normal row
|  Map Dust        3.2%  2.0       N/T     ---     |  <- Non-tradeable, dim
|  Unknown Item    1.1%  1.0  UNMAPPED     ---     |  <- Unmapped, red
|                                                  |
|  [t] Toggle tax   After Tax: OFF                 |  <- Controls row
|                                                  |
|  ! 2 items have stale prices (>1h old)           |  <- Warning, $accent
+--------------------------------------------------+
```

**Behaviours:**
- Border title: `ANALYSIS` in `$primary`
- Summary bar uses semantic colours: gold value in `$primary`, SB in `$secondary`
- DataTable rows are colour-coded by item status
- Column headers are dim/uppercase for separation
- Controls row is compact with clear toggle state
- Warnings appear at bottom with `!` prefix in `$accent`

### 5.3 Summary Bar

The summary bar sits above the DataTable and displays key metrics:

```
  EV  34,200 Gold  |  2.14 SB  |  Rate 15,981 gold/SB
      ^^^^^^ $primary  ^^^^ $secondary
```

- Gold values: `$primary` (warm gold)
- SB values: `$secondary` (cool blue)
- Labels: `$foreground` normal
- Separators: `dim` pipe characters
- Tax indicator: appended in `dim` when active

### 5.4 Footer

Standard Textual `Footer` widget with keybindings. The custom theme
will style it automatically via theme tokens.

---

## 6. DataTable Styling

Rows are styled using `rich.text.Text` objects for per-cell colour control.

| Cell content    | Style                                     |
|-----------------|-------------------------------------------|
| Item name       | `$foreground`, truncated to 30 chars       |
| Drop %          | `$foreground`                              |
| Avg Qty         | `$foreground`                              |
| Gold Price      | `bold #e3b341` (gold)                      |
| Gold EV         | `bold #e3b341` (gold)                      |
| SB Price        | `bold #58a6ff` (blue)                      |
| SB EV           | `bold #58a6ff` (blue)                      |
| `N/T`           | `dim italic` (non-tradeable)               |
| `UNMAPPED`      | `bold #f85149` (error red)                 |
| `---`           | `dim`                                      |
| `N/A`           | `dim italic`                               |

---

## 7. Interaction Patterns

### Keyboard Navigation

| Key         | Context         | Action                        |
|-------------|-----------------|-------------------------------|
| `Down`      | Search input    | Focus suggestion list         |
| `Up`        | List (top)      | Return focus to input         |
| `Enter`     | List            | Select highlighted chest      |
| `t`         | Anywhere        | Toggle after-tax display      |
| `Ctrl+C`    | Anywhere        | Quit application              |
| typing      | Search input    | Filter suggestions live       |

### State Transitions

1. **Launch** → Search input focused, list shows all chests, analysis panel
   shows placeholder text
2. **Type query** → List filters in real-time, highlight resets to first match
3. **Select chest** → Analysis panel shows loading indicator, then results
4. **Toggle tax** → Table and summary update in-place, switch reflects state

### Loading States

- While fetching chest list: search placeholder reads `loading chests...`
- While running analysis: summary reads `Analysing [chest name]...` in `dim italic`

---

## 8. Theme Implementation

```python
from textual.theme import Theme

midnight_theme = Theme(
    name="midnight",
    primary="#e3b341",       # Gold
    secondary="#58a6ff",     # SB Blue
    accent="#f78166",        # Warm orange
    foreground="#c9d1d9",    # Light grey text
    background="#0d1117",    # Deep blue-black
    success="#3fb950",       # Green
    warning="#d29922",       # Amber
    error="#f85149",         # Red
    surface="#161b22",       # Raised panels
    panel="#1c2129",         # Borders
    dark=True,
    variables={
        "block-cursor-text-style": "none",
        "footer-key-foreground": "#e3b341",
        "input-selection-background": "#e3b341 25%",
        "input-cursor-foreground": "#e3b341",
    },
)
```

---

## 9. Design Principles

1. **Colour encodes meaning** — Gold is gold, blue is SB. Never decorative.
2. **Dim > hide** — Secondary info is dimmed, not removed. Data density matters.
3. **One focus at a time** — Only the active panel has a bright border.
4. **Keyboard-first** — Every action reachable without a mouse. Hints visible.
5. **No surprises** — Standard terminal conventions. Arrows navigate, Enter selects.
6. **Graceful degradation** — Works in 16-colour terminals (Textual handles this).
