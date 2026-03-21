// Procedural Audio Synthesizer for Cyberpunk UI
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Global volume
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext not supported or blocked');
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 1) {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playHover() {
    this.playTone(800, 'sine', 0.05, 0.1);
  }

  playClick() {
    this.playTone(1200, 'square', 0.1, 0.2);
    setTimeout(() => this.playTone(1800, 'sine', 0.1, 0.1), 20);
  }

  playType() {
    this.playTone(Math.random() * 200 + 2000, 'square', 0.02, 0.05);
  }

  playError() {
    this.playTone(150, 'sawtooth', 0.3, 0.4);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.4, 0.4), 100);
  }

  playSuccess() {
    this.playTone(400, 'sine', 0.1, 0.2);
    setTimeout(() => this.playTone(600, 'sine', 0.1, 0.2), 100);
    setTimeout(() => this.playTone(800, 'sine', 0.3, 0.2), 200);
  }

  playAlarm() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }
}

export const audio = new AudioEngine();
