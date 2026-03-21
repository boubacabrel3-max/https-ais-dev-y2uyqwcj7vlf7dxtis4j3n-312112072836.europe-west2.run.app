import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import { audio } from '../utils/AudioEngine';
import { ShieldAlert, Cpu, Database, DollarSign, Zap, Lock, Unlock, AlertTriangle } from 'lucide-react';

export const CyberWarfare = () => {
  const { nodes, heat, maxHeat, generateNodes, updateNodeStatus, addCredits, increaseHeat, audioEnabled } = useAppStore();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hackProgress, setHackProgress] = useState(0);
  const [isHacking, setIsHacking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (nodes.length === 0) {
      generateNodes();
    }
  }, []);

  // Draw connections between nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.lineWidth = 1;

    // Draw lines between close nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 30) { // Connect if close
          ctx.beginPath();
          ctx.moveTo(nodes[i].x * canvas.width / 100, nodes[i].y * canvas.height / 100);
          ctx.lineTo(nodes[j].x * canvas.width / 100, nodes[j].y * canvas.height / 100);
          ctx.stroke();
        }
      }
    }
  }, [nodes]);

  const handleNodeClick = (id: string) => {
    if (isHacking) return;
    const node = nodes.find(n => n.id === id);
    if (!node || node.status === 'BREACHED' || node.status === 'FAILED') return;
    
    if (audioEnabled) audio.playClick();
    setActiveNode(id);
  };

  const startHack = () => {
    if (!activeNode || isHacking) return;
    const node = nodes.find(n => n.id === activeNode);
    if (!node) return;

    setIsHacking(true);
    setHackProgress(0);
    updateNodeStatus(activeNode, 'HACKING');
    
    if (audioEnabled) audio.playHover();

    const hackSpeed = 50 / node.securityLevel; // Higher security = slower
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 10;
      setHackProgress(Math.min(progress, 100));
      
      if (audioEnabled && Math.random() > 0.5) audio.playType();

      // Random chance to increase heat during hack
      if (Math.random() > 0.8) {
        increaseHeat(node.securityLevel * 2);
        if (audioEnabled) audio.playAlarm();
      }

      if (progress >= 100) {
        clearInterval(interval);
        completeHack(node);
      }
    }, hackSpeed);
  };

  const completeHack = (node: any) => {
    setIsHacking(false);
    
    // Success chance based on heat and security
    const successChance = 100 - (heat * 0.5) - (node.securityLevel * 10);
    const isSuccess = Math.random() * 100 < successChance;

    if (isSuccess) {
      updateNodeStatus(node.id, 'BREACHED');
      addCredits(node.reward);
      if (audioEnabled) audio.playSuccess();
    } else {
      updateNodeStatus(node.id, 'FAILED');
      increaseHeat(20); // Big heat penalty for failure
      if (audioEnabled) audio.playError();
    }
    
    setActiveNode(null);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'DATA': return <Database className="w-4 h-4" />;
      case 'CREDITS': return <DollarSign className="w-4 h-4" />;
      case 'FIREWALL': return <ShieldAlert className="w-4 h-4" />;
      case 'CORE': return <Cpu className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'LOCKED': return 'text-emerald-500 border-emerald-500 bg-emerald-950/20 hover:bg-emerald-900/50';
      case 'HACKING': return 'text-yellow-500 border-yellow-500 bg-yellow-950/50 animate-pulse';
      case 'BREACHED': return 'text-blue-500 border-blue-500 bg-blue-950/20 opacity-50';
      case 'FAILED': return 'text-red-500 border-red-500 bg-red-950/20 opacity-50';
      default: return 'text-gray-500 border-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/80 border border-emerald-900 rounded-xl backdrop-blur-md overflow-hidden relative">
      {/* HEADER */}
      <div className="bg-emerald-950/50 border-b border-emerald-900 p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-500" />
          <span className="text-emerald-500 font-bold tracking-widest">CYBER WARFARE PROTOCOL</span>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs text-emerald-700">SYSTEM HEAT</span>
            <div className="w-32 h-2 bg-black border border-emerald-900 rounded overflow-hidden mt-1">
              <div 
                className={`h-full transition-all duration-300 ${heat > 80 ? 'bg-red-500 animate-pulse' : heat > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                style={{ width: `${(heat / maxHeat) * 100}%` }}
              />
            </div>
          </div>
          <button 
            onClick={generateNodes}
            className="bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-500 text-emerald-300 px-3 py-1 rounded text-xs transition-all"
          >
            SCAN NEW NETWORK
          </button>
        </div>
      </div>

      {/* NODE MAP */}
      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-950/20 via-black to-black">
        <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
        
        {nodes.map(node => (
          <button
            key={node.id}
            onClick={() => handleNodeClick(node.id)}
            className={`absolute z-10 w-10 h-10 -ml-5 -mt-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${getNodeColor(node.status)} ${activeNode === node.id ? 'ring-4 ring-emerald-500/30 scale-125' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            title={`Type: ${node.type} | Sec: ${node.securityLevel}`}
          >
            {getNodeIcon(node.type)}
          </button>
        ))}

        {/* ACTIVE NODE PANEL */}
        {activeNode && (
          <div className="absolute bottom-4 right-4 w-64 bg-black/90 border border-emerald-500 p-4 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.2)] z-20">
            {(() => {
              const node = nodes.find(n => n.id === activeNode);
              if (!node) return null;
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-emerald-900/50 pb-2">
                    <span className="font-bold text-emerald-400 flex items-center gap-2">
                      {getNodeIcon(node.type)} {node.type} NODE
                    </span>
                    <span className="text-xs text-emerald-600 font-mono">{node.id}</span>
                  </div>
                  
                  <div className="text-sm space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">SECURITY:</span>
                      <span className="text-red-400">LVL {node.securityLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">REWARD:</span>
                      <span className="text-emerald-400">{node.reward} CR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">STATUS:</span>
                      <span className={node.status === 'LOCKED' ? 'text-emerald-500' : 'text-yellow-500'}>{node.status}</span>
                    </div>
                  </div>

                  {isHacking ? (
                    <div className="mt-2">
                      <div className="text-xs text-yellow-500 mb-1 animate-pulse">BREACHING FIREWALL...</div>
                      <div className="w-full h-2 bg-black border border-yellow-900 rounded overflow-hidden">
                        <div className="h-full bg-yellow-500 transition-all duration-100" style={{ width: `${hackProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={startHack}
                      disabled={node.status !== 'LOCKED' || heat >= maxHeat}
                      className="mt-2 w-full bg-emerald-900/30 hover:bg-emerald-800/80 border border-emerald-500 text-emerald-300 py-2 rounded font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                      {heat >= maxHeat ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4" />}
                      {heat >= maxHeat ? 'SYSTEM OVERHEATED' : 'INITIATE HACK'}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
