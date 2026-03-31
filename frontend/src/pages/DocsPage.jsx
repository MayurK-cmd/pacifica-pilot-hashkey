import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function DocsPage() {
  const blue = "#00d1ff"; // Pacifica Water Blue
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());

  // Real-time clock for the institutional footer
  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-300 font-sans selection:bg-[#00d1ff] selection:text-black flex flex-col">
      
      <div className="flex flex-col md:flex-row flex-1">
        {/* Surgical Sidebar Navigation */}
        <aside className="w-full md:w-80 border-r border-[#1a2b3b] bg-black p-10 flex flex-col z-20 overflow-y-auto custom-scrollbar">
          <Link to="/" className="text-white font-black tracking-[0.4em] text-sm mb-16 uppercase flex items-center gap-3 group">
            <div className="w-4 h-4 rotate-45 border-2 transition-all group-hover:bg-[#00d1ff]" style={{ borderColor: blue }} /> 
            ← <span className="group-hover:text-[#00d1ff]">PILOT_HOME</span>
          </Link>
          
          <nav className="space-y-12 uppercase font-mono text-[11px] tracking-widest">
            <div>
              <p style={{ color: blue }} className="mb-6 opacity-80 italic font-bold border-b border-zinc-900 pb-2">01_Getting_Started</p>
              <ul className="space-y-4 pl-4 border-l border-zinc-800">
                <li><a href="#overview" className="hover:text-white transition-colors">Overview</a></li>
                <li><a href="#quickstart" className="hover:text-white transition-colors">Quick_Start</a></li>
              </ul>
            </div>
            <div>
              <p style={{ color: blue }} className="mb-6 opacity-80 italic font-bold border-b border-zinc-900 pb-2">02_System_Specs</p>
              <ul className="space-y-4 pl-4 border-l border-zinc-800">
                <li><a href="#architecture" className="hover:text-white transition-colors">Architecture</a></li>
                <li><a href="#workflow" className="hover:text-white transition-colors">Workflow</a></li>
                <li><a href="#mechanics" className="hover:text-white transition-colors">Trading_Mechanics</a></li>
              </ul>
            </div>
            <div>
              <p style={{ color: blue }} className="mb-6 opacity-80 italic font-bold border-b border-zinc-900 pb-2">03_Deployment</p>
              <ul className="space-y-4 pl-4 border-l border-zinc-800">
                <li><a href="#setup" className="hover:text-white transition-colors">Installation</a></li>
                <li><a href="#env" className="hover:text-white transition-colors">Env_Reference</a></li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* Main Content Terminal */}
        <main className="flex-1 bg-black overflow-y-auto custom-scrollbar border-b border-[#1a2b3b]">
          <div className="max-w-4xl mx-auto p-12 md:p-24 space-y-40">
            
            {/* 01. Overview */}
            <section id="overview">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">01. Overview</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="space-y-10">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">What is PacificaPilot?</h3>
                <p className="text-zinc-400 text-lg leading-relaxed uppercase tracking-tighter">
                  PacificaPilot is an autonomous AI trading agent for Pacifica, a perpetual futures DEX on Solana. 
                  It integrates:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {[
                     "Real-time market data (RSI, funding, basis)",
                     "Social sentiment (Elfa AI Twitter analysis)",
                     "AI reasoning (Google Gemini 2.5 Flash)",
                     "Automated execution (Ed25519-signed orders)",
                     "Risk management (Trailing stops, limits)"
                   ].map((item, i) => (
                     <div key={i} className="p-5 border border-zinc-900 bg-zinc-950/30 flex gap-4 items-center">
                        <span style={{ color: blue }}>[+]</span>
                        <span className="text-[11px] uppercase font-mono">{item}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div id="quickstart" className="mt-24 space-y-10">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Quick_Start (5 Minutes)</h3>
                <div className="space-y-6">
                  <p className="text-zinc-500 font-mono text-sm uppercase"># Clone and Initialize Nodes</p>
                  <pre className="bg-[#050a12] border border-[#1a2b3b] p-10 text-zinc-300 text-sm font-mono leading-7 overflow-x-auto shadow-2xl">
{`# 1. Clone
git clone https://github.com/MayurK-cmd/Pacificia-Trading-Bot.git
cd Pacificia-Trading-Bot

# 2. Dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../agent && pip install requests google-genai solders python-dotenv`}
                  </pre>
                </div>
              </div>
            </section>

            {/* 02. Architecture */}
            <section id="architecture">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">02. Architecture</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="bg-[#050a12]/40 border border-[#1a2b3b] p-12 rounded-sm relative overflow-hidden group shadow-2xl mb-12">
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${blue}, transparent)` }} />
                <pre className="text-zinc-400 text-sm leading-8 font-mono overflow-x-auto whitespace-pre">
{` [ CLIENT_UI ] <────────── JWT AUTH ──────────> [ EXPRESS_API ]
        │                                             │
   (1) SSE STREAM                                (2) AES-256 STORE
        ▲                                             ▼
  [ LOG_BUFFER ] <───── x-agent-key ───────> [ PYTHON_AGENT ]
                                                │
   (3) INTELLIGENCE                             │ (4) EXECUTION
        ├─ GEMINI 2.5 FLASH                     ├─ Ed25519 SIGNING
        └─ ELFA AI SENTIMENT                    └─ PACIFICA API`}
                </pre>
              </div>
              <div id="workflow" className="space-y-12">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Workflow_Cycle</h3>
                <div className="grid grid-cols-1 gap-6">
                  {[
                    { id: "A", t: "FETCH_CONFIG", d: "Agent polls /api/agent/config every 5 minutes for user parameters." },
                    { id: "B", t: "MARKET_SCAN", d: "Parallel processing of RSI-14 (5m/1h) and basis spread vs Binance." },
                    { id: "C", t: "SENTIMENT_SYNC", d: "Retrieval of Elfa AI engagement scores and trending rankings." },
                    { id: "D", t: "AI_INFERENCE", d: "Gemini 2.5 Flash synthesizes signals into actionable trading logic." },
                    { id: "E", t: "SIGNED_BROADCAST", d: "Ed25519-signed orders sent to Pacifica with trailing risk guardrails." }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-8 p-8 bg-zinc-950/20 border border-zinc-900 group hover:border-[#00d1ff]/50 transition-all cursor-default">
                       <span className="text-zinc-800 text-4xl font-black italic">{step.id}</span>
                       <div>
                          <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-1">{step.t}</h4>
                          <p className="text-zinc-500 text-xs leading-relaxed uppercase">{step.d}</p>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 03. Signal Mechanics */}
            <section id="mechanics">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">03. Mechanics</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="bg-[#050a12]/30 border border-[#1a2b3b] p-10">
                <h3 style={{ color: blue }} className="text-sm font-black uppercase mb-10 tracking-widest italic underline underline-offset-8 decoration-zinc-800">Signal_Interpretation_Invariants</h3>
                <table className="w-full border-collapse text-left font-mono text-[11px] text-zinc-500">
                  <thead>
                    <tr className="border-b border-zinc-800 uppercase">
                      <th className="py-4 pr-4 font-black">Invariant</th>
                      <th className="py-4 pr-4 font-black text-white italic">Bullish_State</th>
                      <th className="py-4 font-black text-white italic">Bearish_State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 uppercase tracking-tighter">
                    <tr><td className="py-6 font-bold">RSI-14 (1H)</td><td className="py-6 text-[#00d1ff]">&lt; 35 (Oversold)</td><td className="py-6 text-red-900">&gt; 65 (Overbought)</td></tr>
                    <tr><td className="py-6 font-bold">Funding_Rate</td><td className="py-6 text-[#00d1ff]">Negative (Shorts Pay)</td><td className="py-6 text-red-900">Positive (Longs Pay)</td></tr>
                    <tr><td className="py-6 font-bold">Basis_Spread</td><td className="py-6 text-[#00d1ff]">Discount (Pac &lt; Bin)</td><td className="py-6 text-red-900">Premium (Pac &gt; Bin)</td></tr>
                    <tr><td className="py-6 font-bold">Sentiment</td><td className="py-6 text-[#00d1ff]">High Engagement (&gt;0.3)</td><td className="py-6 text-zinc-700">Low Engagement</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 04. Environment Variables */}
            <section id="env" className="pb-24">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">04. Environment</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="grid grid-cols-1 gap-10">
                 <div className="bg-black border border-zinc-900 p-10 shadow-2xl relative">
                    <p style={{ color: blue }} className="text-xs font-black uppercase mb-6 tracking-widest italic font-bold">Backend_Secrets (.env)</p>
                    <pre className="text-sm text-zinc-500 font-mono leading-7">
{`MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/pacifica
PRIVY_APP_ID=app_id_from_dashboard
PRIVY_APP_SECRET=secret_from_dashboard
ENCRYPTION_SECRET=32_random_hex_chars
AGENT_API_SECRET=secure_random_string`}
                    </pre>
                 </div>
                 <div className="bg-black border border-zinc-900 p-10 shadow-2xl relative">
                    <p style={{ color: blue }} className="text-xs font-black uppercase mb-6 tracking-widest italic font-bold">Agent_Invariants (.env)</p>
                    <pre className="text-sm text-zinc-500 font-mono leading-7">
{`PACIFICA_PRIVATE_KEY=your_main_wallet_key
PACIFICA_AGENT_PRIVATE_KEY=agent_secret_from_apikey_page
GEMINI_API_KEY=google_studio_key
ELFA_API_KEY=elfa_dashboard_key
DRY_RUN=true`}
                    </pre>
                 </div>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* Institutional Landing Footer */}
      <footer className="border-t border-[#1a2b3b] bg-black px-12 py-12 flex flex-col md:flex-row justify-between items-center gap-12 text-[12px] font-mono uppercase tracking-[0.3em] text-zinc-500">
        <div className="flex flex-col md:flex-row gap-12">
          <span className="cursor-default italic text-zinc-700">© 2026_PILOT_CORE</span>
          <a href="https://github.com/MayurK-cmd/Pacificia-Trading-Bot" target="_blank" rel="noreferrer" className="underline underline-offset-8 decoration-zinc-800 hover:text-white transition-colors font-bold">Github_Source</a>
          <button className="hover:text-white transition-colors text-zinc-600">Protocol_Status: {systemTime}</button>
        </div>
        <div className="flex gap-10 items-center">
          <div className="flex items-center gap-4 border border-zinc-900 px-6 py-3 bg-zinc-950/50 rounded-sm">
             <motion.span 
              animate={{ opacity: [1, 0.4, 1] }} 
              transition={{ repeat: Infinity, duration: 2 }} 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: blue, boxShadow: `0 0 15px ${blue}` }} 
             />
             <span className="text-zinc-300 font-black tracking-[0.1em]">SYSTEM_ENCRYPTION_ACTIVE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}