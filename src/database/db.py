import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Retrieve database URL from environment or fall back to local sqlite db.
# For production, PostgreSQL URL would be set, e.g. postgresql://user:pass@db:5432/portal
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///portal.db")

# Create SQLAlchemy engine. Use connect_args for SQLite to handle multi-threading.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
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
