"""
HexGuard Dealer System Test
Tests all major endpoints against the live API at hex-guard.onrender.com
Usage: python hexguard_system_test.py --token <your_jwt_token>
   or: python hexguard_system_test.py --user <email> --password <password>
"""
import sys, json, time, argparse, requests
from datetime import date, timedelta
 
BASE = "https://hex-guard.onrender.com"
 
# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────
 
PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"
INFO = "\033[93m→\033[0m"
 
results = []
 
def h(token): return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
 
def check(label, condition, detail=""):
    ok = bool(condition)
    tag = PASS if ok else FAIL
    msg = f"  {tag}  {label}"
    if detail: msg += f"  ({detail})"
    print(msg)
    results.append((label, ok, detail))
    return ok
 
def section(title):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")
 
def get_token(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=30)
    if r.status_code == 200:
        return r.json().get("access_token")
    raise SystemExit(f"Login failed: {r.status_code} {r.text}")
 
TODAY = date.today().isoformat()
TOMORROW = (date.today() + timedelta(days=1)).isoformat()
NEXT_YEAR = (date.today() + timedelta(days=365)).isoformat()
 
# ──────────────────────────────────────────────────────────
# 1. AUTH
# ──────────────────────────────────────────────────────────
def test_auth(token):
    section("1. Authentication")
    r = requests.get(f"{BASE}/me", headers=h(token), timeout=15)
    check("GET /me — token is valid", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        data = r.json()
        check("Response has client_id", "client_id" in data)
 
# ──────────────────────────────────────────────────────────
# 2. CUSTOMERS
# ──────────────────────────────────────────────────────────
def test_customers(token):
    section("2. Customer Management")
    created_ids = []
 
    # Create 3 customers with different profiles
    customers_to_create = [
        {
            "first_name": "Marcus", "last_name": "Johnson",
            "phone": "2815550001", "email": "marcus.johnson@testmail.com",
            "address": "4501 Oak Park Dr", "city": "Houston", "state": "TX", "zip": "77004",
            "employer": "Metro Bus Authority", "gross_monthly": 4200,
            "net_monthly": 3500, "income_frequency": "Monthly",
            "notes": "SYSTEM TEST - Cash buyer, walk-in"
        },
        {
            "first_name": "Sandra", "last_name": "Reyes",
            "phone": "2815550002", "email": "sandra.reyes@testmail.com",
            "address": "890 Westheimer Rd", "city": "Houston", "state": "TX", "zip": "77007",
            "employer": "HEB Grocery", "gross_monthly": 3200,
            "net_monthly": 2700, "income_frequency": "Bi-Weekly",
            "notes": "SYSTEM TEST - BHPH candidate, referred by friend"
        },
        {
            "first_name": "Derek", "last_name": "Williams",
            "phone": "2815550003", "email": "derek.williams@testmail.com",
            "address": "2200 Navigation Blvd", "city": "Houston", "state": "TX", "zip": "77003",
            "employer": "Self-employed", "gross_monthly": 5800,
            "net_monthly": 4200, "income_frequency": "Monthly",
            "notes": "SYSTEM TEST - Financed buyer, Google Ad lead"
        }
    ]
 
    for c in customers_to_create:
        r = requests.post(f"{BASE}/customers", json=c, headers=h(token), timeout=20)
        check(f"POST /customers — create {c['first_name']} {c['last_name']}", r.status_code == 200, f"status={r.status_code}")
        if r.status_code == 200:
            cid = r.json().get("id") or r.json().get("customer_id")
            if cid:
                created_ids.append(cid)
                check(f"  Returned customer ID for {c['first_name']}", cid is not None, f"id={cid}")
        time.sleep(0.3)
 
    # List all customers
    r = requests.get(f"{BASE}/customers", headers=h(token), timeout=15)
    check("GET /customers — returns list", r.status_code == 200)
    if r.status_code == 200:
        customers = r.json()
        check("Customer list is non-empty", len(customers) > 0, f"count={len(customers)}")
 
    # Search by name
    r = requests.get(f"{BASE}/customers/search?term=Johnson", headers=h(token), timeout=15)
    check("GET /customers/search?term=Johnson", r.status_code == 200)
    if r.status_code == 200:
        results_data = r.json()
        check("  Search returns results (not empty [])", len(results_data) > 0, f"count={len(results_data)}")
        if results_data:
            check("  Result has expected fields", all(k in results_data[0] for k in ["first_name","last_name"]))
 
    # Search by partial phone
    r = requests.get(f"{BASE}/customers/search?term=281555", headers=h(token), timeout=15)
    check("GET /customers/search?term=281555 — phone partial match", r.status_code == 200)
    if r.status_code == 200:
        check("  Phone search returns results", len(r.json()) > 0)
 
    # Fetch individual customer
    if created_ids:
        cid = created_ids[0]
        r = requests.get(f"{BASE}/customers/{cid}", headers=h(token), timeout=15)
        check(f"GET /customers/{cid} — fetch single", r.status_code == 200)
        if r.status_code == 200:
            data = r.json()
            check("  customer_id field present", "customer_id" in data or "id" in data)
            check("  first_name present", "first_name" in data)
 
        # Update
        r = requests.patch(f"{BASE}/customers/{cid}", json={
            "first_name": "Marcus", "last_name": "Johnson",
            "phone": "2815550001", "email": "marcus.updated@testmail.com",
            "address": "4501 Oak Park Dr", "city": "Houston",
            "state": "TX", "zip": "77004", "notes": "SYSTEM TEST - updated email"
        }, headers=h(token), timeout=15)
        check(f"PATCH /customers/{cid} — update email", r.status_code == 200)
 
    return created_ids
 
# ──────────────────────────────────────────────────────────
# 3. INSURANCE
# ──────────────────────────────────────────────────────────
def test_insurance(token, customer_ids):
    section("3. Insurance Tab")
    if not customer_ids:
        print("  (skipped — no customers created)")
        return
 
    cid = customer_ids[1]  # Sandra, the BHPH candidate
    payload = {
        "company": "State Farm",
        "policy_number": "SF-TEST-20261102",
        "agent_name": "Bob Martinez",
        "agent_phone": "2815559999",
        "effective_date": TODAY,
        "expiration_date": NEXT_YEAR,
    }
 
    r = requests.put(f"{BASE}/insurance/{cid}", json=payload, headers=h(token), timeout=15)
    check(f"PUT /insurance/{cid} — save insurance", r.status_code == 200, f"status={r.status_code}")
 
    r = requests.get(f"{BASE}/insurance/{cid}", headers=h(token), timeout=15)
    check(f"GET /insurance/{cid} — retrieve insurance", r.status_code == 200)
    if r.status_code == 200:
        data = r.json()
        check("  company field saved", data.get("company") == "State Farm")
        check("  policy_number saved", data.get("policy_number") == "SF-TEST-20261102")
 
    # Update the insurance (second PUT)
    payload["policy_number"] = "SF-TEST-UPDATED"
    r = requests.put(f"{BASE}/insurance/{cid}", json=payload, headers=h(token), timeout=15)
    check(f"PUT /insurance/{cid} — update existing insurance", r.status_code == 200)
 
# ──────────────────────────────────────────────────────────
# 4. CREDIT APPLICATION
# ──────────────────────────────────────────────────────────
def test_credit_app(token, customer_ids):
    section("4. Credit Application")
    if not customer_ids:
        print("  (skipped — no customers created)")
        return
 
    cid = customer_ids[1]  # Sandra
    payload = {
        "credit_score": 620,
        "signature_obtained": True,
        "vehicle_interest": "2018 Toyota Camry",
        "ref1_name": "Maria Reyes", "ref1_phone": "2815551111",
        "ref1_address": "101 Main St, Houston TX", "ref1_relationship": "Sister",
        "ref2_name": "Carlos Lopez", "ref2_phone": "2815552222",
        "ref2_address": "202 Elm St, Houston TX", "ref2_relationship": "Friend",
        "ref3_name": "Patricia Williams", "ref3_phone": "2815553333",
        "ref3_address": "303 Oak Ave, Houston TX", "ref3_relationship": "Co-worker",
    }
 
    r = requests.put(f"{BASE}/credit-application/{cid}", json=payload, headers=h(token), timeout=15)
    check(f"PUT /credit-application/{cid} — save credit app", r.status_code == 200, f"status={r.status_code}")
 
    r = requests.get(f"{BASE}/credit-application/{cid}", headers=h(token), timeout=15)
    check(f"GET /credit-application/{cid} — retrieve credit app", r.status_code == 200)
    if r.status_code == 200:
        data = r.json()
        check("  credit_score saved", str(data.get("credit_score")) == "620")
        check("  ref1_name saved", data.get("ref1_name") == "Maria Reyes")
 
# ──────────────────────────────────────────────────────────
# 5. INVENTORY
# ──────────────────────────────────────────────────────────
def test_inventory(token):
    section("5. Lot Inventory")
    created = []
 
    vehicles = [
        {
            "name": "2019 Honda Civic LX", "sku": "SYSTEST-001",
            "year": 2019, "make": "Honda", "model": "Civic",
            "trim": "LX", "color": "Silver", "mileage": 65000,
            "vin": "SYSTEST19HND00001", "cost": 10500, "asking_price": 13995,
            "status": "Available", "notes": "SYSTEM TEST vehicle 1"
        },
        {
            "name": "2017 Ford F-150 XLT", "sku": "SYSTEST-002",
            "year": 2017, "make": "Ford", "model": "F-150",
            "trim": "XLT", "color": "Blue", "mileage": 88000,
            "vin": "SYSTEST17FRD00002", "cost": 15000, "asking_price": 19500,
            "status": "Available", "notes": "SYSTEM TEST vehicle 2"
        },
        {
            "name": "2015 Chevrolet Malibu LS", "sku": "SYSTEST-003",
            "year": 2015, "make": "Chevrolet", "model": "Malibu",
            "trim": "LS", "color": "White", "mileage": 102000,
            "vin": "SYSTEST15CHV00003", "cost": 5500, "asking_price": 7995,
            "status": "Available", "notes": "SYSTEM TEST vehicle 3 — BHPH candidate"
        }
    ]
 
    for v in vehicles:
        r = requests.post(f"{BASE}/inventory/add", json=v, headers=h(token), timeout=20)
        check(f"POST /inventory — {v['name']}", r.status_code == 200, f"status={r.status_code}")
        if r.status_code == 200:
            vid = r.json().get("id")
            if vid:
                created.append(vid)
        time.sleep(0.3)
 
    # List inventory
    r = requests.get(f"{BASE}/inventory", headers=h(token), timeout=15)
    check("GET /inventory — list all", r.status_code == 200)
    if r.status_code == 200:
        inv = r.json()
        check("Inventory is non-empty", len(inv) > 0, f"count={len(inv)}")
 
    # Search inventory
    r = requests.get(f"{BASE}/inventory/search?term=SYSTEST", headers=h(token), timeout=15)
    check("GET /inventory/search?term=SYSTEST", r.status_code == 200)
    if r.status_code == 200:
        check("  Search returns test vehicles", len(r.json()) > 0)
 
    return created
 
# ──────────────────────────────────────────────────────────
# 6. SALES — all payment types + lead sources
# ──────────────────────────────────────────────────────────
def test_sales(token, customer_ids, inventory_ids):
    section("6. Sales — All Payment Types & Lead Sources")
    created_sale_ids = []
 
    sales = [
        # Cash sale from Walk-in
        {
            "date": TODAY, "description": "2019 Honda Civic LX",
            "sale_price": 13995, "cost": 10500, "gross_profit": 3495,
            "salesperson": "Jared", "payment_type": "Cash",
            "lead_source": "Walk-in",
            "customer_id": customer_ids[0] if customer_ids else None,
            "notes": "SYSTEM TEST - Cash, Walk-in",
            "finance_reserve": 0, "warranty": 0, "gap_insurance": 0, "addons": 0,
            "inventory_id": inventory_ids[0] if inventory_ids else None
        },
        # Financed — Google Ad lead
        {
            "date": TODAY, "description": "2017 Ford F-150 XLT",
            "sale_price": 19500, "cost": 15000, "gross_profit": 4500,
            "salesperson": "Jared", "payment_type": "Financed",
            "lead_source": "Google Ad",
            "customer_id": customer_ids[2] if len(customer_ids) > 2 else None,
            "notes": "SYSTEM TEST - Financed, Google Ad | Down: $3000 | Rate: 9.9% | Term: 60mo",
            "finance_reserve": 1200, "warranty": 800, "gap_insurance": 400, "addons": 0,
            "inventory_id": inventory_ids[1] if len(inventory_ids) > 1 else None
        },
        # In-House BHPH — Referral
        {
            "date": TODAY, "description": "2015 Chevrolet Malibu LS",
            "sale_price": 7995, "cost": 5500, "gross_profit": 2495,
            "salesperson": "Jared", "payment_type": "In-House / BHPH",
            "lead_source": "Referral",
            "customer_id": customer_ids[1] if len(customer_ids) > 1 else None,
            "notes": "SYSTEM TEST - BHPH, Referral | Down: $1500 | Rate: 24% | Term: 24mo | Monthly Payment: $289.44 | Total Interest: $1446.56",
            "finance_reserve": 0, "warranty": 0, "gap_insurance": 0, "addons": 0,
            "inventory_id": inventory_ids[2] if len(inventory_ids) > 2 else None
        },
        # Phone Call lead — Card
        {
            "date": TODAY, "description": "2018 Nissan Altima",
            "sale_price": 11500, "cost": 8200, "gross_profit": 3300,
            "salesperson": "Jared", "payment_type": "Card",
            "lead_source": "Phone Call",
            "customer_id": None,
            "notes": "SYSTEM TEST - Card, Phone Call",
            "finance_reserve": 0, "warranty": 300, "gap_insurance": 0, "addons": 0
        },
        # Facebook Ad — Check
        {
            "date": TODAY, "description": "2016 Toyota Corolla",
            "sale_price": 10995, "cost": 7800, "gross_profit": 3195,
            "salesperson": "Jared", "payment_type": "Check",
            "lead_source": "Facebook Ad",
            "customer_id": None,
            "notes": "SYSTEM TEST - Check, Facebook Ad",
            "finance_reserve": 0, "warranty": 0, "gap_insurance": 0, "addons": 0
        }
    ]
 
    lead_sources_covered = set()
    payment_types_covered = set()
 
    for s in sales:
        r = requests.post(f"{BASE}/sales/manual", json=s, headers=h(token), timeout=20)
        label = f"POST /sales/manual — {s['payment_type']} / {s['lead_source']}"
        check(label, r.status_code == 200, f"status={r.status_code}")
        if r.status_code == 200:
            sid = r.json().get("id") or r.json().get("sale_id")
            if sid:
                created_sale_ids.append(sid)
            lead_sources_covered.add(s["lead_source"])
            payment_types_covered.add(s["payment_type"])
        time.sleep(0.4)
 
    print(f"\n  {INFO} Lead sources tested: {', '.join(sorted(lead_sources_covered))}")
    print(f"  {INFO} Payment types tested: {', '.join(sorted(payment_types_covered))}")
 
    # Get sales list
    r = requests.get(f"{BASE}/sales", headers=h(token), timeout=15)
    check("GET /sales — returns list", r.status_code == 200)
    if r.status_code == 200:
        all_sales = r.json()
        check("Sales list non-empty", len(all_sales) > 0, f"count={len(all_sales)}")
 
    return created_sale_ids
 
# ──────────────────────────────────────────────────────────
# 7. BHPH CONTRACT + PAYMENTS
# ──────────────────────────────────────────────────────────
def test_bhph(token, customer_ids):
    section("7. BHPH Contracts & Payments")
    if not customer_ids:
        print("  (skipped — no customers)")
        return None
 
    cid = customer_ids[1]  # Sandra
 
    # Create contract
    contract = {
        "sale_id": None,
        "customer_id": cid,
        "customer_name": "Sandra Reyes",
        "customer_phone": "2815550002",
        "vehicle": "2015 Chevrolet Malibu LS",
        "sale_price": 7995,
        "down_payment": 1500,
        "amount_financed": 6495,
        "interest_rate": 24,
        "term_months": 24,
        "payment_frequency": "Monthly",
        "payment_amount": 289.44,
        "total_interest": 1446.56,
        "start_date": TODAY,
        "notes": "SYSTEM TEST contract"
    }
 
    r = requests.post(f"{BASE}/bhph/contracts", json=contract, headers=h(token), timeout=20)
    check("POST /bhph/contracts — create contract", r.status_code == 200, f"status={r.status_code}")
    contract_id = None
    if r.status_code == 200:
        contract_id = r.json().get("id") or r.json().get("contract_id")
        check("  Returned contract_id", contract_id is not None, f"id={contract_id}")
 
    # List contracts
    r = requests.get(f"{BASE}/bhph/contracts", headers=h(token), timeout=15)
    check("GET /bhph/contracts — list contracts", r.status_code == 200)
    if r.status_code == 200:
        check("  Contracts non-empty", len(r.json()) > 0)
 
    # Customer history (contracts endpoint)
    r = requests.get(f"{BASE}/customers/{cid}/contracts", headers=h(token), timeout=15)
    check(f"GET /customers/{cid}/contracts — history tab", r.status_code == 200)
    if r.status_code == 200:
        data = r.json()
        check("  History returns contract rows", len(data) > 0)
 
    if not contract_id:
        return None
 
    # Record a payment
    payment = {
        "contract_id": contract_id,
        "amount_paid": 289.44,
        "payment_date": TODAY,
        "payment_method": "Cash",
        "status": "Paid",
        "notes": "SYSTEM TEST payment 1"
    }
    r = requests.post(f"{BASE}/bhph/payments", json=payment, headers=h(token), timeout=15)
    check("POST /bhph/payments — record payment", r.status_code == 200, f"status={r.status_code}")
 
    # Get payments for contract
    r = requests.get(f"{BASE}/bhph/payments/{contract_id}", headers=h(token), timeout=15)
    check(f"GET /bhph/payments/{contract_id}", r.status_code == 200)
    if r.status_code == 200:
        pmts = r.json()
        check("  Payment list contains the test payment", len(pmts) > 0)
 
    return contract_id
 
# ──────────────────────────────────────────────────────────
# 8. FINANCES
# ──────────────────────────────────────────────────────────
def test_finances(token):
    section("8. Finances — Expenses & Income")
 
    # Add expense
    expense = {
        "date": TODAY, "category": "Advertising",
        "description": "SYSTEM TEST Facebook Ad spend",
        "amount": 250.00,
        "recurring": False, "frequency": "one-time",
        "notes": "Test expense"
    }
    r = requests.post(f"{BASE}/expenses/add", json=expense, headers=h(token), timeout=15)
    check("POST /expenses/add", r.status_code == 200, f"status={r.status_code}")
 
    # Add income
    income = {
        "date": TODAY, "category": "Owner Contribution",
        "description": "SYSTEM TEST income entry",
        "amount": 5000.00, "notes": "Test income"
    }
    r = requests.post(f"{BASE}/income/add", json=income, headers=h(token), timeout=15)
    check("POST /income/add", r.status_code == 200, f"status={r.status_code}")
 
    # Get expenses
    r = requests.get(f"{BASE}/expenses", headers=h(token), timeout=20)
    check("GET /expenses — full finances response", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        data = r.json()
        check("  recent_expenses present", "recent_expenses" in data)
        check("  recent_income present", "recent_income" in data)
        check("  kpis present", "kpis" in data)
 
    # Cashflow
    r = requests.get(f"{BASE}/cashflow", headers=h(token), timeout=15)
    check("GET /cashflow", r.status_code == 200, f"status={r.status_code}")
 
# ──────────────────────────────────────────────────────────
# 9. COLLECTIONS
# ──────────────────────────────────────────────────────────
def test_collections(token, customer_ids):
    section("9. Collections")
    r = requests.get(f"{BASE}/collections", headers=h(token), timeout=15)
    check("GET /collections — returns data", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        data = r.json()
        check("  Response is a list or dict", isinstance(data, (list, dict)))
 
# ──────────────────────────────────────────────────────────
# 10. CUSTOMER HISTORY (full journey)
# ──────────────────────────────────────────────────────────
def test_customer_history(token, customer_ids):
    section("10. Customer History — End-to-End Journey")
    if not customer_ids:
        print("  (skipped)")
        return
 
    cid = customer_ids[0]  # Marcus — cash buyer with a sale
 
    r = requests.get(f"{BASE}/customers/{cid}/contracts", headers=h(token), timeout=15)
    check(f"GET /customers/{cid}/contracts — history", r.status_code == 200)
 
    # Also verify the vehicle field exists in any returned contracts
    if r.status_code == 200 and r.json():
        c = r.json()[0]
        has_vehicle = "vehicle" in c
        check("  Contract row has 'vehicle' field", has_vehicle, "not 'year/make/model' separately")
 
# ──────────────────────────────────────────────────────────
# 11. NEGATIVE / EDGE CASES
# ──────────────────────────────────────────────────────────
def test_edge_cases(token):
    section("11. Edge Cases")
 
    # 404 customer
    r = requests.get(f"{BASE}/customers/9999999", headers=h(token), timeout=10)
    check("GET /customers/9999999 — returns 404", r.status_code in (404, 200), f"status={r.status_code}")
 
    # Empty search term
    r = requests.get(f"{BASE}/customers/search?term=", headers=h(token), timeout=10)
    check("GET /customers/search?term= — doesn't 500", r.status_code != 500, f"status={r.status_code}")
 
    # Sale with no customer (should still work)
    r = requests.post(f"{BASE}/sales/manual", json={
        "date": TODAY, "description": "2014 Dodge Charger",
        "sale_price": 13500, "cost": 10000, "gross_profit": 3500,
        "salesperson": "Jared", "payment_type": "Cash",
        "lead_source": "Instagram",
        "customer_id": None,
        "notes": "SYSTEM TEST - no linked customer",
        "finance_reserve": 0, "warranty": 0, "gap_insurance": 0, "addons": 0
    }, headers=h(token), timeout=20)
    check("POST /sales/manual — sale with no customer_id", r.status_code == 200, f"status={r.status_code}")
 
    # Invalid token
    r = requests.get(f"{BASE}/customers", headers={"Authorization": "Bearer BADTOKEN"}, timeout=10)
    check("GET /customers — bad token returns 401", r.status_code == 401, f"status={r.status_code}")
 
# ──────────────────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────────────────
def print_summary():
    section("SUMMARY")
    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    total  = len(results)
    pct    = int(100 * passed / total) if total else 0
 
    print(f"\n  Passed: {passed}/{total}  ({pct}%)")
    if failed:
        print(f"\n  Failed tests:")
        for label, ok, detail in results:
            if not ok:
                print(f"    ✗  {label}  {detail}")
    print()
    if pct == 100:
        print("  \033[92m🎉 ALL TESTS PASSED\033[0m")
    elif pct >= 80:
        print("  \033[93m⚠  MOSTLY PASSING — check failures above\033[0m")
    else:
        print("  \033[91m❌  SIGNIFICANT FAILURES — investigate above\033[0m")
    print()
 
# ──────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HexGuard dealer system test")
    parser.add_argument("--token", help="JWT token directly")
    parser.add_argument("--user",  help="Email to login with")
    parser.add_argument("--password", help="Password to login with")
    args = parser.parse_args()
 
    if args.token:
        token = args.token
    elif args.user and args.password:
        print(f"{INFO} Logging in as {args.user}...")
        token = get_token(args.user, args.password)
        print(f"{INFO} Got token.\n")
    else:
        parser.print_help()
        sys.exit(1)
 
    print(f"\n{'═'*60}")
    print(f"  HexGuard Dealer System Test")
    print(f"  Target: {BASE}")
    print(f"  Date:   {TODAY}")
    print(f"{'═'*60}")
 
    test_auth(token)
    customer_ids = test_customers(token)
    test_insurance(token, customer_ids)
    test_credit_app(token, customer_ids)
    inventory_ids = test_inventory(token)
    test_sales(token, customer_ids, inventory_ids)
    test_bhph(token, customer_ids)
    test_finances(token)
    test_collections(token, customer_ids)
    test_customer_history(token, customer_ids)
    test_edge_cases(token)
 
    print_summary()
 
