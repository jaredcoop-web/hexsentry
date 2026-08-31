
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
from pipeline.auth import init_auth_db, auth_login, get_all_users, create_user, delete_user

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


app = FastAPI(title="HexGuard API", version="1.0.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


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
    allow_origins=[
        "https://hexguard-app.onrender.com",
        "https://hexguardapp.com",
        "https://www.hexguardapp.com",
        "http://localhost:5173",
    ],
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
    return f"client_{client_id}_{table}"


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
@limiter.limit("100/minute")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends()):
    user = auth_login(form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({
        "sub":           user["email"],
        "client_id":     user["client_id"],
        "business_name": user["business_name"],
        "role":          user["role"],
        "plan":          user.get("plan", "starter"),
        "business_type": user.get("business_type", "general"),
        "pages":         user.get("pages", ""),
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
        return RedirectResponse(f"https://hexguardapp.com/?error=google_auth_failed")

    save_google_tokens(state, tokens["access_token"], tokens.get("refresh_token", ""))
    return RedirectResponse(f"https://hexguardapp.com/?connected=true")


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
        sales = q(f"""
            SELECT COUNT(*) as total_sales,
                   ROUND(CAST(SUM(CASE WHEN payment_type = 'In-House / BHPH' THEN 0 ELSE gross_profit END) AS numeric), 2) as total_gross,
                   ROUND(CAST(AVG(CASE WHEN payment_type = 'In-House / BHPH' THEN NULL ELSE gross_profit END) AS numeric), 2) as avg_gross
            FROM {ct(client_id, 'sales')}
        """)
        inv = q(f"""
            SELECT SUM(CASE WHEN CURRENT_DATE - CAST(arrival_date AS date) > 60 THEN 1 ELSE 0 END) as stale
            FROM {ct(client_id, 'inventory')}
            WHERE status='Available'
        """)
        rev = q(f"SELECT ROUND(CAST(AVG(rating) AS numeric), 2) as avg_rating FROM {ct(client_id, 'reviews')}")
        return {"sales": sales[0] if sales else {}, "inventory": inv[0] if inv else {}, "reviews": rev[0] if rev else {}}
    except Exception as e:
        return {"error": str(e)}


@app.get("/sales")
def get_sales(user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "sales")
    try:
        summary = q(f"""
            SELECT COUNT(*) as total_sales,
                   ROUND(CAST(
                       COALESCE(SUM(CASE WHEN payment_type = 'In-House / BHPH' THEN 0 ELSE gross_profit END), 0) +
                       COALESCE((SELECT SUM(amount) FROM {ct(client_id, 'income')} WHERE category = 'BHPH Payment'), 0)
                   AS numeric), 2) as total_gross,
                   COALESCE((SELECT SUM(amount) FROM {ct(client_id, 'income')} WHERE category = 'BHPH Payment'), 0) as bhph_collected,
                   SUM(CASE WHEN month = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN 1 ELSE 0 END) as this_month
            FROM {table}
        """)[0]
        monthly = q(f"""
            SELECT month, COUNT(*) as units,
                   ROUND(CAST(SUM(CASE WHEN payment_type = 'In-House / BHPH' THEN 0 ELSE gross_profit END) AS numeric), 2) as gross
            FROM {table} GROUP BY month ORDER BY month
        """)
        top_salespeople = q(f"""
            SELECT salesperson, COUNT(*) as deals,
                   ROUND(CAST(SUM(CASE WHEN payment_type = 'In-House / BHPH' THEN 0 ELSE gross_profit END) AS numeric), 2) as gross
            FROM {table} GROUP BY salesperson ORDER BY gross DESC LIMIT 5
        """)
        top_models = q(f"""
            SELECT model, COUNT(*) as units
            FROM {table} GROUP BY model ORDER BY units DESC LIMIT 5
        """)
        return {
            "total_sales":    summary.get("total_sales") or 0,
            "total_gross":    summary.get("total_gross"),
            "bhph_collected": summary.get("bhph_collected"),
            "this_month":     summary.get("this_month") or 0,
            "monthly":        monthly,
            "leaderboard":    top_salespeople,
            "top_models":     top_models,
        }
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/sales/list")
def get_all_sales(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        sales = q(f"""
            SELECT id, date, model, salesperson, sale_price, gross_profit, 
                   lead_source,
                   CASE WHEN sale_price > 0 
                        THEN ROUND(CAST(gross_profit / sale_price * 100 AS numeric), 1) 
                        ELSE 0 END as gross_margin_pct
            FROM {ct(client_id, 'sales')} 
            ORDER BY date DESC
        """)
        return sales
    except Exception as e:
        return []
    

    
# ── Delete endpoints ──────────────────────────────────────────────────────────
@app.delete("/sales/{sale_id}")
def delete_sale(sale_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        with engine.connect() as conn:
            sale = conn.execute(text(f"SELECT model, date FROM {ct(client_id, 'sales')} WHERE id=:id"), {"id": sale_id}).fetchone()
            conn.execute(text(f"DELETE FROM {ct(client_id, 'sales')} WHERE id=:id"), {"id": sale_id})
            conn.commit()
        # Try to delete matching F&I record separately
        try:
            if sale:
                with engine.connect() as conn2:
                    conn2.execute(text(f"DELETE FROM {ct(client_id, 'fi')} WHERE model=:model AND date=:date"), {"model": sale[0], "date": sale[1]})
                    conn2.commit()
        except:
            pass  # F&I table may not exist, that's ok
        return {"message": "Sale deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/sales")
def clear_all_sales(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        with engine.connect() as conn:
            conn.execute(text(f"DELETE FROM {ct(client_id, 'sales')}"))
            conn.execute(text(f"DELETE FROM {ct(client_id, 'fi')}"))
            conn.commit()
        return {"message": "All sales cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/fi")
def clear_fi(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        with engine.connect() as conn:
            conn.execute(text(f"DELETE FROM {ct(client_id, 'fi')}"))
            conn.commit()
        return {"message": "F&I data cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


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
    
@app.delete("/inventory")
def clear_all_inventory(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        with engine.connect() as conn:
            conn.execute(text(f"DELETE FROM {ct(client_id, 'inventory')}"))
            conn.commit()
        return {"message": "All inventory cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/anomalies")
def get_anomalies(user=Depends(get_current_user)):
    client_id = user["client_id"]
    alerts = []
    try:
        # Stale inventory check
        try:
            inv = q(f"""SELECT COUNT(*) as total, SUM(CASE WHEN CURRENT_DATE - CAST(arrival_date AS date) > 60 THEN 1 ELSE 0 END) as stale FROM {ct(client_id, 'inventory')} WHERE status='Available'""")
            if inv and inv[0]["total"] and inv[0]["total"] > 0:
                stale = inv[0]["stale"] or 0
                total = inv[0]["total"]
                pct = round(stale / total * 100)
                if stale > 0:
                    level = "critical" if pct > 50 else "warning"
                    alerts.append({
                        "level": level,
                        "category": "Inventory",
                        "title": "High stale inventory" if pct > 50 else "Stale inventory warning",
                        "detail": f"{stale} of {total} items ({pct}%) have been sitting 60+ days. Consider price reductions."
                    })
        except: pass
        # Sales performance check
        try:
            sales = q(f"""
                SELECT 
                    COUNT(*) as total_deals,
                    ROUND(CAST(AVG(gross_profit) AS numeric), 2) as avg_gross,
                    ROUND(CAST(SUM(gross_profit) AS numeric), 2) as total_gross
                FROM {ct(client_id, 'sales')}
                WHERE month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            """)
            if sales and sales[0]["total_deals"] and sales[0]["total_deals"] > 0:
                avg_gross = sales[0]["avg_gross"] or 0
                total     = sales[0]["total_deals"]
                alerts.append({
                    "level":    "positive",
                    "category": "Sales",
                    "title":    f"{total} deals closed this month",
                    "detail":   f"Average gross profit per deal: ${int(avg_gross):,}"
                })
        except: pass

        # Reviews check
        try:
            rev = q(f"""
                SELECT 
                    ROUND(CAST(AVG(rating) AS numeric), 2) as avg_rating,
                    SUM(CASE WHEN is_negative=true THEN 1 ELSE 0 END) as negative,
                    COUNT(*) as total
                FROM {ct(client_id, 'reviews')}
            """)
            if rev and rev[0]["total"] and rev[0]["total"] > 0:
                avg    = float(rev[0]["avg_rating"] or 0)
                neg    = rev[0]["negative"] or 0
                if neg > 0:
                    alerts.append({
                        "level":    "warning",
                        "category": "Reviews",
                        "title":    f"{neg} negative review{'s' if neg > 1 else ''} detected",
                        "detail":   f"Average rating: {avg} stars. Respond to negative reviews promptly."
                    })
                elif avg >= 4.5:
                    alerts.append({
                        "level":    "positive",
                        "category": "Reviews",
                        "title":    f"Excellent reputation — {avg} star average",
                        "detail":   f"Based on {rev[0]['total']} reviews. Keep up the great work!"
                    })
        except: pass

        # Lead source check
        try:
            leads = q(f"""
                SELECT lead_source, COUNT(*) as deals,
                       ROUND(CAST(SUM(gross_profit) AS numeric), 0) as gross
                FROM {ct(client_id, 'sales')}
                GROUP BY lead_source ORDER BY deals DESC LIMIT 1
            """)
            if leads and leads[0]["lead_source"]:
                alerts.append({
                    "level":    "positive",
                    "category": "Sales",
                    "title":    f"{leads[0]['lead_source']} is your best lead source",
                    "detail":   f"{leads[0]['deals']} deals, ${int(leads[0]['gross'] or 0):,} gross. Consider increasing investment here."
                })
        except: pass

    except Exception as e:
        print(f"Anomaly error: {e}")

    return {"alerts": alerts}


@app.get("/")
def root():
    return {"status": "HexGuard API is running"}

from pydantic import BaseModel
from typing import Optional

class ManualSale(BaseModel):
    date:            str
    description:     str
    sale_price:      float
    cost:            float = 0
    gross_profit:    float
    salesperson:     str
    payment_type:    str = "Cash"
    lead_source:     str = "Walk-in"
    notes:           Optional[str] = ""
    finance_reserve: float = 0
    warranty:        float = 0
    gap_insurance:   float = 0
    addons:          float = 0
    inventory_id:    Optional[int] = None
    

@app.post("/sales/manual")
def add_manual_sale(sale: ManualSale, user=Depends(get_current_user)):
    client_id     = user["client_id"]
    table         = ct(client_id, "sales")
    fi_table      = ct(client_id, "fi")
    total_backend = sale.finance_reserve + sale.warranty + sale.gap_insurance + sale.addons

    try:
        with engine.connect() as conn:
            conn.execute(text(f"""
                INSERT INTO {table}
                (date, model, sale_price, cost, gross_profit, salesperson,
                 lead_source, finance_income, total_income, month, year,
                 days_on_lot, gross_margin_pct, payment_type)
                VALUES (:date, :model, :sale_price, :cost, :gross_profit, :salesperson,
                        :lead_source, :finance_income, :total_income, :month, :year, 0, :margin, :payment_type)
            """), {
                "date":           sale.date,
                "model":          sale.description,
                "sale_price":     sale.sale_price,
                "cost":           sale.cost,
                "gross_profit":   sale.gross_profit,
                "salesperson":    sale.salesperson,
                "lead_source":    sale.lead_source,
                "finance_income": total_backend,
                "total_income":   sale.gross_profit + total_backend,
                "month":          sale.date[:7],
                "year":           sale.date[:4],
                "margin":         round((sale.gross_profit / sale.sale_price * 100), 2) if sale.sale_price else 0,
                "payment_type":   sale.payment_type,
            })
            conn.commit()

        # Save F&I data if any backend income
        if total_backend > 0:
            with engine.connect() as conn:
                conn.execute(text(f"""
                    INSERT INTO {fi_table}
                    (date, salesperson, model, finance_reserve, warranty,
                     gap_insurance, addons, total_backend, month, year)
                    VALUES (:date, :salesperson, :model, :finance_reserve, :warranty,
                            :gap_insurance, :addons, :total_backend, :month, :year)
                """), {
                    "date":            sale.date,
                    "salesperson":     sale.salesperson,
                    "model":           sale.description,
                    "finance_reserve": sale.finance_reserve,
                    "warranty":        sale.warranty,
                    "gap_insurance":   sale.gap_insurance,
                    "addons":          sale.addons,
                    "total_backend":   total_backend,
                    "month":           sale.date[:7],
                    "year":            sale.date[:4],
                })
                conn.commit()

        # Auto-mark specific inventory item as sold if selected
        try:
            inv_id = getattr(sale, 'inventory_id', None)
            if inv_id:
                inv_table = ct(client_id, "inventory")
                with engine.connect() as inv_conn:
                    inv_conn.execute(text(f"UPDATE {inv_table} SET status='Sold' WHERE id=:id"), {"id": inv_id})
                    inv_conn.commit()
        except:
            pass

        # Add to income only if NOT BHPH
        if sale.payment_type != 'In-House / BHPH' and sale.gross_profit > 0:
            with engine.connect() as conn:
                conn.execute(text(f"""
                    INSERT INTO {ct(client_id, 'income')}
                    (date, category, description, amount, month, year)
                    VALUES (:date, 'Sale Income', :desc, :amount, :month, :year)
                """), {
                    "date":   sale.date,
                    "desc":   sale.description,
                    "amount": sale.gross_profit,
                    "month":  sale.date[:7],
                    "year":   sale.date[:4],
                })
                conn.commit()

        return {"message": "Sale recorded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/fi")
def get_fi(user=Depends(get_current_user)):
    client_id = user["client_id"]
    fi_table  = ct(client_id, "fi")
    sal_table = ct(client_id, "sales")
    try:
        summary = q(f"""
            SELECT
                ROUND(CAST(SUM(total_backend) AS numeric), 0) as total_backend,
                ROUND(CAST(AVG(total_backend) AS numeric), 0) as avg_backend,
                COUNT(*) as fi_deals,
                ROUND(CAST(SUM(finance_reserve) AS numeric), 0) as total_finance,
                ROUND(CAST(SUM(warranty) AS numeric), 0) as total_warranty,
                ROUND(CAST(SUM(gap_insurance) AS numeric), 0) as total_gap,
                ROUND(CAST(SUM(addons) AS numeric), 0) as total_addons
            FROM {fi_table}
        """)
        by_salesperson = q(f"""
            SELECT salesperson,
                   COUNT(*) as deals,
                   ROUND(CAST(SUM(total_backend) AS numeric), 0) as total,
                   ROUND(CAST(AVG(total_backend) AS numeric), 0) as avg_bpu
            FROM {fi_table}
            GROUP BY salesperson ORDER BY total DESC
        """)
        monthly = q(f"""
            SELECT month,
                   ROUND(CAST(SUM(total_backend) AS numeric), 0) as total_backend
            FROM {fi_table}
            GROUP BY month ORDER BY month
        """)
        total_deals = q(f"SELECT COUNT(*) as count FROM {sal_table}")[0].get("count", 0)
        fi_deals    = summary[0].get("fi_deals", 0) if summary else 0
        penetration = round(fi_deals / total_deals * 100) if total_deals > 0 else 0

        return {
            "summary":        summary[0] if summary else {},
            "by_salesperson": by_salesperson,
            "monthly":        monthly,
            "penetration":    penetration,
        }
    except Exception as e:
        return {"error": str(e)}
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
    
# ── Inventory endpoints ───────────────────────────────────────────────────────
class InventoryItem(BaseModel):
    name:           str
    category:       str = "General"
    sku:            Optional[str] = ""
    cost:           float = 0
    asking_price:   float = 0
    date_received:  str = ""
    condition:      str = "Used"
    notes:          Optional[str] = ""

@app.post("/inventory/add")
def add_inventory_item(item: InventoryItem, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "inventory")
    date      = item.date_received or datetime.utcnow().strftime("%Y-%m-%d")
    try:
        with engine.connect() as conn:
            conn.execute(text(f"""
                INSERT INTO {table}
                (vin, model, year, list_price, arrival_date, days_on_lot,
                 status, is_stale, color, age_bucket, cost, category, condition, notes)
                VALUES (:vin, :model, :year, :list_price, :arrival_date, 0,
                        'Available', false, :condition, '0-30 days', :cost, :category, :condition, :notes)
            """), {
                "vin":          item.sku or f"SKU-{datetime.utcnow().timestamp()}",
                "model":        item.name,
                "year":         datetime.utcnow().year,
                "list_price":   item.asking_price,
                "arrival_date": date,
                "cost":         item.cost,
                "category":     item.category,
                "condition":    item.condition,
                "notes":        item.notes or "",
            })
            conn.commit()
        return {"message": "Item added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/list")
def get_inventory_list(user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "inventory")
    try:
        items = q(f"""
            SELECT id, vin as sku, model as name, list_price as asking_price,
                   cost, arrival_date, status, condition, notes,
                   CURRENT_DATE - CAST(arrival_date AS date) as days_in_stock
            FROM {table}
            ORDER BY arrival_date ASC
        """)
        return items
    except Exception as e:
        return []

@app.get("/inventory/search")
def search_inventory(term: str, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "inventory")
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT id, model as name, vin as sku, list_price as asking_price, cost
                FROM {table}
                WHERE status='Available'
                AND (LOWER(model) LIKE LOWER(:term) OR LOWER(vin) LIKE LOWER(:term))
                ORDER BY model
                LIMIT 8
            """), {"term": f"%{term}%"})
            rows = result.fetchall()
            return [{"id": r[0], "name": r[1], "sku": r[2], "asking_price": r[3], "cost": r[4]} for r in rows]
    except:
        return []

@app.patch("/inventory/{item_id}/sell")
def mark_item_sold(item_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "inventory")
    try:
        with engine.connect() as conn:
            conn.execute(
                text(f"UPDATE {table} SET status='Sold' WHERE id=:id"),
                {"id": item_id}
            )
            conn.commit()
        return {"message": "Item marked as sold"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/inventory/{item_id}")
def delete_inventory_item(item_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "inventory")
    try:
        with engine.connect() as conn:
            conn.execute(
                text(f"DELETE FROM {table} WHERE id=:id"),
                {"id": item_id}
            )
            conn.commit()
        return {"message": "Item deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # ── AI Chat endpoint ──────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str

@app.post("/chat")
def chat(msg: ChatMessage, user=Depends(get_current_user)):
    client_id     = user["client_id"]
    business_name = user["business_name"]

    try:
        try:
            sales = q(f"SELECT salesperson, model, sale_price, gross_profit, lead_source, date, month FROM {ct(client_id, 'sales')} ORDER BY date DESC LIMIT 100")
        except: sales = []
        try:
            inv = q(f"SELECT model, list_price, days_on_lot, status, age_bucket FROM {ct(client_id, 'inventory')} LIMIT 50")
        except: inv = []
        try:
            reviews = q(f"SELECT rating, text, sentiment, date FROM {ct(client_id, 'reviews')} ORDER BY date DESC LIMIT 20")
        except: reviews = []

        context = f"""
You are a business intelligence assistant for {business_name}.
Answer questions about their business data clearly and concisely.
Do not use markdown formatting — plain text only, no asterisks, no hashtags, no bullet dashes.
Use numbers and be specific. Keep answers under 150 words unless asked for more detail.

SALES DATA (last 100 deals):
{sales}

INVENTORY DATA:
{inv}

REVIEWS DATA (last 20):
{reviews}
"""

        import anthropic
        client   = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model      = "claude-sonnet-4-5",
            max_tokens = 500,
            system     = context,
            messages   = [{"role": "user", "content": msg.message}]
        )

        return {"response": response.content[0].text}

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    
# ── Email Report endpoint ─────────────────────────────────────────────────────
class EmailReportRequest(BaseModel):
    recipient_email: str
    business_name:   Optional[str] = ""

def _send_report(user: dict, recipient_email: str):
    import os
    resend.api_key = os.getenv("RESEND_API_KEY")

    client_id     = user["client_id"]
    business_name = user["business_name"]

    try:
        sales = q(f"""
            SELECT COUNT(*) as deals,
                   ROUND(CAST(SUM(gross_profit) AS numeric), 0) as total_gross,
                   ROUND(CAST(AVG(gross_profit) AS numeric), 0) as avg_gross
            FROM {ct(client_id, 'sales')}
            WHERE month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        """)[0]
    except: sales = {}

    try:
        last_week = q(f"""
            SELECT COUNT(*) as deals,
                   ROUND(CAST(SUM(gross_profit) AS numeric), 0) as total_gross
            FROM {ct(client_id, 'sales')}
            WHERE date >= TO_CHAR(CURRENT_DATE - INTERVAL '14 days', 'YYYY-MM-DD')
            AND date < TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'YYYY-MM-DD')
        """)[0]
    except: last_week = {}

    try:
        top_sp = q(f"""
            SELECT salesperson, COUNT(*) as deals,
                   ROUND(CAST(SUM(gross_profit) AS numeric), 0) as gross
            FROM {ct(client_id, 'sales')}
            WHERE month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            GROUP BY salesperson ORDER BY gross DESC LIMIT 1
        """)
        top_sp = top_sp[0] if top_sp else {}
    except: top_sp = {}

    try:
        stale = q(f"""
            SELECT COUNT(*) as count FROM {ct(client_id, 'inventory')}
            WHERE status='Available'
            AND CURRENT_DATE - CAST(arrival_date AS date) > 60
        """)[0]
    except: stale = {}

    try:
        reviews = q(f"SELECT ROUND(CAST(AVG(rating) AS numeric), 2) as avg_rating, COUNT(*) as total FROM {ct(client_id, 'reviews')}")[0]
    except: reviews = {}

    week        = datetime.utcnow().strftime("%B %d, %Y")
    deals       = int(sales.get("deals") or 0)
    total_gross = int(sales.get("total_gross") or 0)
    avg_gross   = int(sales.get("avg_gross") or 0)
    stale_count = int(stale.get("count") or 0)
    avg_rating  = reviews.get("avg_rating") or "N/A"
    total_rev   = int(reviews.get("total") or 0)

    last_deals     = int(last_week.get("deals") or 0)
    last_gross     = int(last_week.get("total_gross") or 0)
    deals_diff     = deals - last_deals
    gross_diff     = total_gross - last_gross
    deals_arrow    = "↑" if deals_diff >= 0 else "↓"
    gross_arrow    = "↑" if gross_diff >= 0 else "↓"
    deals_color    = "#27ae60" if deals_diff >= 0 else "#c0392b"
    gross_color    = "#27ae60" if gross_diff >= 0 else "#c0392b"
    deals_diff_abs = abs(deals_diff)
    gross_diff_abs = abs(gross_diff)

    top_sp_html = f"{top_sp['salesperson']} — {int(top_sp['deals'])} deals, ${int(top_sp['gross'] or 0):,} gross" if top_sp.get("salesperson") else "No sales data this period."

    avg_rating_stars = "⭐" * int(float(avg_rating)) if avg_rating != "N/A" else ""

    if stale_count > 0:
        inv_bg          = "#2d1515"
        inv_border      = "#c0392b"
        inv_title_color = "#e74c3c"
        inv_text_color  = "#e74c3c"
        inv_title       = "Inventory Alert"
        inv_message     = f"🔴 {stale_count} items have been sitting 60+ days. Consider price reductions or promotions."
    else:
        inv_bg          = "#0d2d15"
        inv_border      = "#27ae60"
        inv_title_color = "#2ecc71"
        inv_text_color  = "#2ecc71"
        inv_title       = "Inventory"
        inv_message     = "✅ No stale inventory — great job keeping stock moving!"

    template_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'email_template.html')
    html = open(template_path).read()
    html = html.replace('{{business_name}}', business_name)
    html = html.replace('{{week}}', week)
    html = html.replace('{{deals}}', str(deals))
    html = html.replace('{{total_gross}}', f'{total_gross:,}')
    html = html.replace('{{avg_gross}}', f'{avg_gross:,}')
    html = html.replace('{{deals_color}}', deals_color)
    html = html.replace('{{deals_arrow}}', deals_arrow)
    html = html.replace('{{deals_diff_abs}}', str(deals_diff_abs))
    html = html.replace('{{gross_color}}', gross_color)
    html = html.replace('{{gross_arrow}}', gross_arrow)
    html = html.replace('{{gross_diff_abs}}', f'{gross_diff_abs:,}')
    html = html.replace('{{top_sp_html}}', top_sp_html)
    html = html.replace('{{avg_rating_stars}}', avg_rating_stars)
    html = html.replace('{{avg_rating}}', str(avg_rating))
    html = html.replace('{{total_rev}}', str(total_rev))
    html = html.replace('{{inv_bg}}', inv_bg)
    html = html.replace('{{inv_border}}', inv_border)
    html = html.replace('{{inv_title_color}}', inv_title_color)
    html = html.replace('{{inv_text_color}}', inv_text_color)
    html = html.replace('{{inv_title}}', inv_title)
    html = html.replace('{{inv_message}}', inv_message)

    resend.Emails.send({
        "from":    "HexGuard <reports@hexguardapp.com>",
        "to":      recipient_email,
        "subject": f"HexGuard Weekly Report — {business_name} — {week}",
        "html":    html,
    })
        
@app.delete("/settings/report-email")
def cancel_report_email(user=Depends(get_current_user)):
    from pipeline.auth import update_report_email
    update_report_email(user["sub"], "")
    return {"message": "Weekly reports cancelled"}

@app.post("/email/send")
def send_email_report(req: EmailReportRequest, user=Depends(get_current_user)):
    business_name = req.business_name or user["business_name"]
    try:
        _send_report(
            {"client_id": user["client_id"], "business_name": business_name, "sub": user["sub"]},
            req.recipient_email
        )
        return {"message": "Email sent successfully"}
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
# ── Admin endpoints ───────────────────────────────────────────────────────────
class NewClient(BaseModel):
    email:         str
    password:      str
    business_name: str
    client_id:     str
    plan:          str = "starter"
    business_type: str = "general"
    pages:         str = ""

@app.post("/admin/clients")
def create_client(client: NewClient, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from pipeline.auth import create_user
    success = create_user(
        email=client.email,
        password=client.password,
        business_name=client.business_name,
        client_id=client.client_id,
        role="client",
        plan=client.plan,
        business_type=client.business_type,
        pages=client.pages
    )
    if not success:
        raise HTTPException(status_code=400, detail="Email or client ID already exists")

    # Create their tables in Neon
    try:
        with engine.connect() as conn:
            for table_suffix, schema in [
                ("sales", """id SERIAL PRIMARY KEY, date TEXT, model TEXT, sale_price FLOAT,
                    cost FLOAT, gross_profit FLOAT, salesperson TEXT, lead_source TEXT,
                    finance_income FLOAT DEFAULT 0, total_income FLOAT, month TEXT,
                    year TEXT, days_on_lot INTEGER DEFAULT 0, gross_margin_pct FLOAT DEFAULT 0"""),
                ("reviews", """id SERIAL PRIMARY KEY, date TEXT, rating FLOAT, text TEXT,
                    platform TEXT, is_negative BOOLEAN, sentiment TEXT, month TEXT"""),
                ("inventory", """id SERIAL PRIMARY KEY, vin TEXT, model TEXT, year INTEGER,
                    list_price FLOAT, arrival_date TEXT, days_on_lot INTEGER DEFAULT 0,
                    status TEXT, is_stale BOOLEAN, color TEXT, age_bucket TEXT,
                    cost FLOAT DEFAULT 0, category TEXT DEFAULT 'General',
                    condition TEXT DEFAULT 'Used', notes TEXT DEFAULT ''"""),
                ("fi", """id SERIAL PRIMARY KEY, date TEXT, salesperson TEXT, model TEXT,
                    finance_reserve FLOAT DEFAULT 0, warranty FLOAT DEFAULT 0,
                    gap_insurance FLOAT DEFAULT 0, addons FLOAT DEFAULT 0,
                    total_backend FLOAT DEFAULT 0, month TEXT, year TEXT"""),
                ("expenses", """id SERIAL PRIMARY KEY, date TEXT, category TEXT,
                    description TEXT, amount FLOAT, recurring BOOLEAN DEFAULT false,
                    frequency TEXT DEFAULT 'one-time', notes TEXT DEFAULT '',
                    month TEXT, year TEXT"""),
                ("income", """id SERIAL PRIMARY KEY, date TEXT, category TEXT,
                    description TEXT, amount FLOAT, notes TEXT DEFAULT '',
                    month TEXT, year TEXT"""),
                ("bhph_contracts", """id SERIAL PRIMARY KEY, sale_id INTEGER,
                    customer_name TEXT, customer_phone TEXT, vehicle TEXT,
                    sale_price FLOAT, down_payment FLOAT, amount_financed FLOAT,
                    interest_rate FLOAT, term_months INTEGER, payment_frequency TEXT,
                    payment_amount FLOAT, total_interest FLOAT, start_date TEXT,
                    status TEXT DEFAULT 'Active', notes TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"""),
                ("bhph_payments", """id SERIAL PRIMARY KEY, contract_id INTEGER,
                    due_date TEXT, amount_due FLOAT, amount_paid FLOAT DEFAULT 0,
                    paid_date TEXT, status TEXT DEFAULT 'Upcoming',
                    notes TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"""),
            ]:
                table = f"client_{client.client_id}_{table_suffix}"
                conn.execute(text(f"CREATE TABLE IF NOT EXISTS {table} ({schema})"))
            conn.commit()
    except Exception as e:
        print(f"Table creation error: {e}")

    return {"message": f"Client {client.business_name} created successfully"}


@app.get("/admin/clients")
def get_clients(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from pipeline.auth import get_all_users
    users = get_all_users()
    return [{
        "id":            u[0],
        "email":         u[1],
        "business_name": u[2],
        "client_id":     u[3],
        "role":          u[4],
        "plan":          u[5] if len(u) > 5 else "core",
        "business_type": u[7] if len(u) > 7 else "general",
        "pages":         u[8] if len(u) > 8 else "",
    } for u in users if u[4] != "admin"]


@app.delete("/admin/clients/{email}")
def delete_client(email: str, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from pipeline.auth import delete_user
    delete_user(email)
    return {"message": f"Client {email} deleted"}

# ── Expenses endpoints ────────────────────────────────────────────────────────
class Expense(BaseModel):
    date:        str
    category:    str
    description: str
    amount:      float
    recurring:   bool = False
    frequency:   str = "one-time"
    notes:       Optional[str] = ""

@app.get("/expenses")
def get_expenses(user=Depends(get_current_user)):
    client_id = user["client_id"]
    exp_table = ct(client_id, "expenses")
    inc_table = ct(client_id, "income")
    try:
        summary = q(f"""
            SELECT
                ROUND(CAST(SUM(amount) AS numeric), 0) as total_expenses,
                COUNT(*) as expense_count
            FROM {exp_table}
            WHERE month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        """)
        other_income = q(f"""
            SELECT ROUND(CAST(SUM(amount) AS numeric), 0) as total_other_income
            FROM {inc_table}
            WHERE month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            AND category NOT IN ('Sale Income', 'BHPH Payment')
        """)
        sale_income = q(f"""
            SELECT ROUND(CAST(SUM(amount) AS numeric), 0) as total_sale_income
            FROM {inc_table}
            WHERE month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            AND category IN ('Sale Income', 'BHPH Payment')
        """)
        by_category = q(f"""
            SELECT category,
                   ROUND(CAST(SUM(amount) AS numeric), 0) as total
            FROM {exp_table}
            WHERE month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            GROUP BY category ORDER BY total DESC
        """)
        monthly = q(f"""
            SELECT month,
                   ROUND(CAST(SUM(amount) AS numeric), 0) as total
            FROM {exp_table}
            GROUP BY month ORDER BY month
        """)
        recent = q(f"""
            SELECT id, date, category, description, amount, recurring, frequency
            FROM {exp_table}
            ORDER BY date DESC LIMIT 50
        """)
        recent = q(f"""
            SELECT id, date, category, description, 
                   ROUND(CAST(amount AS numeric), 2) as amount, 
                   recurring, frequency
            FROM {exp_table}
            ORDER BY date DESC LIMIT 50
        """)
        return {
            "summary": {
                **(summary[0] if summary else {}),
                "total_other_income": other_income[0].get("total_other_income", 0) if other_income else 0,
                "total_sale_income":  sale_income[0].get("total_sale_income", 0) if sale_income else 0,
            },
            "by_category":   by_category,
            "monthly":       monthly,
            "recent":        recent,
            "recent_income": recent_income,
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/cashflow")
def get_cashflow(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        # Only count non-BHPH sales as immediate income
        sales_data = q(f"""
            SELECT month,
                   ROUND(CAST(SUM(CASE WHEN payment_type = 'In-House / BHPH' THEN 0 ELSE gross_profit END) AS numeric), 0) as income
            FROM {ct(client_id, 'sales')}
            GROUP BY month ORDER BY month
        """)
        expense_data = q(f"""
            SELECT month,
                   ROUND(CAST(SUM(amount) AS numeric), 0) as expenses
            FROM {ct(client_id, 'expenses')}
            GROUP BY month ORDER BY month
        """)
        # Sale Income from manual entries
        sale_income_data = q(f"""
            SELECT month,
                   ROUND(CAST(SUM(amount) AS numeric), 0) as sale_income
            FROM {ct(client_id, 'income')}
            WHERE category = 'Sale Income'
            GROUP BY month ORDER BY month
        """)
        # BHPH payments tracked separately
        bhph_income_data = q(f"""
            SELECT month,
                   ROUND(CAST(SUM(amount) AS numeric), 0) as bhph_income
            FROM {ct(client_id, 'income')}
            WHERE category = 'BHPH Payment'
            GROUP BY month ORDER BY month
        """)
        # Other income (owner contributions, loans, etc)
        other_income_data = q(f"""
            SELECT month,
                   ROUND(CAST(SUM(amount) AS numeric), 0) as other_income
            FROM {ct(client_id, 'income')}
            WHERE category NOT IN ('Sale Income', 'BHPH Payment')
            GROUP BY month ORDER BY month
        """)

        months = {}

        for s in sales_data:
            months[s["month"]] = {"month": s["month"], "income": s["income"] or 0, "expenses": 0, "other_income": 0}

        for e in expense_data:
            if e["month"] not in months:
                months[e["month"]] = {"month": e["month"], "income": 0, "expenses": 0, "other_income": 0}
            months[e["month"]]["expenses"] = e["expenses"] or 0

        # Add Sale Income to income
        for s in sale_income_data:
            if s["month"] not in months:
                months[s["month"]] = {"month": s["month"], "income": 0, "expenses": 0, "other_income": 0}
            months[s["month"]]["income"] = (months[s["month"]].get("income") or 0) + (s["sale_income"] or 0)

        # Add BHPH payments to income
        for b in bhph_income_data:
            if b["month"] not in months:
                months[b["month"]] = {"month": b["month"], "income": 0, "expenses": 0, "other_income": 0}
            months[b["month"]]["income"] = (months[b["month"]].get("income") or 0) + (b["bhph_income"] or 0)

        # Add other income
        for o in other_income_data:
            if o["month"] not in months:
                months[o["month"]] = {"month": o["month"], "income": 0, "expenses": 0, "other_income": 0}
            months[o["month"]]["other_income"] = o["other_income"] or 0

        result = sorted(months.values(), key=lambda x: x["month"])
        for r in result:
            r["net"] = (r["income"] + r["other_income"]) - r["expenses"]
        return {"cashflow": result}
    except Exception as e:
        return {"error": str(e)}
    
@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "expenses")
    try:
        with engine.connect() as conn:
            conn.execute(text(f"DELETE FROM {table} WHERE id=:id"), {"id": expense_id})
            conn.commit()
        return {"message": "Expense deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ── Income endpoints ──────────────────────────────────────────────────────────
class Income(BaseModel):
    date:        str
    category:    str
    description: str
    amount:      float
    notes:       Optional[str] = ""

@app.post("/income/add")
def add_income(income: Income, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "income")
    try:
        with engine.connect() as conn:
            conn.execute(text(f"""
                INSERT INTO {table}
                (date, category, description, amount, notes, month, year)
                VALUES (:date, :category, :description, :amount, :notes, :month, :year)
            """), {
                "date":        income.date,
                "category":    income.category,
                "description": income.description,
                "amount":      income.amount,
                "notes":       income.notes or "",
                "month":       income.date[:7],
                "year":        income.date[:4],
            })
            conn.commit()
        return {"message": "Income added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/income/{income_id}")
def delete_income(income_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "income")
    try:
        with engine.connect() as conn:
            conn.execute(text(f"DELETE FROM {table} WHERE id=:id"), {"id": income_id})
            conn.commit()
        return {"message": "Income deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ── Scheduler endpoints ───────────────────────────────────────────────────────
SCHEDULER_KEY = os.getenv("SCHEDULER_API_KEY", "hexguard_scheduler_2024")

class ReportEmailUpdate(BaseModel):
    report_email: str

@app.post("/settings/report-email")
def update_report_email(req: ReportEmailUpdate, user=Depends(get_current_user)):
    from pipeline.auth import update_report_email
    update_report_email(user["sub"], req.report_email)
    return {"message": "Report email saved"}

@app.get("/email/send-all")
def send_all_reports(api_key: str):
    if api_key != SCHEDULER_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    from pipeline.auth import get_all_users
    users   = get_all_users()
    sent    = 0
    failed  = 0
    for u in users:
        if u[4] == "admin": continue
        report_email = u[6] if len(u) > 6 else ""
        if not report_email: continue
        try:
            mock_user = {"client_id": u[3], "business_name": u[2], "sub": u[1]}
            _send_report(mock_user, report_email)
            sent += 1
        except Exception as e:
            print(f"Failed {u[1]}: {e}")
            failed += 1
    return {"sent": sent, "failed": failed}

@app.post("/recurring/process")
def process_recurring(api_key: str):
    if api_key != SCHEDULER_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    from pipeline.auth import get_all_users
    users         = get_all_users()
    processed     = 0
    current_month = datetime.utcnow().strftime("%Y-%m")
    today         = datetime.utcnow().strftime("%Y-%m-%d")
    for u in users:
        if u[4] == "admin": continue
        client_id = u[3]
        exp_table = ct(client_id, "expenses")
        try:
            recurring = q(f"SELECT id, category, description, amount, frequency, notes FROM {exp_table} WHERE recurring=true")
            for r in recurring:
                already = q(f"SELECT COUNT(*) as count FROM {exp_table} WHERE description='{r['description']} (auto)' AND month='{current_month}'")
                if already and already[0]["count"] == 0:
                    with engine.connect() as conn:
                        conn.execute(text(f"""
                            INSERT INTO {exp_table}
                            (date, category, description, amount, recurring, frequency, notes, month, year)
                            VALUES (:date, :category, :description, :amount, false, :frequency, :notes, :month, :year)
                        """), {
                            "date": today, "category": r["category"],
                            "description": f"{r['description']} (auto)",
                            "amount": r["amount"], "frequency": r["frequency"],
                            "notes": r["notes"], "month": current_month, "year": today[:4],
                        })
                        conn.commit()
                    processed += 1
        except Exception as e:
            print(f"Error {client_id}: {e}")
    return {"processed": processed}

class TrialRequest(BaseModel):
    name:     str
    email:    str
    business: str
    type:     str = ""

@app.post("/trial-request")
def trial_request(req: TrialRequest):
    import traceback
    try:
        print(f"Trial request received: {req.name} {req.email} {req.business}")
        import resend
        resend.api_key = os.getenv("RESEND_API_KEY")
        print(f"Resend key: {os.getenv('RESEND_API_KEY')[:10] if os.getenv('RESEND_API_KEY') else 'NOT SET'}")
        print(f"Admin email: {os.getenv('ADMIN_EMAIL')}")
        result = resend.Emails.send({
            "from":    "HexGuard <reports@hexguardapp.com>",
            "to":      os.getenv("ADMIN_EMAIL"),
            "subject": f"New Trial Request — {req.business}",
            "html":    f"""
                <h2>New HexGuard Trial Request</h2>
                <p><strong>Name:</strong> {req.name}</p>
                <p><strong>Email:</strong> {req.email}</p>
                <p><strong>Business:</strong> {req.business}</p>
                <p><strong>Type:</strong> {req.type}</p>
            """
        })
        print(f"Resend result: {result}")
        return {"message": "Request received"}
    except Exception as e:
        print(f"TRIAL REQUEST ERROR: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.get("/debug/google-temp")
def debug_google_temp(user=Depends(get_current_user)):
    client_id = user["client_id"]
    access_token, refresh = load_google_tokens(client_id)
    if not access_token:
        return {"error": "not connected"}
    new_token = refresh_google_token(refresh)
    if new_token:
        access_token = new_token
    headers = {"Authorization": f"Bearer {access_token}"}
    accounts = requests.get(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        headers=headers
    ).json()
    return {"accounts": accounts}

@app.get("/admin/reset-temp")
def reset_admin():
    from pipeline.auth import create_user, get_auth_connection
    import os
    conn = get_auth_connection()
    conn.execute("DELETE FROM users WHERE role='admin'")
    conn.commit()
    conn.close()
    create_user(
        email=os.getenv("ADMIN_EMAIL", "admin@hexguard.com"),
        password=os.getenv("ADMIN_PASSWORD", "hexguard_admin_2024"),
        business_name="HexGuard Admin",
        client_id="admin",
        role="admin",
        plan="pro"
    )
    return {"message": "Admin reset successfully"}

@app.get("/stats")
def get_stats(user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "sales")
    try:
        # Month over month comparison
        this_month = q(f"""
            SELECT COUNT(*) as deals,
                   ROUND(CAST(SUM(gross_profit) AS numeric), 2) as gross
            FROM {table}
            WHERE month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        """)[0]

        last_month = q(f"""
            SELECT COUNT(*) as deals,
                   ROUND(CAST(SUM(gross_profit) AS numeric), 2) as gross
            FROM {table}
            WHERE month = TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM')
        """)[0]

        # Best lead source
        best_source = q(f"""
            SELECT lead_source, COUNT(*) as deals,
                   ROUND(CAST(SUM(gross_profit) AS numeric), 2) as gross
            FROM {table}
            GROUP BY lead_source
            ORDER BY deals DESC LIMIT 1
        """)

        # Best day of week
        best_day = q(f"""
            SELECT TO_CHAR(CAST(date AS date), 'Day') as day_name,
                   COUNT(*) as deals
            FROM {table}
            WHERE date IS NOT NULL
            GROUP BY day_name
            ORDER BY deals DESC LIMIT 1
        """)

        this_gross = float(this_month.get("gross") or 0)
        last_gross = float(last_month.get("gross") or 0)
        mom_change = round((this_gross - last_gross) / last_gross * 100) if last_gross > 0 else None

        return {
            "mom_change":   mom_change,
            "this_gross":   this_gross,
            "last_gross":   last_gross,
            "this_deals":   this_month.get("deals") or 0,
            "last_deals":   last_month.get("deals") or 0,
            "best_source":  best_source[0] if best_source else None,
            "best_day":     best_day[0] if best_day else None,
        }
    except Exception as e:
        return {"error": str(e)}
    
# ── BHPH / Collections endpoints ─────────────────────────────────────────────

@app.post("/bhph/contracts")
def create_bhph_contract(contract: dict, user=Depends(get_current_user)):
    client_id = user["client_id"]
    table     = ct(client_id, "bhph_contracts")
    pay_table = ct(client_id, "bhph_payments")
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                INSERT INTO {table}
                (sale_id, customer_name, customer_phone, vehicle, sale_price,
                 down_payment, amount_financed, interest_rate, term_months,
                 payment_frequency, payment_amount, total_interest, start_date, notes)
                VALUES (:sale_id, :customer_name, :customer_phone, :vehicle, :sale_price,
                        :down_payment, :amount_financed, :interest_rate, :term_months,
                        :payment_frequency, :payment_amount, :total_interest, :start_date, :notes)
                RETURNING id
            """), contract)
            contract_id = result.fetchone()[0]

            # Auto-generate payment schedule
            from datetime import datetime, timedelta
            start = datetime.strptime(contract["start_date"], "%Y-%m-%d")
            freq  = contract["payment_frequency"]
            count = contract["term_months"]
            if freq == "Weekly":    count = contract["term_months"] * 4
            if freq == "Bi-Weekly": count = contract["term_months"] * 2

            for i in range(count):
                if freq == "Weekly":    due = start + timedelta(weeks=i+1)
                if freq == "Bi-Weekly": due = start + timedelta(weeks=(i+1)*2)
                if freq == "Monthly":   
                    month = (start.month + i) % 12 or 12
                    year  = start.year + (start.month + i - 1) // 12
                    due   = start.replace(month=month, year=year)

                conn.execute(text(f"""
                    INSERT INTO {pay_table}
                    (contract_id, due_date, amount_due, status)
                    VALUES (:contract_id, :due_date, :amount_due, :status)
                """), {
                    "contract_id": contract_id,
                    "due_date":    due.strftime("%Y-%m-%d"),
                    "amount_due":  contract["payment_amount"],
                    "status":      "Upcoming"
                })
            conn.commit()
        return {"message": "Contract created", "contract_id": contract_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bhph/contracts")
def get_bhph_contracts(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        contracts = q(f"""
            SELECT c.*,
                   COUNT(p.id) as total_payments,
                   ROUND(CAST(SUM(CASE WHEN p.status = 'Paid' THEN p.amount_paid ELSE 0 END) AS numeric), 2) as total_collected,
                   SUM(CASE WHEN p.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                   SUM(CASE WHEN p.status = 'Upcoming' AND p.due_date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') THEN 1 ELSE 0 END) as due_today
            FROM {ct(client_id, 'bhph_contracts')} c
            LEFT JOIN {ct(client_id, 'bhph_payments')} p ON p.contract_id = c.id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        """)
        return contracts
    except Exception as e:
        return []


@app.get("/bhph/contracts/{contract_id}/payments")
def get_contract_payments(contract_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        payments = q(f"""
            SELECT id, contract_id, due_date, amount_due, 
                   COALESCE(amount_paid, 0) as amount_paid,
                   COALESCE(paid_date, '') as paid_date,
                   COALESCE(status, 'Upcoming') as status,
                   COALESCE(notes, '') as notes
            FROM {ct(client_id, 'bhph_payments')}
            WHERE contract_id = {contract_id}
            ORDER BY due_date ASC
        """)
        return payments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/bhph/payments/{payment_id}/pay")
def mark_payment_paid(payment_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    today     = datetime.utcnow().strftime("%Y-%m-%d")
    try:
        with engine.connect() as conn:
            payment = conn.execute(text(f"""
                SELECT amount_due FROM {ct(client_id, 'bhph_payments')}
                WHERE id = :id
            """), {"id": payment_id}).fetchone()

            conn.execute(text(f"""
                UPDATE {ct(client_id, 'bhph_payments')}
                SET status = 'Paid', paid_date = :today, amount_paid = :amount
                WHERE id = :id
            """), {"today": today, "amount": payment[0], "id": payment_id})

            # Add to income
            conn.execute(text(f"""
                INSERT INTO {ct(client_id, 'income')}
                (date, category, description, amount, month, year)
                VALUES (:date, 'BHPH Payment', :desc, :amount, :month, :year)
            """), {
                "date":   today,
                "desc":   f"BHPH Payment #{payment_id}",
                "amount": payment[0],
                "month":  today[:7],
                "year":   today[:4],
            })
            conn.commit()
        return {"message": "Payment marked as paid"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/bhph/payments/{payment_id}/late")
def mark_payment_late(payment_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        with engine.connect() as conn:
            conn.execute(text(f"""
                UPDATE {ct(client_id, 'bhph_payments')}
                SET status = 'Late'
                WHERE id = :id
            """), {"id": payment_id})
            conn.commit()
        return {"message": "Payment marked as late"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bhph/summary")
def get_bhph_summary(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        summary = q(f"""
            SELECT
                COUNT(DISTINCT c.id) as active_contracts,
                ROUND(CAST(SUM(c.amount_financed) AS numeric), 2) as total_portfolio,
                ROUND(CAST(SUM(CASE WHEN p.status = 'Paid' THEN p.amount_paid ELSE 0 END) AS numeric), 2) as total_collected,
                ROUND(CAST(SUM(CASE WHEN p.status = 'Late' THEN p.amount_due ELSE 0 END) AS numeric), 2) as total_late,
                COUNT(CASE WHEN p.status = 'Late' THEN 1 END) as late_payments,
                COUNT(CASE WHEN p.due_date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AND p.status = 'Upcoming' THEN 1 END) as due_today
            FROM {ct(client_id, 'bhph_contracts')} c
            LEFT JOIN {ct(client_id, 'bhph_payments')} p ON p.contract_id = c.id
            WHERE c.status = 'Active'
        """)[0]
        return summary
    except Exception as e:
        return {}
    
@app.delete("/bhph/contracts/{contract_id}")
def delete_bhph_contract(contract_id: int, user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        with engine.connect() as conn:
            conn.execute(text(f"DELETE FROM {ct(client_id, 'bhph_payments')} WHERE contract_id=:id"), {"id": contract_id})
            conn.execute(text(f"DELETE FROM {ct(client_id, 'bhph_contracts')} WHERE id=:id"), {"id": contract_id})
            conn.commit()
        return {"message": "Contract deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/bhph/contracts")
def clear_all_bhph(user=Depends(get_current_user)):
    client_id = user["client_id"]
    try:
        with engine.connect() as conn:
            conn.execute(text(f"DELETE FROM {ct(client_id, 'bhph_payments')}"))
            conn.execute(text(f"DELETE FROM {ct(client_id, 'bhph_contracts')}"))
            conn.commit()
        return {"message": "All contracts cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/change-password")
def change_password(data: dict, user=Depends(get_current_user)):
    from pipeline.auth import get_user, hash_password, verify_password
    try:
        db_user = get_user(user["sub"])
        if not verify_password(data["current_password"], db_user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        with engine.connect() as conn:
            conn.execute(text("""
                UPDATE users SET password_hash = :hash WHERE email = :email
            """), {
                "hash":  hash_password(data["new_password"]),
                "email": user["sub"]
            })
            conn.commit()
        return {"message": "Password updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
import secrets

@app.post("/forgot-password")
def forgot_password(data: dict):
    email = data.get("email", "").lower().strip()
    try:
        from pipeline.auth import get_user
        user = get_user(email)
        if not user:
            return {"message": "If that email exists, a reset link has been sent."}
        
        token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=1)
        
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO password_reset_tokens (email, token, expires_at)
                VALUES (:email, :token, :expires)
            """), {"email": email, "token": token, "expires": expires})
            conn.commit()
        
        import resend
        resend.api_key = os.getenv("RESEND_API_KEY")
        reset_url = f"https://hexguardapp.com/?reset_token={token}"
        resend.Emails.send({
            "from":    "HexGuard <reports@hexguardapp.com>",
            "to":      email,
            "subject": "Reset your HexGuard password",
            "html":    f"""
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0A0A0A;color:#C0C0C0;">
                    <h2 style="color:#C0C0C0;">Reset your password</h2>
                    <p style="color:#666;">You requested a password reset for your HexGuard account.</p>
                    <a href="{reset_url}" style="display:inline-block;padding:12px 24px;background:#4a9eff;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">Reset Password</a>
                    <p style="color:#444;font-size:12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                </div>
            """
        })
        return {"message": "If that email exists, a reset link has been sent."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reset-password")
def reset_password(data: dict):
    token    = data.get("token", "")
    password = data.get("new_password", "")
    try:
        from pipeline.auth import hash_password
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT email, expires_at, used FROM password_reset_tokens
                WHERE token = :token
            """), {"token": token}).fetchone()
            
            if not result:
                raise HTTPException(status_code=400, detail="Invalid reset link")
            if result[2]:
                raise HTTPException(status_code=400, detail="Reset link already used")
            if datetime.utcnow() > result[1]:
                raise HTTPException(status_code=400, detail="Reset link has expired")
            
            email = result[0]
            conn.execute(text("""
                UPDATE users SET password_hash = :hash WHERE email = :email
            """), {"hash": hash_password(password), "email": email})
            conn.execute(text("""
                UPDATE password_reset_tokens SET used = true WHERE token = :token
            """), {"token": token})
            conn.commit()
        return {"message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))