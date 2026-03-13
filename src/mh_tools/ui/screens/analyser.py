"""Map Value Analyser screen for the TUI."""

from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import DataTable, Footer, Header, Label, Switch, Static
from textual import work

from mh_tools.database import Database
from mh_tools.models import AnalysisResult
from mh_tools.providers.markethunt import MarketHuntProvider
from mh_tools.providers.mhct import MHCTProvider
from mh_tools.tools.map_value import MapValueAnalyser
from mh_tools.ui.widgets.chest_search import ChestSearch


class AnalyserScreen(Screen):
    """Interactive Map Value Analyser screen."""

    BINDINGS = [
        ("ctrl+c", "quit", "Quit"),
        ("t", "toggle_tax", "Toggle Tax"),
    ]

    CSS = """
    Screen {
        overflow: hidden hidden;
        height: 100%;
        max-height: 100%;
    }
    #main-container { height: 1fr; overflow: hidden; }
    #search-panel { width: 1fr; max-width: 40; padding: 1; height: 1fr; overflow: hidden; }
    #result-panel { width: 3fr; padding: 1; height: 1fr; overflow: hidden; }
    #controls { height: 3; padding: 0 1; }
    #summary { height: 3; padding: 1; }
    #warnings { max-height: 6; color: yellow; padding: 0 1; overflow-y: auto; }
    DataTable { height: 1fr; }
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
                yield ChestSearch(id="chest-search")
            with Vertical(id="result-panel"):
                with Horizontal(id="controls"):
                    yield Label("After Tax: ")
                    yield Switch(value=False, id="tax-switch")
                yield Static("Select a chest to analyse.", id="summary")
                yield DataTable(id="results-table")
                yield Static("", id="warnings")
        yield Footer()

    def on_mount(self) -> None:
        # Setup table columns (sync — no HTTP)
        table = self.query_one("#results-table", DataTable)
        table.add_columns("Item", "Drop%", "Avg Qty", "Gold Price", "Gold EV", "SB Price", "SB EV")
        # Load chest list in background thread (HTTP call)
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

    def on_chest_search_chest_selected(self, event: ChestSearch.ChestSelected) -> None:
        """Handle chest selection — run analysis in background thread."""
        self._run_analysis(event.chest_name)

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
        summary.update(f"Error: {message}")

    def on_switch_changed(self, event: Switch.Changed) -> None:
        if event.switch.id == "tax-switch":
            self._show_after_tax = event.value
        self._refresh_table()

    def action_toggle_tax(self) -> None:
        switch = self.query_one("#tax-switch", Switch)
        switch.value = not switch.value

    def _refresh_table(self) -> None:
        if self._result is None:
            return

        result = self._result
        table = self.query_one("#results-table", DataTable)
        table.clear()

        for item in result.items:
            if item.non_tradeable:
                gold_price_str = "N/T"
                gold_ev_str = "---"
                sb_price_str = "N/T"
                sb_ev_str = "---"
            elif item.unmapped:
                gold_price_str = "UNMAPPED"
                gold_ev_str = "---"
                sb_price_str = "---"
                sb_ev_str = "---"
            else:
                gold_price_str = f"{item.gold_price:,}" if item.gold_price else "N/A"
                gold_ev_str = f"{item.ev_gold:,.0f}"
                sb_price_str = f"{item.sb_price:.2f}" if item.sb_price else "---"
                sb_ev_str = f"{item.ev_sb:.4f}"

            table.add_row(
                item.item_name[:35],
                f"{item.drop_chance * 100:.1f}%",
                f"{item.avg_quantity:.1f}",
                gold_price_str,
                gold_ev_str,
                sb_price_str,
                sb_ev_str,
            )

        # Summary
        if self._show_after_tax:
            gold_total = result.total_ev_gold_after_tax
            sb_total = result.total_ev_sb_after_tax
        else:
            gold_total = result.total_ev_gold
            sb_total = result.total_ev_sb

        tax_label = " (after 10% tax)" if self._show_after_tax else ""
        summary = self.query_one("#summary", Static)
        summary.update(
            f"Chest: {result.chest_name}  |  "
            f"EV: {gold_total:,.0f} Gold / {sb_total:,.2f} SB{tax_label}  |  "
            f"SB Rate: {result.sb_rate:,.0f} gold/SB"
        )

        # Warnings
        warnings_widget = self.query_one("#warnings", Static)
        if result.warnings:
            warnings_widget.update("\n".join(f"\u26a0 {w}" for w in result.warnings))
        else:
            warnings_widget.update("")
