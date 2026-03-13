"""Abstract base class for all mh_tools tools."""

from __future__ import annotations

from abc import ABC, abstractmethod

from mh_tools.database import Database


class BaseTool(ABC):
    """Base class that all tools must inherit from."""

    name: str = ""
    description: str = ""

    def __init__(self, db: Database):
        self.db = db

    @abstractmethod
    def run(self, **kwargs):
        """Execute the tool's main logic."""
        ...
