"""Chest search input with type-ahead suggestions."""

from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import Vertical
from textual.message import Message
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import Input, OptionList
from textual.widgets.option_list import Option


def filter_suggestions(items: list[dict], query: str) -> list[dict]:
    """Filter item list by case-insensitive substring match."""
    if not query:
        return items
    q = query.lower()
    return [item for item in items if q in item["name"].lower()]


class ChestSearch(Widget):
    """Search input with dropdown suggestions for chest names."""

    class ChestSelected(Message):
        """Fired when a chest is selected from suggestions."""

        def __init__(self, chest_id: int, chest_name: str) -> None:
            super().__init__()
            self.chest_id = chest_id
            self.chest_name = chest_name

    def __init__(self, items: list[dict] | None = None, **kwargs):
        super().__init__(**kwargs)
        self._items = items or []
        self._filtered: list[dict] = []  # Track filtered list for index-based lookup

    def compose(self) -> ComposeResult:
        yield Input(placeholder="Search chests...", id="chest-input")
        yield OptionList(id="chest-suggestions")

    def on_mount(self) -> None:
        self._update_suggestions("")

    def on_input_changed(self, event: Input.Changed) -> None:
        self._update_suggestions(event.value)

    def on_option_list_option_selected(self, event: OptionList.OptionSelected) -> None:
        # Use index-based lookup into filtered list (avoids fragile string matching)
        idx = event.option_index
        if 0 <= idx < len(self._filtered):
            item = self._filtered[idx]
            self.post_message(self.ChestSelected(item["id"], item["name"]))

    def set_items(self, items: list[dict]) -> None:
        """Update the available items list."""
        self._items = items
        input_widget = self.query_one("#chest-input", Input)
        self._update_suggestions(input_widget.value)

    def _update_suggestions(self, query: str) -> None:
        option_list = self.query_one("#chest-suggestions", OptionList)
        option_list.clear_options()
        self._filtered = filter_suggestions(self._items, query)[:20]
        for item in self._filtered:
            option_list.add_option(Option(item["name"]))
