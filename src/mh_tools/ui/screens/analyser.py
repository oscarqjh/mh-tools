"""Map Value Analyser screen for the TUI."""

from __future__ import annotations

from rich.text import Text

from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import DataTable, Footer, Header, Static
from textual import work

from mh_tools.database import Database
from mh_tools.models import AnalysisResult
from mh_tools.providers.markethunt import MarketHuntProvider
from mh_tools.providers.mhct import MHCTProvider
from mh_tools.tools.map_value import MapValueAnalyser
from mh_tools.ui.widgets.chest_search import ChestSearch
from mh_tools.ui.widgets.favorites import FavoritesList

# -- Rich text style constants ------------------------------------------------
GOLD = "bold #e3b341"
SB_BLUE = "bold #58a6ff"
DIM = "dim"
DIM_ITALIC = "dim italic"
ERR = "bold #f85149"
NORMAL = "#c9d1d9"
ACCENT = "#f78166"


class AnalyserScreen(Screen):
    """Interactive Map Value Analyser screen."""

    BINDINGS = [
        ("ctrl+c", "quit", "Quit"),
        ("t", "toggle_tax", "Toggle Tax"),
        ("f", "toggle_favorite", "Favorite"),
        ("1", "focus_favorites", "Favorites"),
        ("2", "focus_search", "Search"),
        ("3", "focus_table", "Table"),
        ("escape", "focus_search", "Search"),
    ]

    CSS = """
    Screen {
        overflow: hidden hidden;
        height: 100%;
        max-height: 100%;
    }
    #main-container {
        height: 1fr;
        overflow: hidden;
    }
    #search-panel {
        width: 38;
        padding: 1 0 0 1;
        height: 1fr;
        overflow: hidden;
    }
    #result-panel {
        width: 1fr;
        padding: 1 1 0 1;
        height: 1fr;
        overflow: hidden;
        border: round $panel;
        border-title-color: $primary;
        border-title-style: bold;
        margin: 1 1 0 0;
    }
    #result-panel:focus-within {
        border: round $primary;
    }
    #tax-status {
        height: 1;
        padding: 0 1;
        color: $text-muted;
    }
    #summary {
        height: auto;
        min-height: 3;
        padding: 1 1;
        background: $surface;
        margin: 0 1 1 1;
    }
    #warnings {
        max-height: 4;
        color: $accent;
        padding: 0 1;
        overflow-y: auto;
    }
    DataTable {
        height: 1fr;
        margin: 0 1;
    }
    """

    def __init__(self, db: Database, mhct: MHCTProvider, markethunt: MarketHuntProvider):
        super().__init__()
        self.db = db
        self.mhct = mhct
        self.markethunt = markethunt
        self._show_after_tax = False
        self._result: AnalysisResult | None = None

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="main-container"):
            with Vertical(id="search-panel"):
                yield FavoritesList(db=self.db, id="favorites-panel")
                yield ChestSearch(id="chest-search")
            with Vertical(id="result-panel") as panel:
                panel.border_title = "ANALYSIS"
                yield Static(
                    Text("[t] tax OFF", style=DIM),
                    id="tax-status",
                )
                yield Static(
                    Text("Select a chest to analyse", style=DIM_ITALIC),
                    id="summary",
                )
                yield DataTable(id="results-table")
                yield Static("", id="warnings")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#results-table", DataTable)
        table.add_columns(
            "Item",
            Text("Drop%", style=DIM),
            Text("Qty", style=DIM),
            Text("Gold Price", style=GOLD),
            Text("Gold EV", style=GOLD),
            Text("SB Price", style=SB_BLUE),
            Text("SB EV", style=SB_BLUE),
        )
        self._load_chests()

    @work(thread=True)
    def _load_chests(self) -> None:
        """Fetch chest list in a worker thread to avoid blocking the event loop."""
        try:
            items = self.mhct.list_convertibles()
        except Exception:
            items = []
        self.app.call_from_thread(self._set_chest_items, items)

    def _set_chest_items(self, items: list[dict]) -> None:
        search = self.query_one("#chest-search", ChestSearch)
        search.set_items(items)

    # -- Panel focus actions ---------------------------------------------------

    def action_focus_favorites(self) -> None:
        fav_list = self.query_one("#favorites-panel", FavoritesList)
        fav_list.focus_list()

    def action_focus_search(self) -> None:
        self.query_one("#chest-input").focus()

    def action_focus_table(self) -> None:
        self.query_one("#results-table", DataTable).focus()

    # -- Chest selection -------------------------------------------------------

    def on_favorites_list_favorite_selected(self, event: FavoritesList.FavoriteSelected) -> None:
        """Handle favorite selection — run analysis for that chest."""
        self._analyse_chest(event.chest_name)

    def on_chest_search_chest_selected(self, event: ChestSearch.ChestSelected) -> None:
        """Handle chest selection — run analysis in background thread."""
        self._analyse_chest(event.chest_name)

    def _analyse_chest(self, chest_name: str) -> None:
        """Show loading state and kick off analysis."""
        summary = self.query_one("#summary", Static)
        summary.update(Text(f"Analysing {chest_name}...", style=DIM_ITALIC))
        self._run_analysis(chest_name)

    @work(thread=True)
    def _run_analysis(self, chest_name: str) -> None:
        """Run analysis in a worker thread to avoid blocking the event loop."""
        analyser = MapValueAnalyser(
            db=self.db, mhct=self.mhct, markethunt=self.markethunt,
        )
        try:
            result = analyser.run(chest_name=chest_name)
            self.app.call_from_thread(self._apply_result, result)
        except ValueError as e:
            self.app.call_from_thread(self._show_error, str(e))

    def _apply_result(self, result: AnalysisResult) -> None:
        self._result = result
        self._refresh_table()

    def _show_error(self, message: str) -> None:
        summary = self.query_one("#summary", Static)
        summary.update(Text(f"Error: {message}", style=ERR))

    # -- Tax toggle (keyboard only, no Switch widget) --------------------------

    def action_toggle_tax(self) -> None:
        self._show_after_tax = not self._show_after_tax
        status = self.query_one("#tax-status", Static)
        if self._show_after_tax:
            status.update(Text("[t] tax ON", style="#3fb950"))
        else:
            status.update(Text("[t] tax OFF", style=DIM))
        self._refresh_table()

    # -- Favorites toggle ------------------------------------------------------

    def action_toggle_favorite(self) -> None:
        """Add or remove a chest from favorites.

        Uses the currently highlighted chest in the search list or favorites
        list.  Falls back to the analysed chest if nothing is highlighted.
        """
        search = self.query_one("#chest-search", ChestSearch)
        fav_panel = self.query_one("#favorites-panel", FavoritesList)

        name = search.get_highlighted_name() or fav_panel.get_highlighted_name()
        if name is None and self._result is not None:
            name = self._result.chest_name
        if name is None:
            return

        if self.db.is_favorite(name):
            self.db.remove_favorite(name)
        else:
            self.db.add_favorite(name)
        fav_panel.refresh_favorites()

    # -- Table rendering -------------------------------------------------------

    def _refresh_table(self) -> None:
        if self._result is None:
            return

        result = self._result
        table = self.query_one("#results-table", DataTable)
        table.clear()

        for item in result.items:
            if item.non_tradeable:
                gold_price_cell = Text("N/T", style=DIM_ITALIC)
                gold_ev_cell = Text("---", style=DIM)
                sb_price_cell = Text("N/T", style=DIM_ITALIC)
                sb_ev_cell = Text("---", style=DIM)
            elif item.unmapped:
                gold_price_cell = Text("UNMAPPED", style=ERR)
                gold_ev_cell = Text("---", style=DIM)
                sb_price_cell = Text("---", style=DIM)
                sb_ev_cell = Text("---", style=DIM)
            else:
                gold_price_cell = Text(
                    f"{item.gold_price:,}" if item.gold_price else "N/A",
                    style=GOLD if item.gold_price else DIM_ITALIC,
                )
                gold_ev_cell = Text(f"{item.ev_gold:,.0f}", style=GOLD)
                sb_price_cell = Text(
                    f"{item.sb_price:.2f}" if item.sb_price else "---",
                    style=SB_BLUE if item.sb_price else DIM,
                )
                sb_ev_cell = Text(f"{item.ev_sb:.4f}", style=SB_BLUE)

            name_style = DIM_ITALIC if item.non_tradeable else (ERR if item.unmapped else NORMAL)

            table.add_row(
                Text(item.item_name[:30], style=name_style),
                Text(f"{item.drop_chance * 100:.1f}%", style=NORMAL),
                Text(f"{item.avg_quantity:.1f}", style=NORMAL),
                gold_price_cell,
                gold_ev_cell,
                sb_price_cell,
                sb_ev_cell,
            )

        # Summary with semantic colours
        if self._show_after_tax:
            gold_total = result.total_ev_gold_after_tax
            sb_total = result.total_ev_sb_after_tax
        else:
            gold_total = result.total_ev_gold
            sb_total = result.total_ev_sb

        summary_text = Text()
        summary_text.append(result.chest_name.upper(), style="bold #e3b341")
        summary_text.append("\n")
        summary_text.append("EV  ", style="#c9d1d9")
        summary_text.append(f"{gold_total:,.0f} ", style=GOLD)
        summary_text.append("Gold", style="#c9d1d9")
        summary_text.append("  |  ", style=DIM)
        summary_text.append(f"{sb_total:,.2f} ", style=SB_BLUE)
        summary_text.append("SB", style="#c9d1d9")
        summary_text.append("  |  ", style=DIM)
        summary_text.append("Rate ", style="#c9d1d9")
        summary_text.append(f"{result.sb_rate:,.0f}", style="#c9d1d9")
        summary_text.append(" gold/SB", style=DIM)
        if self._show_after_tax:
            summary_text.append("  (after 10% tax)", style=DIM_ITALIC)

        summary = self.query_one("#summary", Static)
        summary.update(summary_text)

        # Warnings
        warnings_widget = self.query_one("#warnings", Static)
        if result.warnings:
            warn_text = Text()
            for i, w in enumerate(result.warnings):
                if i > 0:
                    warn_text.append("\n")
                warn_text.append("! ", style=f"bold {ACCENT}")
                warn_text.append(w, style=ACCENT)
            warnings_widget.update(warn_text)
        else:
            warnings_widget.update("")
