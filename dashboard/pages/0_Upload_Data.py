import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
 
import streamlit as st
import pandas as pd
import sqlite3
from pipeline.auth import init_auth_db, require_login, get_client_table
 
st.set_page_config(page_title="Upload Data — HexGuard", layout="wide", page_icon="📤")
 
init_auth_db()
user = require_login()
client_id = user["client_id"]
 
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dealership.db")
 
def ct(table):
    return get_client_table(client_id, table)
 
def save_to_db(df, table_name, date_col="date"):
    conn = sqlite3.connect(DB_PATH)
    full_table = ct(table_name)
    try:
        existing = pd.read_sql_query(f"SELECT {date_col} FROM {full_table}", conn)
        existing[date_col] = pd.to_datetime(existing[date_col], errors="coerce")
        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
        overlap = set(df[date_col].dt.date) & set(existing[date_col].dt.date)
        if overlap:
            df = df[~df[date_col].dt.date.isin(overlap)]
            st.warning(f"Skipped {len(overlap)} duplicate dates already in the database.")
    except Exception:
        pass
    if len(df) == 0:
        st.warning("No new records to add — all dates already exist.")
        conn.close()
        return 0
    df.to_sql(full_table, conn, if_exists="append", index=False)
    conn.close()
    return len(df)
 
st.title("📤 Upload Your Data")
st.caption(f"{user['business_name']} — Upload your export and map your columns")
 
