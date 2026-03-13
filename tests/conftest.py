"""Shared test fixtures."""

import pytest
from mh_tools.database import Database


@pytest.fixture
def db(tmp_path):
    """Provide a fresh in-memory-like Database for each test."""
    db_path = str(tmp_path / "test.db")
    database = Database(db_path)
    database.initialize()
    return database
