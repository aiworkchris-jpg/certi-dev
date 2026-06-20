import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://wxpumfeia7.execute-api.eu-west-2.amazonaws.com/dev";

// Demo merchant — Goldsmith & Co
const MERCHANT_ID = "5ae3f625-7f94-41b4-8052-c73361099201";
const MERCHANT_NAME = "Goldsmith & Co";

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:       "#09090f",
  surface:  "#13131a",
  panel:    "#1a1a24",
  border:   "#2a2a3a",
  gold:     "#c9a84c",
  goldDim:  "#c9a84c22",
  white:    "#f0f0f0",
  muted:    "#6b7280",
  subtle:   "#374151",
  green:    "#22c55e",
  red:      "#ef4444",
  amber:    "#f59e0b",
  blue:     "#3b82f6",
};

const STATUS_CONFIG = {
  created:    { label: "Created",    color: C.blue,  bg: "#3b82f622" },
  in_transit: { label: "In Transit", color: C.amber, bg: "#f59e0b22" },
  delivered:  { label: "Delivered",  color: C.green, bg: "#22c55e22" },
  failed:     { label: "Failed",     color: C.red,   bg: "#ef444422" },
  claimed:    { label: "Claimed",    color: C.gold,  bg: C.goldDim   },
};

const OUTCOME_CONFIG = {
  APPROVED:  { color: C.green, bg: "#22c55e22" },
  REJECTED:  { color: C.red,   bg: "#ef444422" },
  ESCALATED: { color: C.amber, bg: "#f59e0b22" },
};

