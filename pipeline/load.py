import sqlite3
import os
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dealership.db")

def get_connection():
    return sqlite3.connect(DB_PATH)

def load_all(clean_data):
    print(f"Saving to database...")
    conn = get_connection()
    for table_name, df in clean_data.items():
        df.to_sql(table_name, conn, if_exists="replace", index=False)
        print(f"  Saved {table_name}: {len(df)} rows")
    conn.close()
    print("Done.")

def query(sql):
    conn = get_connection()
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df
