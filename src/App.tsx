import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, ShieldAlert, Zap, Trophy, TrendingUp, Cpu, Globe, Terminal as TerminalIcon, User, DollarSign, ArrowUpRight, ArrowDownRight, Radio, Satellite, LineChart as LineChartIcon, BrainCircuit, Crosshair, Lock, Unlock, AlertTriangle, MessageSquare, Image as ImageIcon, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { AuthProfile, NeuroChat, MediaLab } from './components/AIFeatures';
import { CyberWarfare } from './components/CyberWarfare';
import { MarketMaker } from './components/MarketMaker';
import { ThreeVisualizer } from './components/ThreeVisualizer';
import { useAppStore } from './store';
import { audio } from './utils/AudioEngine';

// --- TYPES ---
interface LiveMatch {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number | string;
  status: string;
  events: string[];
}

interface RealOdds {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  odds: { home: number; draw: number; away: number };
  commenceTime: string;
}

interface GoalKing {
  name: string;
  team: string;
  goals: number;
}

interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  history: { time: string; price: number }[];
  change24h: number;
}

interface Bet {
  id: string;
  matchId: string;
  type: 'HOME' | 'DRAW' | 'AWAY';
  amount: number;
  potentialPayout: number;
  status: 'PENDING' | 'WON' | 'LOST';
  timestamp: number;
}

interface UserProfile {
  balance: number;
  rank: string;
  bets: Bet[];
  hackLevel: number;
}

interface CoreState {
  liveMatches: LiveMatch[];
  realOdds: RealOdds[];
  superLigGoalKings: GoalKing[];
  premierLigGoalKings: GoalKing[];
  cryptoMarket: CryptoAsset[];
  systemLogs: string[];
  apiStatus: { sportmonks: string; odds: string; collect: string };
  lastUpdate: string;
}

// --- MATRIX RAIN COMPONENT ---
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%""\'#&_(),.;:?!\\|{}<>[]^~';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];
    for (let x = 0; x < columns; x++) drops[x] = 1;

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0F0';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 opacity-20 pointer-events-none" />;
};

