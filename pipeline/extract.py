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
        "finance": load_csv("finance.csv"),
    }
