"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LicenseCourt, type Audit, type Claim } from "@/lib/licenseCourt";

const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const EXPLORER = "https://explorer-studio.genlayer.com/address/";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  margin: "6px 0 12px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "#12161f",
  color: "#e6e9f0",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "none",
  background: "#4f7cff",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #232a38",
  borderRadius: 12,
  padding: 16,
  margin: "12px 0",
  background: "#10141d",
};

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const contract = useMemo(() => new LicenseCourt(address), [address]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        contract.getAudits(),
        contract.getClaims(),
      ]);
      setAudits(a);
      setClaims(c);
    } catch (e) {
      setNotice(`Read failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function connect() {
    if (!window.ethereum) {
      setNotice("No MetaMask found. Install it, add the GenLayer Studio network (chain ID 61999), then retry.");
      return;
    }
    const accounts = (await window.ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];
    setAddress(accounts[0] ?? null);
  }

  async function run(label: string, fn: () => Promise<unknown>) {
    if (!address) {
      setNotice("Connect your wallet first.");
      return;
    }
    setBusy(label);
    setNotice(`${label}… consensus can take a few minutes, keep this tab open.`);
    try {
      await fn();
      setNotice(`${label} done.`);
      await refresh();
    } catch (e) {
      setNotice(`${label} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 64px" }}>
      <h1 style={{ fontSize: 30, marginBottom: 4 }}>LicenseCourt</h1>
      <p style={{ color: "#9aa4b8", marginTop: 0 }}>
        Open-source license compliance adjudication on GenLayer. Validators fetch
        the manifest, license index and exceptions page themselves and rule on
        each claim; the violation count is deterministic.
      </p>
      <p style={{ fontSize: 13, color: "#9aa4b8" }}>
        Contract:{" "}
        <a href={`${EXPLORER}${CONTRACT}`} style={{ color: "#7ea4ff" }}>
          {CONTRACT}
        </a>{" "}
        · Studio test environment (chain 61999), not mainnet.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0" }}>
        <button style={buttonStyle} onClick={connect}>
          {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect MetaMask"}
        </button>
        <button style={{ ...buttonStyle, background: "#2a3140" }} onClick={refresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {notice && (
        <p style={{ ...cardStyle, borderColor: "#3b4a6b", color: "#cdd8ff" }}>{notice}</p>
      )}

      <h2 style={{ marginTop: 28 }}>Audits ({audits.length})</h2>
      {audits.length === 0 && <p style={{ color: "#9aa4b8" }}>No audits yet.</p>}
      {audits.map((a, i) => (
        <div key={i} style={cardStyle}>
          <strong>#{i} {a.project_name}</strong>{" "}
          <span style={{ color: a.status === "open" ? "#59d98c" : "#9aa4b8" }}>
            [{a.status}]
          </span>
          <div style={{ fontSize: 13, color: "#9aa4b8", marginTop: 6 }}>
            violations: {String(a.violation_count)} · owner: {a.owner}
            <br />
            manifest: {a.manifest_url}
            <br />
            license index: {a.license_index_url}
            <br />
            exceptions: {a.exceptions_url || "—"}
            <br />
            forbidden: {a.forbidden_licenses}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button
              style={buttonStyle}
              disabled={!!busy}
              onClick={() =>
                run(`Assessing claims of audit #${i}`, async () => {
                  // Assess every still-submitted claim belonging to this audit.
                  const all = await contract.getClaims();
                  for (let j = 0; j < all.length; j++) {
                    if (Number(all[j].audit_id) === i && all[j].status === "submitted") {
                      await contract.assessClaim(j);
                    }
                  }
                })
              }
            >
              Assess submitted claims
            </button>
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 28 }}>Claims ({claims.length})</h2>
      {claims.length === 0 && <p style={{ color: "#9aa4b8" }}>No claims yet.</p>}
      {claims.map((c, i) => (
        <div key={i} style={cardStyle}>
          <strong>#{i} {c.title}</strong>{" "}
          <span style={{ color: "#9aa4b8" }}>
            [audit #{String(c.audit_id)} · {c.status}
            {c.ruled_severity ? ` · ruled ${c.ruled_severity}` : ""}]
          </span>
          <div style={{ fontSize: 13, color: "#9aa4b8", marginTop: 6 }}>
            {c.statement}
            <br />
            claimed severity: {c.claimed_severity} · claimant: {c.claimant}
            {c.triage_summary ? (
              <>
                <br />
                summary: {c.triage_summary}
              </>
            ) : null}
            {c.evidence ? (
              <>
                <br />
                evidence: {c.evidence}
              </>
            ) : null}
          </div>
          {c.status === "submitted" && (
            <div style={{ marginTop: 10 }}>
              <button
                style={buttonStyle}
                disabled={!!busy}
                onClick={() => run(`Assessing claim #${i}`, () => contract.assessClaim(i))}
              >
                Assess claim #{i}
              </button>
            </div>
          )}
        </div>
      ))}

      <h2 style={{ marginTop: 28 }}>Create an audit</h2>
      <CreateAuditForm contract={contract} run={run} busy={!!busy} />

      <h2 style={{ marginTop: 28 }}>Submit a claim</h2>
      <SubmitClaimForm contract={contract} run={run} busy={!!busy} audits={audits} />
    </main>
  );
}

function CreateAuditForm({
  contract,
  run,
  busy,
}: {
  contract: LicenseCourt;
  run: (label: string, fn: () => Promise<unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [f, setF] = useState({
    projectName: "",
    manifestUrl: "",
    licenseIndexUrl: "",
    exceptionsUrl: "",
    forbiddenLicenses: "GPL-3.0, AGPL-3.0",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run("Creating audit", () => contract.createAudit(f));
      }}
    >
      <label>Project name<input style={inputStyle} value={f.projectName} onChange={set("projectName")} required /></label>
      <label>Manifest URL<input style={inputStyle} value={f.manifestUrl} onChange={set("manifestUrl")} required /></label>
      <label>License index URL<input style={inputStyle} value={f.licenseIndexUrl} onChange={set("licenseIndexUrl")} required /></label>
      <label>Exceptions URL (optional)<input style={inputStyle} value={f.exceptionsUrl} onChange={set("exceptionsUrl")} /></label>
      <label>Forbidden licenses<input style={inputStyle} value={f.forbiddenLicenses} onChange={set("forbiddenLicenses")} required /></label>
      <button style={buttonStyle} type="submit" disabled={busy}>Create audit</button>
    </form>
  );
}

function SubmitClaimForm({
  contract,
  run,
  busy,
  audits,
}: {
  contract: LicenseCourt;
  run: (label: string, fn: () => Promise<unknown>) => Promise<void>;
  busy: boolean;
  audits: Audit[];
}) {
  const [auditId, setAuditId] = useState("0");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [severity, setSeverity] = useState("high");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run("Submitting claim", () =>
          contract.submitClaim({
            auditId: Number(auditId),
            title,
            statement,
            claimedSeverity: severity,
          })
        );
      }}
    >
      <label>
        Audit ID
        <input style={inputStyle} value={auditId} onChange={(e) => setAuditId(e.target.value)} required />
      </label>
      <label>Title<input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
      <label>
        Statement
        <textarea
          style={{ ...inputStyle, minHeight: 90 }}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          required
        />
      </label>
      <label>
        Claimed severity
        <select style={inputStyle} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="critical">critical</option>
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
        </select>
      </label>
      <button style={buttonStyle} type="submit" disabled={busy || audits.length === 0}>
        Submit claim (not the audit owner)
      </button>
    </form>
  );
}
