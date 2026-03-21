import { create } from 'zustand';

interface NodeData {
  id: string;
  x: number;
  y: number;
  type: 'DATA' | 'CREDITS' | 'FIREWALL' | 'CORE';
  securityLevel: number;
  status: 'LOCKED' | 'HACKING' | 'BREACHED' | 'FAILED';
  reward: number;
}

interface AppState {
  credits: number;
  heat: number;
  maxHeat: number;
  nodes: NodeData[];
  audioEnabled: boolean;
  addCredits: (amount: number) => void;
  increaseHeat: (amount: number) => void;
  resetHeat: () => void;
  generateNodes: () => void;
  updateNodeStatus: (id: string, status: NodeData['status']) => void;
  toggleAudio: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  credits: 5000,
  heat: 0,
  maxHeat: 100,
  nodes: [],
  audioEnabled: false,
  
  addCredits: (amount) => set((state) => ({ credits: state.credits + amount })),
  
  increaseHeat: (amount) => set((state) => ({ 
    heat: Math.min(state.heat + amount, state.maxHeat) 
  })),
  
  resetHeat: () => set({ heat: 0 }),
  
  generateNodes: () => {
    const newNodes: NodeData[] = [];
    for (let i = 0; i < 15; i++) {
      newNodes.push({
        id: `node_${Math.random().toString(36).substr(2, 9)}`,
        x: Math.random() * 80 + 10, // 10% to 90%
        y: Math.random() * 80 + 10,
        type: ['DATA', 'CREDITS', 'FIREWALL', 'CORE'][Math.floor(Math.random() * 4)] as any,
        securityLevel: Math.floor(Math.random() * 5) + 1,
        status: 'LOCKED',
        reward: Math.floor(Math.random() * 1000) + 100,
      });
    }
    set({ nodes: newNodes, heat: 0 });
  },
  
  updateNodeStatus: (id, status) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, status } : n)
  })),

  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
}));
