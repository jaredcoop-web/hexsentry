import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
from pipeline.auth import init_auth_db, require_login

st.set_page_config(page_title="Email Report — HexGuard", layout="wide", page_icon="📧")

init_auth_db()
user = require_login()

st.title("📧 Weekly Email Report")
st.caption(f"{user['business_name']} — Receive a summary every Friday afternoon")

if st.button("Log out", key="logout"):
    st.session_state.user = None
    st.rerun()

st.divider()

st.subheader("Send a Test Report")

sender_email    = st.text_input("Your Gmail address",    placeholder="you@gmail.com")
app_password    = st.text_input("Gmail App Password",    type="password", placeholder="16 character app password")
recipient_email = st.text_input("Send report to",        placeholder="owner@dealership.com")
business_name   = st.text_input("Business name",         value=user["business_name"])

st.divider()

if st.button("Send Test Email Now", type="primary"):
    if not sender_email or not app_password or not recipient_email:
        st.error("Please fill in all fields above.")
    else:
        with st.spinner("Sending email..."):
            try:
                from pipeline.email_report import send_weekly_report
                success = send_weekly_report(
                    sender_email=sender_email,
                    sender_password=app_password,
                    recipient_email=recipient_email,
                    business_name=business_name or user["business_name"]
                )
                if success:
                    st.success(f"Report sent to {recipient_email}!")
                    st.balloons()
                else:
                    st.error("Failed to send. Check your Gmail address and app password.")
            except Exception as e:
                st.error(f"Error: {e}")

st.divider()

st.subheader("What's in your weekly report:")
st.markdown("""
- Total sales, gross profit, and average per deal
- Top performing salesperson of the week
- HexGuard alerts — issues flagged automatically
- Stale inventory count
- Best converting lead source
- Direct link to your full dashboard
""")
