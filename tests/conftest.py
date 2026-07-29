import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database.db import Base
from src.models.models import Deal

@pytest.fixture(name="db_session")
def fixture_db_session():
    """Create in-memory SQLite database for test isolation."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Seed default deals
    default_deals = [
        {'id': 'DEA001', 'product_code': 'AMZ001', 'product_name': 'boAt Rockerz 255 Pro+ Wireless Earphones', 'platform': 'Amazon', 'price': 1299.0, 'cashback': 300.0, 'slots': 4, 'active': True},
        {'id': 'DEA002', 'product_code': 'AMZ002', 'product_name': 'Noise ColorFit Pro 4 Smartwatch', 'platform': 'Amazon', 'price': 2499.0, 'cashback': 500.0, 'slots': 4, 'active': True},
        {'id': 'DEA003', 'product_code': 'FLK001', 'product_name': 'Redmi 13C 4G Smartphone (128GB)', 'platform': 'Flipkart', 'price': 8999.0, 'cashback': 800.0, 'slots': 5, 'active': True},
        {'id': 'DEA004', 'product_code': 'FLK002', 'product_name': 'Mi 43" 4K Ultra HD Android TV', 'platform': 'Flipkart', 'price': 24999.0, 'cashback': 2000.0, 'slots': 3, 'active': True},
        {'id': 'DEA005', 'product_code': 'BLK001', 'product_name': 'Amul Butter (500g)', 'platform': 'Blinkit', 'price': 290.0, 'cashback': 60.0, 'slots': 6, 'active': True},
        {'id': 'DEA006', 'product_code': 'AMZ003', 'product_name': 'HP 15 Laptop Intel Core i5 (8GB/512GB)', 'platform': 'Amazon', 'price': 49999.0, 'cashback': 3500.0, 'slots': 2, 'active': True},
        {'id': 'DEA007', 'product_code': 'FLK003', 'product_name': 'Puma Men\'s Running Shoes', 'platform': 'Flipkart', 'price': 2999.0, 'cashback': 400.0, 'slots': 4, 'active': True},
    ]
    for d in default_deals:
        deal_row = Deal(
            id=d['id'],
            product_code=d['product_code'],
            product_name=d['product_name'],
            platform=d['platform'],
            price=d['price'],
            cashback=d['cashback'],
            slots=d['slots'],
            active=d['active']
        )
        session.add(deal_row)
    session.commit()

    try:
        yield session
    finally:
        session.close()
