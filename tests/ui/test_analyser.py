"""Tests for the AnalyserScreen."""

from unittest.mock import MagicMock, patch

import pytest
from textual.widgets import DataTable, Static

from mh_tools.models import AnalysisResult, ItemEV
from mh_tools.ui.screens.analyser import AnalyserScreen


@pytest.fixture
def mock_deps():
    db = MagicMock()
    mhct = MagicMock()
    markethunt = MagicMock()
    mhct.list_convertibles.return_value = [
        {"id": 1, "name": "Rare Treasure Chest"},
        {"id": 2, "name": "Relic Hunter Treasure Chest"},
    ]
    return db, mhct, markethunt


@pytest.fixture
def sample_result():
    return AnalysisResult(
        chest_name="Rare Treasure Chest",
        items=[
            ItemEV(
                item_name="Gold",
                drop_chance=1.0,
                avg_quantity=5000.0,
                gold_price=1,
                sb_price=0.00006,
                ev_gold=5000.0,
                ev_sb=0.31,
            ),
        ],
        total_ev_gold=5000.0,
        total_ev_sb=0.31,
        total_ev_gold_after_tax=4500.0,
        total_ev_sb_after_tax=0.279,
        sb_rate=16155.0,
        warnings=[],
    )


class TestAnalyserScreen:
    def test_creates(self, mock_deps):
        db, mhct, markethunt = mock_deps
        screen = AnalyserScreen(db=db, mhct=mhct, markethunt=markethunt)
        assert screen._result is None
        assert screen._show_after_tax is False

    def test_refresh_table_populates_rows(self, mock_deps, sample_result):
        """Test that _refresh_table fills the DataTable correctly."""
        from textual.app import App, ComposeResult

        db, mhct, markethunt = mock_deps

        class TestApp(App):
            def compose(self) -> ComposeResult:
                yield AnalyserScreen(db=db, mhct=mhct, markethunt=markethunt)

        async def run_test():
            async with TestApp().run_test() as pilot:
                screen = pilot.app.query_one(AnalyserScreen)
                screen._result = sample_result
                screen._refresh_table()

                table = screen.query_one("#results-table", DataTable)
                assert table.row_count == 1

                summary = screen.query_one("#summary", Static)
                assert "5,000" in summary.content

        import asyncio
        asyncio.get_event_loop().run_until_complete(run_test())
