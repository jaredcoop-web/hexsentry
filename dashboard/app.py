import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import sqlite3
import pandas as pd
from pipeline.auth import init_auth_db, require_login, get_client_table

st.set_page_config(page_title="HexGuard", layout="wide", page_icon="🛡️")

init_auth_db()

if "user" not in st.session_state:
    st.session_state.user = None

if not st.session_state.user:
    st.warning("Please log in to access your dashboard.")
    st.info("Go to the Login page in the sidebar to sign in.")
    st.stop()

user      = st.session_state.user
client_id = user["client_id"]

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dealership.db")

def q(sql):
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df

def db_ready():
    return os.path.exists(DB_PATH)

def ct(table):
    return get_client_table(client_id, table)

# ── Header ────────────────────────────────────────────────────────────────────
col_logo, col_title, col_logout = st.columns([1, 4, 1])
with col_logo:
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "hexsentry_logo.png")
    if os.path.exists(logo_path):
        st.image(logo_path, width=120)
with col_title:
    st.title("HexGuard")
    st.caption("Business Intelligence Platform")
with col_logout:
    st.write("")
    st.write("")
    if st.button("Log out"):
        st.session_state.user = None
        st.rerun()

st.subheader(f"📍 {user['business_name']}")
st.divider()

if not db_ready():
    st.error("Database not found. Upload your data using the Upload Data page.")
    st.stop()

# ── KPI Row ───────────────────────────────────────────────────────────────────
try:
    kpis = q(f"SELECT COUNT(*) as total_sales, ROUND(SUM(gross_profit),0) as total_gross, ROUND(AVG(gross_profit),0) as avg_gross, ROUND(SUM(total_income),0) as total_income FROM {ct('sales')}").iloc[0]
    inv  = q(f"SELECT COUNT(*) as units, SUM(CASE WHEN is_stale=1 AND status='Available' THEN 1 ELSE 0 END) as stale FROM {ct('inventory')}").iloc[0]
    rev  = q(f"SELECT ROUND(AVG(rating),2) as avg_rating FROM {ct('reviews')}").iloc[0]

    try:
        fi     = q(f"SELECT ROUND(AVG(total_backend),0) as avg_fi FROM {ct('finance')}").iloc[0]
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

except Exception as e:
    st.warning(f"No data yet — upload your files using the Upload Data page. ({e})")
    st.stop()

st.divider()

# ── Anomaly Alerts ────────────────────────────────────────────────────────────
st.subheader("🔍 HexGuard Alerts")
st.caption("Automatically flagged issues and wins in your business data")

try:
    from pipeline.anomalies import run_all_checks
    alerts = run_all_checks()
    if not alerts:
        st.success("All clear — no anomalies detected right now.")
    else:
        for a in [x for x in alerts if x["level"] == "critical"]:
            st.error(f"🔴 **[{a['category']}] {a['title']}**\n\n{a['detail']}")
        for a in [x for x in alerts if x["level"] == "warning"]:
            st.warning(f"🟡 **[{a['category']}] {a['title']}**\n\n{a['detail']}")
        for a in [x for x in alerts if x["level"] == "positive"]:
            st.success(f"🟢 **[{a['category']}] {a['title']}**\n\n{a['detail']}")
except Exception as e:
    st.warning(f"Could not run anomaly checks: {e}")

st.divider()

# ── Quick Overview ────────────────────────────────────────────────────────────
st.subheader("📊 Quick Overview")
st.caption("Use the sidebar to explore each section in detail")

col_a, col_b, col_c = st.columns(3)

with col_a:
    st.markdown("**Monthly Sales**")
    monthly = q(f"SELECT month, COUNT(*) as units FROM {ct('sales')} GROUP BY month ORDER BY month")
    st.bar_chart(monthly.set_index("month")["units"], height=200)

with col_b:
    st.markdown("**Top Salespeople**")
    sp = q(f"SELECT salesperson, ROUND(SUM(gross_profit),0) as gross FROM {ct('sales')} GROUP BY salesperson ORDER BY gross DESC LIMIT 5")
    sp["gross"] = sp["gross"].apply(lambda x: f"${int(x):,}")
    st.dataframe(sp, use_container_width=True, hide_index=True, height=200)

with col_c:
    st.markdown("**Inventory Age**")
    age = q(f"SELECT age_bucket, COUNT(*) as units FROM {ct('inventory')} WHERE status='Available' GROUP BY age_bucket")
    st.bar_chart(age.set_index("age_bucket")["units"], height=200)

st.divider()
st.caption("HexGuard — Business Intelligence Platform | Use the sidebar to navigate")
