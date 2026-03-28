import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import sqlite3
import pandas as pd

st.set_page_config(page_title="HexGuard", layout="wide", page_icon="🛡️")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dealership.db")

def q(sql):
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df

def db_ready():
    return os.path.exists(DB_PATH)

col_logo, col_title = st.columns([1, 4])
with col_logo:
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "hexsentry_logo.png")
    if os.path.exists(logo_path):
        st.image(logo_path, width=120)
with col_title:
    st.title("HexGuard")
    st.caption("Business Intelligence Platform")

st.subheader("📍 Johnson Motors — Houston TX")
st.divider()

if not db_ready():
    st.error("Database not found. Run the pipeline first: `python pipeline/run_pipeline.py`")
    st.stop()

kpis = q("SELECT COUNT(*) as total_sales, ROUND(SUM(gross_profit),0) as total_gross, ROUND(AVG(gross_profit),0) as avg_gross, ROUND(SUM(total_income),0) as total_income FROM sales").iloc[0]
inv  = q("SELECT COUNT(*) as units, SUM(CASE WHEN is_stale=1 AND status='Available' THEN 1 ELSE 0 END) as stale FROM inventory").iloc[0]
rev  = q("SELECT ROUND(AVG(rating),2) as avg_rating FROM reviews").iloc[0]

try:
    fi = q("SELECT ROUND(AVG(total_backend),0) as avg_fi FROM finance").iloc[0]
    avg_fi = f"${int(fi.avg_fi):,}"
except:
    avg_fi = "N/A"

c1, c2, c3, c4, c5, c6, c7 = st.columns(7)
c1.metric("Total Sales",        f"{int(kpis.total_sales):,}")
c2.metric("Total Gross",        f"${int(kpis.total_gross):,}")
c3.metric("Avg Gross/Deal",     f"${int(kpis.avg_gross):,}")
c4.metric("Total Income",       f"${int(kpis.total_income):,}")
c5.metric("Avg F&I/Deal",       avg_fi)
c6.metric("Stale Units (60d+)", int(inv.stale))
c7.metric("Avg Rating",         f"⭐ {rev.avg_rating}")

st.divider()

st.subheader("🔍 HexGuard Alerts")
st.caption("Automatically flagged issues and wins in your business data")

try:
    from pipeline.anomalies import run_all_checks
    alerts = run_all_checks()
    if not alerts:
        st.success("All clear — no anomalies detected right now.")
    else:
        criticals = [a for a in alerts if a["level"] == "critical"]
        warnings  = [a for a in alerts if a["level"] == "warning"]
        positives = [a for a in alerts if a["level"] == "positive"]
        if criticals:
            for a in criticals:
                st.error(f"🔴 **[{a['category']}] {a['title']}**\n\n{a['detail']}")
        if warnings:
            for a in warnings:
                st.warning(f"🟡 **[{a['category']}] {a['title']}**\n\n{a['detail']}")
        if positives:
            for a in positives:
                st.success(f"🟢 **[{a['category']}] {a['title']}**\n\n{a['detail']}")
except Exception as e:
    st.warning(f"Could not run anomaly checks: {e}")

st.divider()

st.subheader("📊 Quick Overview")
st.caption("Use the sidebar to explore each section in detail")

col_a, col_b, col_c = st.columns(3)

with col_a:
    st.markdown("**Monthly Sales**")
    monthly = q("SELECT month, COUNT(*) as units FROM sales GROUP BY month ORDER BY month")
    st.bar_chart(monthly.set_index("month")["units"], height=200)

with col_b:
    st.markdown("**Top Salespeople**")
    sp = q("SELECT salesperson, ROUND(SUM(gross_profit),0) as gross FROM sales GROUP BY salesperson ORDER BY gross DESC LIMIT 5")
    sp["gross"] = sp["gross"].apply(lambda x: f"${int(x):,}")
    st.dataframe(sp, use_container_width=True, hide_index=True, height=200)

with col_c:
    st.markdown("**Inventory Age**")
    age = q("SELECT age_bucket, COUNT(*) as units FROM inventory WHERE status='Available' GROUP BY age_bucket")
    st.bar_chart(age.set_index("age_bucket")["units"], height=200)

st.divider()
st.caption("HexGuard — Business Intelligence Platform | Use the sidebar to navigate")
