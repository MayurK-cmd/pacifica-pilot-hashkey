import { useState } from "react";
import AgentStatusBar from "./components/AgentStatusBar";
import ConfigTab      from "./tabs/ConfigTab";
import DecisionsTab   from "./tabs/DecisionsTab";
import LogsTab        from "./tabs/LogsTab";
import PortfolioTab   from "./tabs/PortfolioTab";

const TABS = ["portfolio", "config", "decisions", "logs"];

export default function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("portfolio");

  const email   = user?.email?.address;
  const wallet  = user?.wallet?.address;
  const display = email || (wallet ? wallet.slice(0, 6) + "..." + wallet.slice(-4) : "");

  return (
    <div>
      {/* Top nav bar */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "12px 20px",
        borderBottom:   "1px solid var(--border)",
      }}>
        <span style={{ fontWeight: 600, fontSize: "16px" }}>PacificaPilot</span>
        <nav style={{ display: "flex", gap: "8px" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              disabled={tab === t}
              style={{
                textTransform: "capitalize",
                padding:       "4px 12px",
                borderRadius:  "6px",
                border:        "1px solid var(--border)",
                cursor:        tab === t ? "default" : "pointer",
                background:    tab === t ? "var(--accent-bg)" : "transparent",
                color:         tab === t ? "var(--accent)" : "var(--text)",
              }}
            >
              {t}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: "var(--text)" }}>{display}</span>
          <button onClick={onLogout} style={{ fontSize: "13px" }}>Logout</button>
        </div>
      </div>

      {/* Agent status bar — always visible below nav */}
      <AgentStatusBar />

      {/* Tab content */}
      <div style={{ padding: "20px" }}>
        {tab === "portfolio"  && <PortfolioTab />}
        {tab === "config"     && <ConfigTab />}
        {tab === "decisions"  && <DecisionsTab />}
        {tab === "logs"       && <LogsTab />}
      </div>
    </div>
  );
}