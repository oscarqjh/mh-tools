"""Tests for the chest search widget."""

import pytest
from mh_tools.ui.widgets.chest_search import filter_suggestions


class TestFilterSuggestions:
    def test_filters_by_substring(self):
        items = [
            {"id": 1, "name": "Rare Treasure Chest"},
            {"id": 2, "name": "Arduous Treasure Chest"},
            {"id": 3, "name": "Relic Hunter Treasure Chest"},
        ]
        result = filter_suggestions(items, "Relic")
        assert len(result) == 1
        assert result[0]["name"] == "Relic Hunter Treasure Chest"

    def test_case_insensitive(self):
        items = [{"id": 1, "name": "Rare Treasure Chest"}]
        result = filter_suggestions(items, "rare")
        assert len(result) == 1

    def test_empty_query_returns_all(self):
        items = [{"id": 1, "name": "A"}, {"id": 2, "name": "B"}]
        result = filter_suggestions(items, "")
        assert len(result) == 2

    def test_no_match_returns_empty(self):
        items = [{"id": 1, "name": "Something"}]
        result = filter_suggestions(items, "zzz")
        assert len(result) == 0
