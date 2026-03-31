import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AgentStatusBar from "../components/AgentStatusBar";
import ConfigTab      from "../tabs/ConfigTab";
import DecisionsTab   from "../tabs/DecisionsTab";
import LogsTab        from "../tabs/LogsTab";
import PortfolioTab   from "../tabs/PortfolioTab";

const TABS = ["portfolio", "config", "decisions", "logs"];

export default function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("portfolio");
  const [showProtocol, setShowProtocol] = useState(false);
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());
  const PACIFICA_BLUE = "#00d1ff";

  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const display = user?.email?.address || (user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : "AUTH_OK");

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-300 font-sans selection:bg-[#00d1ff] selection:text-black flex flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1a2b3b] bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <motion.div 
            animate={{ rotate: 360, borderColor: [PACIFICA_BLUE, "#fff", PACIFICA_BLUE] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 flex items-center justify-center"
          >
            <div className="w-1 h-1" style={{ backgroundColor: PACIFICA_BLUE }} />
          </motion.div>
          <span className="font-mono font-black tracking-[0.4em] text-sm text-white uppercase" style={{ color: PACIFICA_BLUE }}>PACIFICA_PILOT</span>
        </div>

        <div className="flex gap-1 bg-zinc-950 p-1 border border-[#1a2b3b] rounded-lg">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-md ${
                tab === t ? "text-black shadow-[0_0_20px_rgba(0,209,255,0.3)]" : "text-zinc-600 hover:text-zinc-200"
              }`}
              style={tab === t ? { backgroundColor: PACIFICA_BLUE } : {}}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-8 font-mono">
          <button onClick={() => setShowProtocol(true)} className="text-[10px] text-zinc-500 hover:text-white border-b border-zinc-800 pb-1 uppercase tracking-tighter transition-all">
            System_Protocol
          </button>
          <div className="flex items-center gap-4 border-l border-[#1a2b3b] pl-8">
            <span className="text-[10px] text-zinc-500">{display}</span>
            <button onClick={onLogout} className="text-[10px] text-red-500 font-black hover:text-red-400 transition-colors">EXIT</button>
          </div>
        </div>
      </nav>

      <AgentStatusBar />

      {/* Main Content */}
      <main className="flex-1 p-10 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div 
            key={tab} 
            initial={{ opacity: 0, scale: 0.99, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.99, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {tab === "portfolio" && <PortfolioTab />}
            {tab === "config" && <ConfigTab />}
            {tab === "decisions" && <DecisionsTab />}
            {tab === "logs" && <LogsTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-[#1a2b3b] bg-zinc-950 px-8 py-5 flex justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
        <div className="flex gap-12">
          <div className="flex items-center gap-2">
            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-2 h-2 rounded-full shadow-[0_0_8px_#00d1ff]" style={{ backgroundColor: PACIFICA_BLUE }} />
            LIVE_ON_TESTNET
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
             AES_256_ENCRYPTION: <span style={{ color: PACIFICA_BLUE }}>ACTIVE</span>
          </div>
          <button className="hover:text-white transition-colors underline underline-offset-4 decoration-[#1a2b3b]">Status_Page</button>
        </div>
        <div>TERMINAL_TIME: <span className="text-white">{systemTime}</span></div>
      </footer>

      {/* HIGH-FIDELITY SYSTEM PROTOCOL MODAL */}
      <AnimatePresence>
        {showProtocol && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 bg-black/95 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="bg-[#080808] border border-[#1a2b3b] w-full max-w-6xl h-full overflow-hidden flex flex-col shadow-2xl relative"
            >
              <div className="p-8 border-b border-[#1a2b3b] flex justify-between items-center bg-zinc-950/50">
                <h2 className="text-white text-2xl font-black tracking-tighter uppercase italic">System_Infrastructure_Specs</h2>
                <button onClick={() => setShowProtocol(false)} className="px-4 py-1 text-[10px] font-black uppercase hover:invert transition-all" style={{ backgroundColor: PACIFICA_BLUE, color: '#000' }}>
                  Close_Esc
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-12 space-y-20 custom-scrollbar">
                <section className="space-y-12">
                  <div className="flex items-center gap-4">
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-[0.4em] italic">// Hardware_Schematic</h3>
                    <div className="h-px flex-1 bg-zinc-900" />
                  </div>
                  <div className="flex justify-center bg-zinc-950/50 border border-[#1a2b3b] p-12 rounded-xl">
                    <SystemSVG blue={PACIFICA_BLUE} />
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-10 border border-[#1a2b3b] bg-gradient-to-br from-[#00d1ff11] to-transparent relative group">
                    <div className="absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: PACIFICA_BLUE }} />
                    <h4 className="text-white font-black mb-6 text-sm uppercase tracking-widest border-b border-[#1a2b3b] pb-2 inline-block">Logic_Redundancy</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed uppercase tracking-tighter">
                      Circuit Breaker monitors Pacifica health. Upon 5 failures, system hot-swaps to Binance Spot Klines for RSI continuity.
                    </p>
                  </div>
                  <div className="p-10 border border-[#1a2b3b] bg-gradient-to-br from-[#00d1ff11] to-transparent relative group">
                    <div className="absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: PACIFICA_BLUE }} />
                    <h4 className="text-white font-black mb-6 text-sm uppercase tracking-widest border-b border-[#1a2b3b] pb-2 inline-block">Intelligence_Layer</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed uppercase tracking-tighter">
                      Integrating Elfa AI engagement metrics [(Likes + 2x Reposts) / Views] as secondary confirmation for Gemini execution.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SystemSVG({ blue }) {
  return (
    <svg viewBox="0 0 800 400" className="w-full max-w-3xl">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orientation="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#1a2b3b" />
        </marker>
      </defs>
      <g className="nodes">
        <rect x="50" y="50" width="180" height="60" fill="none" stroke="white" strokeWidth="2" />
        <text x="140" y="85" fill="white" fontSize="12" fontWeight="900" textAnchor="middle" className="font-mono">USER_TERMINAL</text>
        <rect x="310" y="170" width="180" height="60" fill="none" stroke="#1a2b3b" strokeWidth="2" />
        <text x="400" y="205" fill="#a1a1aa" fontSize="12" fontWeight="900" textAnchor="middle" className="font-mono">EXPRESS_CORE</text>
        <rect x="570" y="50" width="180" height="60" fill="none" stroke={blue} strokeWidth="2" />
        <text x="660" y="85" fill={blue} fontSize="12" fontWeight="900" textAnchor="middle" className="font-mono">PYTHON_AGENT</text>
        <path d="M310,320 L490,320 L490,370 L310,370 Z" fill="none" stroke="#1a2b3b" strokeWidth="1" />
        <text x="400" y="350" fill="#3f3f46" fontSize="10" fontWeight="900" textAnchor="middle" className="font-mono">MONGO_DB_ATLAS</text>
      </g>
      <g className="connections" strokeDasharray="5,5">
        <path d="M140,110 L140,200 L310,200" fill="none" stroke="#1a2b3b" markerEnd="url(#arrow)" />
        <path d="M660,110 L660,200 L490,200" fill="none" stroke="#1a2b3b" markerEnd="url(#arrow)" />
        <path d="M400,230 L400,320" fill="none" stroke="#1a2b3b" markerEnd="url(#arrow)" />
      </g>
      <circle cx="400" cy="80" r="40" fill="none" stroke={blue} strokeWidth="1" strokeDasharray="2,2" />
      <text x="400" y="85" fill={blue} fontSize="8" fontWeight="900" textAnchor="middle" className="font-mono">GEMINI_2.5</text>
      <motion.circle r="3" fill="white" animate={{ cx: [140, 140, 310], cy: [110, 200, 200] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
      <motion.circle r="3" fill={blue} animate={{ cx: [660, 660, 490], cy: [110, 200, 200] }} transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1.5 }} />
    </svg>
  );
}