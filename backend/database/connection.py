"""
Database connection and session management.
Supports SQLite (default) with migration path to PostgreSQL/MySQL.
"""

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from contextlib import contextmanager
from typing import Generator
import logging

from database.models import Base

logger = logging.getLogger(__name__)

# Module-level engine and session factory
_engine = None
_SessionLocal = None


def init_database(database_url: str = None) -> None:
    """Initialize the database engine and create all tables."""
    global _engine, _SessionLocal

    if database_url is None:
        from config import settings
        database_url = settings.DATABASE_URL

    is_sqlite = database_url.startswith("sqlite")
    is_memory = ":memory:" in database_url

    connect_args = {}
    if is_sqlite:
        connect_args["check_same_thread"] = False
        connect_args["timeout"] = 30.0

    _engine = create_engine(
        database_url,
        connect_args=connect_args,
        poolclass=StaticPool if is_memory else None,
        pool_pre_ping=True,
        echo=False,
    )

    # Enable WAL mode and robust busy timeout for SQLite
    if is_sqlite:
        @event.listens_for(_engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.execute("PRAGMA busy_timeout=30000")  # 30s busy timeout
                cursor.execute("PRAGMA cache_size=-32000")   # 32MB cache
            except Exception:
                pass
            finally:
                cursor.close()

    # Create all tables
    Base.metadata.create_all(bind=_engine)

    # Keep existing SQLite installations compatible with the account fields.
    if is_sqlite:
        columns = {column["name"] for column in inspect(_engine).get_columns("users")}
        with _engine.begin() as connection:
            for name, definition in (
                ("email", "VARCHAR(255)"),
                ("phone", "VARCHAR(30)"),
                ("first_login", "DATETIME"),
            ):
                if name not in columns:
                    connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))
            connection.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_unique "
                "ON users (email) WHERE email IS NOT NULL"
            ))
            connection.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone_unique "
                "ON users (phone) WHERE phone IS NOT NULL"
            ))

    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

    logger.info(f"Database initialized: {database_url.split('///')[0]}///...")


def get_session() -> Session:
    """Get a new database session."""
    global _SessionLocal
    if _SessionLocal is None:
        init_database()
    return _SessionLocal()


@contextmanager
def get_db() -> Generator[Session, None, None]:
    """Context manager for database sessions with automatic cleanup."""
    session = get_session()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db_dependency() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    session = get_session()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_engine():
    """Get the database engine."""
    return _engine
