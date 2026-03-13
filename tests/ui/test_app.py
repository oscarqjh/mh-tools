"""Tests for TUI app initialization and screen mounting."""

import asyncio
from unittest.mock import MagicMock, patch

from mh_tools.ui.app import MHToolsApp
from mh_tools.ui.screens.analyser import AnalyserScreen
from mh_tools.ui.widgets.chest_search import ChestSearch
from textual.widgets import DataTable, Switch


class TestApp:
    def test_app_creates(self, tmp_path):
        db_path = str(tmp_path / "test.db")
        app = MHToolsApp(db_path=db_path)
        assert app.TITLE == "MH Tools"

    def test_app_mounts_analyser_screen(self, tmp_path):
        """Verify the app pushes AnalyserScreen with key widgets on mount."""
        db_path = str(tmp_path / "test.db")
        app = MHToolsApp(db_path=db_path)

        async def run_test():
            async with app.run_test() as pilot:
                # Allow multiple event loop cycles for push_screen to complete
                for _ in range(5):
                    await pilot.pause()

                # Verify AnalyserScreen is the active screen
                screen = pilot.app.screen
                assert isinstance(screen, AnalyserScreen)

                # Verify key widgets exist on the screen
                screen.query_one("#results-table", DataTable)
                screen.query_one("#chest-search", ChestSearch)
                screen.query_one("#tax-switch", Switch)
                screen.query_one("#sb-switch", Switch)

        asyncio.get_event_loop().run_until_complete(run_test())
