"""Main Textual application for mh-tools."""

from __future__ import annotations

import logging

from textual.app import App
from textual.theme import Theme

from mh_tools.database import Database
from mh_tools.providers.markethunt import MarketHuntProvider
from mh_tools.providers.mhct import MHCTProvider
from mh_tools.ui.screens.analyser import AnalyserScreen

midnight_theme = Theme(
    name="midnight",
    primary="#e3b341",
    secondary="#58a6ff",
    accent="#f78166",
    foreground="#c9d1d9",
    background="#0d1117",
    success="#3fb950",
    warning="#d29922",
    error="#f85149",
    surface="#161b22",
    panel="#1c2129",
    dark=True,
    variables={
        "block-cursor-text-style": "none",
        "footer-key-foreground": "#e3b341",
        "input-selection-background": "#e3b341 25%",
        "input-cursor-foreground": "#e3b341",
    },
)


class MHToolsApp(App):
    """MouseHunt Tools terminal UI."""

    TITLE = "MH Tools"
    ENABLE_COMMAND_PALETTE = False

    BINDINGS = [
        ("ctrl+c", "quit", "Quit"),
    ]

    def __init__(self, db_path: str = "./data/mh_tools.db"):
        super().__init__()
        logging.getLogger("mh_tools").setLevel(logging.CRITICAL)
        self.db = Database(db_path)
        self.db.initialize()
        self.mhct = MHCTProvider()
        self.markethunt = MarketHuntProvider()
        self.register_theme(midnight_theme)
        self.theme = "midnight"

    def on_mount(self) -> None:
        self.install_screen(
            AnalyserScreen(db=self.db, mhct=self.mhct, markethunt=self.markethunt),
            name="analyser",
        )
        self.push_screen("analyser")
