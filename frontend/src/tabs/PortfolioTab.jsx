import { useState, useEffect } from "react";
import { useApi } from "../useApi";
import { motion, AnimatePresence } from "framer-motion";

const getIcon = (sym) => `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/white/${sym.toLowerCase()}.png`;
const getFallbackIcon = (sym) => `https://coinicons-api.vercel.app/api/icon/${sym.toLowerCase()}`;

export default function PortfolioTab() {
  const api = useApi();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const PACIFICA_BLUE = "#00d1ff";

  const load = () => {
    setLoading(true);
    api.get("/api/portfolio")
      .then(data => { setPortfolio(data); setError(""); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 font-mono text-zinc-500 animate-pulse uppercase tracking-[0.3em]">
      Syncing_Live_Chain_State...
    </div>
  );
  
  if (error) return (
    <div className="border border-red-900 bg-red-900/10 p-6 text-red-500 font-mono text-xs uppercase tracking-widest">
      ⚠ System_Error: {error}
    </div>
  );

  const lastUpdated = portfolio?.updatedAt ? new Date(portfolio.updatedAt).toLocaleTimeString() : "—";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
      <div className="flex justify-between items-end border-b border-zinc-900 pb-8">
        <div>
          <h2 className="text-white text-4xl font-black uppercase tracking-tighter italic">Portfolio_Terminal</h2>
          <div className="flex gap-4 items-center mt-2">
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.4em]">{portfolio?.pacificaAddress}</p>
            <span className="text-[9px] text-zinc-800 font-mono">LAST_SYNC: {lastUpdated}</span>
          </div>
        </div>
        <button onClick={load} className="text-[11px] bg-white text-black px-6 py-2 font-black uppercase hover:invert transition-all active:scale-95">Refresh_Node</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-900 border border-zinc-900 shadow-2xl">
        <StatCard label="Account Equity" value={`$${portfolio.accountEquity.toFixed(2)}`} />
        <StatCard label="USDC Balance" value={`$${portfolio.usdcBalance.toFixed(2)}`} />
        <StatCard label="Used Margin" value={`$${portfolio.usedMargin.toFixed(2)}`} />
        <StatCard 
          label="Unrealised PnL" 
          value={`${portfolio.totalUnrealisedPnl >= 0 ? "+" : ""}$${portfolio.totalUnrealisedPnl.toFixed(4)}`}
          color={portfolio.totalUnrealisedPnl >= 0 ? "#22c55e" : "#ef4444"}
        />
      </div>

      <section>
        <div className="flex items-center gap-4 mb-8">
          <h3 className="text-zinc-500 text-[11px] font-mono uppercase tracking-[0.5em] italic">// Spot_Inventory</h3>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {portfolio.spotBalances?.map((b) => (
              <motion.div 
                key={b.symbol} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                whileHover={{ borderColor: PACIFICA_BLUE }}
                className="bg-zinc-950 border border-zinc-800 p-8 transition-all group overflow-hidden relative"
              >
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center p-1.5">
                       <img src={getIcon(b.symbol)} alt="" onError={(e) => { e.target.src = getFallbackIcon(b.symbol); e.target.onerror = () => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }; }} className="w-full h-full object-contain" />
                       <span className="hidden text-[10px] font-bold text-white uppercase">{b.symbol[0]}</span>
                    </div>
                    <span className="bg-white text-black px-2 py-0.5 font-black text-[10px] tracking-tighter group-hover:bg-[#00d1ff] transition-colors">{b.symbol}</span>
                  </div>
                </div>
                <div className="text-4xl font-black text-white tracking-tighter group-hover:text-[#00d1ff] transition-colors relative z-10">
                  {b.amount % 1 === 0 ? b.amount.toLocaleString() : b.amount.toFixed(6)}
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between items-center font-mono text-[10px] relative z-10">
                  <span className="text-zinc-600 uppercase">Withdrawable</span>
                  <span className="text-zinc-300 font-bold">{b.availableToWithdraw.toFixed(4)}</span>
                </div>
                <div className="absolute -bottom-4 -right-4 text-[60px] font-black text-zinc-900/20 group-hover:text-[#00d1ff11] transition-colors">{b.symbol}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-4 mb-8">
          <h3 className="text-zinc-500 text-[11px] font-mono uppercase tracking-[0.5em] italic">// Active_Perp_Exposure</h3>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>
        <div className="border border-zinc-800 bg-zinc-950 overflow-x-auto shadow-2xl">
          <table className="w-full text-left font-mono text-[12px] min-w-[800px]">
            <thead className="bg-zinc-900/40 text-zinc-500 uppercase">
              <tr>
                {["Asset", "Side", "Size", "Entry", "Mark", "PnL", "Margin"].map(h => (
                  <th key={h} className="p-5 font-black border-r border-zinc-900 last:border-0 uppercase tracking-widest text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {portfolio.positions.map((p) => (
                <tr key={p.symbol} className="hover:bg-zinc-900/30 transition-colors group">
                  <td className="p-5 border-r border-zinc-900 font-bold text-white">{p.symbol}</td>
                  <td className={`p-5 border-r border-zinc-900 font-black ${p.side === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>{p.side}</td>
                  <td className="p-5 border-r border-zinc-900 text-zinc-300">{p.size.toFixed(4)}</td>
                  <td className="p-5 border-r border-zinc-900 text-zinc-500">${p.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-5 border-r border-zinc-900 text-zinc-100 font-bold">${p.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className={`p-5 border-r border-zinc-900 font-black ${p.unrealisedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {p.unrealisedPnl >= 0 ? "+" : ""}${p.unrealisedPnl.toFixed(4)}
                  </td>
                  <td className="p-5 text-zinc-400 italic font-bold">${p.margin.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {portfolio.positions.length === 0 && <div className="p-20 text-center text-zinc-800 uppercase font-mono tracking-[1em] text-[10px]">Zero_Active_Positions</div>}
        </div>
      </section>
    </motion.div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-zinc-950 p-10 flex flex-col gap-3 hover:bg-zinc-900/30 transition-all group border-r border-zinc-900 last:border-0">
      <span className="text-[9px] text-zinc-600 uppercase tracking-[0.3em] font-mono group-hover:text-[#00d1ff] transition-colors">{label}</span>
      <span className="text-3xl font-black tracking-tighter text-white uppercase italic" style={{ color }}>{value}</span>
    </div>
  );
}