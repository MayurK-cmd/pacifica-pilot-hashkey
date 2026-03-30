import { useState, useEffect } from "react";
import { useApi } from "../useApi";

export default function PortfolioTab() {
  const api = useApi();
  const [portfolio, setPortfolio] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  function load() {
    setLoading(true);
    api.get("/api/portfolio")
      .then(data => { setPortfolio(data); setError(""); })
      .catch(e   => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading)    return <p>Loading portfolio...</p>;
  if (error)      return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!portfolio) return null;

  const {
    pacificaAddress,
    usdcBalance,
    accountEquity,
    spotCollateral,
    availableToSpend,
    availableToWithdraw,
    usedMargin,
    spotBalances,
    positions,
    totalUnrealisedPnl,
    updatedAt,
  } = portfolio;

  const lastUpdated = updatedAt
    ? new Date(updatedAt).toLocaleTimeString()
    : "—";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Portfolio</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", color: "var(--text)" }}>
            Updated: {lastUpdated}
          </span>
          <button onClick={load}>Refresh</button>
        </div>
      </div>

      <p style={{ fontSize: "12px", color: "var(--text)", margin: "6px 0 16px" }}>
        {pacificaAddress}
      </p>

      {/* Stat cards */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap:                 "12px",
        margin:              "0 0 24px",
      }}>
        <StatCard label="USDC Balance"        value={`$${usdcBalance.toFixed(2)}`} />
        <StatCard label="Account Equity"      value={`$${accountEquity.toFixed(2)}`} />
        <StatCard label="Spot Collateral"     value={`$${spotCollateral.toFixed(2)}`} />
        <StatCard label="Available to Trade"  value={`$${availableToSpend.toFixed(2)}`} />
        <StatCard label="Available Withdraw"  value={`$${availableToWithdraw.toFixed(2)}`} />
        <StatCard label="Used Margin"         value={`$${usedMargin.toFixed(2)}`} />
        <StatCard
          label="Unrealised PnL"
          value={`${totalUnrealisedPnl >= 0 ? "+" : ""}$${totalUnrealisedPnl.toFixed(4)}`}
          color={totalUnrealisedPnl >= 0 ? "#22c55e" : "#ef4444"}
        />
      </div>

      {/* Spot balances (BTC, WIF, etc held on Pacifica) */}
      {spotBalances && spotBalances.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 10px" }}>Spot balances</h3>
          <div style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap:                 "10px",
            marginBottom:        "24px",
          }}>
            {spotBalances.map(b => (
              <div key={b.symbol} style={{
                border:       "1px solid var(--border)",
                borderRadius: "8px",
                padding:      "12px",
              }}>
                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  {b.symbol}
                </div>
                <div style={{ fontSize: "18px", fontWeight: 500 }}>
                  {b.amount % 1 === 0 ? b.amount.toLocaleString() : b.amount.toFixed(6)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text)", marginTop: "4px" }}>
                  Withdrawable: {b.availableToWithdraw % 1 === 0
                    ? b.availableToWithdraw.toLocaleString()
                    : b.availableToWithdraw.toFixed(6)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Open perp positions */}
      <h3 style={{ margin: "0 0 10px" }}>Open perp positions</h3>
      {positions.length === 0 ? (
        <p style={{ color: "var(--text)", fontSize: "14px" }}>
          No open positions. Agent will open positions when it finds a signal.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              {["Symbol", "Side", "Size", "Entry", "Mark", "Unrealised PnL", "Margin"].map(h => (
                <th key={h} style={{
                  textAlign:    "left",
                  padding:      "6px 8px",
                  borderBottom: "1px solid var(--border)",
                  color:        "var(--text)",
                  fontWeight:   500,
                  fontSize:     "12px",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map(p => (
              <tr key={p.symbol}>
                <td style={{ padding: "8px" }}>{p.symbol}</td>
                <td style={{ padding: "8px", color: p.side === "LONG" ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                  {p.side}
                </td>
                <td style={{ padding: "8px" }}>{p.size.toFixed(4)}</td>
                <td style={{ padding: "8px" }}>
                  ${p.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "8px" }}>
                  ${p.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "8px", color: p.unrealisedPnl >= 0 ? "#22c55e" : "#ef4444" }}>
                  {p.unrealisedPnl >= 0 ? "+" : ""}${p.unrealisedPnl.toFixed(4)}
                </td>
                <td style={{ padding: "8px" }}>${p.margin.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
      <div style={{ fontSize: "11px", color: "var(--text)", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "17px", fontWeight: 500, color: color || "var(--text-h)" }}>{value}</div>
    </div>
  );
}