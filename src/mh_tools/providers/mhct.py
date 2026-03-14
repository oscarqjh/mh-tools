"""MHCT (mhct.win) API provider."""

from __future__ import annotations

import ssl

import httpx

MHCT_BASE = "https://www.mhct.win"


def _make_tls12_context() -> ssl.SSLContext:
    """Create an SSL context that caps at TLS 1.2.

    Cloudflare's TLS 1.3 implementation on mhct.win triggers an
    INVALID_SESSION_ID bug in certain OpenSSL builds (notably the
    versions bundled with Git-for-Windows and Anaconda on Windows).
    Forcing TLS 1.2 works around the issue.
    """
    ctx = ssl.create_default_context()
    ctx.maximum_version = ssl.TLSVersion.TLSv1_2
    return ctx


class MHCTProvider:
    """Client for MHCT's searchByItem.php endpoint."""

    def __init__(self, client: httpx.Client | None = None):
        self.client = client or httpx.Client(
            timeout=30, verify=_make_tls12_context()
        )

    def list_convertibles(self) -> list[dict]:
        """Fetch all convertible items from MHCT.

        Returns list of {"id": int, "name": str}.
        """
        resp = self.client.get(
            f"{MHCT_BASE}/searchByItem.php",
            params={"item_id": "all", "item_type": "convertible"},
        )
        resp.raise_for_status()
        raw = resp.json()
        return [{"id": item["id"], "name": item["value"]} for item in raw]

    def get_convertible_drops(self, mhct_id: int) -> list[dict]:
        """Fetch drop data for a specific convertible.

        Returns list of dicts with keys:
            item_name, drop_chance, avg_quantity

        Note: MHCT also returns item_gold_value and item_sb_value per drop,
        but we intentionally fetch prices from MarketHunt instead for fresher data.
        """
        resp = self.client.get(
            f"{MHCT_BASE}/searchByItem.php",
            params={"item_id": str(mhct_id), "item_type": "convertible"},
        )
        resp.raise_for_status()
        raw = resp.json()

        drops = []
        for entry in raw:
            single_opens = entry.get("single_opens", 0)
            times_with_any = entry.get("times_with_any", 0)
            total_qty_when_any = entry.get("total_quantity_when_any", 0)

            if single_opens == 0 or times_with_any == 0:
                continue

            drops.append({
                "item_name": entry["item"],
                "drop_chance": times_with_any / single_opens,
                "avg_quantity": total_qty_when_any / times_with_any,
            })
        return drops

    def search_convertible(self, query: str) -> list[dict]:
        """Search convertibles by name (case-insensitive substring match).

        Fetches the full list and filters client-side since MHCT has no search param.
        Returns list of {"id": int, "name": str}.
        """
        all_convertibles = self.list_convertibles()
        query_lower = query.lower()
        return [c for c in all_convertibles if query_lower in c["name"].lower()]
