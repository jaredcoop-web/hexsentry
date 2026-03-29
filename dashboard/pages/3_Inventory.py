import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
import sqlite3
import pandas as pd

st.set_page_config(page_title="Inventory — HexGuard", layout="wide", page_icon="🚙")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dealership.db")

def q(sql):
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df

st.title("🚙 Inventory Management")
st.caption("Lot health, stale vehicles, and age breakdown")

kpis = q("SELECT COUNT(*) as total, SUM(CASE WHEN status='Available' THEN 1 ELSE 0 END) as available, SUM(CASE WHEN is_stale=1 AND status='Available' THEN 1 ELSE 0 END) as stale, ROUND(AVG(days_on_lot),0) as avg_days FROM inventory").iloc[0]

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Units",       int(kpis.total))
c2.metric("Available",         int(kpis.available))
c3.metric("Stale (60d+)",      int(kpis.stale))
c4.metric("Avg Days on Lot",   int(kpis.avg_days))

st.divider()

st.subheader("Inventory Age Breakdown")
age = q("SELECT age_bucket, COUNT(*) as units FROM inventory WHERE status='Available' GROUP BY age_bucket ORDER BY age_bucket")
st.bar_chart(age.set_index("age_bucket")["units"])

st.divider()

st.subheader("⚠️ Stale Inventory — 60+ Days on Lot")
stale = q("SELECT vin, model, year, color, list_price, days_on_lot FROM inventory WHERE is_stale=1 AND status='Available' ORDER BY days_on_lot DESC")
if len(stale):
    stale["list_price"] = stale["list_price"].apply(lambda x: f"${x:,}")
    st.dataframe(stale, use_container_width=True, hide_index=True)
else:
    st.success("No stale inventory right now!")

st.divider()

st.subheader("Inventory by Model")
models = q("SELECT model, COUNT(*) as units, ROUND(AVG(list_price),0) as avg_price, ROUND(AVG(days_on_lot),0) as avg_days FROM inventory WHERE status='Available' GROUP BY model ORDER BY units DESC")
models["avg_price"] = models["avg_price"].apply(lambda x: f"${int(x):,}")
st.dataframe(models, use_container_width=True, hide_index=True)
