// --- Programmatic Synth Audio System (Web Audio API) ---

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    
    // Load volume settings from localStorage (range: 0 to 1)
    const savedSfx = localStorage.getItem('neon_survivors_sfx_volume');
    this.sfxVolume = savedSfx !== null ? parseFloat(savedSfx) : 0.7;
    
    const savedBgm = localStorage.getItem('neon_survivors_bgm_volume');
    this.bgmVolume = savedBgm !== null ? parseFloat(savedBgm) : 0.5;
    
    this.sfxGainNode = null;
    this.bgmGainNode = null;
  }

  // Initialize Audio Context on user gesture to bypass browser security
  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Create master gain nodes
      this.sfxGainNode = this.ctx.createGain();
      this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGainNode.connect(this.ctx.destination);

      this.bgmGainNode = this.ctx.createGain();
      this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      this.bgmGainNode.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  // Check if audio context is active, resume if suspended
  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = val;
    localStorage.setItem('neon_survivors_sfx_volume', val);
    if (this.sfxGainNode && this.ctx) {
      this.sfxGainNode.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  setBgmVolume(val) {
    this.bgmVolume = val;
    localStorage.setItem('neon_survivors_bgm_volume', val);
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  // Laser Shoot Sound: Quick frequency sweep down
  playShoot() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.sfxGainNode || this.ctx.destination);

    // Synthwave-style square wave for a retro 8-bit chip feel
    osc.type = 'triangle';
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(880, now); // A5 note start
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.12); // Sweep down to A2

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Enemy Hit Sound: Short noise-like low sweep
  playHit() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.sfxGainNode || this.ctx.destination);

    osc.type = 'sawtooth';
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.08);

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Boss Spawn / Heavy Impact: Deeper rumble
  playHeavyImpact() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.sfxGainNode || this.ctx.destination);

    osc.type = 'sawtooth';
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.4);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Level Up Jingle: Elegant upward major chord arpeggio
  playLevelUp() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major scale arpeggio notes
    const noteDuration = 0.08;

    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(this.sfxGainNode || this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + index * noteDuration;
      
      gainNode.gain.setValueAtTime(0.0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  // Player Defeat: Falling pitch with drone
  playDefeat() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxGainNode || this.ctx.destination);

    osc.type = 'sawtooth';
    osc2.type = 'square';
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
    osc2.frequency.setValueAtTime(223, now); // Slightly detuned
    osc2.frequency.exponentialRampToValueAtTime(41, now + 0.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.8);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.8);
    osc2.stop(now + 0.8);
  }

  // Button Click: Short crisp sine transient
  playClick() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.sfxGainNode || this.ctx.destination);

    osc.type = 'sine';
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Speed Up/Upgrade choice: Bright sci-fi riser
  playUpgrade() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.sfxGainNode || this.ctx.destination);

    osc.type = 'sine';
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(330, now); // E4
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.25); // Sweep up 2 octaves

    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const Sound = new SoundManager();
