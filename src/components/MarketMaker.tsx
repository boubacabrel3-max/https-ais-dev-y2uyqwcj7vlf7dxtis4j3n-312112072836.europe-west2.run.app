import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store';
import { audio } from '../utils/AudioEngine';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';

interface Order {
  price: number;
  amount: number;
  type: 'BUY' | 'SELL';
}

export const MarketMaker = () => {
  const { credits, addCredits, audioEnabled } = useAppStore();
  const [symbol, setSymbol] = useState('NEURO/USD');
  const [price, setPrice] = useState(1245.67);
  const [history, setHistory] = useState<{ time: string, price: number }[]>([]);
  const [orderBook, setOrderBook] = useState<{ buys: Order[], sells: Order[] }>({ buys: [], sells: [] });
  const [tradeAmount, setTradeAmount] = useState(1);
  const [portfolio, setPortfolio] = useState({ NEURO: 5.5, CREDITS: credits });

  // Sync portfolio credits with global store
  useEffect(() => {
    setPortfolio(prev => ({ ...prev, CREDITS: credits }));
  }, [credits]);

  // Simulate market data
  useEffect(() => {
    const generateData = () => {
      let currentPrice = 1245.67;
      const newHistory = [];
      for (let i = 0; i < 50; i++) {
        currentPrice += (Math.random() - 0.5) * 10;
        newHistory.push({ time: `T-${50 - i}`, price: currentPrice });
      }
      setHistory(newHistory);
      setPrice(currentPrice);
    };
    generateData();

    const interval = setInterval(() => {
      setPrice(prev => {
        const change = (Math.random() - 0.5) * 5;
        const newPrice = prev + change;
        
        setHistory(h => {
          const newH = [...h.slice(1), { time: new Date().toLocaleTimeString().split(' ')[0], price: newPrice }];
          return newH;
        });

        // Generate fake order book
        const buys = Array.from({ length: 10 }, (_, i) => ({
          price: newPrice - (Math.random() * 5 + i),
          amount: Math.random() * 10,
          type: 'BUY' as const
        })).sort((a, b) => b.price - a.price);

        const sells = Array.from({ length: 10 }, (_, i) => ({
          price: newPrice + (Math.random() * 5 + i),
          amount: Math.random() * 10,
          type: 'SELL' as const
        })).sort((a, b) => a.price - b.price);

        setOrderBook({ buys, sells });

        return newPrice;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleTrade = (type: 'BUY' | 'SELL') => {
    const cost = price * tradeAmount;
    
    if (type === 'BUY') {
      if (portfolio.CREDITS >= cost) {
        addCredits(-cost);
        setPortfolio(prev => ({ ...prev, NEURO: prev.NEURO + tradeAmount }));
        if (audioEnabled) audio.playSuccess();
      } else {
        if (audioEnabled) audio.playError();
      }
    } else {
      if (portfolio.NEURO >= tradeAmount) {
        addCredits(cost);
        setPortfolio(prev => ({ ...prev, NEURO: prev.NEURO - tradeAmount }));
        if (audioEnabled) audio.playSuccess();
      } else {
        if (audioEnabled) audio.playError();
      }
    }
  };

  return (
    <div className="flex h-full gap-4 font-mono">
      {/* LEFT: CHART & CONTROLS */}
      <div className="flex-1 flex flex-col gap-4">
        {/* HEADER */}
        <div className="bg-black/80 border border-emerald-900 rounded-xl p-4 flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Activity className="w-8 h-8 text-emerald-500" />
            <div>
              <h2 className="text-2xl font-bold text-emerald-400">{symbol}</h2>
              <div className="text-emerald-700 text-xs">MARKET MAKER PROTOCOL</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${history.length > 1 && price > history[history.length - 2].price ? 'text-emerald-400' : 'text-red-400'}`}>
              ${price.toFixed(2)}
            </div>
            <div className="text-xs text-emerald-600">LIVE FEED</div>
          </div>
        </div>

        {/* CHART */}
        <div className="flex-1 bg-black/80 border border-emerald-900 rounded-xl p-4 backdrop-blur-md">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" opacity={0.3} />
              <XAxis dataKey="time" stroke="#047857" fontSize={10} tickMargin={10} />
              <YAxis domain={['auto', 'auto']} stroke="#047857" fontSize={10} width={60} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#022c22', border: '1px solid #10b981', color: '#34d399' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#10b981" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* TRADING PANEL */}
        <div className="bg-black/80 border border-emerald-900 rounded-xl p-4 backdrop-blur-md grid grid-cols-2 gap-4">
          <div className="border-r border-emerald-900 pr-4">
            <div className="text-xs text-emerald-700 mb-2">PORTFOLIO</div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-emerald-500">CREDITS:</span>
              <span className="text-emerald-300 font-bold">{portfolio.CREDITS.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-500">NEURO:</span>
              <span className="text-emerald-300 font-bold">{portfolio.NEURO.toFixed(4)}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-emerald-700 mb-2">EXECUTE ORDER</div>
            <div className="flex gap-2 mb-2">
              <input 
                type="number" 
                value={tradeAmount} 
                onChange={(e) => setTradeAmount(Number(e.target.value))}
                className="w-full bg-emerald-950/30 border border-emerald-900 rounded px-2 py-1 text-emerald-400 text-sm focus:outline-none focus:border-emerald-500"
                min="0.1"
                step="0.1"
              />
              <span className="text-emerald-700 self-center text-sm">NEURO</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleTrade('BUY')}
                className="flex-1 bg-emerald-900/30 hover:bg-emerald-800/80 border border-emerald-500 text-emerald-300 py-1 rounded text-sm font-bold transition-all flex justify-center items-center gap-1"
              >
                <TrendingUp className="w-4 h-4" /> BUY
              </button>
              <button 
                onClick={() => handleTrade('SELL')}
                className="flex-1 bg-red-900/30 hover:bg-red-800/80 border border-red-500 text-red-300 py-1 rounded text-sm font-bold transition-all flex justify-center items-center gap-1"
              >
                <TrendingDown className="w-4 h-4" /> SELL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: ORDER BOOK */}
      <div className="w-64 flex flex-col gap-4">
        <div className="flex-1 bg-black/80 border border-emerald-900 rounded-xl p-4 backdrop-blur-md flex flex-col overflow-hidden">
          <h3 className="text-emerald-500 font-bold text-sm mb-4 border-b border-emerald-900 pb-2">ORDER BOOK</h3>
          
          <div className="flex justify-between text-xs text-emerald-700 mb-2 px-1">
            <span>PRICE</span>
            <span>AMOUNT</span>
          </div>
          
          {/* SELLS (Red) */}
          <div className="flex-1 overflow-hidden flex flex-col justify-end">
            {orderBook.sells.map((order, i) => (
              <div key={`sell-${i}`} className="flex justify-between text-xs py-1 px-1 hover:bg-red-950/30 cursor-pointer">
                <span className="text-red-400">{order.price.toFixed(2)}</span>
                <span className="text-emerald-600">{order.amount.toFixed(4)}</span>
              </div>
            ))}
          </div>
          
          {/* SPREAD */}
          <div className="py-2 my-2 border-y border-emerald-900/50 text-center text-emerald-400 font-bold text-sm">
            ${price.toFixed(2)}
          </div>
          
          {/* BUYS (Green) */}
          <div className="flex-1 overflow-hidden">
            {orderBook.buys.map((order, i) => (
              <div key={`buy-${i}`} className="flex justify-between text-xs py-1 px-1 hover:bg-emerald-950/30 cursor-pointer">
                <span className="text-emerald-400">{order.price.toFixed(2)}</span>
                <span className="text-emerald-600">{order.amount.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
