import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// --- ENVIRONMENT VARIABLES ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const COLLECT_API_KEY = process.env.COLLECT_API_KEY || '';
const SPORTMONKS_API_TOKEN = process.env.SPORTMONKS_API_TOKEN || '';
const ODDS_API_KEY = process.env.ODDS_API_KEY || '';

// --- MASSIVE TYPE DEFINITIONS ---
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

// --- GLOBAL STATE (THE NEURAL CORE) ---
const CORE_STATE = {
  liveMatches: [] as LiveMatch[],
  realOdds: [] as RealOdds[],
  superLigGoalKings: [] as GoalKing[],
  premierLigGoalKings: [] as GoalKing[],
  cryptoMarket: [] as CryptoAsset[],
  users: {} as Record<string, UserProfile>,
  systemLogs: [] as string[],
  apiStatus: {
    sportmonks: 'SIMULATION',
    odds: 'SIMULATION',
    collect: 'SIMULATION'
  },
  lastUpdate: new Date().toISOString()
};

// --- INITIALIZATION ---
function initCryptoMarket() {
  const assets = [
    { symbol: 'NRO', name: 'NeuroCreds' },
    { symbol: 'SYN', name: 'SyndicateCoin' },
    { symbol: 'VRT', name: 'VirtuaToken' },
    { symbol: 'GLC', name: 'GlitchBit' }
  ];
  
  CORE_STATE.cryptoMarket = assets.map(a => ({
    ...a,
    price: Math.random() * 1000 + 50,
    history: Array.from({ length: 20 }, (_, i) => ({
      time: new Date(Date.now() - (20 - i) * 60000).toLocaleTimeString(),
      price: Math.random() * 1000 + 50
    })),
    change24h: (Math.random() * 20) - 10
  }));
}

function logSystem(msg: string) {
  const log = `[${new Date().toLocaleTimeString()}] ${msg}`;
  CORE_STATE.systemLogs.unshift(log);
  if (CORE_STATE.systemLogs.length > 50) CORE_STATE.systemLogs.pop();
  io.emit('system_log', log);
  console.log(log);
}

// --- SIMULATION ENGINES ---
function simulateMatches() {
  if (CORE_STATE.apiStatus.sportmonks === 'LIVE_API') return; // Don't simulate if real API is active

  if (CORE_STATE.liveMatches.length === 0) {
    CORE_STATE.liveMatches = [
      { id: 'sim1', league: 'Cyber League', homeTeam: 'Neon FC', awayTeam: 'Chrome United', homeScore: 0, awayScore: 0, minute: 1, status: 'LIVE', events: [] },
      { id: 'sim2', league: 'Underground Cup', homeTeam: 'Hackers SC', awayTeam: 'Glitch City', homeScore: 1, awayScore: 0, minute: 45, status: 'LIVE', events: [] },
      { id: 'sim3', league: 'Syndicate Pro', homeTeam: 'Void Runners', awayTeam: 'Data Miners', homeScore: 2, awayScore: 2, minute: 80, status: 'LIVE', events: [] }
    ];
  }

  CORE_STATE.liveMatches.forEach(match => {
    if (typeof match.minute === 'number') {
      match.minute += 1;
      if (match.minute > 90) {
        match.status = 'FINISHED';
        match.minute = 'FT';
        resolveBets(match.id, match.homeScore, match.awayScore);
      } else {
        // Random goal chance
        if (Math.random() < 0.05) {
          if (Math.random() > 0.5) {
            match.homeScore++;
            match.events.unshift(`[${match.minute}'] GOAL! ${match.homeTeam}`);
          } else {
            match.awayScore++;
            match.events.unshift(`[${match.minute}'] GOAL! ${match.awayTeam}`);
          }
        }
      }
    }
  });
}

function simulateCrypto() {
  CORE_STATE.cryptoMarket.forEach(asset => {
    const volatility = asset.price * 0.02;
    const change = (Math.random() * volatility * 2) - volatility;
    asset.price = Math.max(1, asset.price + change);
    asset.change24h = ((asset.price - asset.history[0].price) / asset.history[0].price) * 100;
    
    asset.history.push({
      time: new Date().toLocaleTimeString(),
      price: asset.price
    });
    if (asset.history.length > 20) asset.history.shift();
  });
}

function simulateOdds() {
  if (CORE_STATE.apiStatus.odds === 'LIVE_API') return;

  CORE_STATE.realOdds = CORE_STATE.liveMatches.map(m => ({
    id: `odds_${m.id}`,
    sport: m.league,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    odds: {
      home: parseFloat((Math.random() * 2 + 1.1).toFixed(2)),
      draw: parseFloat((Math.random() * 2 + 2.0).toFixed(2)),
      away: parseFloat((Math.random() * 3 + 1.5).toFixed(2))
    },
    commenceTime: 'LIVE'
  }));
}

