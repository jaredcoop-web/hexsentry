import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from pipeline.load import query


def check_sales_anomalies():
    alerts = []

    df = query("""
        SELECT month, COUNT(*) as deals, ROUND(SUM(gross_profit), 0) as gross
        FROM sales GROUP BY month ORDER BY month
    """)

    if len(df) < 2:
        return alerts

    avg_deals = df["deals"].mean()
    avg_gross = df["gross"].mean()
    latest = df.iloc[-1]

    if latest["deals"] < avg_deals * 0.6:
        drop = round((1 - latest["deals"] / avg_deals) * 100)
        alerts.append({
            "level": "critical",
            "title": "Sales volume unusually low",
            "detail": f"This month's deals are {drop}% below your average. Avg: {int(avg_deals)}, This month: {int(latest['deals'])}",
            "category": "Sales"
        })

    if latest["gross"] < avg_gross * 0.6:
        drop = round((1 - latest["gross"] / avg_gross) * 100)
        alerts.append({
            "level": "critical",
            "title": "Gross profit unusually low",
            "detail": f"This month's gross is {drop}% below your average. Avg: ${int(avg_gross):,}, This month: ${int(latest['gross']):,}",
            "category": "Sales"
        })

    if latest["deals"] > avg_deals * 1.4:
        bump = round((latest["deals"] / avg_deals - 1) * 100)
        alerts.append({
            "level": "positive",
            "title": "Sales volume unusually high",
            "detail": f"This month is {bump}% above your average — great month! Find out what's working.",
            "category": "Sales"
        })

    return alerts


def check_inventory_anomalies():
    alerts = []

    stale = query("""
        SELECT COUNT(*) as count, ROUND(AVG(days_on_lot), 0) as avg_days
        FROM inventory WHERE is_stale=1 AND status='Available'
    """).iloc[0]

    total = query("SELECT COUNT(*) as count FROM inventory WHERE status='Available'").iloc[0]

    if total["count"] > 0:
        pct = stale["count"] / total["count"] * 100
        if pct > 30:
            alerts.append({
                "level": "critical",
                "title": "High stale inventory",
                "detail": f"{int(stale['count'])} cars ({round(pct)}% of lot) have been sitting 60+ days. Average age: {int(stale['avg_days'])} days. Consider price reductions.",
                "category": "Inventory"
            })
        elif pct > 15:
            alerts.append({
                "level": "warning",
                "title": "Stale inventory building up",
                "detail": f"{int(stale['count'])} cars ({round(pct)}% of lot) over 60 days. Monitor closely.",
                "category": "Inventory"
            })

    return alerts

def check_fi_anomalies():
    alerts = []
    
    fi = query("""
        SELECT month, 
               ROUND(AVG(total_backend), 0) as avg_fi
        FROM finance
        GROUP BY month ORDER BY month
    """)
    
    if len(fi) < 2:
        return alerts
    
    avg = fi["avg_fi"].mean()
    latest = fi.iloc[-1]["avg_fi"]
    
    if latest < avg * 0.6:
        drop = round((1 - latest/avg) * 100)
        alerts.append({
            "level": "warning",
            "title": "F&I income below average",
            "detail": f"Average F&I this month is ${int(latest):,} — {drop}% below your usual ${int(avg):,}. Check if backend products are being offered on every deal.",
            "category": "Finance"
        })
    
    return alerts

def check_salesperson_anomalies():
    alerts = []

    sp = query("""
        SELECT salesperson, COUNT(*) as deals, ROUND(SUM(gross_profit), 0) as gross
        FROM sales GROUP BY salesperson ORDER BY gross DESC
    """)

    if len(sp) < 2:
        return alerts

    avg_deals = sp["deals"].mean()

    underperformers = sp[sp["deals"] < avg_deals * 0.5]
    for _, row in underperformers.iterrows():
        drop = round((1 - row["deals"] / avg_deals) * 100)
        alerts.append({
            "level": "warning",
            "title": f"{row['salesperson']} underperforming",
            "detail": f"Only {int(row['deals'])} deals vs team average of {int(avg_deals)}. That's {drop}% below average.",
            "category": "Staff"
        })

    top = sp.iloc[0]
    if top["deals"] > avg_deals * 1.5:
        alerts.append({
            "level": "positive",
            "title": f"{top['salesperson']} is on fire",
            "detail": f"Leading the team with {int(top['deals'])} deals and ${int(top['gross']):,} gross. Find out what they're doing right.",
            "category": "Staff"
        })

    return alerts


def check_review_anomalies():
    alerts = []

    reviews = query("""
        SELECT ROUND(AVG(rating), 2) as avg_rating,
               SUM(is_negative) as negative_count,
               COUNT(*) as total
        FROM reviews
    """).iloc[0]

    if reviews["avg_rating"] < 3.5:
        alerts.append({
            "level": "critical",
            "title": "Low average review rating",
            "detail": f"Average rating is {reviews['avg_rating']} — below the healthy threshold of 3.5. Reputation risk.",
            "category": "Reviews"
        })

    if reviews["total"] > 0:
        neg_pct = reviews["negative_count"] / reviews["total"] * 100
        if neg_pct > 20:
            alerts.append({
                "level": "warning",
                "title": "High negative review rate",
                "detail": f"{int(reviews['negative_count'])} negative reviews ({round(neg_pct)}% of total). Investigate common complaints.",
                "category": "Reviews"
            })

    return alerts


def check_lead_anomalies():
    alerts = []

    leads = query("""
        SELECT source,
               COUNT(*) as total,
               ROUND(100.0 * SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END) / COUNT(*), 1) as pct
        FROM leads GROUP BY source
    """)

    avg_conversion = leads["pct"].mean()

    bad_sources = leads[leads["pct"] < avg_conversion * 0.5]
    for _, row in bad_sources.iterrows():
        alerts.append({
            "level": "warning",
            "title": f"{row['source']} leads converting poorly",
            "detail": f"Only {row['pct']}% conversion vs average of {round(avg_conversion)}%. Consider reallocating budget.",
            "category": "Leads"
        })

    best = leads.loc[leads["pct"].idxmax()]
    alerts.append({
        "level": "positive",
        "title": f"{best['source']} is your best lead source",
        "detail": f"{best['pct']}% conversion rate — highest of all sources. Consider increasing investment here.",
        "category": "Leads"
    })

    return alerts


def run_all_checks():
    all_alerts = []
    all_alerts += check_sales_anomalies()
    all_alerts += check_inventory_anomalies()
    all_alerts += check_salesperson_anomalies()
    all_alerts += check_review_anomalies()
    all_alerts += check_lead_anomalies()
    all_alerts += check_fi_anomalies()
    return all_alerts


if __name__ == "__main__":
    alerts = run_all_checks()
    print(f"\nFound {len(alerts)} alerts:\n")
    for a in alerts:
        icon = "🔴" if a["level"] == "critical" else ("🟡" if a["level"] == "warning" else "🟢")
        print(f"{icon} [{a['category']}] {a['title']}")
        print(f"   {a['detail']}\n")
