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
