import sqlite3
import os

dbs = [
    'relaywork.db',
    os.path.join('backend', 'relaywork.db')
]

for db in dbs:
    if os.path.exists(db):
        conn = sqlite3.connect(db)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(pro_profiles)")
        cols = [r[1] for r in cursor.fetchall()]
        if 'is_available' not in cols:
            print(f"Adding is_available to {db} pro_profiles...")
            cursor.execute("ALTER TABLE pro_profiles ADD COLUMN is_available BOOLEAN DEFAULT 1 NOT NULL")
            conn.commit()
        else:
            print(f"is_available already in {db} pro_profiles.")
        
        cursor.execute("PRAGMA table_info(jobs)")
        job_cols = [r[1] for r in cursor.fetchall()]
        for c, t in [
            ('job_type', "TEXT DEFAULT 'quoted' NOT NULL"),
            ('call_out_kobo', "INTEGER DEFAULT 600000 NOT NULL"),
            ('surge_multiplier', "REAL DEFAULT 1.0 NOT NULL"),
            ('surge_reason', "TEXT"),
            ('pricing_config_version', "TEXT DEFAULT 'v1.0'"),
            ('diagnosis_notes', "TEXT")
        ]:
            if c not in job_cols:
                print(f"Adding {c} to {db} jobs...")
                cursor.execute(f"ALTER TABLE jobs ADD COLUMN {c} {t}")
                conn.commit()
        conn.close()

print("Both databases verified and synchronized!")
