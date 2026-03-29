import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
import sqlite3
import pandas as pd

st.set_page_config(page_title="Reviews — HexGuard", layout="wide", page_icon="⭐")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dealership.db")

def q(sql):
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df

st.title("⭐ Customer Reviews")
st.caption("Ratings, sentiment, and reputation tracking")

kpis = q("SELECT ROUND(AVG(rating),2) as avg_rating, COUNT(*) as total, SUM(is_negative) as negative FROM reviews").iloc[0]

c1, c2, c3 = st.columns(3)
c1.metric("Avg Rating",        f"⭐ {kpis.avg_rating}")
c2.metric("Total Reviews",     int(kpis.total))
c3.metric("Negative Reviews",  int(kpis.negative))

st.divider()

st.subheader("Monthly Average Rating")
monthly = q("SELECT month, ROUND(AVG(rating),2) as avg_rating, COUNT(*) as reviews FROM reviews GROUP BY month ORDER BY month")
st.line_chart(monthly.set_index("month")["avg_rating"])

st.divider()

st.subheader("Reviews by Platform")
platforms = q("SELECT platform, COUNT(*) as reviews, ROUND(AVG(rating),2) as avg_rating FROM reviews GROUP BY platform ORDER BY reviews DESC")
st.dataframe(platforms, use_container_width=True, hide_index=True)

st.divider()

st.subheader("Sentiment Breakdown")
sentiment = q("SELECT sentiment, COUNT(*) as count FROM reviews GROUP BY sentiment ORDER BY count DESC")
st.bar_chart(sentiment.set_index("sentiment")["count"])

st.divider()

st.subheader("⚠️ Negative Reviews")
negative = q("SELECT date, rating, platform, text FROM reviews WHERE is_negative=1 ORDER BY date DESC")
if len(negative):
    st.dataframe(negative, use_container_width=True, hide_index=True)
else:
    st.success("No negative reviews!")