// ── Shared components ──────────────────────────────────────────────────────
const Badge = ({ status, type = "status" }) => {
  const cfg = type === "outcome"
    ? OUTCOME_CONFIG[status]
    : STATUS_CONFIG[status] || { label: status, color: C.muted, bg: "#6b728022" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.color}44`,
    }}>
      {type === "outcome" ? status : cfg.label}
    </span>
  );
};

const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 24,
    ...style
  }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", disabled = false, small = false }) => {
  const styles = {
    primary:   { background: C.gold,    color: "#000", border: "none" },
    secondary: { background: "transparent", color: C.white, border: `1px solid ${C.border}` },
    danger:    { background: "transparent", color: C.red, border: `1px solid ${C.red}44` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: small ? "6px 14px" : "10px 20px",
      borderRadius: 8,
      fontSize: small ? 12 : 14,
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "inherit",
      transition: "opacity 0.15s",
    }}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
      {label}{required && <span style={{ color: C.gold }}> *</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 12px",
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        color: C.white,
        fontSize: 14,
        fontFamily: "inherit",
        boxSizing: "border-box",
        outline: "none",
      }}
    />
  </div>
);

const Select = ({ label, value, onChange, options, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
      {label}{required && <span style={{ color: C.gold }}> *</span>}
    </label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        color: value ? C.white : C.muted,
        fontSize: 14,
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    >
      <option value="">Select...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const StatCard = ({ label, value, accent }) => (
  <div style={{
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "20px 24px",
    borderTop: `3px solid ${accent || C.gold}`,
  }}>
    <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
    <div style={{ color: C.white, fontSize: 28, fontWeight: 700 }}>{value}</div>
  </div>
);

const EmptyState = ({ icon, title, subtitle, action }) => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ color: C.white, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</div>
    <div style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{subtitle}</div>
    {action}
  </div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
    <div>
      <h2 style={{ color: C.white, fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ color: C.muted, fontSize: 14, margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const formatCurrency = (v) => `£${Number(v).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ── Views ──────────────────────────────────────────────────────────────────

// Dashboard
const Dashboard = ({ shipments, claims, onNavigate }) => {
  const stats = {
    total: shipments.length,
    inTransit: shipments.filter(s => s.status === "in_transit").length,
    delivered: shipments.filter(s => s.status === "delivered").length,
    failed: shipments.filter(s => s.status === "failed").length,
    claimed: shipments.filter(s => s.status === "claimed").length,
    totalValue: shipments.reduce((sum, s) => sum + Number(s.item_value || 0), 0),
  };

  const recent = [...shipments].slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: C.white, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Good morning, {MERCHANT_NAME}</h1>
        <p style={{ color: C.muted, margin: 0 }}>Here's an overview of your shipments and claims.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Shipments" value={stats.total} accent={C.blue} />
        <StatCard label="In Transit" value={stats.inTransit} accent={C.amber} />
        <StatCard label="Delivered" value={stats.delivered} accent={C.green} />
        <StatCard label="Active Claims" value={stats.claimed} accent={C.gold} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <Card>
          <SectionHeader
            title="Recent Shipments"
            action={<Btn small variant="secondary" onClick={() => onNavigate("shipments")}>View all</Btn>}
          />
          {recent.length === 0 ? (
            <EmptyState icon="📦" title="No shipments yet" subtitle="Create your first shipment to get started" action={<Btn onClick={() => onNavigate("new-shipment")}>Create Shipment</Btn>} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Order Ref", "Item", "Value", "Status", "Date"].map(h => (
                    <th key={h} style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "left", padding: "0 0 12px", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < recent.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding: "12px 0", color: C.gold, fontSize: 13, fontFamily: "monospace" }}>{s.order_reference}</td>
                    <td style={{ padding: "12px 8px", color: C.white, fontSize: 13 }}>{s.item_description}</td>
                    <td style={{ padding: "12px 8px", color: C.white, fontSize: 13 }}>{formatCurrency(s.item_value)}</td>
                    <td style={{ padding: "12px 8px" }}><Badge status={s.status} /></td>
                    <td style={{ padding: "12px 0", color: C.muted, fontSize: 12 }}>{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <SectionHeader title="Claims Summary" />
          {claims.length === 0 ? (
            <EmptyState icon="📋" title="No claims" subtitle="Claims will appear here when filed" />
          ) : (
            <div>
              {[
                { label: "Approved", outcome: "APPROVED", color: C.green },
                { label: "Rejected", outcome: "REJECTED", color: C.red },
                { label: "Escalated", outcome: "ESCALATED", color: C.amber },
                { label: "Pending", outcome: null, color: C.muted },
              ].map(({ label, outcome, color }) => {
                const count = outcome
                  ? claims.filter(c => c.outcome === outcome).length
                  : claims.filter(c => !c.outcome).length;
                return (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted, fontSize: 13 }}>{label}</span>
                    <span style={{ color, fontSize: 18, fontWeight: 700 }}>{count}</span>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Total</span>
                <span style={{ color: C.white, fontSize: 18, fontWeight: 700 }}>{claims.length}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// Shipments list
const ShipmentsList = ({ shipments, onSelect, onNavigate }) => (
  <div>
    <SectionHeader
      title="Shipments"
      subtitle={`${shipments.length} shipment${shipments.length !== 1 ? "s" : ""} total`}
      action={<Btn onClick={() => onNavigate("new-shipment")}>+ New Shipment</Btn>}
    />
    {shipments.length === 0 ? (
      <Card>
        <EmptyState icon="📦" title="No shipments yet" subtitle="Create your first shipment to start tracking high-value deliveries" action={<Btn onClick={() => onNavigate("new-shipment")}>Create Shipment</Btn>} />
      </Card>
    ) : (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.panel }}>
              {["Order Ref", "Item", "Value", "Customer", "Delivery Co", "Status", "Filed", ""].map(h => (
                <th key={h} style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "left", padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shipments.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i < shipments.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = C.panel}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                onClick={() => onSelect(s.id)}
              >
                <td style={{ padding: "14px 16px", color: C.gold, fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" }}>{s.order_reference}</td>
                <td style={{ padding: "14px 16px", color: C.white, fontSize: 13 }}>{s.item_description}</td>
                <td style={{ padding: "14px 16px", color: C.white, fontSize: 13, whiteSpace: "nowrap" }}>{formatCurrency(s.item_value)}</td>
                <td style={{ padding: "14px 16px", color: C.muted, fontSize: 13 }}>{s.customer_name}</td>
                <td style={{ padding: "14px 16px", color: C.muted, fontSize: 13 }}>{s.delivery_company_name || "—"}</td>
                <td style={{ padding: "14px 16px" }}><Badge status={s.status} /></td>
                <td style={{ padding: "14px 16px", color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(s.created_at)}</td>
                <td style={{ padding: "14px 16px", color: C.muted, fontSize: 13 }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )}
  </div>
);

// Shipment detail
const ShipmentDetail = ({ shipmentId, onBack, onClaimFiled, deliveryCompanies }) => {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({ claim_type: "damaged", description: "" });
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/merchant/shipments/${shipmentId}`);
      setShipment(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [shipmentId]);

  const updateStatus = async (status) => {
    setStatusLoading(true);
    try {
      await axios.patch(`${API}/merchant/shipments/${shipmentId}/status`, { status });
      await load();
    } catch (e) { console.error(e); }
    setStatusLoading(false);
  };

  const fileClaim = async () => {
    setClaimLoading(true);
    setClaimError(null);
    try {
      await axios.post(`${API}/merchant/claims`, {
        shipment_id: shipmentId,
        claimant_email: "orders@goldsmithandco.co.uk",
        claim_type: claimForm.claim_type,
        description: claimForm.description,
      });
      setShowClaimForm(false);
      await load();
      onClaimFiled();
    } catch (e) {
      setClaimError(e.response?.data?.error || "Something went wrong");
    }
    setClaimLoading(false);
  };

  if (loading) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading shipment...</div>;
  if (!shipment) return <div style={{ color: C.red, padding: 40 }}>Shipment not found</div>;

  const canClaim = ["failed", "in_transit", "delivered"].includes(shipment.status) && !shipment.claim;
  const nextStatuses = {
    created: [{ label: "Mark as In Transit", status: "in_transit" }],
    in_transit: [{ label: "Mark as Delivered", status: "delivered" }, { label: "Mark as Failed", status: "failed" }],
  }[shipment.status] || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>← Back</button>
        <span style={{ color: C.border }}>|</span>
        <span style={{ color: C.gold, fontFamily: "monospace", fontSize: 14 }}>{shipment.order_reference}</span>
        <Badge status={shipment.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Item details */}
          <Card>
            <h3 style={{ color: C.white, margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Item Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["Description", shipment.item_description],
                ["Value", formatCurrency(shipment.item_value)],
                ["Category", shipment.item_category || "Jewellery"],
                ["CERTI Label", shipment.certi_label_id || "Not yet assigned"],
                ["Tracking Number", shipment.tracking_number || "—"],
                ["Delivery Company", shipment.delivery_company_name || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <div style={{ color: C.white, fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Customer */}
          <Card>
            <h3 style={{ color: C.white, margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Customer</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["Name", shipment.customer_name],
                ["Email", shipment.customer_email || "—"],
                ["City", shipment.customer_city || "—"],
                ["Postcode", shipment.customer_postcode || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <div style={{ color: C.white, fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Sensor events */}
          <Card>
            <h3 style={{ color: C.white, margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Sensor Data</h3>
            {shipment.sensor_events?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {shipment.sensor_events.map(e => (
                  <div key={e.id} style={{ background: C.panel, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 16, fontSize: 12 }}>
                    <span style={{ color: C.gold, fontWeight: 600, minWidth: 120 }}>{e.event_type}</span>
                    <span style={{ color: C.muted }}>{formatDate(e.event_time)}</span>
                    {e.shock_g && <span style={{ color: C.red }}>Shock: {e.shock_g}G</span>}
                    {e.temperature_c && <span style={{ color: C.blue }}>Temp: {e.temperature_c}°C</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                No sensor data yet — data will appear once the CERTI label is active
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Timeline */}
          <Card>
            <h3 style={{ color: C.white, margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Timeline</h3>
            {[
              { label: "Created", date: shipment.created_at, done: true },
              { label: "Dispatched", date: shipment.dispatched_at, done: !!shipment.dispatched_at },
              { label: "Delivered", date: shipment.delivered_at, done: !!shipment.delivered_at },
              { label: "Failed", date: shipment.failed_at, done: !!shipment.failed_at },
            ].filter(t => t.done || !["Failed"].includes(t.label) || shipment.status === "failed").map((t, i) => (
              <div key={t.label} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.done ? C.gold : C.border, marginTop: 3 }} />
                  {i < 2 && <div style={{ width: 1, height: 24, background: C.border, margin: "4px 0" }} />}
                </div>
                <div>
                  <div style={{ color: t.done ? C.white : C.muted, fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{t.date ? formatDate(t.date) : "Pending"}</div>
                </div>
              </div>
            ))}
          </Card>

          {/* Actions */}
          {(nextStatuses.length > 0 || canClaim) && (
            <Card>
              <h3 style={{ color: C.white, margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {nextStatuses.map(({ label, status }) => (
                  <Btn key={status} variant="secondary" onClick={() => updateStatus(status)} disabled={statusLoading}>{label}</Btn>
                ))}
                {canClaim && !showClaimForm && (
                  <Btn variant="danger" onClick={() => setShowClaimForm(true)}>File a Claim</Btn>
                )}
              </div>
            </Card>
          )}

          {/* Claim form */}
          {showClaimForm && (
            <Card>
              <h3 style={{ color: C.white, margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>File a Claim</h3>
              <Select
                label="Claim Type"
                value={claimForm.claim_type}
                onChange={v => setClaimForm(f => ({ ...f, claim_type: v }))}
                options={[
                  { value: "damaged", label: "Item Damaged" },
                  { value: "non_receipt", label: "Item Not Received" },
                  { value: "theft", label: "Theft" },
                  { value: "false_claim", label: "Other" },
                ]}
              />
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
                  Description <span style={{ color: C.gold }}>*</span>
                </label>
                <textarea
                  value={claimForm.description}
                  onChange={e => setClaimForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what happened..."
                  rows={4}
                  style={{ width: "100%", padding: "10px 12px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
              {claimError && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{claimError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={fileClaim} disabled={claimLoading || !claimForm.description}>
                  {claimLoading ? "Submitting..." : "Submit Claim"}
                </Btn>
                <Btn variant="secondary" onClick={() => setShowClaimForm(false)}>Cancel</Btn>
              </div>
            </Card>
          )}

          {/* Claim decision */}
          {shipment.claim && (
            <Card style={{ borderTop: `3px solid ${shipment.claim.outcome ? OUTCOME_CONFIG[shipment.claim.outcome]?.color : C.amber}` }}>
              <h3 style={{ color: C.white, margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Claim Decision</h3>
              {shipment.claim.outcome ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Badge status={shipment.claim.outcome} type="outcome" />
                    <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>
                      {shipment.claim.confidence_score}% confidence
                    </span>
                  </div>
                  <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{shipment.claim.decision_report}</p>
                </>
              ) : (
                <div style={{ color: C.muted, fontSize: 13 }}>Claim submitted — AI decision pending</div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// New shipment form
const NewShipment = ({ deliveryCompanies, onCreated, onBack }) => {
  const [form, setForm] = useState({
    item_description: "",
    item_value: "",
    item_category: "Jewellery",
    customer_name: "",
    customer_email: "",
    customer_address_line_1: "",
    customer_city: "",
    customer_postcode: "",
    delivery_company_id: "",
    tracking_number: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/merchant/shipments`, {
        ...form,
        merchant_id: MERCHANT_ID,
        item_value: parseFloat(form.item_value),
        delivery_company_id: form.delivery_company_id || null,
      });
      onCreated(res.data);
    } catch (e) {
      setError(e.response?.data?.error || "Something went wrong");
    }
    setLoading(false);
  };

  const valid = form.item_description && form.item_value && form.customer_name;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>← Back</button>
        <span style={{ color: C.border }}>|</span>
        <h2 style={{ color: C.white, fontSize: 20, fontWeight: 700, margin: 0 }}>New Shipment</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Card>
          <h3 style={{ color: C.white, margin: "0 0 20px", fontSize: 15, fontWeight: 600 }}>Item Details</h3>
          <Input label="Item Description" value={form.item_description} onChange={set("item_description")} placeholder="e.g. 18ct Gold Diamond Ring" required />
          <Input label="Item Value (£)" value={form.item_value} onChange={set("item_value")} type="number" placeholder="0.00" required />
          <Select label="Category" value={form.item_category} onChange={set("item_category")} options={[
            { value: "Jewellery", label: "Jewellery" },
            { value: "Watch", label: "Watch" },
            { value: "Gemstone", label: "Gemstone" },
            { value: "Other", label: "Other" },
          ]} />
          <Select label="Delivery Company" value={form.delivery_company_id} onChange={set("delivery_company_id")} options={deliveryCompanies.map(d => ({ value: d.id, label: d.name }))} />
          <Input label="Tracking Number" value={form.tracking_number} onChange={set("tracking_number")} placeholder="Optional" />
        </Card>

        <Card>
          <h3 style={{ color: C.white, margin: "0 0 20px", fontSize: 15, fontWeight: 600 }}>Customer Details</h3>
          <Input label="Customer Name" value={form.customer_name} onChange={set("customer_name")} placeholder="Full name" required />
          <Input label="Email" value={form.customer_email} onChange={set("customer_email")} type="email" placeholder="customer@email.com" />
          <Input label="Address" value={form.customer_address_line_1} onChange={set("customer_address_line_1")} placeholder="Street address" />
          <Input label="City" value={form.customer_city} onChange={set("customer_city")} placeholder="City" />
          <Input label="Postcode" value={form.customer_postcode} onChange={set("customer_postcode")} placeholder="Postcode" />
        </Card>
      </div>

      {error && <p style={{ color: C.red, fontSize: 13, margin: "16px 0 0" }}>{error}</p>}

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <Btn onClick={submit} disabled={loading || !valid}>
          {loading ? "Creating..." : "Create Shipment"}
        </Btn>
        <Btn variant="secondary" onClick={onBack}>Cancel</Btn>
      </div>
    </div>
  );
};

// Claims list
const ClaimsList = ({ claims }) => (
  <div>
    <SectionHeader title="Claims" subtitle={`${claims.length} claim${claims.length !== 1 ? "s" : ""} total`} />
    {claims.length === 0 ? (
      <Card>
        <EmptyState icon="📋" title="No claims filed" subtitle="Claims will appear here when filed against a failed shipment" />
      </Card>
    ) : (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.panel }}>
              {["Order", "Item", "Value", "Type", "AI Decision", "Confidence", "Filed"].map(h => (
                <th key={h} style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "left", padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {claims.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < claims.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <td style={{ padding: "14px 16px", color: C.gold, fontSize: 12, fontFamily: "monospace" }}>{c.order_reference}</td>
                <td style={{ padding: "14px 16px", color: C.white, fontSize: 13 }}>{c.item_description}</td>
                <td style={{ padding: "14px 16px", color: C.white, fontSize: 13 }}>{formatCurrency(c.item_value)}</td>
                <td style={{ padding: "14px 16px", color: C.muted, fontSize: 13, textTransform: "capitalize" }}>{c.claim_type.replace("_", " ")}</td>
                <td style={{ padding: "14px 16px" }}>{c.outcome ? <Badge status={c.outcome} type="outcome" /> : <span style={{ color: C.muted, fontSize: 12 }}>Pending</span>}</td>
                <td style={{ padding: "14px 16px", color: C.white, fontSize: 13 }}>{c.confidence_score ? `${c.confidence_score}%` : "—"}</td>
                <td style={{ padding: "14px 16px", color: C.muted, fontSize: 12 }}>{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )}
  </div>
);

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("dashboard");
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [claims, setClaims] = useState([]);
  const [deliveryCompanies, setDeliveryCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [shipRes, claimRes, dcRes] = await Promise.all([
        axios.get(`${API}/merchant/shipments?merchant_id=${MERCHANT_ID}`),
        axios.get(`${API}/merchant/claims?merchant_id=${MERCHANT_ID}`),
        axios.get(`${API}/merchant/delivery-companies`),
      ]);
      setShipments(shipRes.data);
      setClaims(claimRes.data);
      setDeliveryCompanies(dcRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const navigate = (v, id) => {
    setView(v);
    if (id) setSelectedShipmentId(id);
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "⬡" },
    { id: "shipments", label: "Shipments", icon: "📦" },
    { id: "claims", label: "Claims", icon: "📋" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.white }}>

      {/* Sidebar */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 220,
        background: C.surface, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: C.goldDim, border: `1px solid ${C.gold}44`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>◈</div>
            <div>
              <div style={{ color: C.gold, fontWeight: 700, fontSize: 16, letterSpacing: "0.05em" }}>CERTI</div>
              <div style={{ color: C.muted, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>Merchant Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "12px 10px", flex: 1 }}>
          {navItems.map(item => {
            const active = view === item.id || (item.id === "shipments" && ["shipments", "new-shipment", "shipment-detail"].includes(view));
            return (
              <button key={item.id} onClick={() => navigate(item.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, border: "none",
                background: active ? C.goldDim : "transparent",
                color: active ? C.gold : C.muted,
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                marginBottom: 2,
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.id === "claims" && claims.filter(c => !c.outcome).length > 0 && (
                  <span style={{ marginLeft: "auto", background: C.gold, color: "#000", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                    {claims.filter(c => !c.outcome).length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Merchant info */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{MERCHANT_NAME}</div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Trust Score: 100</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 220, padding: 32, minHeight: "100vh" }}>
        {loading ? (
          <div style={{ color: C.muted, textAlign: "center", padding: 80 }}>Loading...</div>
        ) : (
          <>
            {view === "dashboard" && <Dashboard shipments={shipments} claims={claims} onNavigate={navigate} />}
            {view === "shipments" && <ShipmentsList shipments={shipments} onSelect={id => navigate("shipment-detail", id)} onNavigate={navigate} />}
            {view === "shipment-detail" && selectedShipmentId && (
              <ShipmentDetail
                shipmentId={selectedShipmentId}
                onBack={() => navigate("shipments")}
                onClaimFiled={loadData}
                deliveryCompanies={deliveryCompanies}
              />
            )}
            {view === "new-shipment" && (
              <NewShipment
                deliveryCompanies={deliveryCompanies}
                onCreated={(s) => { loadData(); navigate("shipment-detail", s.id); }}
                onBack={() => navigate("shipments")}
              />
            )}
            {view === "claims" && <ClaimsList claims={claims} />}
          </>
        )}
      </div>
    </div>
  );
}
