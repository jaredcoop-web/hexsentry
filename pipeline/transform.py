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

def transform_finance(df):
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["total_backend"] = (
        df["finance_income"] + 
        df["warranty_income"] + 
        df["addon_income"]
    )
    df["month"] = df["date"].dt.to_period("M").astype(str)
    return df

def transform_all(raw):
    print("Transforming data...")
    return {
        "sales":     transform_sales(raw["sales"]),
        "inventory": transform_inventory(raw["inventory"]),
        "finance":   transform_finance(raw["finance"]), 
        "leads":     transform_leads(raw["leads"]),
        "reviews":   transform_reviews(raw["reviews"]),
    }
