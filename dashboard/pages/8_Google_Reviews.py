import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import streamlit as st
from pipeline.auth import init_auth_db, require_login
from pipeline.google_reviews import (
    get_auth_url, exchange_code_for_tokens, refresh_access_token,
    get_accounts, get_locations, get_reviews,
    save_tokens, load_tokens, save_reviews_to_db
)

st.set_page_config(page_title="Google Reviews — HexGuard", layout="wide", page_icon="⭐")

init_auth_db()
user = require_login()
client_id = user["client_id"]

if st.button("Log out", key="logout"):
    st.session_state.user = None
    st.rerun()

st.title("⭐ Google Reviews — Auto Sync")
st.caption(f"{user['business_name']} — Connect Google Business to sync reviews automatically")

st.divider()

# ── Check for OAuth callback ──────────────────────────────────────────────────
params = st.query_params
if "code" in params:
    code = params["code"]
    with st.spinner("Connecting to Google..."):
        try:
            tokens = exchange_code_for_tokens(code)
            if "access_token" in tokens:
                save_tokens(client_id, tokens["access_token"], tokens.get("refresh_token", ""))
                st.success("Google Business connected successfully!")
                st.query_params.clear()
            else:
                st.error(f"Connection failed: {tokens.get('error_description', 'Unknown error')}")
        except Exception as e:
            st.error(f"Error connecting: {e}")

# ── Check connection status ───────────────────────────────────────────────────
access_token, refresh_token = load_tokens(client_id)

if not access_token:
    st.subheader("Step 1 — Connect your Google Business account")
    st.markdown("""
    HexGuard will automatically sync your Google reviews every few hours.
    No more manual exports — new reviews appear in your dashboard automatically.
    """)

    auth_url = get_auth_url(state=client_id)
    st.link_button("🔗 Connect Google Business", auth_url, type="primary")

    st.divider()
    st.info("You'll be asked to sign in with the Google account that manages your dealership's Google Business profile.")

else:
    st.success("✅ Google Business is connected")

    col_a, col_b = st.columns(2)

    with col_a:
        if st.button("🔄 Sync Reviews Now", type="primary"):
            with st.spinner("Fetching reviews from Google..."):
                try:
                    new_token = refresh_access_token(refresh_token)
                    if new_token:
                        access_token = new_token

                    accounts = get_accounts(access_token)
                    account_list = accounts.get("accounts", [])

                    if not account_list:
                        st.warning("No Google Business accounts found.")
                    else:
                        account_id = account_list[0]["name"]
                        locations  = get_locations(access_token, account_id)
                        loc_list   = locations.get("locations", [])

                        if not loc_list:
                            st.warning("No locations found in your Google Business account.")
                        else:
                            total_saved = 0
                            for loc in loc_list:
                                location_id  = loc["name"]
                                reviews_data = get_reviews(access_token, account_id, location_id)
                                saved        = save_reviews_to_db(client_id, reviews_data)
                                total_saved += saved

                            if total_saved > 0:
                                st.success(f"✅ Synced {total_saved} new reviews!")
                                st.balloons()
                            else:
                                st.info("No new reviews since last sync.")

                except Exception as e:
                    st.error(f"Sync failed: {e}")
                    st.info("Try disconnecting and reconnecting your Google account.")

    with col_b:
        if st.button("Disconnect Google", type="secondary"):
            import sqlite3
            import os
            DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dealership.db")
            conn = sqlite3.connect(DB_PATH)
            conn.execute("DELETE FROM google_tokens WHERE client_id=?", (client_id,))
            conn.commit()
            conn.close()
            st.success("Disconnected. Reload the page to reconnect.")
            st.rerun()

    st.divider()

    st.subheader("How auto-sync works:")
    st.markdown("""
    - HexGuard checks for new reviews every **2 hours** automatically
    - New reviews are added to your Reviews page instantly
    - Negative reviews trigger an **immediate alert**
    - Friday email report includes your weekly review summary
    - You never have to manually export or upload anything
    """)
