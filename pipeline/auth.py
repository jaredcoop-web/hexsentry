import sqlite3
import bcrypt
import os

 
AUTH_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "auth.db")
 
 
def get_auth_connection():
    return sqlite3.connect(AUTH_DB)
 
 
def init_auth_db():
    conn = get_auth_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            business_name TEXT NOT NULL,
            client_id     TEXT UNIQUE NOT NULL,
            role          TEXT DEFAULT 'client',
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
 
    admin_email    = os.getenv("ADMIN_EMAIL",    "admin@hexguard.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "hexguard_admin_2024")
 
    cursor = conn.execute("SELECT COUNT(*) FROM users WHERE role='admin'")
    if cursor.fetchone()[0] == 0:
        create_user(
            email=admin_email,
            password=admin_password,
            business_name="HexGuard Admin",
            client_id="admin",
            role="admin"
        )
        print(f"Admin account created: {admin_email}")
 
    conn.close()
 
 
def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
 
 
def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed.encode())
 
 
def create_user(email, password, business_name, client_id, role="client"):
    conn = get_auth_connection()
    try:
        conn.execute("""
            INSERT INTO users (email, password_hash, business_name, client_id, role)
            VALUES (?, ?, ?, ?, ?)
        """, (email.lower().strip(), hash_password(password), business_name, client_id.lower().replace(" ", "_"), role))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False
 
 
def get_user(email):
    conn = get_auth_connection()
    cursor = conn.execute("SELECT * FROM users WHERE email=?", (email.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "id":            row[0],
            "email":         row[1],
            "password_hash": row[2],
            "business_name": row[3],
            "client_id":     row[4],
            "role":          row[5],
        }
    return None
 
 
def get_all_users():
    conn = get_auth_connection()
    cursor = conn.execute("SELECT id, email, business_name, client_id, role, created_at FROM users ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return rows
 
 
def delete_user(email):
    conn = get_auth_connection()
    conn.execute("DELETE FROM users WHERE email=?", (email.lower().strip(),))
    conn.commit()
    conn.close()
 
 
def login(email, password):
    user = get_user(email)
    if user and verify_password(password, user["password_hash"]):
        return user
    return None
 
 
 
def get_client_table(client_id, table_name):
    return f"client_{client_id}_{table_name}"
 
 
if __name__ == "__main__":
    init_auth_db()
    print("Auth database initialized.")