// --- GLITCH TEXT COMPONENT ---
const GlitchText = ({ text, className = '' }: { text: string, className?: string }) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-[2px] -z-10 text-red-500 opacity-70 animate-pulse mix-blend-screen">{text}</span>
      <span className="absolute top-0 -left-[2px] -z-10 text-blue-500 opacity-70 animate-pulse mix-blend-screen" style={{ animationDelay: '0.1s' }}>{text}</span>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const { audioEnabled, toggleAudio } = useAppStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [coreState, setCoreState] = useState<CoreState | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SYNDICATE' | 'ORACLE' | 'TERMINAL' | 'NEURO_CHAT' | 'MEDIA_LAB' | 'PROFILE' | 'CYBER_WARFARE' | 'MARKET_MAKER'>('DASHBOARD');
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>(['> NEURAL SYNDICATE OS v9.9.9 LOADED.', '> TYPE /help FOR COMMANDS.']);
  const [oracleResponses, setOracleResponses] = useState<Record<string, string>>({});
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isListening, setIsListening] = useState(false);

  // Voice Recognition Setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTerminalInput(finalTranscript.trim());
        // Auto submit if it sounds like a command
        if (finalTranscript.toLowerCase().includes('execute') || finalTranscript.toLowerCase().includes('run')) {
           setTimeout(() => {
             const form = document.getElementById('terminal-form');
             if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
           }, 500);
        }
      } else {
        setTerminalInput(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) recognition.start();
    };

    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => recognition.stop();
  }, [isListening]);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_APP_URL || window.location.origin);
    setSocket(newSocket);

    newSocket.on('core_state_update', (state: CoreState) => setCoreState(state));
    newSocket.on('user_data', (profile: UserProfile) => setUserProfile(profile));
    newSocket.on('system_log', (log: string) => {
      setTerminalHistory(prev => [...prev, `[SYS] ${log}`].slice(-50));
    });
    newSocket.on('terminal_response', (res: string) => {
      if (res === 'CLEAR_HISTORY') {
        setTerminalHistory(['> TERMINAL CLEARED.']);
      } else {
        setTerminalHistory(prev => [...prev, `> ${res}`].slice(-50));
      }
    });
    newSocket.on('oracle_response', (data: { matchId: string, prediction: string }) => {
      setOracleResponses(prev => ({ ...prev, [data.matchId]: data.prediction }));
    });
    newSocket.on('bet_error', (err: string) => {
      setTerminalHistory(prev => [...prev, `[ERROR] ${err}`].slice(-50));
    });

    return () => { newSocket.close(); };
  }, []);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim() || !socket) return;
    setTerminalHistory(prev => [...prev, `$ ${terminalInput}`].slice(-50));
    socket.emit('terminal_command', terminalInput);
    setTerminalInput('');
  };

  const placeBet = (matchId: string, type: 'HOME'|'DRAW'|'AWAY', odds: number) => {
    if (!socket || !userProfile) return;
    if (userProfile.balance < betAmount) {
      setTerminalHistory(prev => [...prev, `[ERROR] INSUFFICIENT FUNDS FOR BET.`].slice(-50));
      return;
    }
    socket.emit('place_bet', { matchId, type, amount: betAmount, odds });
  };

  const consultOracle = (matchId: string) => {
    if (!socket) return;
    setOracleResponses(prev => ({ ...prev, [matchId]: 'ANALYZING NEURAL PATHWAYS...' }));
    socket.emit('request_oracle', matchId);
  };

  if (!coreState || !userProfile) {
    return (
      <div className="min-h-screen bg-black text-emerald-500 font-mono flex items-center justify-center flex-col">
        <Cpu className="w-16 h-16 animate-pulse mb-4" />
        <GlitchText text="ESTABLISHING NEURAL LINK..." className="text-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-emerald-500 font-mono overflow-hidden relative selection:bg-emerald-500 selection:text-black">
      <MatrixRain />

      {/* TOP HUD */}
      <header className="relative z-10 border-b border-emerald-900 bg-black/80 backdrop-blur-md p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <ShieldAlert className="text-red-500 animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold tracking-widest"><GlitchText text="NEURAL SYNDICATE OS" /></h1>
            <div className="text-xs text-emerald-700">GLOBAL THREAT LEVEL: MID | UPLINK: SECURE</div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <button 
            onClick={() => {
              toggleAudio();
              if (!audioEnabled) audio.init();
            }}
            className="text-emerald-500 hover:text-emerald-300 transition-colors"
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-xs text-emerald-700">BALANCE (NRO)</span>
            <span className="text-xl font-bold text-emerald-400 flex items-center gap-1">
              <DollarSign className="w-5 h-5" /> {userProfile.balance.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-emerald-700">RANK</span>
            <span className="text-sm font-bold text-fuchsia-400">{userProfile.rank}</span>
          </div>
          <div className="flex gap-2">
            <div className={`w-3 h-3 rounded-full ${coreState.apiStatus.sportmonks === 'LIVE_API' ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`} title="Sportmonks API" />
            <div className={`w-3 h-3 rounded-full ${coreState.apiStatus.odds === 'LIVE_API' ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`} title="Odds API" />
            <div className={`w-3 h-3 rounded-full ${coreState.apiStatus.collect === 'LIVE_API' ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`} title="Collect API" />
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex h-[calc(100vh-80px)] relative z-10">
        
        {/* SIDEBAR NAVIGATION */}
        <nav className="w-64 border-r border-emerald-900 bg-black/60 backdrop-blur-sm p-4 flex flex-col gap-2">
          {[
            { id: 'DASHBOARD', icon: Globe, label: 'GLOBAL RADAR' },
            { id: 'SYNDICATE', icon: DollarSign, label: 'SYNDICATE MARKET' },
            { id: 'MARKET_MAKER', icon: TrendingUp, label: 'MARKET MAKER' },
            { id: 'CYBER_WARFARE', icon: ShieldAlert, label: 'CYBER WARFARE' },
            { id: 'ORACLE', icon: BrainCircuit, label: 'AI ORACLE' },
            { id: 'NEURO_CHAT', icon: MessageSquare, label: 'NEURO-CHAT' },
            { id: 'MEDIA_LAB', icon: ImageIcon, label: 'MEDIA LAB' },
            { id: 'PROFILE', icon: User, label: 'USER PROFILE' },
            { id: 'TERMINAL', icon: TerminalIcon, label: 'TERMINAL OS' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                  : 'border-transparent text-emerald-700 hover:bg-emerald-950/30 hover:text-emerald-500'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-bold tracking-wider">{tab.label}</span>
            </button>
          ))}

          {/* CRYPTO TICKER MINI */}
          <div className="mt-auto border-t border-emerald-900 pt-4">
            <h3 className="text-xs text-emerald-700 mb-2">NEURO-MARKET TICKER</h3>
            <div className="flex flex-col gap-2">
              {coreState.cryptoMarket.map(c => (
                <div key={c.symbol} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-600">{c.symbol}</span>
                  <span className="text-emerald-400">{c.price.toFixed(2)}</span>
                  <span className={c.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                    {c.change24h >= 0 ? '+' : ''}{c.change24h.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-emerald-900 scrollbar-track-transparent">
          <AnimatePresence mode="wait">
            
            {/* DASHBOARD TAB */}
            {activeTab === 'DASHBOARD' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* LIVE MATCHES */}
                <div className="bg-black/60 border border-emerald-800/50 rounded-xl p-6 backdrop-blur-md">
                  <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                    <Satellite className="animate-spin-slow" /> LIVE SATELLITE FEED
                  </h2>
                  <div className="space-y-4">
                    {coreState.liveMatches.map(match => (
                      <div key={match.id} className="border border-emerald-900/50 bg-emerald-950/20 p-4 rounded-lg relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                        <div className="absolute top-0 right-0 bg-red-900/80 text-red-100 text-[10px] px-2 py-1 rounded-bl-lg animate-pulse font-bold">
                          {match.minute}'
                        </div>
                        <div className="text-xs text-emerald-700 mb-2">{match.league}</div>
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span className="w-2/5 text-right text-emerald-300">{match.homeTeam}</span>
                          <span className="w-1/5 text-center text-2xl text-fuchsia-400">{match.homeScore} - {match.awayScore}</span>
                          <span className="w-2/5 text-left text-emerald-300">{match.awayTeam}</span>
                        </div>
                        {match.events.length > 0 && (
                          <div className="mt-3 text-xs text-emerald-500/70 border-t border-emerald-900/50 pt-2">
                            &gt; {match.events[0]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* CRYPTO MARKET CHART */}
                <div className="bg-black/60 border border-emerald-800/50 rounded-xl p-6 backdrop-blur-md flex flex-col">
                  <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                    <Activity /> NEURO-MARKET ANALYSIS
                  </h2>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={coreState.cryptoMarket[0]?.history || []}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" vertical={false} />
                        <XAxis dataKey="time" stroke="#047857" fontSize={10} />
                        <YAxis stroke="#047857" fontSize={10} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#10b981', color: '#10b981' }} />
                        <Area type="monotone" dataKey="price" stroke="#10b981" fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {coreState.cryptoMarket.map(c => (
                      <div key={c.symbol} className="bg-emerald-950/30 border border-emerald-900 p-2 rounded text-center">
                        <div className="text-xs font-bold text-emerald-600">{c.symbol}</div>
                        <div className="text-sm text-emerald-300">{c.price.toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3D VISUALIZER */}
                <div className="col-span-1 xl:col-span-2 h-[400px]">
                  <ThreeVisualizer />
                </div>

              </motion.div>
            )}

            {/* SYNDICATE MARKET TAB */}
            {activeTab === 'SYNDICATE' && (
              <motion.div key="syndicate" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                
                <div className="flex justify-between items-center bg-black/60 border border-emerald-800/50 p-4 rounded-xl backdrop-blur-md">
                  <h2 className="text-2xl font-bold text-emerald-400"><GlitchText text="GLOBAL ODDS NETWORK" /></h2>
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-700 text-sm">BET AMOUNT:</span>
                    <input 
                      type="number" 
                      value={betAmount} 
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      className="bg-black border border-emerald-500 text-emerald-400 px-3 py-1 rounded w-24 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <span className="text-emerald-500 font-bold">NRO</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {coreState.realOdds.map(odd => (
                    <div key={odd.id} className="bg-black/80 border border-emerald-900 hover:border-emerald-500/50 transition-all p-5 rounded-xl group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-900 group-hover:bg-emerald-500 transition-colors" />
                      
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-[10px] text-emerald-600 tracking-widest uppercase">{odd.sport}</div>
                          <div className="text-sm text-emerald-300 font-bold mt-1">{odd.homeTeam} vs {odd.awayTeam}</div>
                        </div>
                        <div className="text-xs font-mono text-emerald-700 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                          {odd.commenceTime}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => placeBet(odd.id, 'HOME', odd.odds.home)} className="bg-emerald-950/20 border border-emerald-900 hover:bg-emerald-900/40 hover:border-emerald-500 rounded p-2 flex flex-col items-center transition-all">
                          <span className="text-[10px] text-emerald-600 mb-1">1 (HOME)</span>
                          <span className="text-lg font-bold text-emerald-400">{odd.odds.home.toFixed(2)}</span>
                        </button>
                        <button onClick={() => placeBet(odd.id, 'DRAW', odd.odds.draw)} className="bg-emerald-950/20 border border-emerald-900 hover:bg-emerald-900/40 hover:border-emerald-500 rounded p-2 flex flex-col items-center transition-all">
                          <span className="text-[10px] text-emerald-600 mb-1">X (DRAW)</span>
                          <span className="text-lg font-bold text-emerald-400">{odd.odds.draw.toFixed(2)}</span>
                        </button>
                        <button onClick={() => placeBet(odd.id, 'AWAY', odd.odds.away)} className="bg-emerald-950/20 border border-emerald-900 hover:bg-emerald-900/40 hover:border-emerald-500 rounded p-2 flex flex-col items-center transition-all">
                          <span className="text-[10px] text-emerald-600 mb-1">2 (AWAY)</span>
                          <span className="text-lg font-bold text-emerald-400">{odd.odds.away.toFixed(2)}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ORACLE TAB */}
            {activeTab === 'ORACLE' && (
              <motion.div key="oracle" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <div className="bg-black/60 border border-fuchsia-900/50 p-6 rounded-xl backdrop-blur-md">
                  <h2 className="text-2xl font-bold text-fuchsia-400 mb-2 flex items-center gap-3">
                    <BrainCircuit className="animate-pulse" /> GEMINI ORACLE CORE
                  </h2>
                  <p className="text-fuchsia-700 text-sm mb-6">Select a target for deep neural analysis. The Oracle will predict outcomes based on current data streams.</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {coreState.liveMatches.map(match => (
                      <div key={match.id} className="border border-fuchsia-900/30 bg-fuchsia-950/10 p-4 rounded-lg flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <div className="text-fuchsia-300 font-bold">{match.homeTeam} vs {match.awayTeam} <span className="text-xs text-fuchsia-700 ml-2">[{match.minute}']</span></div>
                          <button onClick={() => consultOracle(match.id)} className="bg-fuchsia-900/20 hover:bg-fuchsia-900/50 border border-fuchsia-700 text-fuchsia-300 px-4 py-1 rounded text-xs font-bold transition-all flex items-center gap-2">
                            <Crosshair className="w-4 h-4" /> ANALYZE
                          </button>
                        </div>
                        
                        {oracleResponses[match.id] && (
                          <div className="bg-black/80 border-l-2 border-fuchsia-500 p-3 text-sm text-fuchsia-400 font-mono">
                            <span className="text-fuchsia-600 mr-2">&gt;</span>
                            {oracleResponses[match.id]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TERMINAL TAB */}
            {activeTab === 'TERMINAL' && (
              <motion.div key="terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col bg-black/80 border border-emerald-900 rounded-xl backdrop-blur-md overflow-hidden">
                <div className="bg-emerald-950/50 border-b border-emerald-900 p-2 flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-emerald-500 font-bold">root@neural-syndicate:~</span>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-1 flex flex-col justify-end">
                  {terminalHistory.map((line, i) => (
                    <div key={i} className={`${line.startsWith('[ERROR]') ? 'text-red-500' : line.startsWith('[SYS]') ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      {line}
                    </div>
                  ))}
                </div>

                <form id="terminal-form" onSubmit={handleTerminalSubmit} className="border-t border-emerald-900 p-2 flex items-center bg-black">
                  <span className="text-emerald-500 mr-2">$</span>
                  <input 
                    type="text" 
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    className="flex-1 bg-transparent text-emerald-400 focus:outline-none font-mono"
                    autoFocus
                    spellCheck="false"
                    autoComplete="off"
                  />
                  <button 
                    type="button"
                    onClick={() => setIsListening(!isListening)}
                    className={`ml-2 p-1 rounded-full transition-colors ${isListening ? 'bg-red-900/50 text-red-500 animate-pulse' : 'text-emerald-700 hover:text-emerald-500 hover:bg-emerald-900/30'}`}
                    title="Voice Command"
                  >
                    {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                </form>
              </motion.div>
            )}

            {/* CYBER WARFARE TAB */}
            {activeTab === 'CYBER_WARFARE' && (
              <motion.div key="cyber_warfare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <CyberWarfare />
              </motion.div>
            )}

            {/* MARKET MAKER TAB */}
            {activeTab === 'MARKET_MAKER' && (
              <motion.div key="market_maker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <MarketMaker />
              </motion.div>
            )}

            {/* NEURO CHAT TAB */}
            {activeTab === 'NEURO_CHAT' && (
              <motion.div key="neuro_chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="bg-black/60 border border-emerald-900/50 p-6 rounded-xl backdrop-blur-md">
                  <h2 className="text-2xl font-bold text-emerald-400 mb-2 flex items-center gap-3">
                    <MessageSquare className="animate-pulse" /> NEURO-CHAT INTERFACE
                  </h2>
                  <p className="text-emerald-700 text-sm mb-6">Direct neural link to Gemini AI. Select your processing mode.</p>
                  <NeuroChat />
                </div>
              </motion.div>
            )}

            {/* MEDIA LAB TAB */}
            {activeTab === 'MEDIA_LAB' && (
              <motion.div key="media_lab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="bg-black/60 border border-emerald-900/50 p-6 rounded-xl backdrop-blur-md">
                  <h2 className="text-2xl font-bold text-emerald-400 mb-2 flex items-center gap-3">
                    <ImageIcon className="animate-pulse" /> MEDIA SYNTHESIS LAB
                  </h2>
                  <p className="text-emerald-700 text-sm mb-6">Generate and analyze visual and auditory data streams.</p>
                  <MediaLab />
                </div>
              </motion.div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'PROFILE' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="bg-black/60 border border-emerald-900/50 p-6 rounded-xl backdrop-blur-md">
                  <h2 className="text-2xl font-bold text-emerald-400 mb-2 flex items-center gap-3">
                    <User className="animate-pulse" /> USER PROFILE
                  </h2>
                  <p className="text-emerald-700 text-sm mb-6">Manage your neural identity and synchronization.</p>
                  <AuthProfile />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* RIGHT SIDEBAR - USER PORTFOLIO */}
        <aside className="w-80 border-l border-emerald-900 bg-black/60 backdrop-blur-sm p-4 flex flex-col gap-6 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-900">
          
          {/* USER PROFILE */}
          <div className="border border-emerald-800/50 rounded-xl p-4 bg-emerald-950/10">
            <div className="flex items-center gap-3 mb-4 border-b border-emerald-900/50 pb-3">
              <div className="w-10 h-10 rounded bg-emerald-900/50 border border-emerald-500 flex items-center justify-center">
                <User className="text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-300">OPERATIVE_01</div>
                <div className="text-xs text-fuchsia-500">{userProfile.rank}</div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-700">HACK LEVEL</span>
                <span className="text-emerald-400">v{userProfile.hackLevel}.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">ACTIVE BETS</span>
                <span className="text-emerald-400">{userProfile.bets.filter(b => b.status === 'PENDING').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">NET WORTH</span>
                <span className="text-emerald-400">{userProfile.balance.toFixed(0)} NRO</span>
              </div>
            </div>
          </div>

          {/* ACTIVE BETS LOG */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-emerald-600 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> TRANSACTION LOG
            </h3>
            <div className="flex-1 space-y-3">
              {userProfile.bets.length === 0 ? (
                <div className="text-xs text-emerald-800 text-center py-4 border border-dashed border-emerald-900/50 rounded">NO ACTIVE TRANSACTIONS</div>
              ) : (
                userProfile.bets.map(bet => (
                  <div key={bet.id} className={`p-3 rounded border text-xs ${
                    bet.status === 'PENDING' ? 'bg-yellow-950/20 border-yellow-900/50 text-yellow-500' :
                    bet.status === 'WON' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-500' :
                    'bg-red-950/20 border-red-900/50 text-red-500'
                  }`}>
                    <div className="flex justify-between font-bold mb-1">
                      <span>{bet.type}</span>
                      <span>{bet.amount} NRO</span>
                    </div>
                    <div className="flex justify-between opacity-70">
                      <span>{bet.status}</span>
                      <span>POTENTIAL: {bet.potentialPayout.toFixed(0)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}
