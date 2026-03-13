"""Tests for CLI entry point."""

import pytest
from unittest.mock import patch, MagicMock

from mh_tools.main import build_parser, run_analyse, run_clear_cache


class TestParser:
    def test_analyse_subcommand(self):
        parser = build_parser()
        args = parser.parse_args(["analyse", "--chest", "Rare Treasure Chest"])
        assert args.command == "analyse"
        assert args.chest == "Rare Treasure Chest"

    def test_analyse_with_tax(self):
        parser = build_parser()
        args = parser.parse_args(["analyse", "--chest", "Test", "--after-tax"])
        assert args.after_tax is True

    def test_clear_cache(self):
        parser = build_parser()
        args = parser.parse_args(["clear-cache"])
        assert args.command == "clear-cache"

    def test_add_mapping(self):
        parser = build_parser()
        args = parser.parse_args(["add-mapping", "--mhct", "SB+", "--markethunt", "SUPER|brie+"])
        assert args.command == "add-mapping"
        assert args.mhct == "SB+"
        assert args.markethunt == "SUPER|brie+"


class TestRunAnalyse:
    @patch("mh_tools.main.MapValueAnalyser")
    @patch("mh_tools.main.MarketHuntProvider")
    @patch("mh_tools.main.MHCTProvider")
    @patch("mh_tools.main.Database")
    def test_prints_result(self, MockDB, MockMHCT, MockMH, MockAnalyser, capsys):
        from mh_tools.models import AnalysisResult, ItemEV

        mock_result = AnalysisResult(
            chest_name="Test Chest",
            items=[
                ItemEV(item_name="Gold", drop_chance=1.0, avg_quantity=5000.0, gold_price=1, ev_gold=5000.0, ev_sb=0.31),
            ],
            total_ev_gold=5000.0,
            total_ev_sb=0.31,
            total_ev_gold_after_tax=4500.0,
            total_ev_sb_after_tax=0.279,
            sb_rate=16155.0,
            warnings=[],
        )
        MockAnalyser.return_value.run.return_value = mock_result

        args = MagicMock()
        args.chest = "Test Chest"
        args.after_tax = False
        args.db_path = "./data/mh_tools.db"

        run_analyse(args)

        captured = capsys.readouterr()
        assert "Test Chest" in captured.out
        assert "Gold" in captured.out
        assert "5000" in captured.out or "5,000" in captured.out


class TestSyncPricesParser:
    def test_sync_prices(self):
        parser = build_parser()
        args = parser.parse_args(["sync-prices"])
        assert args.command == "sync-prices"


class TestRunSyncPrices:
    @patch("mh_tools.main.MarketHuntProvider")
    @patch("mh_tools.main.Database")
    def test_syncs_prices(self, MockDB, MockMarkethunt, capsys):
        from mh_tools.main import run_sync_prices

        mock_db = MockDB.return_value
        mock_mh = MockMarkethunt.return_value
        mock_mh.get_all_items.return_value = [
            {"item_id": 1, "name": "Gold", "gold_price": 1, "sb_price": 0.00006},
            {"item_id": 2, "name": "Cheese", "gold_price": 100, "sb_price": 0.006},
        ]

        args = MagicMock()
        args.db_path = "./data/mh_tools.db"
        run_sync_prices(args)

        mock_db.bulk_upsert_prices.assert_called_once()
        prices = mock_db.bulk_upsert_prices.call_args[0][0]
        assert len(prices) == 2
        captured = capsys.readouterr()
        assert "Synced 2 item prices" in captured.out


class TestRunClearCache:
    @patch("mh_tools.main.Database")
    def test_clears_cache(self, MockDB, capsys):
        from mh_tools.main import run_clear_cache

        args = MagicMock()
        args.db_path = "./data/mh_tools.db"
        run_clear_cache(args)

        MockDB.return_value.clear_cache.assert_called_once()
        captured = capsys.readouterr()
        assert "Cache cleared" in captured.out


class TestRunAddMapping:
    @patch("mh_tools.main.Database")
    def test_adds_mapping(self, MockDB, capsys):
        from mh_tools.main import run_add_mapping

        args = MagicMock()
        args.db_path = "./data/mh_tools.db"
        args.mhct = "SB+"
        args.markethunt = "SUPER|brie+"
        run_add_mapping(args)

        MockDB.return_value.add_mapping.assert_called_once_with("SB+", "SUPER|brie+")
        captured = capsys.readouterr()
        assert "Mapping added" in captured.out
