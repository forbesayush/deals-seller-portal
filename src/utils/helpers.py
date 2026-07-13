import random
import string
import csv
import io
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from openpyxl import Workbook

# ─────────────────────────────────────────────
#  ID & CODE GENERATORS
# ─────────────────────────────────────────────
def next_id(db: Session, model, prefix: str) -> str:
    """Query the maximum ID currently in the table and return the incremented string."""
    max_id = db.query(func.max(model.id)).scalar()
    if max_id is None:
        return f"{prefix}001"
    
    # Strip prefix to get the integer portion
    prefix_len = len(prefix)
    try:
        num = int(max_id[prefix_len:]) + 1
    except ValueError:
        num = 1
    return f"{prefix}{str(num).zfill(3)}"

def generate_order_code() -> str:
    """Generate a unique tracking order code (e.g., ORD-CODE-392F8A)."""
    chars = string.ascii_uppercase + string.digits
    rand_part = ''.join(random.choices(chars, k=6))
    return f"ORD-CODE-{rand_part}"

def generate_tracking_number() -> str:
    """Generate a unique tracking number (e.g., TRK-29402948-IN)."""
    rand_num = random.randint(10000000, 99999999)
    return f"TRK-{rand_num}-IN"

def now_iso() -> str:
    """Current timestamp in ISO format."""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')

def today_date() -> str:
    """Current date in YYYY-MM-DD."""
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')

# ─────────────────────────────────────────────
#  REPORT EXPORTERS
# ─────────────────────────────────────────────
def export_csv(headers: list, data: list) -> str:
    """Generate CSV string from header list and data lists."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in data:
        writer.writerow(row)
    return output.getvalue()

def export_excel(headers: list, data: list) -> bytes:
    """Generate Excel binary bytes from header list and data lists using openpyxl."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Report"
    
    ws.append(headers)
    for row in data:
        ws.append(row)
        
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
