import { useState } from "react";
import axios from "axios";

const API_URL = "https://wxpumfeia7.execute-api.eu-west-2.amazonaws.com/dev";

export default function App() {
  const [form, setForm] = useState({
    claimant_email: "",
    claim_type: "non_receipt",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [claimId, setClaimId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/claims`, form);
      setClaimId(res.data.claim_id);
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
      padding: "24px"
    }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        
        {/* Header */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1 style={{ color: "white", fontSize: "32px", margin: "0 0 8px" }}>CERTI</h1>
          <p style={{ color: "#94a3b8", margin: 0 }}>Autonomous Claims Resolution</p>
        </div>

        {!submitted ? (
          <div style={{
            background: "#1e293b",
            borderRadius: "12px",
            padding: "32px",
            border: "1px solid #334155"
          }}>
            <h2 style={{ color: "white", margin: "0 0 24px", fontSize: "20px" }}>
              File a Claim
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#94a3b8", fontSize: "14px", display: "block", marginBottom: "8px" }}>
                Your Email Address
              </label>
              <input
                type="email"
                value={form.claimant_email}
                onChange={e => setForm({ ...form, claimant_email: e.target.value })}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#94a3b8", fontSize: "14px", display: "block", marginBottom: "8px" }}>
                Claim Type
              </label>
              <select
                value={form.claim_type}
                onChange={e => setForm({ ...form, claim_type: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
              >
                <option value="non_receipt">Package Not Received</option>
                <option value="damaged">Package Damaged</option>
                <option value="theft">Package Stolen</option>
                <option value="false_claim">Unrecognised Transaction</option>
              </select>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ color: "#94a3b8", fontSize: "14px", display: "block", marginBottom: "8px" }}>
                Describe What Happened
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Please describe your claim in as much detail as possible..."
                rows={5}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  resize: "vertical"
                }}
              />
            </div>

            {error && (
              <p style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !form.claimant_email || !form.description}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "#334155" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Submitting..." : "Submit Claim"}
            </button>
          </div>
        ) : (
          <div style={{
            background: "#1e293b",
            borderRadius: "12px",
            padding: "32px",
            border: "1px solid #334155",
            textAlign: "center"
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              background: "#22c55e20",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: "32px"
            }}>
              ✓
            </div>
            <h2 style={{ color: "white", margin: "0 0 12px" }}>Claim Submitted</h2>
            <p style={{ color: "#94a3b8", margin: "0 0 24px" }}>
              Your claim is being processed by our AI engine. You will receive a decision by email shortly.
            </p>
            <div style={{
              background: "#0f172a",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px"
            }}>
              <p style={{ color: "#64748b", fontSize: "12px", margin: "0 0 4px" }}>Claim Reference</p>
              <p style={{ color: "#3b82f6", fontFamily: "monospace", margin: 0, fontSize: "14px" }}>
                {claimId}
              </p>
            </div>
            <button
              onClick={() => { setSubmitted(false); setForm({ claimant_email: "", claim_type: "non_receipt", description: "" }); }}
              style={{
                padding: "12px 24px",
                background: "transparent",
                color: "#94a3b8",
                border: "1px solid #334155",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer"
              }}
            >
              Submit Another Claim
            </button>
          </div>
        )}
      </div>
    </div>
  );
}