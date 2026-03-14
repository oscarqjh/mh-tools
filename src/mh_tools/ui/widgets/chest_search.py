"""Chest search input with type-ahead suggestions."""

from __future__ import annotations

import textwrap

from textual.app import ComposeResult
from textual.containers import Vertical
from textual.events import Key
from textual.message import Message
from rich.text import Text

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
        border: round $panel;
        border-title-color: $primary;
        border-title-style: bold;
        padding: 0 1;
    }
    ChestSearch:focus-within {
        border: round $primary;
    }
    ChestSearch #chest-input {
        height: 3;
        dock: top;
        border: heavy $panel;
        background: $surface;
        padding: 0 1;
        margin: 0 0 1 0;
    }
    ChestSearch #chest-input:focus {
        border: heavy $primary;
    }
    ChestSearch #chest-suggestions {
        height: 1fr;
        background: $surface;
        border: none;
        scrollbar-size: 1 1;
    }
    ChestSearch #chest-suggestions > .option-list--option-highlighted {
        background: $primary 20%;
        color: $primary;
        text-style: bold;
    }
    """

    def __init__(self, items: list[dict] | None = None, **kwargs):
        super().__init__(**kwargs)
        self._items = items or []
        self._filtered: list[dict] = []
        self._favorites: set[str] = set()
        self.border_title = "CHEST SEARCH"

    def compose(self) -> ComposeResult:
        yield Input(placeholder="type to search...", id="chest-input")
        yield OptionList(id="chest-suggestions")

    def on_mount(self) -> None:
        self._update_suggestions("")

    def on_input_changed(self, event: Input.Changed) -> None:
        self._update_suggestions(event.value)

    def on_option_list_option_highlighted(self, event: OptionList.OptionHighlighted) -> None:
        """Update arrow indicator on highlighted option."""
        option_list = self.query_one("#chest-suggestions", OptionList)
        for i in range(option_list.option_count):
            opt = option_list.get_option_at_index(i)
            plain = opt.prompt.plain if isinstance(opt.prompt, Text) else str(opt.prompt)
            # Strip the 2-char prefix (either "> " or "  ")
            text = plain[2:] if len(plain) > 2 else plain
            prefix = "> " if i == event.option_index else "  "
            # Preserve gold color for favorites
            is_fav = self._filtered[i]["name"] in self._favorites if i < len(self._filtered) else False
            new_prompt = Text(prefix + text, style="#e3b341" if is_fav else "")
            option_list.replace_option_prompt_at_index(i, new_prompt)

    def on_key(self, event: Key) -> None:
        option_list = self.query_one("#chest-suggestions", OptionList)
        input_widget = self.query_one("#chest-input", Input)

        if event.key == "down" and input_widget.has_focus:
            option_list.focus()
            if option_list.option_count > 0:
                option_list.highlighted = 0
            event.prevent_default()
            event.stop()
        elif event.key == "up" and option_list.has_focus:
            if option_list.highlighted is not None and option_list.highlighted <= 0:
                input_widget.focus()
                event.prevent_default()
                event.stop()
        elif event.key == "enter" and option_list.has_focus:
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

    def get_highlighted_name(self) -> str | None:
        """Return the name of the currently highlighted chest, or None."""
        option_list = self.query_one("#chest-suggestions", OptionList)
        idx = option_list.highlighted
        if idx is not None and 0 <= idx < len(self._filtered):
            return self._filtered[idx]["name"]
        return None

    def set_items(self, items: list[dict]) -> None:
        """Update the available items list."""
        self._items = items
        input_widget = self.query_one("#chest-input", Input)
        self._update_suggestions(input_widget.value)

    def set_favorites(self, favorites: set[str]) -> None:
        """Update the favorites set and refresh display."""
        self._favorites = favorites
        input_widget = self.query_one("#chest-input", Input)
        self._update_suggestions(input_widget.value)

    def _update_suggestions(self, query: str) -> None:
        option_list = self.query_one("#chest-suggestions", OptionList)
        option_list.clear_options()
        self._filtered = filter_suggestions(self._items, query)[:20]
        indent = "  "
        line_width = 31
        for item in self._filtered:
            name = item["name"]
            wrapped = textwrap.fill(
                name, width=line_width,
                initial_indent=indent,
                subsequent_indent=indent,
            )
            if name in self._favorites:
                prompt = Text(wrapped, style="#e3b341")
            else:
                prompt = Text(wrapped)
            option_list.add_option(Option(prompt))
