import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Retrieve database URL and pool configuration from environment with high-concurrency defaults.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///portal.db")
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "20"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "30"))
DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "1800"))  # Recycle connections after 30 mins
DB_POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "15"))    # Timeout waiting for pool connection

# Create SQLAlchemy engine. Use connect_args for SQLite to handle multi-threading.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=DB_POOL_SIZE,
        max_overflow=DB_MAX_OVERFLOW,
        pool_recycle=DB_POOL_RECYCLE,
        pool_timeout=DB_POOL_TIMEOUT,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI Dependency to get database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

