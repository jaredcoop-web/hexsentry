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

function CustomerForm({ initial = {}, onSave, onCancel, title }) {
  const [form, setForm] = useState({ ...emptyCustomer, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

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

  const inp = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const label = "block text-xs font-medium text-gray-600 mb-1";
  const section = "mb-6";
  const sectionTitle = "text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-200";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}

      {/* Identity */}
      <div className={section}>
        <div className={sectionTitle}>Identity</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>First Name *</label>
            <input className={inp} value={form.first_name} onChange={e => set("first_name", e.target.value)} required />
          </div>
          <div>
            <label className={label}>Middle Name</label>
            <input className={inp} value={form.middle_name} onChange={e => set("middle_name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Last Name *</label>
            <input className={inp} value={form.last_name} onChange={e => set("last_name", e.target.value)} required />
          </div>
          <div>
            <label className={label}>Suffix</label>
            <select className={inp} value={form.suffix} onChange={e => set("suffix", e.target.value)}>
              <option value="">—</option>
              {["Jr.", "Sr.", "II", "III", "IV"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>Date of Birth</label>
            <input type="date" className={inp} value={form.dob} onChange={e => set("dob", e.target.value)} />
          </div>
          <div>
            <label className={label}>SSN</label>
            <input className={inp} placeholder="XXX-XX-XXXX" value={form.ssn} onChange={e => set("ssn", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>DL Number</label>
            <input className={inp} value={form.dl_number} onChange={e => set("dl_number", e.target.value)} />
          </div>
          <div>
            <label className={label}>DL State</label>
            <select className={inp} value={form.dl_state} onChange={e => set("dl_state", e.target.value)}>
              <option value="">—</option>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>DL Expiration</label>
            <input type="date" className={inp} value={form.dl_expiration} onChange={e => set("dl_expiration", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className={section}>
        <div className={sectionTitle}>Contact</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>Email</label>
            <input type="email" className={inp} value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className={label}>Primary Phone</label>
            <input className={inp} value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
          <div>
            <label className={label}>Secondary Phone</label>
            <input className={inp} value={form.phone2} onChange={e => set("phone2", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Residential */}
      <div className={section}>
        <div className={sectionTitle}>Residential</div>
        <div className="mb-3">
          <label className={label}>Current Address</label>
          <input className={inp} placeholder="Street address" value={form.address} onChange={e => set("address", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className={label}>City</label>
            <input className={inp} value={form.city} onChange={e => set("city", e.target.value)} />
          </div>
          <div>
            <label className={label}>State</label>
            <select className={inp} value={form.state} onChange={e => set("state", e.target.value)}>
              <option value="">—</option>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>ZIP</label>
            <input className={inp} value={form.zip} onChange={e => set("zip", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>Housing Status</label>
            <select className={inp} value={form.housing_status} onChange={e => set("housing_status", e.target.value)}>
              <option value="">—</option>
              {HOUSING_OPTIONS.map(h => <option key={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Time at Address</label>
            <input className={inp} placeholder="e.g. 2 years 3 months" value={form.time_at_address} onChange={e => set("time_at_address", e.target.value)} />
          </div>
        </div>
        <div className="text-xs font-medium text-gray-500 mb-2">Previous Address (if less than 2 years at current)</div>
        <div className="mb-3">
          <input className={inp} placeholder="Previous street address" value={form.prev_address} onChange={e => set("prev_address", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>City</label>
            <input className={inp} value={form.prev_city} onChange={e => set("prev_city", e.target.value)} />
          </div>
          <div>
            <label className={label}>State</label>
            <select className={inp} value={form.prev_state} onChange={e => set("prev_state", e.target.value)}>
              <option value="">—</option>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>ZIP</label>
            <input className={inp} value={form.prev_zip} onChange={e => set("prev_zip", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Employment */}
      <div className={section}>
        <div className={sectionTitle}>Employment & Income</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>Employer</label>
            <input className={inp} value={form.employer} onChange={e => set("employer", e.target.value)} />
          </div>
          <div>
            <label className={label}>Employer Phone</label>
            <input className={inp} value={form.employer_phone} onChange={e => set("employer_phone", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className={label}>Gross Monthly Income</label>
            <input className={inp} type="number" placeholder="0.00" value={form.gross_monthly} onChange={e => set("gross_monthly", e.target.value)} />
          </div>
          <div>
            <label className={label}>Net Monthly Income</label>
            <input className={inp} type="number" placeholder="0.00" value={form.net_monthly} onChange={e => set("net_monthly", e.target.value)} />
          </div>
          <div>
            <label className={label}>Pay Frequency</label>
            <select className={inp} value={form.income_frequency} onChange={e => set("income_frequency", e.target.value)}>
              <option value="">—</option>
              {INCOME_FREQ.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Other Income ($)</label>
            <input className={inp} type="number" placeholder="0.00" value={form.other_income} onChange={e => set("other_income", e.target.value)} />
          </div>
          <div>
            <label className={label}>Other Income Source</label>
            <input className={inp} placeholder="e.g. Social Security" value={form.other_income_source} onChange={e => set("other_income_source", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className={section}>
        <div className={sectionTitle}>Notes</div>
        <textarea className={inp} rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes..." />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save Customer"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50">
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
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setForm({ ...emptyCreditApp, ...data }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch(`${API}/credit-application/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
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

  const inp = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Credit Score (optional)</label>
          <input className={inp} type="number" placeholder="e.g. 620" value={form.credit_score} onChange={e => set("credit_score", e.target.value)} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!form.signature_obtained} onChange={e => set("signature_obtained", e.target.checked)}
              className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700">Physical Signature Obtained</span>
          </label>
        </div>
      </div>

      <div>
        <label className={label}>Vehicle Interest</label>
        <input className={inp} placeholder="e.g. 2022 Toyota Camry" value={form.vehicle_interest} onChange={e => set("vehicle_interest", e.target.value)} />
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-200">References (up to 5)</div>
        {[1,2,3,4,5].map(n => (
          <div key={n} className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-semibold text-gray-500 mb-2">Reference {n}</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className={label}>Full Name</label>
                <input className={inp} value={form[`ref${n}_name`]} onChange={e => set(`ref${n}_name`, e.target.value)} />
              </div>
              <div>
                <label className={label}>Phone</label>
                <input className={inp} value={form[`ref${n}_phone`]} onChange={e => set(`ref${n}_phone`, e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Address</label>
                <input className={inp} value={form[`ref${n}_address`]} onChange={e => set(`ref${n}_address`, e.target.value)} />
              </div>
              <div>
                <label className={label}>Relationship</label>
                <select className={inp} value={form[`ref${n}_relationship`]} onChange={e => set(`ref${n}_relationship`, e.target.value)}>
                  <option value="">—</option>
                  {RELATIONSHIP_OPTIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save Credit App"}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
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
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setForm({ ...emptyInsurance, ...data }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch(`${API}/insurance/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
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
  const inp = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-4">
      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <div className="text-red-700 font-semibold text-sm">Insurance Expired</div>
            <div className="text-red-600 text-xs">
              Policy expired {new Date(form.expiration_date).toLocaleDateString()}. Update before processing transactions.
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Insurance Company</label>
          <input className={inp} value={form.company} onChange={e => set("company", e.target.value)} />
        </div>
        <div>
          <label className={label}>Policy Number</label>
          <input className={inp} value={form.policy_number} onChange={e => set("policy_number", e.target.value)} />
        </div>
        <div>
          <label className={label}>Agent Name</label>
          <input className={inp} value={form.agent_name} onChange={e => set("agent_name", e.target.value)} />
        </div>
        <div>
          <label className={label}>Agent Phone</label>
          <input className={inp} value={form.agent_phone} onChange={e => set("agent_phone", e.target.value)} />
        </div>
        <div>
          <label className={label}>Effective Date</label>
          <input type="date" className={inp} value={form.effective_date} onChange={e => set("effective_date", e.target.value)} />
        </div>
        <div>
          <label className={label}>Expiration Date</label>
          <input type="date"
            className={`${inp} ${isExpired ? "border-red-400 bg-red-50" : ""}`}
            value={form.expiration_date}
            onChange={e => set("expiration_date", e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save Insurance"}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
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
      .then(r => r.ok ? r.json() : [])
      .then(data => setContracts(Array.isArray(data) ? data : []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>;

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-2">🚗</div>
        <div className="text-sm">No purchase history on file</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map(c => (
        <div key={c.contract_id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-gray-800">{c.year} {c.make} {c.model}</div>
              <div className="text-xs text-gray-500 mt-0.5">Contract #{c.contract_id} · {c.sale_date}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              c.status === "Active" ? "bg-green-100 text-green-700" :
              c.status === "Paid Off" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-600"
            }`}>{c.status}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-gray-600">
            <div><span className="text-gray-400 block">Sale Price</span>${Number(c.sale_price || 0).toLocaleString()}</div>
            <div><span className="text-gray-400 block">Balance</span>${Number(c.remaining_balance || 0).toLocaleString()}</div>
            <div><span className="text-gray-400 block">Payment</span>${Number(c.payment_amount || 0).toLocaleString()}/{c.payment_frequency || "mo"}</div>
          </div>
        </div>
      ))}
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

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const fetchCustomer = async (id) => {
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(form),
    });
    if (!r.ok) throw new Error("Failed to create customer");
    const data = await r.json();
    await fetchCustomers();
    setShowNew(false);
    await fetchCustomer(data.customer_id || data.id);
    setActiveTab("profile");
  };

  const handleUpdate = async (form) => {
    const r = await fetch(`${API}/customers/${selected.customer_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(form),
    });
    if (!r.ok) throw new Error("Failed to update customer");
    await fetchCustomers();
    await fetchCustomer(selected.customer_id);
    setShowEdit(false);
    setEditMsg("✓ Updated");
    setTimeout(() => setEditMsg(""), 3000);
  };

  const handleDelete = async () => {
    try {
      await fetch(`${API}/customers/${selected.customer_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSelected(null);
      setDeleteConfirm(false);
      fetchCustomers();
    } catch {}
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  const tabs = [
    { id: "profile", label: "👤 Profile" },
    { id: "credit", label: "📋 Credit App" },
    { id: "insurance", label: "🛡️ Insurance" },
    { id: "history", label: "🚗 History" },
  ];

  return (
    <div className="flex bg-gray-50" style={{ minHeight: "calc(100vh - 60px)" }}>
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-800">Customers</h2>
            <button
              onClick={() => { setShowNew(true); setSelected(null); setShowEdit(false); setDeleteConfirm(false); }}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >+ New</button>
          </div>
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-8">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">No customers found</div>
          ) : (
            filtered.map(c => (
              <button
                key={c.customer_id}
                onClick={() => {
                  fetchCustomer(c.customer_id);
                  setShowNew(false);
                  setShowEdit(false);
                  setDeleteConfirm(false);
                  setActiveTab("profile");
                }}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selected?.customer_id === c.customer_id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="font-medium text-gray-800 text-sm">{c.first_name} {c.last_name}</div>
                {c.phone && <div className="text-xs text-gray-500 mt-0.5">{c.phone}</div>}
                {c.email && <div className="text-xs text-gray-400 truncate">{c.email}</div>}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {showNew ? (
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <CustomerForm
              title="New Customer"
              onSave={handleCreate}
              onCancel={() => setShowNew(false)}
            />
          </div>
        ) : selected ? (
          <div className="max-w-3xl mx-auto">
            {/* Header card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selected.first_name}
                    {selected.middle_name ? ` ${selected.middle_name}` : ""}
                    {` ${selected.last_name}`}
                    {selected.suffix ? ` ${selected.suffix}` : ""}
                  </h2>
                  <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                    {selected.phone && <span>📞 {selected.phone}</span>}
                    {selected.email && <span>✉️ {selected.email}</span>}
                    {selected.city && <span>📍 {selected.city}, {selected.state}</span>}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {editMsg && <span className="text-sm text-green-600">{editMsg}</span>}
                  <button
                    onClick={() => { setShowEdit(v => !v); setDeleteConfirm(false); }}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                  >{showEdit ? "Cancel Edit" : "Edit"}</button>
                  <button
                    onClick={() => setDeleteConfirm(v => !v)}
                    className="px-3 py-1.5 text-xs border border-red-200 rounded-md text-red-600 hover:bg-red-50"
                  >Delete</button>
                </div>
              </div>
            </div>

            {/* Delete confirm */}
            {deleteConfirm && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex justify-between items-center">
                <span className="text-sm text-red-700 font-medium">
                  Delete {selected.first_name} {selected.last_name}? This cannot be undone.
                </span>
                <div className="flex gap-2">
                  <button onClick={handleDelete} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Confirm Delete</button>
                  <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}

            {/* Edit form */}
            {showEdit && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                  {tabs.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                        activeTab === t.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >{t.label}</button>
                  ))}
                </div>
                <div className="p-6">
                  {activeTab === "profile" && (
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identity</div>
                        <div className="space-y-2">
                          {selected.dob && <div><span className="text-gray-500">DOB: </span>{new Date(selected.dob).toLocaleDateString()}</div>}
                          {selected.ssn && <div><span className="text-gray-500">SSN: </span>***-**-{String(selected.ssn).slice(-4)}</div>}
                          {selected.dl_number && <div><span className="text-gray-500">DL: </span>{selected.dl_number} ({selected.dl_state})</div>}
                          {selected.dl_expiration && <div><span className="text-gray-500">DL Exp: </span>{new Date(selected.dl_expiration).toLocaleDateString()}</div>}
                          {!selected.dob && !selected.ssn && !selected.dl_number && <div className="text-gray-400 italic text-xs">No identity info on file</div>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Residential</div>
                        <div className="space-y-2">
                          {selected.address && <div>{selected.address}</div>}
                          {selected.city && <div>{selected.city}, {selected.state} {selected.zip}</div>}
                          {selected.housing_status && <div><span className="text-gray-500">Housing: </span>{selected.housing_status}</div>}
                          {selected.time_at_address && <div><span className="text-gray-500">Time there: </span>{selected.time_at_address}</div>}
                          {selected.prev_address && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="text-xs text-gray-400 mb-1">Previous Address</div>
                              <div>{selected.prev_address}</div>
                              {selected.prev_city && <div>{selected.prev_city}, {selected.prev_state} {selected.prev_zip}</div>}
                            </div>
                          )}
                          {!selected.address && <div className="text-gray-400 italic text-xs">No address on file</div>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Employment & Income</div>
                        <div className="space-y-2">
                          {selected.employer && <div><span className="text-gray-500">Employer: </span>{selected.employer}</div>}
                          {selected.employer_phone && <div><span className="text-gray-500">Work Phone: </span>{selected.employer_phone}</div>}
                          {selected.gross_monthly && <div><span className="text-gray-500">Gross/mo: </span>${Number(selected.gross_monthly).toLocaleString()}</div>}
                          {selected.net_monthly && <div><span className="text-gray-500">Net/mo: </span>${Number(selected.net_monthly).toLocaleString()}</div>}
                          {selected.income_frequency && <div><span className="text-gray-500">Pay Freq: </span>{selected.income_frequency}</div>}
                          {selected.other_income && <div><span className="text-gray-500">Other Income: </span>${Number(selected.other_income).toLocaleString()} — {selected.other_income_source}</div>}
                          {!selected.employer && !selected.gross_monthly && <div className="text-gray-400 italic text-xs">No employment info on file</div>}
                        </div>
                      </div>
                      {selected.notes && (
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</div>
                          <div className="text-gray-700 whitespace-pre-wrap text-sm">{selected.notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "credit" && <CreditAppTab customerId={selected.customer_id} />}
                  {activeTab === "insurance" && <InsuranceTab customerId={selected.customer_id} />}
                  {activeTab === "history" && <HistoryTab customerId={selected.customer_id} />}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400" style={{ minHeight: "400px" }}>
            <div className="text-6xl mb-4">👤</div>
            <div className="text-lg font-medium mb-1">Select a customer</div>
            <div className="text-sm">or click <span className="font-semibold text-blue-500">+ New</span> to add one</div>
          </div>
        )}
      </div>
    </div>
  );
}
