import os

BASE = os.path.join(os.getcwd(), "dealership-dashboard")

files = {
"data/generate_sample_data.py": '''
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

random.seed(42)
np.random.seed(42)

SALESPEOPLE = ["Marcus Johnson", "Diana Lee", "Troy Williams", "Priya Patel", "Jake Rivera"]
MODELS = ["F-150", "Camry", "Silverado", "RAV4", "Mustang", "Accord", "Explorer", "Tacoma", "Civic", "Ram 1500"]
LEAD_SOURCES = ["Walk-in", "Website", "Referral", "Facebook Ad", "Google Ad", "Phone Call"]
STATUSES = ["Sold", "Available", "Reserved"]
START_DATE = datetime(2025, 9, 1)
END_DATE = datetime(2026, 2, 28)

def random_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))

def generate_sales():
    rows = []
    for i in range(300):
        sale_date = random_date(START_DATE, END_DATE)
        sale_price = random.randint(22000, 72000)
        cost = sale_price - random.randint(800, 6000)
        rows.append({
            "sale_id": f"S{1000+i}", "date": sale_date.strftime("%Y-%m-%d"),
            "salesperson": random.choice(SALESPEOPLE), "model": random.choice(MODELS),
            "sale_price": sale_price, "cost": cost, "gross_profit": sale_price - cost,
            "days_on_lot": random.randint(1, 130), "lead_source": random.choice(LEAD_SOURCES),
            "finance_income": random.randint(0, 2500),
        })
    df = pd.DataFrame(rows).sort_values("date")
    df.to_csv("sales.csv", index=False)
    print(f"  sales.csv — {len(df)} records")

def generate_inventory():
    rows = []
    for i in range(80):
        arrival = random_date(START_DATE, END_DATE)
        days_on_lot = (datetime.today() - arrival).days
        rows.append({
            "vin": f"VIN{100000+i}", "model": random.choice(MODELS),
            "year": random.choice([2023, 2024, 2025]),
            "color": random.choice(["White","Black","Silver","Red","Blue","Gray"]),
            "list_price": random.randint(22000, 72000),
            "arrival_date": arrival.strftime("%Y-%m-%d"),
            "days_on_lot": max(days_on_lot, 0),
            "status": random.choice(STATUSES),
        })
    pd.DataFrame(rows).to_csv("inventory.csv", index=False)
    print(f"  inventory.csv — 80 records")

def generate_leads():
    rows = []
    for i in range(500):
        created = random_date(START_DATE, END_DATE)
        converted = random.random() < 0.35
        rows.append({
            "lead_id": f"L{2000+i}", "created_date": created.strftime("%Y-%m-%d"),
            "source": random.choice(LEAD_SOURCES), "salesperson": random.choice(SALESPEOPLE),
            "model_interest": random.choice(MODELS), "converted": converted,
            "converted_date": (created + timedelta(days=random.randint(1,30))).strftime("%Y-%m-%d") if converted else None,
        })
    pd.DataFrame(rows).to_csv("leads.csv", index=False)
    print(f"  leads.csv — 500 records")

def generate_reviews():
    positive_texts = ["Great experience, Marcus was super helpful!","Best dealership in Houston.","Very smooth process, no pressure at all.","Diana helped me find exactly what I wanted.","Quick and easy. Will come back for my next car."]
    negative_texts = ["Waited over an hour with no update.","Felt pressured by the salesperson.","Price changed last minute, very frustrating."]
    sentiments = ["positive"]*7 + ["neutral"]*2 + ["negative"]*1
    rows = []
    for i in range(120):
        sentiment = random.choice(sentiments)
        rating = random.randint(4,5) if sentiment=="positive" else (3 if sentiment=="neutral" else random.randint(1,2))
        text = random.choice(positive_texts if sentiment=="positive" else (["Decent experience overall."] if sentiment=="neutral" else negative_texts))
        rows.append({
            "review_id": f"R{3000+i}", "date": random_date(START_DATE, END_DATE).strftime("%Y-%m-%d"),
            "rating": rating, "sentiment": sentiment, "text": text,
            "platform": random.choice(["Google","Yelp","DealerRater"]),
        })
    pd.DataFrame(rows).sort_values("date").to_csv("reviews.csv", index=False)
    print(f"  reviews.csv — 120 records")

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("Generating sample dealership data...")
    generate_sales()
    generate_inventory()
    generate_leads()
    generate_reviews()
    print("Done!")
''',

"pipeline/extract.py": '''
import pandas as pd
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

def load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Run data/generate_sample_data.py first.")
    df = pd.read_csv(path)
    print(f"  Loaded {filename}: {len(df)} rows")
    return df

def extract_all():
    print("Extracting data...")
    return {
        "sales":     load_csv("sales.csv"),
        "inventory": load_csv("inventory.csv"),
        "leads":     load_csv("leads.csv"),
        "reviews":   load_csv("reviews.csv"),
    }
''',

"pipeline/transform.py": '''
import pandas as pd

def transform_sales(df):
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M").astype(str)
    df["year"] = df["date"].dt.year
    df["gross_margin_pct"] = (df["gross_profit"] / df["sale_price"] * 100).round(2)
    df["total_income"] = df["gross_profit"] + df["finance_income"]
    return df

def transform_inventory(df):
    df = df.copy()
    df["arrival_date"] = pd.to_datetime(df["arrival_date"])
    df["is_stale"] = df["days_on_lot"] > 60
    df["age_bucket"] = pd.cut(df["days_on_lot"], bins=[0,30,60,90,999], labels=["0-30 days","31-60 days","61-90 days","90+ days"])
    return df

def transform_leads(df):
    df = df.copy()
    df["created_date"] = pd.to_datetime(df["created_date"])
    df["converted_date"] = pd.to_datetime(df["converted_date"], errors="coerce")
    df["days_to_convert"] = (df["converted_date"] - df["created_date"]).dt.days
    df["month"] = df["created_date"].dt.to_period("M").astype(str)
    return df

def transform_reviews(df):
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M").astype(str)
    df["is_negative"] = df["rating"] <= 2
    return df

def transform_all(raw):
    print("Transforming data...")
    return {
        "sales":     transform_sales(raw["sales"]),
        "inventory": transform_inventory(raw["inventory"]),
        "leads":     transform_leads(raw["leads"]),
        "reviews":   transform_reviews(raw["reviews"]),
    }
''',

"pipeline/load.py": '''
import sqlite3
import os
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dealership.db")

def get_connection():
    return sqlite3.connect(DB_PATH)

def load_all(clean_data):
    print(f"Saving to database...")
    conn = get_connection()
    for table_name, df in clean_data.items():
        df.to_sql(table_name, conn, if_exists="replace", index=False)
        print(f"  Saved {table_name}: {len(df)} rows")
    conn.close()
    print("Done.")

def query(sql):
    conn = get_connection()
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df
''',

"pipeline/run_pipeline.py": '''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.extract import extract_all
from pipeline.transform import transform_all
from pipeline.load import load_all

def run_pipeline():
    print("=" * 40)
    print("  PIPELINE STARTING")
    print("=" * 40)
    raw = extract_all()
    clean = transform_all(raw)
    load_all(clean)
    print("=" * 40)
    print("  PIPELINE COMPLETE")
    print("=" * 40)

if __name__ == "__main__":
    run_pipeline()
''',

"ai/chat.py": '''
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.load import query

def get_data_summary():
    try:
        sales   = query("SELECT COUNT(*) as total_sales, ROUND(SUM(gross_profit),0) as total_gross, ROUND(AVG(gross_profit),0) as avg_gross FROM sales").to_string(index=False)
        sp      = query("SELECT salesperson, COUNT(*) as deals, ROUND(SUM(gross_profit),0) as gross FROM sales GROUP BY salesperson ORDER BY gross DESC").to_string(index=False)
        leads   = query("SELECT source, COUNT(*) as leads, ROUND(100.0*SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END)/COUNT(*),1) as pct FROM leads GROUP BY source ORDER BY pct DESC").to_string(index=False)
        stale   = query("SELECT COUNT(*) as stale_units, ROUND(AVG(days_on_lot),1) as avg_days FROM inventory WHERE is_stale=1 AND status=\'Available\'").to_string(index=False)
        reviews = query("SELECT ROUND(AVG(rating),2) as avg_rating, COUNT(*) as total FROM reviews").to_string(index=False)
        return f"SALES:\\n{sales}\\n\\nSALESPEOPLE:\\n{sp}\\n\\nLEADS:\\n{leads}\\n\\nSTALE INVENTORY:\\n{stale}\\n\\nREVIEWS:\\n{reviews}"
    except Exception as e:
        return f"Error: {e}"

def ask(question, api_key=None):
    try:
        import anthropic
    except ImportError:
        return "Run: pip install anthropic"
    key = api_key or os.getenv("ANTHROPIC_API_KEY")
    if not key:
        return "Add your ANTHROPIC_API_KEY to the .env file."
    client = anthropic.Anthropic(api_key=key)
    msg = client.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=1000,
        messages=[{"role":"user","content":f"You are a car dealership analyst. Use this data to answer questions:\\n\\n{get_data_summary()}\\n\\nQuestion: {question}"}]
    )
    return msg.content[0].text
''',

"dashboard/app.py": '''
import sys, os
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

st.title("🚗 Dealership Intelligence Dashboard")
st.caption("AI-powered insights for your dealership")

if not os.path.exists(DB_PATH):
    st.error("Run the pipeline first: python pipeline/run_pipeline.py")
    st.stop()

kpis = q("SELECT COUNT(*) as total_sales, ROUND(SUM(gross_profit),0) as total_gross, ROUND(AVG(gross_profit),0) as avg_gross, ROUND(SUM(total_income),0) as total_income FROM sales").iloc[0]
inv  = q("SELECT COUNT(*) as units, SUM(CASE WHEN is_stale=1 AND status=\'Available\' THEN 1 ELSE 0 END) as stale FROM inventory").iloc[0]
rev  = q("SELECT ROUND(AVG(rating),2) as avg_rating FROM reviews").iloc[0]

c1,c2,c3,c4,c5,c6 = st.columns(6)
c1.metric("Total Sales",        f"{int(kpis.total_sales):,}")
c2.metric("Total Gross",        f"${int(kpis.total_gross):,}")
c3.metric("Avg Gross / Deal",   f"${int(kpis.avg_gross):,}")
c4.metric("Total Income",       f"${int(kpis.total_income):,}")
c5.metric("Stale Units (60d+)", int(inv.stale))
c6.metric("Avg Rating",         f"⭐ {rev.avg_rating}")

st.divider()
col_a, col_b = st.columns([2,1])
with col_a:
    st.subheader("Monthly Sales Volume")
    st.bar_chart(q("SELECT month, COUNT(*) as units FROM sales GROUP BY month ORDER BY month").set_index("month"))
with col_b:
    st.subheader("Top Salespeople")
    sp = q("SELECT salesperson, COUNT(*) as deals, ROUND(SUM(gross_profit),0) as gross FROM sales GROUP BY salesperson ORDER BY gross DESC")
    sp["gross"] = sp["gross"].apply(lambda x: f"${int(x):,}")
    st.dataframe(sp, use_container_width=True, hide_index=True)

st.divider()
col_c, col_d = st.columns(2)
with col_c:
    st.subheader("Lead Conversion by Source")
    leads = q("SELECT source, COUNT(*) as leads, ROUND(100.0*SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END)/COUNT(*),1) as pct FROM leads GROUP BY source ORDER BY pct DESC")
    leads["pct"] = leads["pct"].apply(lambda x: f"{x}%")
    st.dataframe(leads, use_container_width=True, hide_index=True)
with col_d:
    st.subheader("Inventory Age")
    st.bar_chart(q("SELECT age_bucket, COUNT(*) as units FROM inventory WHERE status=\'Available\' GROUP BY age_bucket ORDER BY age_bucket").set_index("age_bucket"))

st.divider()
st.subheader("⚠️ Stale Inventory — 60+ Days on Lot")
stale = q("SELECT vin, model, year, color, list_price, days_on_lot FROM inventory WHERE is_stale=1 AND status=\'Available\' ORDER BY days_on_lot DESC LIMIT 20")
if len(stale):
    stale["list_price"] = stale["list_price"].apply(lambda x: f"${x:,}")
    st.dataframe(stale, use_container_width=True, hide_index=True)
else:
    st.success("No stale inventory!")

st.divider()
st.subheader("🤖 Ask Your Data")
api_key = st.text_input("Anthropic API Key", type="password")
question = st.text_input("Ask anything...", placeholder="Who is my best salesperson this quarter?")
if st.button("Ask", type="primary") and question:
    with st.spinner("Thinking..."):
        from ai.chat import ask
        st.info(ask(question, api_key=api_key or None))
''',

"requirements.txt": "pandas\nstreamlit\nanthropic\npython-dotenv\nopenpyxl\n",
".env.example": "ANTHROPIC_API_KEY=your_key_here\n",
}

print(f"Creating project at: {BASE}")
for filepath, content in files.items():
    full_path = os.path.join(BASE, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.lstrip("\n"))

for folder in ["data", "pipeline", "ai", "dashboard"]:
    init = os.path.join(BASE, folder, "__init__.py")
    if not os.path.exists(init):
        open(init, "w").close()

print("\nProject created! Now run these commands:")
print(f"\n  cd {BASE}")
print("  pip install pandas streamlit anthropic python-dotenv openpyxl")
print("  cd data")
print("  python generate_sample_data.py")
print("  cd ..")
print("  python pipeline/run_pipeline.py")
print("  streamlit run dashboard/app.py")
