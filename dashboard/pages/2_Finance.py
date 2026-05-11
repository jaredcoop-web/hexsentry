import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
import sqlite3
import pandas as pd
from pipeline.auth import init_auth_db, require_login, get_client_table

st.set_page_config(page_title="Finance — HexGuard", layout="wide", page_icon="💰")

init_auth_db()
user = require_login()
client_id = user["client_id"]

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dealership.db")

def q(sql):
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df

def ct(table):
    return get_client_table(client_id, table)

st.title("💰 Finance & Insurance")
st.caption(f"{user['business_name']} — Backend income, F&I per deal, and warranty tracking")

if st.button("Log out", key="logout"):
    st.session_state.user = None
    st.rerun()

st.divider()

try:
    kpis = q(f"SELECT ROUND(SUM(total_backend),0) as total_fi, ROUND(AVG(total_backend),0) as avg_fi, ROUND(SUM(finance_income),0) as finance, ROUND(SUM(warranty_income),0) as warranty FROM {ct('finance')}").iloc[0]

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total F&I Income", f"${int(kpis.total_fi):,}")
    c2.metric("Avg F&I Per Deal", f"${int(kpis.avg_fi):,}")
    c3.metric("Total Finance",    f"${int(kpis.finance):,}")
    c4.metric("Total Warranty",   f"${int(kpis.warranty):,}")

    st.divider()

    st.subheader("Monthly F&I Income")
    monthly = q(f"SELECT month, ROUND(SUM(total_backend),0) as total_fi FROM {ct('finance')} GROUP BY month ORDER BY month")
    st.bar_chart(monthly.set_index("month")["total_fi"])

    st.divider()

    st.subheader("F&I Breakdown by Type")
    breakdown = q(f"SELECT month, ROUND(SUM(finance_income),0) as finance, ROUND(SUM(warranty_income),0) as warranty, ROUND(SUM(addon_income),0) as addons FROM {ct('finance')} GROUP BY month ORDER BY month")
    st.bar_chart(breakdown.set_index("month"))

    st.divider()

    st.subheader("F&I by Salesperson")
    sp = q(f"SELECT salesperson, ROUND(SUM(total_backend),0) as total_fi, ROUND(AVG(total_backend),0) as avg_fi, COUNT(*) as deals FROM {ct('finance')} GROUP BY salesperson ORDER BY total_fi DESC")
    sp["total_fi"] = sp["total_fi"].apply(lambda x: f"${int(x):,}")
    sp["avg_fi"]   = sp["avg_fi"].apply(lambda x: f"${int(x):,}")
    st.dataframe(sp, use_container_width=True, hide_index=True)

except Exception as e:
    st.warning(f"No F&I data yet. Upload your finance report on the Upload Data page. ({e})")