// --- BET RESOLUTION ENGINE ---
function resolveBets(matchId: string, homeScore: number, awayScore: number) {
  let result: 'HOME' | 'DRAW' | 'AWAY';
  if (homeScore > awayScore) result = 'HOME';
  else if (awayScore > homeScore) result = 'AWAY';
  else result = 'DRAW';

  Object.values(CORE_STATE.users).forEach(user => {
    user.bets.forEach(bet => {
      if (bet.matchId === matchId && bet.status === 'PENDING') {
        if (bet.type === result) {
          bet.status = 'WON';
          user.balance += bet.potentialPayout;
          logSystem(`User won ${bet.potentialPayout.toFixed(2)} NRO on match ${matchId}`);
        } else {
          bet.status = 'LOST';
        }
      }
    });
  });
  io.emit('core_state_update', CORE_STATE);
}

// --- REAL API FETCHERS ---
async function fetchCollectApiData() {
  try {
    if (!COLLECT_API_KEY) throw new Error("No CollectAPI Key");
    const res = await fetch('https://api.collectapi.com/football/goalKings?league=1', {
      headers: { 'authorization': `apikey ${COLLECT_API_KEY}`, 'content-type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      CORE_STATE.superLigGoalKings = data.result.map((p: any) => ({ name: p.name, team: p.team, goals: parseInt(p.goals) }));
      CORE_STATE.apiStatus.collect = 'LIVE_API';
    }
  } catch (e) {
    CORE_STATE.apiStatus.collect = 'SIMULATION';
    CORE_STATE.superLigGoalKings = [
      { name: 'M. Icardi (SIM)', team: 'Galatasaray', goals: 21 },
      { name: 'E. Dzeko (SIM)', team: 'Fenerbahçe', goals: 19 }
    ];
  }
}

async function fetchSportmonksData() {
  try {
    if (!SPORTMONKS_API_TOKEN) throw new Error("No Sportmonks Token");
    const res = await fetch(`https://api.sportmonks.com/v3/football/livescores/inplay?api_token=${SPORTMONKS_API_TOKEN}&include=participants;scores`);
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      CORE_STATE.liveMatches = data.data.slice(0, 10).map((m: any) => {
        const home = m.participants?.find((p: any) => p.meta?.location === 'home')?.name || 'Home';
        const away = m.participants?.find((p: any) => p.meta?.location === 'away')?.name || 'Away';
        const homeScore = m.scores?.find((s: any) => s.description === 'CURRENT' && s.score?.participant === 'home')?.score?.goals || 0;
        const awayScore = m.scores?.find((s: any) => s.description === 'CURRENT' && s.score?.participant === 'away')?.score?.goals || 0;
        return {
          id: m.id.toString(),
          league: 'Global League',
          homeTeam: home,
          awayTeam: away,
          homeScore,
          awayScore,
          minute: m.minute || 'LIVE',
          status: 'LIVE',
          events: []
        };
      });
      CORE_STATE.apiStatus.sportmonks = 'LIVE_API';
    }
  } catch (e) {
    CORE_STATE.apiStatus.sportmonks = 'SIMULATION';
  }
}

async function fetchOddsApiData() {
  try {
    if (!ODDS_API_KEY) throw new Error("No Odds API Key");
    const res = await fetch(`https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      CORE_STATE.realOdds = data.slice(0, 10).map((m: any) => {
        const h2h = m.bookmakers?.[0]?.markets?.find((mk: any) => mk.key === 'h2h');
        return {
          id: m.id,
          sport: m.sport_title,
          homeTeam: m.home_team,
          awayTeam: m.away_team,
          odds: {
            home: h2h?.outcomes?.find((o: any) => o.name === m.home_team)?.price || 2.0,
            draw: h2h?.outcomes?.find((o: any) => o.name === 'Draw')?.price || 3.0,
            away: h2h?.outcomes?.find((o: any) => o.name === m.away_team)?.price || 2.0
          },
          commenceTime: new Date(m.commence_time).toLocaleTimeString()
        };
      });
      CORE_STATE.apiStatus.odds = 'LIVE_API';
    }
  } catch (e) {
    CORE_STATE.apiStatus.odds = 'SIMULATION';
  }
}

// --- GEMINI AI ORACLE ---
async function generateOraclePrediction(matchData: any) {
  try {
    if (!process.env.GEMINI_API_KEY) return "ORACLE OFFLINE: Gemini API Key missing.";
    const prompt = `Sen bir siberpunk yeraltı bahis kahini olan 'ORACLE'sın. Şu anki maç verisi: ${JSON.stringify(matchData)}. 
    Bana bu maç için siberpunk jargonuyla (neon, matrix, veri akışı, sendika vb. kelimeler kullanarak) kısa, havalı ve risk analizi içeren bir tahmin yap. Maksimum 3 cümle.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-preview',
      contents: prompt
    });
    return response.text || "Veri akışı bozuk. Tahmin yapılamıyor.";
  } catch (e) {
    console.error("Gemini Error:", e);
    return "ORACLE ERROR: Neural link severed.";
  }
}

