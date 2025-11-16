"""
Database configuration and session management
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from contextlib import contextmanager

# Create base for all models
Base = declarative_base()

# Database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=False  # Set to True for SQL debugging
)

# Create session factory
SessionLocal = scoped_session(sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
))


def get_db_session():
    """
    Get database session (use as dependency injection)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    """
    Context manager for database sessions
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db():
    """
    Dependency injection function for FastAPI or similar
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables
    """
    # Import all models to register them with Base
    from app.models.contract_address import ContractAddress
    from app.models.pair_contract import PairContract
    from app.models.failed_lookup import FailedContractLookup
    from app.models.api_call_log import ApiCallLog
    
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables initialized")


def close_db():
    """
    Close database connections
    """
    engine.dispose()

