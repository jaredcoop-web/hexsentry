import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
import pandas as pd
import sqlite3

st.set_page_config(page_title="Upload Data — HexGuard", layout="wide", page_icon="📤")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dealership.db")

def save_to_db(df, table_name, date_col="date"):
    conn = sqlite3.connect(DB_PATH)

    try:
        existing = pd.read_sql_query(f"SELECT {date_col} FROM {table_name}", conn)
        existing[date_col] = pd.to_datetime(existing[date_col], errors="coerce")
        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
        existing_dates = set(existing[date_col].dt.date)
        new_dates = set(df[date_col].dt.date)
        overlap = existing_dates & new_dates
        if overlap:
            df = df[~df[date_col].dt.date.isin(overlap)]
            st.warning(f"Skipped {len(overlap)} duplicate dates already in the database.")
    except Exception:
        pass

    if len(df) == 0:
        st.warning("No new records to add — all dates already exist in the database.")
        conn.close()
        return 0

    df.to_sql(table_name, conn, if_exists="append", index=False)
    conn.close()
    return len(df)

st.title("📤 Upload Your Data")
st.caption("Upload your dealership CSV exports — we handle the rest")

st.divider()

st.subheader("Step 1 — What are you uploading?")
data_type = st.selectbox("Select data type", [
    "Sales Report",
    "Inventory Report",
    "Leads Report",
    "Reviews Report",
    "Finance & Insurance Report",
])

st.subheader("Step 2 — Upload your file")
uploaded_file = st.file_uploader("Drag and drop or click to upload", type=["csv", "xlsx", "xls"])

