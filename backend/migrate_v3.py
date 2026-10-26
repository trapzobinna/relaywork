import os
import sys
import sqlite3
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base
import app.models

db_path = os.path.join(os.path.dirname(__file__), 'relaywork.db')
conn = sqlite3.connect(db_path)
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

add_col_if_missing('pro_profiles', 'is_available', "BOOLEAN DEFAULT 1 NOT NULL")
add_col_if_missing('jobs', 'job_type', "TEXT DEFAULT 'quoted' NOT NULL")
add_col_if_missing('jobs', 'call_out_kobo', "INTEGER DEFAULT 600000 NOT NULL")
add_col_if_missing('jobs', 'surge_multiplier', "REAL DEFAULT 1.0 NOT NULL")
add_col_if_missing('jobs', 'surge_reason', "TEXT")
add_col_if_missing('jobs', 'pricing_config_version', "TEXT DEFAULT 'v1.0'")
add_col_if_missing('jobs', 'diagnosis_notes', "TEXT")

conn.close()

Base.metadata.create_all(bind=engine)
print("Migration v3 completed successfully!")
