import { useState, useEffect } from "react";
import { useApi } from "../useApi";

export default function DecisionsTab() {
  const api = useApi();
  const [trades, setTrades] = useState([]);
  const [stats,  setStats]  = useState(null);

  useEffect(() => {
    const load = () => {
      api.get("/api/trades?limit=100").then(d => setTrades(d.trades || [])).catch(() => {});
      api.get("/api/trades/stats").then(setStats).catch(() => {});
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h2>Decisions</h2>
      {stats && (
        <p>Total: {stats.totalDecisions} | LONG: {stats.byAction?.LONG ?? 0} | SHORT: {stats.byAction?.SHORT ?? 0} | PnL: ${stats.totalPnlUsdc ?? 0}</p>
      )}
      {trades.length === 0
        ? <p>No decisions yet. Start the agent to see results.</p>
        : trades.map(t => (
          <div key={t._id} style={{ borderBottom: "1px solid #ccc", padding: "8px 0" }}>
            <strong>{t.action}</strong> {t.symbol} @ ${t.mark_price?.toLocaleString()} — conf {Math.round((t.confidence || 0) * 100)}%
            <p>{t.reasoning}</p>
          </div>
        ))
      }
    </div>
  );
}