import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
import sqlite3
import pandas as pd
from pipeline.auth import init_auth_db, require_login, get_client_table

st.set_page_config(page_title="Reviews — HexGuard", layout="wide", page_icon="⭐")

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

st.title("⭐ Customer Reviews")
st.caption(f"{user['business_name']} — Ratings, sentiment, and reputation tracking")

if st.button("Log out", key="logout"):
    st.session_state.user = None
    st.rerun()

st.divider()

try:
    kpis = q(f"SELECT ROUND(AVG(rating),2) as avg_rating, COUNT(*) as total, SUM(is_negative) as negative FROM {ct('reviews')}").iloc[0]

    c1, c2, c3 = st.columns(3)
    c1.metric("Avg Rating",       f"⭐ {kpis.avg_rating}")
    c2.metric("Total Reviews",    int(kpis.total))
    c3.metric("Negative Reviews", int(kpis.negative))

    st.divider()

    st.subheader("Monthly Average Rating")
    monthly = q(f"SELECT month, ROUND(AVG(rating),2) as avg_rating FROM {ct('reviews')} GROUP BY month ORDER BY month")
    st.line_chart(monthly.set_index("month")["avg_rating"])

    st.divider()

    st.subheader("Reviews by Platform")
    platforms = q(f"SELECT platform, COUNT(*) as reviews, ROUND(AVG(rating),2) as avg_rating FROM {ct('reviews')} GROUP BY platform ORDER BY reviews DESC")
    st.dataframe(platforms, use_container_width=True, hide_index=True)

    st.divider()

    st.subheader("Sentiment Breakdown")
    sentiment = q(f"SELECT sentiment, COUNT(*) as count FROM {ct('reviews')} GROUP BY sentiment ORDER BY count DESC")
    st.bar_chart(sentiment.set_index("sentiment")["count"])

    st.divider()

    st.subheader("⚠️ Negative Reviews")
    negative = q(f"SELECT date, rating, platform, text FROM {ct('reviews')} WHERE is_negative=1 ORDER BY date DESC")
    if len(negative):
        st.dataframe(negative, use_container_width=True, hide_index=True)
    else:
        st.success("No negative reviews!")

except Exception as e:
    st.warning(f"No reviews data yet. Upload your reviews on the Upload Data page. ({e})")
