import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
from pipeline.auth import init_auth_db, login

st.set_page_config(page_title="Login — HexGuard", layout="centered", page_icon="🛡️")

init_auth_db()

if "user" not in st.session_state:
    st.session_state.user = None

if st.session_state.user:
    st.success(f"You are logged in as {st.session_state.user['email']}")
    if st.button("Log out"):
        st.session_state.user = None
        st.rerun()
    st.stop()

col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "hexsentry_logo.png")
    if os.path.exists(logo_path):
        st.image(logo_path, width=80)

    st.title("HexGuard")
    st.caption("Business Intelligence Platform")
    st.divider()

    st.subheader("Sign in to your account")

    email    = st.text_input("Email address", placeholder="you@example.com")
    password = st.text_input("Password",      type="password")

    if st.button("Sign In", type="primary", use_container_width=True):
        if not email or not password:
            st.error("Please enter your email and password.")
        else:
            user = login(email, password)
            if user:
                st.session_state.user = user
                st.success(f"Welcome back, {user['business_name']}!")
                st.rerun()
            else:
                st.error("Invalid email or password. Please try again.")

    st.divider()
    st.caption("Don't have an account? Contact HexGuard to get set up.")