if st.button("Log out", key="logout"):
    st.session_state.user = None
    st.rerun()
 
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
        df = pd.read_csv(uploaded_file) if uploaded_file.name.endswith(".csv") else pd.read_excel(uploaded_file)
        st.success(f"File loaded — {len(df)} rows, {len(df.columns)} columns")
 
        st.divider()
        st.subheader("Your file's column names:")
        st.code(", ".join(df.columns.tolist()))
        st.caption("Copy and paste these exactly into the fields below")
 
        st.divider()
        st.subheader("Step 3 — Type your column names")
        st.caption("Type the exact column name from your file that matches each field. Leave blank to skip.")
 
        if data_type == "Sales Report":
            c1, c2 = st.columns(2)
            with c1:
                col_date        = st.text_input("Date of sale",         placeholder="e.g. SaleDate")
                col_salesperson = st.text_input("Salesperson name",     placeholder="e.g. SalesRep")
                col_model       = st.text_input("Vehicle model",        placeholder="e.g. VehicleDescription")
            with c2:
                col_sale_price  = st.text_input("Sale price",           placeholder="e.g. SalePrice")
                col_cost        = st.text_input("Cost / invoice price", placeholder="e.g. InvoiceCost")
                col_lead_source = st.text_input("Lead source",          placeholder="e.g. LeadSource")
 
            st.divider()
            if st.button("Process & Save Sales Data", type="primary"):
                try:
                    missing = []
                    if not col_date:       missing.append("Date of sale")
                    if not col_sale_price: missing.append("Sale price")
                    if missing:
                        st.error(f"These required fields are empty: {', '.join(missing)}")
                    else:
                        bad_cols = []
                        for name, val in [("Date", col_date), ("Sale price", col_sale_price)]:
                            if val and val not in df.columns:
                                bad_cols.append(f"'{val}' not found in your file")
                        if bad_cols:
                            st.error("Column name mismatch:\n" + "\n".join(bad_cols))
                            st.info("Check spelling and capitalization — it must match exactly.")
                        else:
                            mapped = pd.DataFrame()
                            if col_date        and col_date        in df.columns: mapped["date"]         = pd.to_datetime(df[col_date], errors="coerce")
                            if col_salesperson and col_salesperson in df.columns: mapped["salesperson"]  = df[col_salesperson].astype(str).str.strip()
                            if col_model       and col_model       in df.columns: mapped["model"]        = df[col_model].astype(str).str.strip()
                            if col_sale_price  and col_sale_price  in df.columns: mapped["sale_price"]   = pd.to_numeric(df[col_sale_price], errors="coerce")
                            if col_cost        and col_cost        in df.columns: mapped["cost"]         = pd.to_numeric(df[col_cost], errors="coerce")
                            if col_lead_source and col_lead_source in df.columns: mapped["lead_source"]  = df[col_lead_source].astype(str).str.strip()
 
                            mapped["gross_profit"]     = mapped.get("sale_price", pd.Series([0]*len(mapped))) - mapped.get("cost", pd.Series([0]*len(mapped)))
                            mapped["finance_income"]   = 0
                            mapped["total_income"]     = mapped["gross_profit"]
                            mapped["month"]            = mapped["date"].dt.to_period("M").astype(str)
                            mapped["year"]             = mapped["date"].dt.year
                            mapped["days_on_lot"]      = 0
                            mapped["gross_margin_pct"] = (mapped["gross_profit"] / mapped["sale_price"] * 100).round(2)
                            mapped = mapped.dropna(subset=["date"])
 
                            st.subheader("Preview — first 5 rows after mapping:")
                            st.dataframe(mapped.head(5), use_container_width=True)
 
                            saved = save_to_db(mapped, "sales")
                            if saved:
                                st.success(f"✅ Saved {saved} new sales records to your dashboard!")
                                st.balloons()
                except Exception as e:
                    st.error(f"Error processing file: {e}")
 
        elif data_type == "Inventory Report":
            c1, c2 = st.columns(2)
            with c1:
                col_vin     = st.text_input("VIN or Stock #",           placeholder="e.g. StockNumber")
                col_model   = st.text_input("Vehicle model",            placeholder="e.g. VehicleDesc")
                col_year    = st.text_input("Year",                     placeholder="e.g. ModelYear")
            with c2:
                col_price   = st.text_input("List price",               placeholder="e.g. ListPrice")
                col_arrival = st.text_input("Arrival / in-stock date",  placeholder="e.g. ArrivalDate")
                col_status  = st.text_input("Status (sold/available)",  placeholder="e.g. Status")
 
            st.divider()
            if st.button("Process & Save Inventory Data", type="primary"):
                try:
                    mapped = pd.DataFrame()
                    if col_vin     and col_vin     in df.columns: mapped["vin"]          = df[col_vin].astype(str)
                    if col_model   and col_model   in df.columns: mapped["model"]        = df[col_model].astype(str).str.strip()
                    if col_year    and col_year    in df.columns: mapped["year"]         = pd.to_numeric(df[col_year], errors="coerce")
                    if col_price   and col_price   in df.columns: mapped["list_price"]   = pd.to_numeric(df[col_price], errors="coerce")
                    if col_arrival and col_arrival in df.columns:
                        mapped["arrival_date"] = pd.to_datetime(df[col_arrival], errors="coerce")
                        mapped["days_on_lot"]  = (pd.Timestamp.today() - mapped["arrival_date"]).dt.days.clip(lower=0)
                    if col_status  and col_status  in df.columns: mapped["status"]       = df[col_status].astype(str).str.strip()
                    mapped["is_stale"]   = mapped.get("days_on_lot", 0) > 60
                    mapped["color"]      = "Unknown"
                    mapped["age_bucket"] = pd.cut(mapped.get("days_on_lot", pd.Series([0]*len(mapped))), bins=[0,30,60,90,999], labels=["0-30 days","31-60 days","61-90 days","90+ days"])
 
                    st.subheader("Preview — first 5 rows after mapping:")
                    st.dataframe(mapped.head(5), use_container_width=True)
 
                    saved = save_to_db(mapped, "inventory", date_col="arrival_date")
                    if saved:
                        st.success(f"✅ Saved {saved} inventory records!")
                        st.balloons()
                except Exception as e:
                    st.error(f"Error: {e}")
 
        elif data_type == "Leads Report":
            c1, c2 = st.columns(2)
            with c1:
                col_date        = st.text_input("Lead date",            placeholder="e.g. LeadDate")
                col_source      = st.text_input("Lead source",          placeholder="e.g. Source")
                col_salesperson = st.text_input("Salesperson",          placeholder="e.g. AssignedRep")
            with c2:
                col_converted   = st.text_input("Converted? (yes/no)", placeholder="e.g. Converted")
                col_model       = st.text_input("Vehicle interest",     placeholder="e.g. ModelInterest")
 
            st.divider()
            if st.button("Process & Save Leads Data", type="primary"):
                try:
                    mapped = pd.DataFrame()
                    if col_date        and col_date        in df.columns: mapped["created_date"]   = pd.to_datetime(df[col_date], errors="coerce")
                    if col_source      and col_source      in df.columns: mapped["source"]         = df[col_source].astype(str).str.strip()
                    if col_salesperson and col_salesperson in df.columns: mapped["salesperson"]    = df[col_salesperson].astype(str).str.strip()
                    if col_model       and col_model       in df.columns: mapped["model_interest"] = df[col_model].astype(str).str.strip()
                    if col_converted   and col_converted   in df.columns:
                        mapped["converted"] = df[col_converted].astype(str).str.lower().isin(["yes","true","1","y"])
                    mapped["month"] = mapped["created_date"].dt.to_period("M").astype(str)
                    mapped = mapped.dropna(subset=["created_date"])
 
                    st.subheader("Preview — first 5 rows after mapping:")
                    st.dataframe(mapped.head(5), use_container_width=True)
 
                    saved = save_to_db(mapped, "leads", date_col="created_date")
                    if saved:
                        st.success(f"✅ Saved {saved} lead records!")
                        st.balloons()
                except Exception as e:
                    st.error(f"Error: {e}")
 
        elif data_type == "Reviews Report":
            c1, c2 = st.columns(2)
            with c1:
                col_date     = st.text_input("Review date",             placeholder="e.g. ReviewDate")
                col_rating   = st.text_input("Star rating",             placeholder="e.g. StarRating")
            with c2:
                col_text     = st.text_input("Review text",             placeholder="e.g. ReviewText")
                col_platform = st.text_input("Platform",                placeholder="e.g. Platform")
 
            st.divider()
            if st.button("Process & Save Reviews Data", type="primary"):
                try:
                    mapped = pd.DataFrame()
                    if col_date     and col_date     in df.columns: mapped["date"]     = pd.to_datetime(df[col_date], errors="coerce")
                    if col_rating   and col_rating   in df.columns: mapped["rating"]   = pd.to_numeric(df[col_rating], errors="coerce")
                    if col_text     and col_text     in df.columns: mapped["text"]     = df[col_text].astype(str)
                    if col_platform and col_platform in df.columns: mapped["platform"] = df[col_platform].astype(str).str.strip()
                    mapped["is_negative"] = mapped.get("rating", pd.Series([5]*len(mapped))) <= 2
                    mapped["sentiment"]   = mapped["rating"].apply(lambda x: "positive" if x >= 4 else ("neutral" if x == 3 else "negative"))
                    mapped["month"] = mapped["date"].dt.to_period("M").astype(str)
                    mapped = mapped.dropna(subset=["date"])
 
                    st.subheader("Preview — first 5 rows after mapping:")
                    st.dataframe(mapped.head(5), use_container_width=True)
 
                    saved = save_to_db(mapped, "reviews")
                    if saved:
                        st.success(f"✅ Saved {saved} review records!")
                        st.balloons()
                except Exception as e:
                    st.error(f"Error: {e}")
 
        elif data_type == "Finance & Insurance Report":
            c1, c2 = st.columns(2)
            with c1:
                col_date        = st.text_input("Date",                 placeholder="e.g. SaleDate")
                col_salesperson = st.text_input("Salesperson",          placeholder="e.g. SalesRep")
                col_finance     = st.text_input("Finance income",       placeholder="e.g. FinanceIncome")
            with c2:
                col_warranty    = st.text_input("Warranty income",      placeholder="e.g. WarrantyIncome")
                col_addon       = st.text_input("Add-on income",        placeholder="e.g. AddonIncome")
 
            st.divider()
            if st.button("Process & Save F&I Data", type="primary"):
                try:
                    mapped = pd.DataFrame()
                    if col_date        and col_date        in df.columns: mapped["date"]            = pd.to_datetime(df[col_date], errors="coerce")
                    if col_salesperson and col_salesperson in df.columns: mapped["salesperson"]     = df[col_salesperson].astype(str).str.strip()
                    if col_finance     and col_finance     in df.columns: mapped["finance_income"]  = pd.to_numeric(df[col_finance], errors="coerce").fillna(0)
                    if col_warranty    and col_warranty    in df.columns: mapped["warranty_income"] = pd.to_numeric(df[col_warranty], errors="coerce").fillna(0)
                    if col_addon       and col_addon       in df.columns: mapped["addon_income"]    = pd.to_numeric(df[col_addon], errors="coerce").fillna(0)
                    mapped["total_backend"] = mapped.get("finance_income", 0) + mapped.get("warranty_income", 0) + mapped.get("addon_income", 0)
                    mapped["month"] = mapped["date"].dt.to_period("M").astype(str)
                    mapped = mapped.dropna(subset=["date"])
 
                    st.subheader("Preview — first 5 rows after mapping:")
                    st.dataframe(mapped.head(5), use_container_width=True)
 
                    saved = save_to_db(mapped, "finance")
                    if saved:
                        st.success(f"✅ Saved {saved} F&I records!")
                        st.balloons()
                except Exception as e:
                    st.error(f"Error: {e}")
 
    except Exception as e:
        st.error(f"Could not read file: {e}")
 
else:
    st.info("Upload a CSV or Excel file to get started.")
    st.markdown("""
    **What to export from your DMS:**
    - Sales report — last 3 to 6 months
    - Inventory list — current vehicles on lot
    - Any other report you have available
 
    **Supported formats:** CSV or Excel (.xlsx, .xls)
    """)
