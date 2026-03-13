"""Main Textual application for mh-tools."""

from __future__ import annotations

import logging

from textual.app import App

from mh_tools.database import Database
from mh_tools.providers.markethunt import MarketHuntProvider
from mh_tools.providers.mhct import MHCTProvider
from mh_tools.ui.screens.analyser import AnalyserScreen


class MHToolsApp(App):
    """MouseHunt Tools terminal UI."""

    TITLE = "MH Tools"
    ENABLE_COMMAND_PALETTE = False

    BINDINGS = [
        ("ctrl+c", "quit", "Quit"),
    ]

    def __init__(self, db_path: str = "./data/mh_tools.db"):
        super().__init__()
        # Suppress library warnings from printing to stderr (corrupts TUI)
        logging.getLogger("mh_tools").setLevel(logging.CRITICAL)
        self.db = Database(db_path)
        self.db.initialize()
        self.mhct = MHCTProvider()
        self.markethunt = MarketHuntProvider()

    def on_mount(self) -> None:
        self.install_screen(
            AnalyserScreen(db=self.db, mhct=self.mhct, markethunt=self.markethunt),
            name="analyser",
        )
        self.push_screen("analyser")
