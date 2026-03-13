"""Main Textual application for mh-tools."""

from __future__ import annotations

from textual.app import App

from mh_tools.database import Database
from mh_tools.providers.markethunt import MarketHuntProvider
from mh_tools.providers.mhct import MHCTProvider
from mh_tools.ui.screens.analyser import AnalyserScreen


class MHToolsApp(App):
    """MouseHunt Tools terminal UI."""

    TITLE = "MH Tools"
    CSS = """
    Screen { layout: horizontal; }
    """

    BINDINGS = [
        ("q", "quit", "Quit"),
    ]

    def __init__(self, db_path: str = "./data/mh_tools.db"):
        super().__init__()
        self.db = Database(db_path)
        self.db.initialize()
        self.mhct = MHCTProvider()
        self.markethunt = MarketHuntProvider()

    def on_mount(self) -> None:
        self.push_screen(
            AnalyserScreen(db=self.db, mhct=self.mhct, markethunt=self.markethunt)
        )
