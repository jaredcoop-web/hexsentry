import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st

st.set_page_config(page_title="Email Report — HexGuard", layout="wide", page_icon="📧")

st.title("📧 Weekly Email Report")
st.caption("Send a weekly summary of your dealership performance every Friday")

st.divider()

st.subheader("Email Settings")

sender_email    = st.text_input("Your Gmail address",         placeholder="you@gmail.com")
app_password    = st.text_input("Your Gmail App Password",    type="password", placeholder="16 character app password")
recipient_email = st.text_input("Send report to",             placeholder="owner@dealership.com")
business_name   = st.text_input("Business name",              placeholder="Johnson Motors")

st.divider()

col_a, col_b = st.columns(2)

with col_a:
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
                        business_name=business_name or "Your Dealership"
                    )
                    if success:
                        st.success(f"Email sent successfully to {recipient_email}!")
                        st.balloons()
                    else:
                        st.error("Failed to send email. Check your Gmail address and app password.")
                except Exception as e:
                    st.error(f"Error: {e}")

with col_b:
    st.info("Reports automatically send every Friday at 5pm once you add your email credentials to Render's environment variables.")

st.divider()

st.subheader("What's included in the report:")
st.markdown("""
- Total sales, gross profit, and avg gross per deal this week
- Top performing salesperson
- All HexGuard alerts — critical issues, warnings, and wins
- Stale inventory count
- Best converting lead source
- Direct link to your full dashboard
""")

st.divider()

st.subheader("To automate Friday reports on Render:")
st.markdown("""
1. Go to your Render service
2. Click **Environment**
3. Add these three variables:
   - `EMAIL_ADDRESS` → your Gmail
   - `EMAIL_APP_PASSWORD` → your 16 character app password
   - `RECIPIENT_EMAIL` → owner's email address
""")
