import os
import bcrypt
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def init_auth_db():
    admin_email    = os.getenv("ADMIN_EMAIL",    "admin@hexguard.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "hexguard_admin_2024")
    
    
    with engine.connect() as conn:
        # Create users table if not exists
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id            SERIAL PRIMARY KEY,
                email         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                business_name TEXT NOT NULL,
                client_id     TEXT UNIQUE NOT NULL,
                role          TEXT DEFAULT 'client',
                plan          TEXT DEFAULT 'starter',
                report_email  TEXT DEFAULT '',
                business_type TEXT DEFAULT 'general',
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()

        # Check if admin exists, create if not
        result = conn.execute(text("SELECT COUNT(*) FROM users WHERE role='admin'"))
        if result.fetchone()[0] == 0:
            conn.execute(text("""
                INSERT INTO users (email, password_hash, business_name, client_id, role, plan, business_type)
                VALUES (:email, :hash, 'HexGuard Admin', 'admin', 'admin', 'pro', 'general')
            """), {"email": admin_email, "hash": hash_password(admin_password)})
            conn.commit()
            print(f"Admin account created: {admin_email}")

def get_user(email: str):
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, email, password_hash, business_name, client_id, role, plan, report_email, pages FROM users WHERE email=:email"),
            {"email": email.lower().strip()}
        )
        row = result.fetchone()
        if row:
            return {
                "id":            row[0],
                "email":         row[1],
                "password_hash": row[2],
                "business_name": row[3],
                "client_id":     row[4],
                "role":          row[5],
                "plan":          row[6],
                "report_email":  row[7],
                "business_type": row[8] if len(row) > 8 else "general",
                "pages":         row[9] if len(row) > 9 else "",
            }
    return None

def auth_login(email: str, password: str):
    user = get_user(email)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user

def create_user(email, password, business_name, client_id, role="client", plan="starter"):
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                INSERT INTO users (email, password_hash, business_name, client_id, role, plan)
                VALUES (:email, :hash, :business_name, :client_id, :role, :plan)
            """), {
                "email":         email.lower().strip(),
                "hash":          hash_password(password),
                "business_name": business_name,
                "client_id":     client_id.lower().replace(" ", "_"),
                "role":          role,
                "plan":          plan,
                "business_type": business_type,
                "pages":         pages,
            })
            conn.commit()
            return True
        except Exception as e:
            print(f"Create user error: {e}")
            return False

def delete_user(email: str):
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM users WHERE email=:email"), {"email": email.lower().strip()})
        conn.commit()

def get_all_users():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, email, business_name, client_id, role, plan, report_email, business_type, pages FROM users"))
        return result.fetchall()

def update_report_email(email: str, report_email: str):
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE users SET report_email=:report_email WHERE email=:email"),
            {"report_email": report_email, "email": email.lower().strip()}
        )
        conn.commit()