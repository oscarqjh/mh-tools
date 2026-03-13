"""Chest search input with type-ahead suggestions."""

from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import Vertical
from textual.events import Key
from textual.message import Message
from textual.widgets import Input, OptionList
from textual.widgets.option_list import Option


def filter_suggestions(items: list[dict], query: str) -> list[dict]:
    """Filter item list by case-insensitive substring match."""
    if not query:
        return items
    q = query.lower()
    return [item for item in items if q in item["name"].lower()]


class ChestSearch(Vertical):
    """Search input with dropdown suggestions for chest names.

    Arrow Down/Up from the input navigates the suggestion list.
    Enter on a highlighted suggestion selects it.
    Any typing refocuses the input.
    """

    class ChestSelected(Message):
        """Fired when a chest is selected from suggestions."""

        def __init__(self, chest_id: int, chest_name: str) -> None:
            super().__init__()
            self.chest_id = chest_id
            self.chest_name = chest_name

    BINDINGS = [
        ("down", "focus_suggestions", "Browse"),
        ("enter", "select_highlighted", "Select"),
    ]

    DEFAULT_CSS = """
    ChestSearch {
        height: 1fr;
    }
    ChestSearch #chest-input {
        height: 3;
        dock: top;
    }
    ChestSearch #chest-suggestions {
        height: 1fr;
    }
    """

    def __init__(self, items: list[dict] | None = None, **kwargs):
        super().__init__(**kwargs)
        self._items = items or []
        self._filtered: list[dict] = []

    def compose(self) -> ComposeResult:
        yield Input(placeholder="Search chests... (arrows to browse)", id="chest-input")
        yield OptionList(id="chest-suggestions")

    def on_mount(self) -> None:
        self._update_suggestions("")

    def on_input_changed(self, event: Input.Changed) -> None:
        self._update_suggestions(event.value)

    def on_key(self, event: Key) -> None:
        option_list = self.query_one("#chest-suggestions", OptionList)
        input_widget = self.query_one("#chest-input", Input)

        if event.key == "down" and input_widget.has_focus:
            # Move focus to option list and highlight first item
            option_list.focus()
            if option_list.option_count > 0:
                option_list.highlighted = 0
            event.prevent_default()
            event.stop()
        elif event.key == "up" and option_list.has_focus:
            # If at top of list, return focus to input
            if option_list.highlighted is not None and option_list.highlighted <= 0:
                input_widget.focus()
                event.prevent_default()
                event.stop()
        elif event.key == "enter" and option_list.has_focus:
            # Select the highlighted option
            idx = option_list.highlighted
            if idx is not None and 0 <= idx < len(self._filtered):
                item = self._filtered[idx]
                self.post_message(self.ChestSelected(item["id"], item["name"]))
                event.prevent_default()
                event.stop()

    def on_option_list_option_selected(self, event: OptionList.OptionSelected) -> None:
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
