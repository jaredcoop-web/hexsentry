
import sys
import os

from dotenv import load_dotenv
load_dotenv()


sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from datetime import datetime, timedelta
import sqlite3
import pandas as pd
from sqlalchemy import create_engine, text
from jose import JWTError, jwt
from passlib.context import CryptContext
import requests
from urllib.parse import urlencode
import hmac
import hashlib
import base64
import json
from pipeline.auth import init_auth_db, login as auth_login, get_client_table

app = FastAPI(title="HexGuard API", version="1.0.0")

DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    engine = create_engine(DATABASE_URL)
    def q(sql):
        with engine.connect() as conn:
            df = pd.read_sql_query(text(sql), conn)
        return df.to_dict(orient="records")
else:
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dealership.db")
    engine = None

app = FastAPI(title="HexGuard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://hex-guard.onrender.com", "https://hexguard-app.onrender.com",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY           = os.getenv("JWT_SECRET", "hexguard_jwt_secret_change_in_production")
ALGORITHM            = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dealership.db")

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

init_auth_db()


# ── Token helpers ─────────────────────────────────────────────────────────────
def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("sub") is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def q(sql):
    if DATABASE_URL:
        with engine.connect() as conn:
            df = pd.read_sql_query(text(sql), conn)
        return df.to_dict(orient="records")
    else:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(sql, conn)
        conn.close()
        return df.to_dict(orient="records")

def ct(client_id, table):
    return get_client_table(client_id, table)


def save_google_tokens(client_id, access_token, refresh_token):
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS google_tokens (
                    client_id     TEXT PRIMARY KEY,
                    access_token  TEXT,
                    refresh_token TEXT,
                    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                INSERT INTO google_tokens (client_id, access_token, refresh_token)
                VALUES (:client_id, :access_token, :refresh_token)
                ON CONFLICT(client_id) DO UPDATE SET
                    access_token=EXCLUDED.access_token,
                    refresh_token=EXCLUDED.refresh_token,
                    updated_at=CURRENT_TIMESTAMP
            """), {
                "client_id":     client_id,
                "access_token":  access_token,
                "refresh_token": refresh_token,
            })
            conn.commit()
    except Exception as e:
        print(f"Error saving Google tokens: {e}")


def load_google_tokens(client_id):
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT access_token, refresh_token FROM google_tokens WHERE client_id=:client_id"),
                {"client_id": client_id}
            ).fetchone()
        return (result[0], result[1]) if result else (None, None)
    except:
        return None, None


def refresh_google_token(refresh_token):
    resp = requests.post("https://oauth2.googleapis.com/token", data={
        "refresh_token": refresh_token,
        "client_id":     GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "grant_type":    "refresh_token",
    })
    return resp.json().get("access_token")



def fetch_and_save_reviews(client_id, access_token):
    headers      = {"Authorization": f"Bearer {access_token}"}
    accounts     = requests.get("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", headers=headers).json()
    account_list = accounts.get("accounts", [])
    if not account_list:
        return 0

    account_id = account_list[0]["name"]
    locations  = requests.get(
        f"https://mybusinessbusinessinformation.googleapis.com/v1/{account_id}/locations",
        headers=headers,
        params={"readMask": "name,title"}
    ).json()

    loc_list = locations.get("locations", [])
    if not loc_list:
        return 0

    total_saved = 0
    rating_map  = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}

    for loc in loc_list:
        location_id  = loc["name"]
        reviews_data = requests.get(
            f"https://mybusiness.googleapis.com/v4/{account_id}/{location_id}/reviews",
            headers=headers
        ).json()

        rows = []
        for r in reviews_data.get("reviews", []):
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

        if rows:
            df    = pd.DataFrame(rows)
            table = ct(client_id, "reviews")
            try:
                with engine.connect() as conn:
                    existing = pd.read_sql_query(
                        text(f"SELECT date FROM {table}"), conn
                    )
                    existing["date"] = pd.to_datetime(existing["date"], errors="coerce")
                    df["date"]       = pd.to_datetime(df["date"], errors="coerce")
                    df = df[~df["date"].dt.date.isin(set(existing["date"].dt.date))]
            except:
                pass

            if len(df) > 0:
                df.to_sql(table, engine, if_exists="append", index=False)
                total_saved += len(df)

    return total_saved

# ── Auth endpoints ────────────────────────────────────────────────────────────
@app.post("/token")
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = auth_login(form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({
        "sub":           user["email"],
        "client_id":     user["client_id"],
        "business_name": user["business_name"],
        "role":          user["role"],
    })
    return {"access_token": token, "token_type": "bearer"}


@app.get("/me")
def get_me(user=Depends(get_current_user)):
    return user


# ── Google OAuth endpoints ────────────────────────────────────────────────────
@app.get("/auth/google")
def google_auth(user=Depends(get_current_user)):
    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "https://www.googleapis.com/auth/business.manage",
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         user["client_id"],
    }
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"}


@app.get("/auth/google/callback")
def google_callback(code: str, state: str, request: Request):
    resp = requests.post("https://oauth2.googleapis.com/token", data={
        "code":          code,
        "client_id":     GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "grant_type":    "authorization_code",
    })
    tokens = resp.json()

    if "access_token" not in tokens:
        return RedirectResponse(f"http://localhost:5173/reviews?error=google_auth_failed")

    save_google_tokens(state, tokens["access_token"], tokens.get("refresh_token", ""))
    return RedirectResponse(f"https://hexguard-app.onrender.com/reviews?connected=true")


@app.get("/auth/google/status")
def google_status(user=Depends(get_current_user)):
    access_token, _ = load_google_tokens(user["client_id"])
    return {"connected": access_token is not None}


@app.post("/auth/google/sync")
def google_sync(user=Depends(get_current_user)):
    client_id             = user["client_id"]
    access_token, refresh = load_google_tokens(client_id)

    if not access_token:
        raise HTTPException(status_code=400, detail="Google not connected")

    new_token = refresh_google_token(refresh)
    if new_token:
        access_token = new_token

    try:
        saved = fetch_and_save_reviews(client_id, access_token)
        return {"saved": saved, "message": f"Synced {saved} new reviews"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/auth/google")
def google_disconnect(user=Depends(get_current_user)):
    try:
        with engine.connect() as conn:
            conn.execute(
                text("DELETE FROM google_tokens WHERE client_id=:client_id"),
                {"client_id": user["client_id"]}
            )
            conn.commit()
        return {"message": "Disconnected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Data endpoints ────────────────────────────────────────────────────────────
@app.get("/kpis")
def get_kpis(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        sales = q(f"SELECT COUNT(*) as total_sales, ROUND(CAST(SUM(gross_profit) AS numeric), 0) as total_gross, ROUND(CAST(AVG(gross_profit) AS numeric), 0) as avg_gross FROM {ct(client_id, 'sales')}")
        inv   = q(f"SELECT SUM(CASE WHEN is_stale=1 AND status='Available' THEN 1 ELSE 0 END) as stale FROM {ct(client_id, 'inventory')}")
        rev   = q(f"SELECT ROUND(CAST(AVG(rating) AS numeric), 2) as avg_rating FROM {ct(client_id, 'reviews')}")
        return {"sales": sales[0] if sales else {}, "inventory": inv[0] if inv else {}, "reviews": rev[0] if rev else {}}
    except Exception as e:
        return {"error": str(e)}


@app.get("/sales")
def get_sales(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        monthly = q(f"SELECT month, COUNT(*) as units, ROUND(CAST(SUM(gross_profit) AS numeric), 0) as gross FROM {ct(client_id, 'sales')} GROUP BY month ORDER BY month")
        top_sp  = q(f"SELECT salesperson, COUNT(*) as deals, ROUND(CAST(SUM(gross_profit) AS numeric), 0) as gross FROM {ct(client_id, 'sales')} GROUP BY salesperson ORDER BY gross DESC")
        models  = q(f"SELECT model, COUNT(*) as units FROM {ct(client_id, 'sales')} GROUP BY model ORDER BY units DESC LIMIT 10")
        return {"monthly": monthly, "top_salespeople": top_sp, "top_models": models}
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/sales/list")
def get_all_sales(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        sales = q(f"SELECT id, date, model, salesperson, sale_price, gross_profit FROM {ct(client_id, 'sales')} ORDER BY date DESC")
        return sales
    except Exception as e:
        return []
    

    
# ── Delete endpoints ──────────────────────────────────────────────────────────
@app.delete("/sales/{sale_id}")
def delete_sale(sale_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "sales")
    try:
        with engine.connect() as conn:
            conn.execute(
                text(f"DELETE FROM {table} WHERE id=:id"),
                {"id": sale_id}
            )
            conn.commit()
        return {"message": "Sale deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/sales")
def clear_all_sales(user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "sales")
    try:
        with engine.connect() as conn:
            conn.execute(text(f"TRUNCATE TABLE {table}"))
            conn.commit()
        return {"message": "All sales cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/debug")
def debug(user=Depends(get_current_user)):
    client_id = user["client_id"]
    table = ct(client_id, "sales")
    return {"table_name": table, "client_id": client_id}

@app.get("/debug2")
def debug2(user=Depends(get_current_user)):
    try:
        result = q("SELECT COUNT(*) as count FROM client_admin_sales")
        return {"count": result, "database": "neon" if DATABASE_URL else "sqlite"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/reviews")
def get_reviews(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        summary = q(f"SELECT ROUND(CAST(AVG(rating) AS numeric), 2) as avg_rating, COUNT(*) as total, SUM(CASE WHEN is_negative=true THEN 1 ELSE 0 END) as negative FROM {ct(client_id, 'reviews')}")
        recent  = q(f"SELECT date, rating, text, platform, sentiment FROM {ct(client_id, 'reviews')} ORDER BY date DESC LIMIT 20")
        monthly = q(f"SELECT month, ROUND(CAST(AVG(rating) AS numeric), 2) as avg_rating FROM {ct(client_id, 'reviews')} GROUP BY month ORDER BY month")
        return {"summary": summary[0] if summary else {}, "recent": recent, "monthly": monthly}
    except Exception as e:
        return {"error": str(e)}


@app.get("/inventory")
def get_inventory(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        summary = q(f"SELECT COUNT(*) as total, SUM(CASE WHEN status='Available' THEN 1 ELSE 0 END) as available, SUM(CASE WHEN is_stale=true AND status='Available' THEN 1 ELSE 0 END) as stale FROM {ct(client_id, 'inventory')}")
        stale   = q(f"SELECT vin, model, year, list_price, days_on_lot FROM {ct(client_id, 'inventory')} WHERE is_stale=true AND status='Available' ORDER BY days_on_lot DESC LIMIT 20")
        age     = q(f"SELECT age_bucket, COUNT(*) as units FROM {ct(client_id, 'inventory')} WHERE status='Available' GROUP BY age_bucket")
        return {"summary": summary[0] if summary else {}, "stale": stale, "age_buckets": age}
    except Exception as e:
        return {"error": str(e)}


@app.get("/anomalies")
def get_anomalies(user=Depends(get_current_user)):
    try:
        from pipeline.anomalies import run_all_checks
        alerts = run_all_checks()
        return {"alerts": alerts}
    except Exception as e:
        return {"alerts": [], "error": str(e)}


@app.get("/")
def root():
    return {"status": "HexGuard API is running"}

from pydantic import BaseModel
from typing import Optional

class ManualSale(BaseModel):
    date:         str
    description:  str
    sale_price:   float
    cost:         float = 0
    gross_profit: float
    salesperson:  str
    payment_type: str = "Cash"
    lead_source:  str = "Walk-in"
    notes:        Optional[str] = ""

@app.post("/sales/manual")
def add_manual_sale(sale: ManualSale, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "sales")
    try:
        with engine.connect() as conn:
            conn.execute(text(f"""
                INSERT INTO {table}
                (date, model, sale_price, cost, gross_profit, salesperson,
                 lead_source, finance_income, total_income, month, year,
                 days_on_lot, gross_margin_pct)
                VALUES (:date, :model, :sale_price, :cost, :gross_profit, :salesperson,
                        :lead_source, 0, :total_income, :month, :year, 0, :margin)
            """), {
                "date":         sale.date,
                "model":        sale.description,
                "sale_price":   sale.sale_price,
                "cost":         sale.cost,
                "gross_profit": sale.gross_profit,
                "salesperson":  sale.salesperson,
                "lead_source":  sale.lead_source,
                "total_income": sale.gross_profit,
                "month":        sale.date[:7],
                "year":         sale.date[:4],
                "margin":       round((sale.gross_profit / sale.sale_price * 100), 2) if sale.sale_price else 0,
            })
            conn.commit()
        return {"message": "Sale recorded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ── Square webhook ────────────────────────────────────────────────────────────
import hmac
import hashlib
import base64
import json

SQUARE_WEBHOOK_SIG = os.getenv("SQUARE_WEBHOOK_SIGNATURE_KEY", "")

def verify_square_signature(body: bytes, signature: str, url: str) -> bool:
    if not SQUARE_WEBHOOK_SIG:
        return True
    combined = url + body.decode("utf-8")
    expected = hmac.new(SQUARE_WEBHOOK_SIG.encode(), combined.encode(), hashlib.sha256).digest()
    return base64.b64encode(expected).decode() == signature

def parse_square_payment(event_data: dict) -> dict:
    payment      = event_data.get("object", {}).get("payment", {})
    amount       = payment.get("amount_money", {}).get("amount", 0) / 100
    date         = payment.get("created_at", datetime.utcnow().isoformat())[:10]
    method_map   = {"CARD": "Card", "CASH": "Cash", "BANK_ACCOUNT": "Bank Transfer", "EXTERNAL": "Other"}
    payment_type = method_map.get(payment.get("source_type", "CARD"), "Card")
    return {
        "date":         date,
        "description":  payment.get("note", "Square Payment"),
        "sale_price":   amount,
        "cost":         0,
        "gross_profit": amount,
        "salesperson":  "Square POS",
        "lead_source":  "Square",
        "payment_type": payment_type,
        "square_id":    payment.get("id", ""),
    }

@app.post("/webhooks/square/{client_id}")
async def square_webhook(client_id: str, request: Request):
    body      = await request.body()
    signature = request.headers.get("x-square-hmacsha256-signature", "")
    if not verify_square_signature(body, signature, str(request.url)):
        raise HTTPException(status_code=401, detail="Invalid Square signature")
    try:
        event      = json.loads(body)
        event_type = event.get("type", "")
        if event_type != "payment.completed":
            return {"status": "ignored"}
        sale  = parse_square_payment(event.get("data", {}))
        table = ct(client_id, "sales")
        with engine.connect() as conn:
            conn.execute(text(f"""
                INSERT INTO {table}
                (date, model, sale_price, cost, gross_profit, salesperson,
                 lead_source, finance_income, total_income, month, year,
                 days_on_lot, gross_margin_pct)
                VALUES (:date, :model, :sale_price, :cost, :gross_profit, :salesperson,
                        :lead_source, 0, :total_income, :month, :year, 0, 0)
            """), {
                "date":         sale["date"],
                "model":        sale["description"],
                "sale_price":   sale["sale_price"],
                "cost":         sale["cost"],
                "gross_profit": sale["gross_profit"],
                "salesperson":  sale["salesperson"],
                "lead_source":  sale["lead_source"],
                "total_income": sale["gross_profit"],
                "month":        sale["date"][:7],
                "year":         sale["date"][:4],
            })
            conn.commit()
        return {"status": "success", "amount": sale["sale_price"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ── Stripe webhook ────────────────────────────────────────────────────────────
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

def parse_stripe_payment(event_data: dict) -> dict:
    payment_intent = event_data.get("object", {})
    amount         = payment_intent.get("amount", 0) / 100
    date           = datetime.utcfromtimestamp(
        payment_intent.get("created", 0)
    ).strftime("%Y-%m-%d")
    method_map = {
        "card":         "Card",
        "us_bank_account": "Bank Transfer",
        "cashapp":      "Cash",
        "link":         "Card",
    }
    payment_method = payment_intent.get("payment_method_types", ["card"])[0]
    description    = payment_intent.get("description", "Stripe Payment")
    return {
        "date":         date,
        "description":  description or "Stripe Payment",
        "sale_price":   amount,
        "cost":         0,
        "gross_profit": amount,
        "salesperson":  "Stripe",
        "lead_source":  "Stripe",
        "payment_type": method_map.get(payment_method, "Card"),
        "stripe_id":    payment_intent.get("id", ""),
    }

@app.post("/webhooks/stripe/{client_id}")
async def stripe_webhook(client_id: str, request: Request):
    body = await request.body()
    try:
        event      = json.loads(body)
        event_type = event.get("type", "")
        if event_type != "payment_intent.succeeded":
            return {"status": "ignored"}
        sale  = parse_stripe_payment(event.get("data", {}))
        table = ct(client_id, "sales")
        with engine.connect() as conn:
            conn.execute(text(f"""
                INSERT INTO {table}
                (date, model, sale_price, cost, gross_profit, salesperson,
                 lead_source, finance_income, total_income, month, year,
                 days_on_lot, gross_margin_pct)
                VALUES (:date, :model, :sale_price, :cost, :gross_profit, :salesperson,
                        :lead_source, 0, :total_income, :month, :year, 0, 0)
            """), {
                "date":         sale["date"],
                "model":        sale["description"],
                "sale_price":   sale["sale_price"],
                "cost":         sale["cost"],
                "gross_profit": sale["gross_profit"],
                "salesperson":  sale["salesperson"],
                "lead_source":  sale["lead_source"],
                "total_income": sale["gross_profit"],
                "month":        sale["date"][:7],
                "year":         sale["date"][:4],
            })
            conn.commit()
        return {"status": "success", "amount": sale["sale_price"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))