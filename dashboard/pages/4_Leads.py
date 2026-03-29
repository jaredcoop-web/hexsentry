import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
import sqlite3
import pandas as pd

st.set_page_config(page_title="Leads — HexGuard", layout="wide", page_icon="🎯")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dealership.db")

def q(sql):
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df

st.title("🎯 Lead Tracking")
st.caption("Conversion rates, lead sources, and pipeline health")

kpis = q("SELECT COUNT(*) as total, SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END) as converted, ROUND(100.0*SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END)/COUNT(*),1) as pct FROM leads").iloc[0]

c1, c2, c3 = st.columns(3)
c1.metric("Total Leads",        f"{int(kpis.total):,}")
c2.metric("Converted",          f"{int(kpis.converted):,}")
c3.metric("Conversion Rate",    f"{kpis.pct}%")

st.divider()

st.subheader("Conversion by Lead Source")
sources = q("SELECT source, COUNT(*) as total, SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END) as converted, ROUND(100.0*SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END)/COUNT(*),1) as pct FROM leads GROUP BY source ORDER BY pct DESC")
sources["pct"] = sources["pct"].apply(lambda x: f"{x}%")
st.dataframe(sources, use_container_width=True, hide_index=True)

st.divider()

st.subheader("Lead Volume by Source")
volume = q("SELECT source, COUNT(*) as leads FROM leads GROUP BY source ORDER BY leads DESC")
st.bar_chart(volume.set_index("source")["leads"])

st.divider()

st.subheader("Monthly Lead Volume")
monthly = q("SELECT month, COUNT(*) as leads, SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END) as converted FROM leads GROUP BY month ORDER BY month")
st.bar_chart(monthly.set_index("month")["leads"])

st.divider()

st.subheader("Leads by Salesperson")
sp = q("SELECT salesperson, COUNT(*) as leads, SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END) as converted, ROUND(100.0*SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END)/COUNT(*),1) as pct FROM leads GROUP BY salesperson ORDER BY converted DESC")
sp["pct"] = sp["pct"].apply(lambda x: f"{x}%")
st.dataframe(sp, use_container_width=True, hide_index=True)
