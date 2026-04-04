import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import smtplib
import sqlite3
import pandas as pd
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from pipeline.load import query


def get_weekly_summary():
    week_ago = (datetime.today() - timedelta(days=7)).strftime("%Y-%m-%d")

    try:
        sales = query(f"""
            SELECT COUNT(*) as deals,
                   ROUND(SUM(gross_profit), 0) as total_gross,
                   ROUND(AVG(gross_profit), 0) as avg_gross
            FROM sales WHERE date >= '{week_ago}'
        """).iloc[0]
    except:
        sales = None

    try:
        fi = query(f"""
            SELECT ROUND(AVG(total_backend), 0) as avg_fi
            FROM finance WHERE date >= '{week_ago}'
        """).iloc[0]
    except:
        fi = None

    try:
        top_sp = query(f"""
            SELECT salesperson,
                   COUNT(*) as deals,
                   ROUND(SUM(gross_profit), 0) as gross
            FROM sales WHERE date >= '{week_ago}'
            GROUP BY salesperson ORDER BY gross DESC LIMIT 1
        """).iloc[0]
    except:
        top_sp = None

    try:
        stale = query("""
            SELECT COUNT(*) as count
            FROM inventory WHERE is_stale=1 AND status='Available'
        """).iloc[0]
    except:
        stale = None

    try:
        leads = query(f"""
            SELECT source,
                   ROUND(100.0*SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END)/COUNT(*),1) as pct
            FROM leads WHERE created_date >= '{week_ago}'
            GROUP BY source ORDER BY pct DESC LIMIT 1
        """).iloc[0]
    except:
        leads = None

    try:
        from pipeline.anomalies import run_all_checks
        alerts = run_all_checks()
    except:
        alerts = []

    return {
        "sales": sales,
        "fi": fi,
        "top_sp": top_sp,
        "stale": stale,
        "leads": leads,
        "alerts": alerts,
        "week_of": datetime.today().strftime("%B %d, %Y"),
    }


def build_email_html(data):
    sales  = data["sales"]
    fi     = data["fi"]
    top_sp = data["top_sp"]
    stale  = data["stale"]
    leads  = data["leads"]
    alerts = data["alerts"]

    criticals = [a for a in alerts if a["level"] == "critical"]
    warnings  = [a for a in alerts if a["level"] == "warning"]
    positives = [a for a in alerts if a["level"] == "positive"]

    alert_html = ""
    for a in criticals:
        alert_html += f"<p style='color:#c0392b;'>🔴 <strong>[{a['category']}] {a['title']}</strong><br><small>{a['detail']}</small></p>"
    for a in warnings:
        alert_html += f"<p style='color:#e67e22;'>🟡 <strong>[{a['category']}] {a['title']}</strong><br><small>{a['detail']}</small></p>"
    for a in positives:
        alert_html += f"<p style='color:#27ae60;'>🟢 <strong>[{a['category']}] {a['title']}</strong><br><small>{a['detail']}</small></p>"

    if not alert_html:
        alert_html = "<p style='color:#27ae60;'>✅ All clear — no issues detected this week.</p>"

    sales_html = ""
    if sales is not None:
        sales_html = f"""
        <table style='width:100%;border-collapse:collapse;margin:10px 0;'>
            <tr style='background:#f8f9fa;'>
                <td style='padding:10px;border:1px solid #dee2e6;'><strong>Total Sales</strong></td>
                <td style='padding:10px;border:1px solid #dee2e6;'>{int(sales.deals)} cars</td>
            </tr>
            <tr>
                <td style='padding:10px;border:1px solid #dee2e6;'><strong>Total Gross</strong></td>
                <td style='padding:10px;border:1px solid #dee2e6;'>${int(sales.total_gross):,}</td>
            </tr>
            <tr style='background:#f8f9fa;'>
                <td style='padding:10px;border:1px solid #dee2e6;'><strong>Avg Gross/Deal</strong></td>
                <td style='padding:10px;border:1px solid #dee2e6;'>${int(sales.avg_gross):,}</td>
            </tr>
            {"<tr><td style='padding:10px;border:1px solid #dee2e6;'><strong>Avg F&I/Deal</strong></td><td style='padding:10px;border:1px solid #dee2e6;'>$" + str(int(fi.avg_fi)) + "</td></tr>" if fi is not None else ""}
        </table>
        """
    else:
        sales_html = "<p>No sales data available for this week.</p>"

    top_sp_html = ""
    if top_sp is not None:
        top_sp_html = f"<p>🏆 <strong>{top_sp.salesperson}</strong> — {int(top_sp.deals)} deals, ${int(top_sp.gross):,} gross</p>"

    best_lead_html = ""
    if leads is not None:
        best_lead_html = f"<p>📞 <strong>{leads.source}</strong> converting at {leads.pct}% this week</p>"

    stale_html = ""
    if stale is not None and stale.count > 0:
        stale_html = f"<p>⚠️ <strong>{int(stale.count)} cars</strong> sitting 60+ days on the lot</p>"

    html = f"""
    <html>
    <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;'>

        <div style='background:#0A0A0A; padding:20px; border-radius:8px; margin-bottom:20px;'>
            <h1 style='color:#C0C0C0; margin:0; font-size:24px;'>🛡️ HexGuard</h1>
            <p style='color:#888; margin:5px 0 0;'>Weekly Business Intelligence Report</p>
        </div>

        <p style='color:#666;'>Week of {data['week_of']}</p>

        <h2 style='border-bottom:2px solid #eee; padding-bottom:8px;'>📊 This Week at a Glance</h2>
        {sales_html}

        <h2 style='border-bottom:2px solid #eee; padding-bottom:8px;'>🏆 Top Performer</h2>
        {top_sp_html if top_sp_html else "<p>No sales data this week.</p>"}

        <h2 style='border-bottom:2px solid #eee; padding-bottom:8px;'>🔍 HexGuard Alerts</h2>
        {alert_html}

        <h2 style='border-bottom:2px solid #eee; padding-bottom:8px;'>📌 Quick Notes</h2>
        {stale_html}
        {best_lead_html}

        <div style='background:#f8f9fa; padding:15px; border-radius:8px; margin-top:30px; text-align:center;'>
            <p style='margin:0; color:#666; font-size:12px;'>
                Powered by <strong>HexGuard</strong> — Business Intelligence Platform<br>
                <a href='https://hexguard.onrender.com' style='color:#C0C0C0;'>View Full Dashboard</a>
            </p>
        </div>

    </body>
    </html>
    """
    return html


def send_weekly_report(
    sender_email,
    sender_password,
    recipient_email,
    business_name="Your Dealership"
):
    data = get_weekly_summary()
    html = build_email_html(data)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"HexGuard Weekly Report — {business_name} — {data['week_of']}"
    msg["From"]    = sender_email
    msg["To"]      = recipient_email

    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipient_email, msg.as_string())
        print(f"Email sent successfully to {recipient_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


if __name__ == "__main__":
    sender   = os.getenv("EMAIL_ADDRESS")
    password = os.getenv("EMAIL_APP_PASSWORD")
    recipient = os.getenv("RECIPIENT_EMAIL", sender)

    if not sender or not password:
        print("Set EMAIL_ADDRESS and EMAIL_APP_PASSWORD environment variables.")
    else:
        send_weekly_report(sender, password, recipient, "Johnson Motors")