// --- SOCKET.IO HANDLERS ---
io.on('connection', (socket) => {
  logSystem(`New neural connection established: ${socket.id}`);
  
  // Initialize user
  if (!CORE_STATE.users[socket.id]) {
    CORE_STATE.users[socket.id] = {
      balance: 10000,
      rank: 'ROOKIE RUNNER',
      bets: [],
      hackLevel: 1
    };
  }

  socket.emit('core_state_update', CORE_STATE);
  socket.emit('user_data', CORE_STATE.users[socket.id]);

  socket.on('place_bet', (data: { matchId: string, type: 'HOME'|'DRAW'|'AWAY', amount: number, odds: number }) => {
    const user = CORE_STATE.users[socket.id];
    if (user.balance >= data.amount) {
      user.balance -= data.amount;
      const bet: Bet = {
        id: Math.random().toString(36).substring(7),
        matchId: data.matchId,
        type: data.type,
        amount: data.amount,
        potentialPayout: data.amount * data.odds,
        status: 'PENDING',
        timestamp: Date.now()
      };
      user.bets.unshift(bet);
      logSystem(`Bet placed: ${data.amount} NRO on ${data.matchId} [${data.type}]`);
      socket.emit('user_data', user);
      socket.emit('bet_success', bet);
    } else {
      socket.emit('bet_error', 'INSUFFICIENT FUNDS');
    }
  });

  socket.on('request_oracle', async (matchId: string) => {
    const match = CORE_STATE.liveMatches.find(m => m.id === matchId) || CORE_STATE.realOdds.find(o => o.id === matchId);
    if (match) {
      socket.emit('oracle_thinking', matchId);
      const prediction = await generateOraclePrediction(match);
      socket.emit('oracle_response', { matchId, prediction });
      logSystem(`Oracle consulted for match ${matchId}`);
    }
  });

  socket.on('terminal_command', (cmd: string) => {
    const user = CORE_STATE.users[socket.id];
    let response = '';
    const args = cmd.split(' ');
    const command = args[0].toLowerCase();
    
    switch(command) {
      case '/help':
        response = 'AVAILABLE COMMANDS: /help, /balance, /hack, /clear, /status, /market, /execute';
        break;
      case '/balance':
        response = `CURRENT BALANCE: ${user.balance.toFixed(2)} NRO`;
        break;
      case '/hack':
        if (Math.random() > 0.7) {
          const loot = Math.floor(Math.random() * 500);
          user.balance += loot;
          response = `HACK SUCCESSFUL. Extracted ${loot} NRO from megacorp accounts.`;
        } else {
          response = `HACK FAILED. ICE detected. Connection traced.`;
        }
        break;
      case '/status':
        response = `SYSTEM STATUS: ${CORE_STATE.apiStatus.sportmonks} | ACTIVE USERS: ${Object.keys(CORE_STATE.users).length}`;
        break;
      case '/market':
        const btc = CORE_STATE.cryptoMarket.find(c => c.symbol === 'NRO');
        response = `NRO PRICE: $${btc?.price.toFixed(2)} (${btc?.change24h > 0 ? '+' : ''}${btc?.change24h.toFixed(2)}%)`;
        break;
      case '/execute':
      case 'execute':
      case 'run':
        response = `EXECUTING NEURAL OVERRIDE... BYPASSING SECURITY PROTOCOLS.`;
        break;
      default:
        response = `COMMAND NOT RECOGNIZED: ${command}`;
    }
    socket.emit('terminal_response', response);
    socket.emit('user_data', user);
  });

  socket.on('disconnect', () => {
    logSystem(`Connection lost: ${socket.id}`);
    delete CORE_STATE.users[socket.id];
  });
});

// --- MAIN LOOPS ---
initCryptoMarket();

setInterval(() => {
  simulateMatches();
  simulateCrypto();
  simulateOdds();
  CORE_STATE.lastUpdate = new Date().toISOString();
  io.emit('core_state_update', CORE_STATE);
}, 2000); // Fast 2-second tick for intense UI updates

// Slower loop for real APIs to avoid rate limits
setInterval(async () => {
  await fetchCollectApiData();
  await fetchSportmonksData();
  await fetchOddsApiData();
}, 60000);

// Initial fetch
fetchCollectApiData();
fetchSportmonksData();
fetchOddsApiData();

// --- EXPRESS SETUP ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', state: CORE_STATE.apiStatus }));

if (process.env.NODE_ENV !== 'production') {
  import('vite').then(async (vite) => {
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[NEURAL CORE] Online on port ${PORT}`);
  logSystem('SYSTEM BOOT SEQUENCE COMPLETE.');
});