if uploaded_file:
    try:
        if uploaded_file.name.endswith(".csv"):
            df = pd.read_csv(uploaded_file)
        else:
            df = pd.read_excel(uploaded_file)

        st.success(f"File loaded — {len(df)} rows, {len(df.columns)} columns")
        st.caption("Here's a preview of your file:")
        st.dataframe(df.head(5), use_container_width=True)

        st.divider()

        st.subheader("Step 3 — Match your columns")
        st.caption("Tell us which column in your file matches each field. Select 'Skip' if you don't have that field.")

        cols = ["Skip"] + list(df.columns)

        if data_type == "Sales Report":
            c1, c2 = st.columns(2)
            with c1:
                col_date        = st.selectbox("Date of sale",             cols, key="date")
                col_salesperson = st.selectbox("Salesperson name",         cols, key="sp")
                col_model       = st.selectbox("Vehicle model",            cols, key="model")
            with c2:
                col_sale_price  = st.selectbox("Sale price",               cols, key="price")
                col_cost        = st.selectbox("Cost / invoice price",     cols, key="cost")
                col_lead_source = st.selectbox("Lead source",              cols, key="lead")

            if st.button("Process & Save Sales Data", type="primary"):
                try:
                    mapped = pd.DataFrame()
                    if col_date        != "Skip": mapped["date"]          = pd.to_datetime(df[col_date], errors="coerce")
                    if col_salesperson != "Skip": mapped["salesperson"]   = df[col_salesperson].astype(str).str.strip()
                    if col_model       != "Skip": mapped["model"]         = df[col_model].astype(str).str.strip()
                    if col_sale_price  != "Skip": mapped["sale_price"]    = pd.to_numeric(df[col_sale_price], errors="coerce")
                    if col_cost        != "Skip": mapped["cost"]          = pd.to_numeric(df[col_cost], errors="coerce")
                    if col_lead_source != "Skip": mapped["lead_source"]   = df[col_lead_source].astype(str).str.strip()

                    mapped["gross_profit"]     = mapped.get("sale_price", 0) - mapped.get("cost", 0)
                    mapped["finance_income"]   = 0
                    mapped["total_income"]     = mapped["gross_profit"]
                    mapped["month"]            = mapped["date"].dt.to_period("M").astype(str)
                    mapped["year"]             = mapped["date"].dt.year
                    mapped["days_on_lot"]      = 0
                    mapped["gross_margin_pct"] = (mapped["gross_profit"] / mapped["sale_price"] * 100).round(2)
                    mapped = mapped.dropna(subset=["date"])

                    saved = save_to_db(mapped, "sales")
                    if saved:
                        st.success(f"Saved {saved} new sales records to your dashboard!")
                        st.balloons()
                except Exception as e:
                    st.error(f"Error processing file: {e}")

        elif data_type == "Inventory Report":
            c1, c2 = st.columns(2)
            with c1:
                col_vin     = st.selectbox("VIN or Stock #",              cols, key="vin")
                col_model   = st.selectbox("Vehicle model",               cols, key="model")
                col_year    = st.selectbox("Year",                        cols, key="year")
            with c2:
                col_price   = st.selectbox("List price",                  cols, key="price")
                col_arrival = st.selectbox("Arrival / in-stock date",     cols, key="arrival")
                col_status  = st.selectbox("Status (sold/available)",     cols, key="status")

            if st.button("Process & Save Inventory Data", type="primary"):
                try:
                    mapped = pd.DataFrame()
                    if col_vin     != "Skip": mapped["vin"]          = df[col_vin].astype(str)
                    if col_model   != "Skip": mapped["model"]        = df[col_model].astype(str).str.strip()
                    if col_year    != "Skip": mapped["year"]         = pd.to_numeric(df[col_year], errors="coerce")
                    if col_price   != "Skip": mapped["list_price"]   = pd.to_numeric(df[col_price], errors="coerce")
                    if col_arrival != "Skip":
                        mapped["arrival_date"] = pd.to_datetime(df[col_arrival], errors="coerce")
                        mapped["days_on_lot"]  = (pd.Timestamp.today() - mapped["arrival_date"]).dt.days.clip(lower=0)
                    if col_status  != "Skip": mapped["status"]       = df[col_status].astype(str).str.strip()

                    mapped["is_stale"]   = mapped.get("days_on_lot", 0) > 60
                    mapped["color"]      = "Unknown"
                    mapped["age_bucket"] = pd.cut(
                        mapped.get("days_on_lot", pd.Series([0]*len(mapped))),
                        bins=[0, 30, 60, 90, 999],
                        labels=["0-30 days", "31-60 days", "61-90 days", "90+ days"]
                    )

                    saved = save_to_db(mapped, "inventory", date_col="arrival_date")
                    if saved:
                        st.success(f"Saved {saved} inventory records to your dashboard!")
                        st.balloons()
                except Exception as e:
                    st.error(f"Error processing file: {e}")

        elif data_type == "Leads Report":
            c1, c2 = st.columns(2)
            with c1:
                col_date        = st.selectbox("Lead date",               cols, key="date")
                col_source      = st.selectbox("Lead source",             cols, key="source")
                col_salesperson = st.selectbox("Salesperson",             cols, key="sp")
            with c2:
                col_converted   = st.selectbox("Converted? (yes/no)",    cols, key="converted")
                col_model       = st.selectbox("Vehicle interest",        cols, key="model")

            if st.button("Process & Save Leads Data", type="primary"):
                try:
                    mapped = pd.DataFrame()
                    if col_date        != "Skip": mapped["created_date"]   = pd.to_datetime(df[col_date], errors="coerce")
                    if col_source      != "Skip": mapped["source"]         = df[col_source].astype(str).str.strip()
                    if col_salesperson != "Skip": mapped["salesperson"]    = df[col_salesperson].astype(str).str.strip()
                    if col_model       != "Skip": mapped["model_interest"] = df[col_model].astype(str).str.strip()
                    if col_converted   != "Skip":
                        mapped["converted"] = df[col_converted].astype(str).str.lower().isin(["yes", "true", "1", "y"])
                    mapped["month"] = mapped["created_date"].dt.to_period("M").astype(str)
                    mapped = mapped.dropna(subset=["created_date"])

                    saved = save_to_db(mapped, "leads", date_col="created_date")
                    if saved:
                        st.success(f"Saved {saved} new lead records to your dashboard!")
                        st.balloons()
                except Exception as e:
                    st.error(f"Error processing file: {e}")

        elif data_type == "Reviews Report":
            c1, c2 = st.columns(2)
            with c1:
                col_date     = st.selectbox("Review date",               cols, key="date")
                col_rating   = st.selectbox("Star rating",               cols, key="rating")
            with c2:
                col_text     = st.selectbox("Review text",               cols, key="text")
                col_platform = st.selectbox("Platform",                  cols, key="platform")

            if st.button("Process & Save Reviews Data", type="primary"):
                try:
                    mapped = pd.DataFrame()
                    if col_date     != "Skip": mapped["date"]     = pd.to_datetime(df[col_date], errors="coerce")
                    if col_rating   != "Skip": mapped["rating"]   = pd.to_numeric(df[col_rating], errors="coerce")
                    if col_text     != "Skip": mapped["text"]     = df[col_text].astype(str)
                    if col_platform != "Skip": mapped["platform"] = df[col_platform].astype(str).str.strip()

                    mapped["is_negative"] = mapped.get("rating", 5) <= 2
                    mapped["sentiment"]   = mapped["rating"].apply(
                        lambda x: "positive" if x >= 4 else ("neutral" if x == 3 else "negative")
                    )
                    mapped["month"] = mapped["date"].dt.to_period("M").astype(str)
                    mapped = mapped.dropna(subset=["date"])

                    saved = save_to_db(mapped, "reviews")
                    if saved:
                        st.success(f"Saved {saved} new review records to your dashboard!")
                        st.balloons()
                except Exception as e:
                    st.error(f"Error processing file: {e}")

        elif data_type == "Finance & Insurance Report":
            c1, c2 = st.columns(2)
            with c1:
                col_date        = st.selectbox("Date",                   cols, key="date")
                col_salesperson = st.selectbox("Salesperson",            cols, key="sp")
                col_finance     = st.selectbox("Finance income",         cols, key="finance")
            with c2:
                col_warranty    = st.selectbox("Warranty income",        cols, key="warranty")
                col_addon       = st.selectbox("Add-on income",          cols, key="addon")

            if st.button("Process & Save F&I Data", type="primary"):
                try:
                    mapped = pd.DataFrame()
                    if col_date        != "Skip": mapped["date"]            = pd.to_datetime(df[col_date], errors="coerce")
                    if col_salesperson != "Skip": mapped["salesperson"]     = df[col_salesperson].astype(str).str.strip()
                    if col_finance     != "Skip": mapped["finance_income"]  = pd.to_numeric(df[col_finance], errors="coerce").fillna(0)
                    if col_warranty    != "Skip": mapped["warranty_income"] = pd.to_numeric(df[col_warranty], errors="coerce").fillna(0)
                    if col_addon       != "Skip": mapped["addon_income"]    = pd.to_numeric(df[col_addon], errors="coerce").fillna(0)

                    mapped["total_backend"] = (
                        mapped.get("finance_income", 0) +
                        mapped.get("warranty_income", 0) +
                        mapped.get("addon_income", 0)
                    )
                    mapped["month"] = mapped["date"].dt.to_period("M").astype(str)
                    mapped = mapped.dropna(subset=["date"])

                    saved = save_to_db(mapped, "finance")
                    if saved:
                        st.success(f"Saved {saved} new F&I records to your dashboard!")
                        st.balloons()
                except Exception as e:
                    st.error(f"Error processing file: {e}")

    except Exception as e:
        st.error(f"Could not read file: {e}")

else:
    st.info("Upload a CSV or Excel file to get started.")
    st.markdown("""
    **Common exports to get from your DMS:**
    - Sales report (last 3-6 months)
    - Current inventory list
    - Lead/prospect report
    - Customer review export
    """)
