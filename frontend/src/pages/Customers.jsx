import { useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";

const API = import.meta.env.VITE_API_URL || "https://hex-guard.onrender.com";

function getToken() {
  return localStorage.getItem("token");
}

function getClientId() {
  try {
    const token = getToken();
    if (!token) return null;
    const decoded = jwtDecode(token);
    return decoded.client_id;
  } catch {
    return null;
  }
}

const getCustId = (c) => c?.customer_id ?? c?.id;

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY"
];

const HOUSING_OPTIONS = ["Own", "Rent", "Family", "Other"];
const INCOME_FREQ = ["Weekly", "Bi-Weekly", "Semi-Monthly", "Monthly"];
const RELATIONSHIP_OPTIONS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Coworker", "Other"];

const emptyCustomer = {
  first_name: "", middle_name: "", last_name: "", suffix: "",
  email: "", phone: "", phone2: "",
  dob: "", ssn: "", dl_number: "", dl_state: "", dl_expiration: "",
  address: "", city: "", state: "", zip: "",
  housing_status: "", time_at_address: "",
  prev_address: "", prev_city: "", prev_state: "", prev_zip: "",
  employer: "", employer_phone: "", gross_monthly: "", net_monthly: "",
  income_frequency: "", other_income: "", other_income_source: "",
  notes: "",
};

const emptyCreditApp = {
  credit_score: "",
  signature_obtained: false,
  ref1_name: "", ref1_phone: "", ref1_address: "", ref1_relationship: "",
  ref2_name: "", ref2_phone: "", ref2_address: "", ref2_relationship: "",
  ref3_name: "", ref3_phone: "", ref3_address: "", ref3_relationship: "",
  ref4_name: "", ref4_phone: "", ref4_address: "", ref4_relationship: "",
  ref5_name: "", ref5_phone: "", ref5_address: "", ref5_relationship: "",
  vehicle_interest: "",
};

const emptyInsurance = {
  company: "", policy_number: "", agent_name: "", agent_phone: "",
  effective_date: "", expiration_date: "",
};

const inp =
  "w-full border border-white/15 bg-[#121526] text-slate-100 placeholder-slate-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const label = "block text-xs font-medium text-slate-300 mb-1";
const section = "mb-6";
const sectionTitle =
  "text-sm font-semibold text-slate-200 mb-3 pb-1 border-b border-white/10";

