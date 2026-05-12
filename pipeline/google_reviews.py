import os
import sys
import json
import sqlite3
import requests
import pandas as pd
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.auth import get_client_table

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dealership.db")

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI         = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8501/callback")

AUTH_URL    = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL   = "https://oauth2.googleapis.com/token"
REVIEWS_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"


def get_auth_url(state="hexguard"):
    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  REDIRECT_URI,
        "response_type": "code",
        "scope":         "https://www.googleapis.com/auth/business.manage",
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         state,
    }
    from urllib.parse import urlencode
    return f"{AUTH_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code):
    resp = requests.post(TOKEN_URL, data={
        "code":          code,
        "client_id":     GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri":  REDIRECT_URI,
        "grant_type":    "authorization_code",
    })
    return resp.json()


def refresh_access_token(refresh_token):
    resp = requests.post(TOKEN_URL, data={
        "refresh_token": refresh_token,
        "client_id":     GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "grant_type":    "refresh_token",
    })
    return resp.json().get("access_token")


def get_accounts(access_token):
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(REVIEWS_URL, headers=headers)
    return resp.json()


def get_locations(access_token, account_id):
    url = f"https://mybusinessbusinessinformation.googleapis.com/v1/{account_id}/locations"
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(url, headers=headers, params={"readMask": "name,title"})
    return resp.json()


def get_reviews(access_token, account_id, location_id):
    url = f"https://mybusiness.googleapis.com/v4/{account_id}/{location_id}/reviews"
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(url, headers=headers)
    return resp.json()


def save_tokens(client_id, access_token, refresh_token):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS google_tokens (
            client_id     TEXT PRIMARY KEY,
            access_token  TEXT,
            refresh_token TEXT,
            updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        INSERT INTO google_tokens (client_id, access_token, refresh_token)
        VALUES (?, ?, ?)
        ON CONFLICT(client_id) DO UPDATE SET
            access_token=excluded.access_token,
            refresh_token=excluded.refresh_token,
            updated_at=CURRENT_TIMESTAMP
    """, (client_id, access_token, refresh_token))
    conn.commit()
    conn.close()


def load_tokens(client_id):
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT access_token, refresh_token FROM google_tokens WHERE client_id=?",
            (client_id,)
        ).fetchone()
        conn.close()
        return row if row else (None, None)
    except:
        conn.close()
        return None, None


def save_reviews_to_db(client_id, reviews_data):
    if not reviews_data.get("reviews"):
        return 0

    rows = []
    for r in reviews_data["reviews"]:
        rating_map = {
            "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5
        }
        rating   = rating_map.get(r.get("starRating", "THREE"), 3)
        text     = r.get("comment", "")
        date_str = r.get("createTime", "")[:10]

        try:
            date = pd.to_datetime(date_str)
        except:
            date = pd.Timestamp.today()

        rows.append({
            "date":        date,
            "rating":      rating,
            "text":        text,
            "platform":    "Google",
            "is_negative": rating <= 2,
            "sentiment":   "positive" if rating >= 4 else ("neutral" if rating == 3 else "negative"),
            "month":       date.strftime("%Y-%m"),
        })

    if not rows:
        return 0

    df = pd.DataFrame(rows)
    table = get_client_table(client_id, "reviews")
    conn = sqlite3.connect(DB_PATH)

    try:
        existing = pd.read_sql_query(f"SELECT date FROM {table}", conn)
        existing["date"] = pd.to_datetime(existing["date"], errors="coerce")
        existing_dates = set(existing["date"].dt.date)
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df[~df["date"].dt.date.isin(existing_dates)]
    except:
        pass

    if len(df) > 0:
        df.to_sql(table, conn, if_exists="append", index=False)

    conn.close()
    return len(df)
