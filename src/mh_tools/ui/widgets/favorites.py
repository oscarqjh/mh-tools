"""Favorites panel for quick access to saved chests."""

from __future__ import annotations

import textwrap

from rich.text import Text

from textual.app import ComposeResult
from textual.containers import Vertical
from textual.events import Key
from textual.message import Message
from textual.widgets import OptionList, Static
from textual.widgets.option_list import Option

from mh_tools.database import Database


class FavoritesList(Vertical):
    """Keyboard-navigable favorites panel.

    Arrow keys navigate the list, Enter selects, Escape returns to search.
    """

    class FavoriteSelected(Message):
        """Fired when a favorite chest is selected."""

        def __init__(self, chest_name: str) -> None:
            super().__init__()
            self.chest_name = chest_name

    DEFAULT_CSS = """
    FavoritesList {
        height: auto;
        max-height: 14;
        border: round $panel;
        border-title-color: $primary;
        border-title-style: bold;
        padding: 0 1;
    }
    FavoritesList:focus-within {
        border: round $primary;
    }
    FavoritesList #favorites-list {
        height: auto;
        max-height: 10;
        background: $surface;
        border: none;
        scrollbar-size: 1 1;
    }
    FavoritesList #favorites-list > .option-list--option-highlighted {
        background: $primary 20%;
        color: $primary;
        text-style: bold;
    }
    FavoritesList #favorites-empty {
        height: auto;
        padding: 1 1;
        color: $text-muted;
    }
    """

    def __init__(self, db: Database, **kwargs):
        super().__init__(**kwargs)
        self.db = db
        self.border_title = "FAVORITES"
        self._names: list[str] = []

    def compose(self) -> ComposeResult:
        yield OptionList(id="favorites-list")
        yield Static("[f] to add/remove", id="favorites-empty")

    def on_mount(self) -> None:
        self.refresh_favorites()

    def focus_list(self) -> None:
        """Focus the option list and highlight the first item."""
        option_list = self.query_one("#favorites-list", OptionList)
        if option_list.display and option_list.option_count > 0:
            option_list.focus()
            if option_list.highlighted is None:
                option_list.highlighted = 0

    def get_highlighted_name(self) -> str | None:
        """Return the name of the currently highlighted favorite, or None."""
        option_list = self.query_one("#favorites-list", OptionList)
        idx = option_list.highlighted
        if idx is not None and 0 <= idx < len(self._names):
            return self._names[idx]
        return None

    def on_option_list_option_highlighted(self, event: OptionList.OptionHighlighted) -> None:
        """Update arrow indicator on highlighted option."""
        option_list = self.query_one("#favorites-list", OptionList)
        for i in range(option_list.option_count):
            opt = option_list.get_option_at_index(i)
            plain = opt.prompt.plain if isinstance(opt.prompt, Text) else str(opt.prompt)
            text = plain[2:] if len(plain) > 2 else plain
            prefix = "> " if i == event.option_index else "  "
            option_list.replace_option_prompt_at_index(i, prefix + text)

    def on_key(self, event: Key) -> None:
        option_list = self.query_one("#favorites-list", OptionList)
        if event.key == "enter" and option_list.has_focus:
            idx = option_list.highlighted
            if idx is not None and 0 <= idx < len(self._names):
                self.post_message(self.FavoriteSelected(self._names[idx]))
                event.prevent_default()
                event.stop()

    def on_option_list_option_selected(self, event: OptionList.OptionSelected) -> None:
        idx = event.option_index
        if 0 <= idx < len(self._names):
            self.post_message(self.FavoriteSelected(self._names[idx]))

    def refresh_favorites(self) -> None:
        """Reload favorites from the database and update the list."""
        self._names = self.db.get_all_favorites()
        option_list = self.query_one("#favorites-list", OptionList)
        option_list.clear_options()

        empty_label = self.query_one("#favorites-empty", Static)

        if not self._names:
            option_list.display = False
            empty_label.display = True
        else:
            option_list.display = True
            empty_label.display = False
            indent = "  "
            line_width = 31
            for name in self._names:
                wrapped = textwrap.fill(
                    name, width=line_width,
                    initial_indent=indent,
                    subsequent_indent=indent,
                )
                option_list.add_option(Option(wrapped))
