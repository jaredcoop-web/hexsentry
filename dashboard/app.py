import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import pandas as pd
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dealership.db")

st.set_page_config(page_title="Dealership Intelligence", layout="wide", page_icon="🚗")


def q(sql):
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df


def db_ready():
    return os.path.exists(DB_PATH)


# ── Header ──────────────────────────────────────────────────────────────────
col_logo, col_title = st.columns([1, 4])
with col_logo:
    st.image("assets/hexsentry_logo.png", width=140)
with col_title:
    st.title("HexGuard")
    st.caption("Business Intelligence Platform")
st.subheader("📍 Johnson Motors — Houston TX")
st.divider()

if not db_ready():
    st.error("Database not found. Run the pipeline first: `python pipeline/run_pipeline.py`")
    st.stop()

# ── KPI Row ──────────────────────────────────────────────────────────────────
kpis = q("""
    SELECT
        COUNT(*)                          as total_sales,
        ROUND(SUM(gross_profit), 0)       as total_gross,
        ROUND(AVG(gross_profit), 0)       as avg_gross,
        ROUND(SUM(total_income), 0)       as total_income
    FROM sales
""").iloc[0]

inv_kpis = q("""
    SELECT
        COUNT(*) as total_units,
        SUM(CASE WHEN is_stale=1 AND status='Available' THEN 1 ELSE 0 END) as stale_units
    FROM inventory
""").iloc[0]

review_kpis = q("SELECT ROUND(AVG(rating),2) as avg_rating FROM reviews").iloc[0]

col1, col2, col3, col4, col5, col6 = st.columns(6)
col1.metric("Total Sales",       f"{int(kpis['total_sales']):,}")
col2.metric("Total Gross",       f"${int(kpis['total_gross']):,}")
col3.metric("Avg Gross / Deal",  f"${int(kpis['avg_gross']):,}")
col4.metric("Total Income",      f"${int(kpis['total_income']):,}")
col5.metric("Stale Units (60d+)", int(inv_kpis['stale_units']))
col6.metric("Avg Review Rating", f"⭐ {review_kpis['avg_rating']}")

st.divider()

# ── Anomaly Detection ─────────────────────────────────────────────────────────
st.subheader("🔍 HexSentry Alerts")
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

# ── Sales Over Time + Top Salespeople ────────────────────────────────────────
col_a, col_b = st.columns([2, 1])

with col_a:
    st.subheader("Monthly Sales Volume")
    monthly = q("""
        SELECT month, COUNT(*) as units, ROUND(SUM(gross_profit),0) as gross
        FROM sales GROUP BY month ORDER BY month
    """)
    st.bar_chart(monthly.set_index("month")["units"])

with col_b:
    st.subheader("Top Salespeople")
    sp = q("""
        SELECT salesperson,
               COUNT(*) as deals,
               ROUND(SUM(gross_profit),0) as gross
        FROM sales GROUP BY salesperson ORDER BY gross DESC
    """)
    sp["gross"] = sp["gross"].apply(lambda x: f"${int(x):,}")
    st.dataframe(sp, use_container_width=True, hide_index=True)

st.divider()

# ── Lead Sources + Inventory Age ─────────────────────────────────────────────
col_c, col_d = st.columns(2)

with col_c:
    st.subheader("Lead Conversion by Source")
    leads = q("""
        SELECT source,
               COUNT(*) as total_leads,
               SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END) as converted,
               ROUND(100.0 * SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END)/COUNT(*),1) as pct
        FROM leads GROUP BY source ORDER BY pct DESC
    """)
    leads["pct"] = leads["pct"].apply(lambda x: f"{x}%")
    st.dataframe(leads, use_container_width=True, hide_index=True)

with col_d:
    st.subheader("Inventory Age Breakdown")
    inv_age = q("""
        SELECT age_bucket, COUNT(*) as units
        FROM inventory WHERE status='Available'
        GROUP BY age_bucket ORDER BY age_bucket
    """)
    st.bar_chart(inv_age.set_index("age_bucket")["units"])

st.divider()

# ── Stale Inventory Alert ─────────────────────────────────────────────────────
st.subheader("⚠️ Stale Inventory — Cars on Lot 60+ Days")
stale = q("""
    SELECT vin, model, year, color, list_price, days_on_lot, status
    FROM inventory WHERE is_stale=1 AND status='Available'
    ORDER BY days_on_lot DESC LIMIT 20
""")
if len(stale):
    stale["list_price"] = stale["list_price"].apply(lambda x: f"${x:,}")
    st.dataframe(stale, use_container_width=True, hide_index=True)
else:
    st.success("No stale inventory right now!")

st.divider()

# ── AI Chat ───────────────────────────────────────────────────────────────────
st.subheader("🤖 Ask Your Data")
st.caption("Ask anything about your dealership performance in plain English")

api_key = st.text_input("Anthropic API Key (optional — needed for AI answers)", type="password")

user_q = st.text_input("Your question", placeholder="Who is my best salesperson this quarter?")

if st.button("Ask", type="primary") and user_q:
    with st.spinner("Thinking..."):
        try:
            from ai.chat import ask
            answer = ask(user_q, api_key=api_key if api_key else None)
            st.info(answer)
        except Exception as e:
            st.error(f"Error: {e}")

st.divider()
st.caption("Dealership Intelligence — built with Python, SQLite, and Streamlit")