function CustomerForm({ initial = {}, onSave, onCancel, title }) {
  const [form, setForm] = useState({ ...emptyCustomer, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {error && (
        <div className="text-red-300 text-sm bg-red-950/60 border border-red-500/30 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Identity */}
      <div className={section}>
        <div className={sectionTitle}>Identity</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>First Name *</label>
            <input
              className={inp}
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className={label}>Middle Name</label>
            <input
              className={inp}
              value={form.middle_name}
              onChange={(e) => set("middle_name", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Last Name *</label>
            <input
              className={inp}
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className={label}>Suffix</label>
            <select
              className={inp}
              value={form.suffix}
              onChange={(e) => set("suffix", e.target.value)}
            >
              <option value="">—</option>
              {["Jr.", "Sr.", "II", "III", "IV"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>Date of Birth</label>
            <input
              type="date"
              className={inp}
              value={form.dob}
              onChange={(e) => set("dob", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>SSN</label>
            <input
              className={inp}
              placeholder="XXX-XX-XXXX"
              value={form.ssn}
              onChange={(e) => set("ssn", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>DL Number</label>
            <input
              className={inp}
              value={form.dl_number}
              onChange={(e) => set("dl_number", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>DL State</label>
            <select
              className={inp}
              value={form.dl_state}
              onChange={(e) => set("dl_state", e.target.value)}
            >
              <option value="">—</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>DL Expiration</label>
            <input
              type="date"
              className={inp}
              value={form.dl_expiration}
              onChange={(e) => set("dl_expiration", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className={section}>
        <div className={sectionTitle}>Contact</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>Email</label>
            <input
              type="email"
              className={inp}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Primary Phone</label>
            <input
              className={inp}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Secondary Phone</label>
            <input
              className={inp}
              value={form.phone2}
              onChange={(e) => set("phone2", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Residential */}
      <div className={section}>
        <div className={sectionTitle}>Residential</div>
        <div className="mb-3">
          <label className={label}>Current Address</label>
          <input
            className={inp}
            placeholder="Street address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className={label}>City</label>
            <input
              className={inp}
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>State</label>
            <select
              className={inp}
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            >
              <option value="">—</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>ZIP</label>
            <input
              className={inp}
              value={form.zip}
              onChange={(e) => set("zip", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>Housing Status</label>
            <select
              className={inp}
              value={form.housing_status}
              onChange={(e) => set("housing_status", e.target.value)}
            >
              <option value="">—</option>
              {HOUSING_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Time at Address</label>
            <input
              className={inp}
              placeholder="e.g. 2 years 3 months"
              value={form.time_at_address}
              onChange={(e) => set("time_at_address", e.target.value)}
            />
          </div>
        </div>
        <div className="text-xs font-medium text-slate-400 mb-2">
          Previous Address (if less than 2 years at current)
        </div>
        <div className="mb-3">
          <input
            className={inp}
            placeholder="Previous street address"
            value={form.prev_address}
            onChange={(e) => set("prev_address", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>City</label>
            <input
              className={inp}
              value={form.prev_city}
              onChange={(e) => set("prev_city", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>State</label>
            <select
              className={inp}
              value={form.prev_state}
              onChange={(e) => set("prev_state", e.target.value)}
            >
              <option value="">—</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>ZIP</label>
            <input
              className={inp}
              value={form.prev_zip}
              onChange={(e) => set("prev_zip", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Employment */}
      <div className={section}>
        <div className={sectionTitle}>Employment & Income</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>Employer</label>
            <input
              className={inp}
              value={form.employer}
              onChange={(e) => set("employer", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Employer Phone</label>
            <input
              className={inp}
              value={form.employer_phone}
              onChange={(e) => set("employer_phone", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className={label}>Gross Monthly Income</label>
            <input
              className={inp}
              type="number"
              placeholder="0.00"
              value={form.gross_monthly}
              onChange={(e) => set("gross_monthly", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Net Monthly Income</label>
            <input
              className={inp}
              type="number"
              placeholder="0.00"
              value={form.net_monthly}
              onChange={(e) => set("net_monthly", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Pay Frequency</label>
            <select
              className={inp}
              value={form.income_frequency}
              onChange={(e) => set("income_frequency", e.target.value)}
            >
              <option value="">—</option>
              {INCOME_FREQ.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Other Income ($)</label>
            <input
              className={inp}
              type="number"
              placeholder="0.00"
              value={form.other_income}
              onChange={(e) => set("other_income", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Other Income Source</label>
            <input
              className={inp}
              placeholder="e.g. Social Security"
              value={form.other_income_source}
              onChange={(e) => set("other_income_source", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className={section}>
        <div className={sectionTitle}>Notes</div>
        <textarea
          className={inp}
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Internal notes..."
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Customer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-white/15 text-slate-300 rounded text-sm hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function CreditAppTab({ customerId }) {
  const [form, setForm] = useState(emptyCreditApp);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    fetch(`${API}/credit-application/${customerId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setForm({ ...emptyCreditApp, ...data });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch(`${API}/credit-application/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Save failed");
      setMsg("✓ Saved");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Error saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-400 text-sm py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Credit Score (optional)</label>
          <input
            className={inp}
            type="number"
            placeholder="e.g. 620"
            value={form.credit_score}
            onChange={(e) => set("credit_score", e.target.value)}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.signature_obtained}
              onChange={(e) => set("signature_obtained", e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-200">Physical Signature Obtained</span>
          </label>
        </div>
      </div>

      <div>
        <label className={label}>Vehicle Interest</label>
        <input
          className={inp}
          placeholder="e.g. 2022 Toyota Camry"
          value={form.vehicle_interest}
          onChange={(e) => set("vehicle_interest", e.target.value)}
        />
      </div>

      <div>
        <div className={sectionTitle}>References (up to 5)</div>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="mb-4 p-3 bg-[#121526] border border-white/10 rounded-lg">
            <div className="text-xs font-semibold text-slate-400 mb-2">Reference {n}</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className={label}>Full Name</label>
                <input
                  className={inp}
                  value={form[`ref${n}_name`]}
                  onChange={(e) => set(`ref${n}_name`, e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Phone</label>
                <input
                  className={inp}
                  value={form[`ref${n}_phone`]}
                  onChange={(e) => set(`ref${n}_phone`, e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Address</label>
                <input
                  className={inp}
                  value={form[`ref${n}_address`]}
                  onChange={(e) => set(`ref${n}_address`, e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Relationship</label>
                <select
                  className={inp}
                  value={form[`ref${n}_relationship`]}
                  onChange={(e) => set(`ref${n}_relationship`, e.target.value)}
                >
                  <option value="">—</option>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Credit App"}
        </button>
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
      </div>
    </div>
  );
}

function InsuranceTab({ customerId }) {
  const [form, setForm] = useState(emptyInsurance);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    fetch(`${API}/insurance/${customerId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setForm({ ...emptyInsurance, ...data });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch(`${API}/insurance/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Save failed");
      setMsg("✓ Saved");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Error saving");
    } finally {
      setSaving(false);
    }
  };

  const isExpired = form.expiration_date && new Date(form.expiration_date) < new Date();

  if (loading) return <div className="text-slate-400 text-sm py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-4">
      {isExpired && (
        <div className="bg-red-950/60 border border-red-500/40 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="text-red-400 text-lg">⚠️</span>
          <div>
            <div className="text-red-300 font-semibold text-sm">Insurance Expired</div>
            <div className="text-red-400 text-xs">
              Policy expired {new Date(form.expiration_date).toLocaleDateString()}. Update before processing transactions.
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Insurance Company</label>
          <input className={inp} value={form.company} onChange={(e) => set("company", e.target.value)} />
        </div>
        <div>
          <label className={label}>Policy Number</label>
          <input className={inp} value={form.policy_number} onChange={(e) => set("policy_number", e.target.value)} />
        </div>
        <div>
          <label className={label}>Agent Name</label>
          <input className={inp} value={form.agent_name} onChange={(e) => set("agent_name", e.target.value)} />
        </div>
        <div>
          <label className={label}>Agent Phone</label>
          <input className={inp} value={form.agent_phone} onChange={(e) => set("agent_phone", e.target.value)} />
        </div>
        <div>
          <label className={label}>Effective Date</label>
          <input type="date" className={inp} value={form.effective_date} onChange={(e) => set("effective_date", e.target.value)} />
        </div>
        <div>
          <label className={label}>Expiration Date</label>
          <input
            type="date"
            className={`${inp} ${isExpired ? "border-red-500 bg-red-950/40" : ""}`}
            value={form.expiration_date}
            onChange={(e) => set("expiration_date", e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Insurance"}
        </button>
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
      </div>
    </div>
  );
}

function HistoryTab({ customerId }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    fetch(`${API}/customers/${customerId}/contracts`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setContracts(Array.isArray(data) ? data : []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <div className="text-slate-400 text-sm py-8 text-center">Loading…</div>;

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-4xl mb-2">🚗</div>
        <div className="text-sm">No purchase history on file</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((c) => (
        <div key={c.contract_id} className="border border-white/10 bg-[#121526] rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-white">
                {c.vehicle || `${c.year || ""} ${c.make || ""} ${c.model || ""}`.trim()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Contract #{c.contract_id} · {c.sale_date}
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  c.status === "Active"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : c.status === "Paid Off"
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-white/10 text-slate-300"
                }`}
              >
                {c.status}
              </span>
              <div className="text-xs text-slate-400 mt-1">{c.sale_type}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-300">
            <div>
              <span className="text-slate-400 block">Sale Price</span>${Number(c.sale_price || 0).toLocaleString()}
            </div>
            <div>
              <span className="text-slate-400 block">Balance</span>${Number(c.remaining_balance || 0).toLocaleString()}
            </div>
            <div>
              <span className="text-slate-400 block">Payment</span>${Number(c.payment_amount || 0).toLocaleString()}/
              {c.payment_frequency || "mo"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileOverview({ customer }) {
  const field = (lbl, val) => (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{lbl}</div>
      <div className="text-sm text-slate-200 mt-0.5">{val || <span className="italic text-slate-500">None on file</span>}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className={sectionTitle}>Identity</div>
        {field("Date of Birth", customer.dob)}
        {field("SSN", customer.ssn)}
        {field(
          "Driver's License",
          [customer.dl_number, customer.dl_state, customer.dl_expiration && `Exp: ${customer.dl_expiration}`]
            .filter(Boolean)
            .join(" · ")
        )}

        <div className={sectionTitle}>Employment & Income</div>
        {field("Employer", [customer.employer, customer.employer_phone].filter(Boolean).join(" · "))}
        {field("Gross Monthly", customer.gross_monthly ? `$${Number(customer.gross_monthly).toLocaleString()}` : "")}
        {field("Net Monthly", customer.net_monthly ? `$${Number(customer.net_monthly).toLocaleString()}` : "")}
        {field("Pay Frequency", customer.income_frequency)}
      </div>

      <div className="space-y-4">
        <div className={sectionTitle}>Residential</div>
        {field(
          "Current Address",
          [customer.address, [customer.city, customer.state, customer.zip].filter(Boolean).join(", ")]
            .filter(Boolean)
            .join(" — ")
        )}
        {field("Housing / Time", [customer.housing_status, customer.time_at_address].filter(Boolean).join(" · "))}
        {field(
          "Previous Address",
          [customer.prev_address, [customer.prev_city, customer.prev_state, customer.prev_zip].filter(Boolean).join(", ")]
            .filter(Boolean)
            .join(" — ")
        )}

        <div className={sectionTitle}>Notes</div>
        <div className="text-sm text-slate-200 whitespace-pre-wrap">
          {customer.notes || <span className="italic text-slate-500">No notes on file</span>}
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/customers`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (r.ok) {
        const data = await r.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const fetchCustomer = async (id) => {
    if (!id) return;
    try {
      const r = await fetch(`${API}/customers/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (r.ok) setSelected(await r.json());
    } catch {}
  };

  const handleCreate = async (form) => {
    const r = await fetch(`${API}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(form),
    });
    if (!r.ok) throw new Error("Failed to create customer");
    const data = await r.json();
    await fetchCustomers();
    setShowNew(false);
    await fetchCustomer(getCustId(data));
    setActiveTab("profile");
  };

  const handleUpdate = async (form) => {
    const id = getCustId(selected);
    const r = await fetch(`${API}/customers/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(form),
    });
    if (!r.ok) throw new Error("Failed to update customer");
    await fetchCustomers();
    await fetchCustomer(id);
    setShowEdit(false);
    setEditMsg("✓ Updated");
    setTimeout(() => setEditMsg(""), 3000);
  };

  const handleDelete = async () => {
    const id = getCustId(selected);
    try {
      await fetch(`${API}/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSelected(null);
      setDeleteConfirm(false);
      fetchCustomers();
    } catch {}
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  const tabs = [
    { id: "profile", label: "👤 Profile" },
    { id: "credit", label: "📋 Credit App" },
    { id: "insurance", label: "🛡️ Insurance" },
    { id: "history", label: "🚗 History" },
  ];

  const selectedId = getCustId(selected);

  return (
    <div className="flex bg-[#070812] text-slate-100" style={{ minHeight: "calc(100vh - 60px)" }}>
      {/* Left Sidebar: Shows all matching customers */}
      <aside className="w-80 bg-[#0b0d1a] border-r border-white/10 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-white">Customers</h2>
            <button
              type="button"
              onClick={() => {
                setShowNew(true);
                setSelected(null);
                setShowEdit(false);
                setDeleteConfirm(false);
              }}
              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 font-medium"
            >
              + New
            </button>
          </div>
          <input
            className={inp}
            placeholder="Search name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/10">
          {loading ? (
            <div className="text-center text-slate-400 text-sm py-8">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">No customers found</div>
          ) : (
            filtered.map((c, idx) => {
              const cid = getCustId(c);
              const isSelected = selectedId != null && cid === selectedId;
              return (
                <button
                  type="button"
                  key={cid ?? `${c.email}-${idx}`}
                  onClick={() => {
                    fetchCustomer(cid);
                    setShowNew(false);
                    setShowEdit(false);
                    setDeleteConfirm(false);
                    setActiveTab("profile");
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${
                    isSelected ? "bg-indigo-500/20 border-l-4 border-l-indigo-400" : ""
                  }`}
                >
                  <div className="font-medium text-white text-sm">
                    {c.first_name} {c.last_name}
                  </div>
                  {c.phone && <div className="text-xs text-slate-400 mt-0.5">{c.phone}</div>}
                  {c.email && <div className="text-xs text-slate-400 truncate">{c.email}</div>}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Detail Pane */}
      <main className="flex-1 overflow-y-auto p-6">
        {showNew ? (
          <div className="max-w-3xl mx-auto bg-[#0b0d1a] rounded-xl border border-white/10 p-6">
            <CustomerForm
              title="New Customer"
              onSave={handleCreate}
              onCancel={() => setShowNew(false)}
            />
          </div>
        ) : selected ? (
          <div className="max-w-3xl mx-auto">
            {/* Header card */}
            <div className="bg-[#0b0d1a] rounded-xl border border-white/10 p-5 mb-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selected.first_name}
                    {selected.middle_name ? ` ${selected.middle_name}` : ""}
                    {` ${selected.last_name}`}
                    {selected.suffix ? ` ${selected.suffix}` : ""}
                  </h2>
                  <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-400">
                    {selected.phone && <span>📞 {selected.phone}</span>}
                    {selected.email && <span>✉️ {selected.email}</span>}
                    {selected.city && (
                      <span>
                        📍 {selected.city}
                        {selected.state ? `, ${selected.state}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {editMsg && <span className="text-sm text-emerald-400">{editMsg}</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setShowEdit((v) => !v);
                      setDeleteConfirm(false);
                    }}
                    className="px-3 py-1.5 text-xs border border-white/15 rounded-md text-slate-200 hover:bg-white/5"
                  >
                    {showEdit ? "Cancel Edit" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm((v) => !v)}
                    className="px-3 py-1.5 text-xs border border-red-500/30 rounded-md text-red-400 hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Delete confirm */}
            {deleteConfirm && (
              <div className="bg-red-950/60 border border-red-500/30 rounded-lg p-4 mb-4 flex justify-between items-center gap-3">
                <span className="text-sm text-red-200 font-medium">
                  Delete {selected.first_name} {selected.last_name}? This cannot be undone.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-1 text-xs border border-white/15 rounded text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Edit form */}
            {showEdit && (
              <div className="bg-[#0b0d1a] rounded-xl border border-white/10 p-6 mb-4">
                <CustomerForm
                  title="Edit Customer"
                  initial={selected}
                  onSave={handleUpdate}
                  onCancel={() => setShowEdit(false)}
                />
              </div>
            )}

            {/* Tabbed detail view */}
            {!showEdit && (
              <div className="bg-[#0b0d1a] rounded-xl border border-white/10">
                <div className="flex border-b border-white/10 overflow-x-auto">
                  {tabs.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === t.id
                          ? "border-indigo-400 text-white"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {activeTab === "profile" && <ProfileOverview customer={selected} />}
                  {activeTab === "credit" && <CreditAppTab customerId={selectedId} />}
                  {activeTab === "insurance" && <InsuranceTab customerId={selectedId} />}
                  {activeTab === "history" && <HistoryTab customerId={selectedId} />}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Select a customer on the left or click <span className="text-slate-200 font-medium mx-1">+ New</span> to add one.
          </div>
        )}
      </main>
    </div>
  );
}
