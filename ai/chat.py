import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.load import query

def get_data_summary():
    try:
        sales   = query("SELECT COUNT(*) as total_sales, ROUND(SUM(gross_profit),0) as total_gross, ROUND(AVG(gross_profit),0) as avg_gross FROM sales").to_string(index=False)
        sp      = query("SELECT salesperson, COUNT(*) as deals, ROUND(SUM(gross_profit),0) as gross FROM sales GROUP BY salesperson ORDER BY gross DESC").to_string(index=False)
        leads   = query("SELECT source, COUNT(*) as leads, ROUND(100.0*SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END)/COUNT(*),1) as pct FROM leads GROUP BY source ORDER BY pct DESC").to_string(index=False)
        stale   = query("SELECT COUNT(*) as stale_units, ROUND(AVG(days_on_lot),1) as avg_days FROM inventory WHERE is_stale=1 AND status='Available'").to_string(index=False)
        reviews = query("SELECT ROUND(AVG(rating),2) as avg_rating, COUNT(*) as total FROM reviews").to_string(index=False)
        return f"SALES:\n{sales}\n\nSALESPEOPLE:\n{sp}\n\nLEADS:\n{leads}\n\nSTALE INVENTORY:\n{stale}\n\nREVIEWS:\n{reviews}"
    except Exception as e:
        return f"Error: {e}"

def ask(question, api_key=None):
    try:
        import anthropic
    except ImportError:
        return "Run: pip install anthropic"
    key = api_key or os.getenv("ANTHROPIC_API_KEY")
    if not key:
        return "Add your ANTHROPIC_API_KEY to the .env file."
    client = anthropic.Anthropic(api_key=key)
    msg = client.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=1000,
        messages=[{"role":"user","content":f"You are a car dealership analyst. Use this data to answer questions:\n\n{get_data_summary()}\n\nQuestion: {question}"}]
    )
    return msg.content[0].text
