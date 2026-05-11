import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
import pandas as pd
from pipeline.auth import require_admin, create_user, get_all_users, delete_user, init_auth_db

from pipeline.auth import init_auth_db, require_login
init_auth_db()
user = require_login()

st.set_page_config(page_title="Admin — HexGuard", layout="wide", page_icon="⚙️")

init_auth_db()

admin = require_admin()

st.title("⚙️ HexGuard Admin Panel")
st.caption(f"Logged in as {admin['email']}")

if st.button("Log out", key="logout"):
    st.session_state.user = None
    st.rerun()

st.divider()

# ── Create new client ─────────────────────────────────────────────────────────
st.subheader("Create New Client Account")

col_a, col_b = st.columns(2)
with col_a:
    new_email    = st.text_input("Client email",     placeholder="owner@dealership.com")
    new_password = st.text_input("Temporary password", type="password", placeholder="they can change this later")
with col_b:
    new_business = st.text_input("Business name",   placeholder="Johnson Motors")
    new_client_id = st.text_input("Client ID",      placeholder="johnson_motors (no spaces)")

st.caption("The client ID is used internally to separate their data. Use lowercase with underscores.")

if st.button("Create Account", type="primary"):
    if not new_email or not new_password or not new_business or not new_client_id:
        st.error("Please fill in all fields.")
    else:
        success = create_user(
            email=new_email,
            password=new_password,
            business_name=new_business,
            client_id=new_client_id,
            role="client"
        )
        if success:
            st.success(f"Account created for {new_business}!")
            st.info(f"Send them these login details:\n\n**Email:** {new_email}\n\n**Password:** {new_password}")
        else:
            st.error("Email or client ID already exists. Try a different one.")

st.divider()

# ── All clients ───────────────────────────────────────────────────────────────
st.subheader("All Client Accounts")

users = get_all_users()
if users:
    df = pd.DataFrame(users, columns=["ID", "Email", "Business", "Client ID", "Role", "Created"])
    df = df[df["Role"] != "admin"]
    st.dataframe(df, use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Delete Account")
    delete_email = st.text_input("Enter email to delete", placeholder="owner@dealership.com")
    if st.button("Delete Account", type="secondary"):
        if delete_email:
            delete_user(delete_email)
            st.success(f"Account deleted for {delete_email}")
            st.rerun()
else:
    st.info("No client accounts yet.")
