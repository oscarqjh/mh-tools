"""CLI entry point for mh-tools."""

from __future__ import annotations

import argparse
import logging
import sys

from mh_tools.database import Database
from mh_tools.models import AnalysisResult
from mh_tools.providers.markethunt import MarketHuntProvider
from mh_tools.providers.mhct import MHCTProvider
from mh_tools.tools.map_value import MapValueAnalyser


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mh-tools",
        description="MouseHunt community tools",
    )
    parser.add_argument(
        "--db-path", default="./data/mh_tools.db",
        help="Path to SQLite database (default: ./data/mh_tools.db)",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true",
        help="Enable verbose logging",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # analyse
    analyse_parser = subparsers.add_parser("analyse", help="Analyse chest expected value")
    analyse_parser.add_argument("--chest", required=True, help="Chest name to analyse")
    analyse_parser.add_argument("--after-tax", action="store_true", help="Show after 10%% marketplace tax")

    # clear-cache
    subparsers.add_parser("clear-cache", help="Clear all cached data")

    # add-mapping
    mapping_parser = subparsers.add_parser("add-mapping", help="Add a name mapping (MHCT -> MarketHunt)")
    mapping_parser.add_argument("--mhct", required=True, help="MHCT item name")
    mapping_parser.add_argument("--markethunt", required=True, help="MarketHunt item name")

    # sync-prices
    subparsers.add_parser("sync-prices", help="Fetch all MarketHunt prices into local cache")

    return parser


def run_analyse(args) -> None:
    """Execute the analyse command."""
    db = Database(args.db_path)
    db.initialize()
    mhct = MHCTProvider()
    markethunt = MarketHuntProvider()
    analyser = MapValueAnalyser(db=db, mhct=mhct, markethunt=markethunt)

    try:
        result = analyser.run(chest_name=args.chest)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    _print_result(result, show_after_tax=getattr(args, "after_tax", False))


def run_clear_cache(args) -> None:
    """Execute the clear-cache command."""
    db = Database(args.db_path)
    db.initialize()
    db.clear_cache()
    print("Cache cleared.")


def run_add_mapping(args) -> None:
    """Execute the add-mapping command."""
    db = Database(args.db_path)
    db.initialize()
    db.add_mapping(args.mhct, args.markethunt)
    print(f"Mapping added: '{args.mhct}' -> '{args.markethunt}'")


def run_sync_prices(args) -> None:
    """Fetch all MarketHunt prices and store in local DB."""
    from datetime import datetime, timezone
    from mh_tools.models import Price

    db = Database(args.db_path)
    db.initialize()
    markethunt = MarketHuntProvider()

    print("Fetching all MarketHunt items...")
    items = markethunt.get_all_items()

    now = datetime.now(timezone.utc)
    prices = [
        Price(
            item_name=item["name"],
            markethunt_id=item["item_id"],
            gold_price=item["gold_price"],
            sb_price=item["sb_price"],
            last_updated=now,
        )
        for item in items
        if item.get("name")
    ]

    db.bulk_upsert_prices(prices)
    print(f"Synced {len(prices)} item prices.")


def _print_result(result: AnalysisResult, show_after_tax: bool = False) -> None:
    """Pretty-print an analysis result to stdout."""
    print(f"\n{'=' * 60}")
    print(f"  Chest: {result.chest_name}")
    print(f"  SB Rate: {result.sb_rate:,.0f} gold/SB")
    print(f"{'=' * 60}\n")

    # Header
    print(f"  {'Item':<30} {'Drop%':>7} {'AvgQty':>8} {'Price':>12} {'EV (Gold)':>12}")
    print(f"  {'-' * 30} {'-' * 7} {'-' * 8} {'-' * 12} {'-' * 12}")

    for item in result.items:
        if item.unmapped:
            price_str = "UNMAPPED"
            ev_str = "—"
        else:
            price_str = f"{item.gold_price:>12,}" if item.gold_price else "N/A"
            ev_str = f"{item.ev_gold:>12,.0f}"

        name = item.item_name[:30]
        print(f"  {name:<30} {item.drop_chance * 100:>6.1f}% {item.avg_quantity:>8.1f} {price_str:>12} {ev_str:>12}")

    print(f"\n  {'─' * 60}")
    print(f"  Total EV (Gold):          {result.total_ev_gold:>12,.0f}")
    print(f"  Total EV (SB):            {result.total_ev_sb:>12,.2f}")

    if show_after_tax:
        print(f"  After Tax EV (Gold):      {result.total_ev_gold_after_tax:>12,.0f}")
        print(f"  After Tax EV (SB):        {result.total_ev_sb_after_tax:>12,.2f}")

    if result.warnings:
        print(f"\n  Warnings:")
        for w in result.warnings:
            print(f"    ⚠ {w}")

    print()


def main() -> None:
    """Main CLI entry point."""
    parser = build_parser()
    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG, format="%(levelname)s: %(message)s")
    else:
        logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

    commands = {
        "analyse": run_analyse,
        "clear-cache": run_clear_cache,
        "add-mapping": run_add_mapping,
        "sync-prices": run_sync_prices,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
