import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
import sqlite3
import pandas as pd

st.set_page_config(page_title="Sales — HexGuard", layout="wide", page_icon="🚗")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dealership.db")

def q(sql):
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df

st.title("🚗 Sales Performance")
st.caption("Monthly trends, gross profit, and deal volume")

kpis = q("SELECT COUNT(*) as total_sales, ROUND(SUM(gross_profit),0) as total_gross, ROUND(AVG(gross_profit),0) as avg_gross FROM sales").iloc[0]

c1, c2, c3 = st.columns(3)
c1.metric("Total Sales",     f"{int(kpis.total_sales):,}")
c2.metric("Total Gross",     f"${int(kpis.total_gross):,}")
c3.metric("Avg Gross/Deal",  f"${int(kpis.avg_gross):,}")

st.divider()

st.subheader("Monthly Sales Volume")
monthly = q("SELECT month, COUNT(*) as units, ROUND(SUM(gross_profit),0) as gross FROM sales GROUP BY month ORDER BY month")
st.bar_chart(monthly.set_index("month")["units"])

st.subheader("Monthly Gross Profit")
st.bar_chart(monthly.set_index("month")["gross"])

st.divider()

st.subheader("Top Salespeople")
sp = q("SELECT salesperson, COUNT(*) as deals, ROUND(SUM(gross_profit),0) as gross, ROUND(AVG(gross_profit),0) as avg_gross FROM sales GROUP BY salesperson ORDER BY gross DESC")
sp["gross"]     = sp["gross"].apply(lambda x: f"${int(x):,}")
sp["avg_gross"] = sp["avg_gross"].apply(lambda x: f"${int(x):,}")
st.dataframe(sp, use_container_width=True, hide_index=True)

st.divider()

st.subheader("Sales by Lead Source")
source = q("SELECT lead_source, COUNT(*) as deals, ROUND(SUM(gross_profit),0) as gross FROM sales GROUP BY lead_source ORDER BY deals DESC")
st.bar_chart(source.set_index("lead_source")["deals"])

st.divider()

st.subheader("Best Selling Models")
models = q("SELECT model, COUNT(*) as units, ROUND(AVG(gross_profit),0) as avg_gross FROM sales GROUP BY model ORDER BY units DESC")
models["avg_gross"] = models["avg_gross"].apply(lambda x: f"${int(x):,}")
st.dataframe(models, use_container_width=True, hide_index=True)
