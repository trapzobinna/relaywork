import sqlite3
from app.database import engine, Base
import app.models

conn = sqlite3.connect('relaywork.db')
cursor = conn.cursor()

def add_col_if_missing(table, col, col_def):
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [r[1] for r in cursor.fetchall()]
    if col not in cols:
        print(f"Adding {col} to {table}...")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
        conn.commit()
    else:
        print(f"{col} already in {table}.")

add_col_if_missing('jobs', 'job_type', "TEXT DEFAULT 'quoted' NOT NULL")
add_col_if_missing('jobs', 'call_out_kobo', "INTEGER DEFAULT 600000 NOT NULL")
add_col_if_missing('jobs', 'surge_multiplier', "REAL DEFAULT 1.0 NOT NULL")
add_col_if_missing('jobs', 'surge_reason', "TEXT")
add_col_if_missing('jobs', 'pricing_config_version', "TEXT DEFAULT 'v1.0'")
add_col_if_missing('jobs', 'diagnosis_notes', "TEXT")

conn.close()

Base.metadata.create_all(bind=engine)

conn2 = sqlite3.connect('relaywork.db')
c2 = conn2.cursor()
c2.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("All tables in DB:", [r[0] for r in c2.fetchall()])
conn2.close()
