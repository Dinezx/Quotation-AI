import os
import sys
import pytest

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database schema and baseline reference data are available for testing."""
    from app.db.base import Base
    from app.db.session import engine
    from app.db.init_db import seed_initial_data

    # For testing environments, create tables if they do not already exist
    Base.metadata.create_all(bind=engine)
    seed_initial_data()

