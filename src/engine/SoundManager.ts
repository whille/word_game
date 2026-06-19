// engine/SoundManager.ts — Web Audio API procedural sound engine.
// Zero audio files. All sounds synthesized from oscillators + noise.
// Controlled by store actions — never imports from ui/.

type StingerType = 'click' | 'violation' | 'death' | 'contradiction' | 'item_use' | 'true_ending';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientLFO: OscillatorNode | null = null;
  private _muted = true; // start muted — browser autoplay policy
  private _volume = 0.5;

  // ------- Lifecycle -------

  /** Create AudioContext. MUST be called from a user-gesture handler (click/touch). */
  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._muted ? 0 : this._volume;
    this.masterGain.connect(this.ctx.destination);
  }

  /** Clean up all audio resources. */
  destroy(): void {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }

  // ------- Master controls -------

  get muted(): boolean { return this._muted; }
  get volume(): number { return this._volume; }

  toggleMute(): boolean {
    this._muted = !this._muted;
    this.applyGain();
    return this._muted;
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    this.applyGain();
  }

  private applyGain(): void {
    if (!this.masterGain || !this.ctx) return;
    const target = this._muted ? 0 : this._volume;
    this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.05);
  }

  // ------- Ambient Layer -------

  /** Start low-frequency ambient drone with slow LFO. */
  startAmbient(): void {
    if (!this.ctx || !this.masterGain || this.ambientOsc) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Main oscillator: low rumble 30-60 Hz, sawtooth for harmonics
    this.ambientOsc = this.ctx.createOscillator();
    this.ambientOsc.type = 'sawtooth';
    this.ambientOsc.frequency.value = 35 + Math.random() * 20;

    // Low-pass filter to remove harsh edges
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 1;

    // Gain node for LFO modulation
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.06; // barely audible

    // LFO: slow sine modulation of gain for breathing effect
    this.ambientLFO = this.ctx.createOscillator();
    this.ambientLFO.type = 'sine';
    this.ambientLFO.frequency.value = 0.08 + Math.random() * 0.04; // ~5-12s cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.04;
    this.ambientLFO.connect(lfoGain);
    lfoGain.connect(this.ambientGain.gain);

    this.ambientOsc.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    this.ambientOsc.start();
    this.ambientLFO.start();
  }

  /** Stop ambient drone. */
  stopAmbient(): void {
    if (this.ambientOsc) {
      this.ambientOsc.stop();
      this.ambientOsc.disconnect();
      this.ambientOsc = null;
    }
    if (this.ambientLFO) {
      this.ambientLFO.stop();
      this.ambientLFO.disconnect();
      this.ambientLFO = null;
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }
  }

  // ------- Stingers -------

  playStinger(type: StingerType): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    switch (type) {
      case 'click': this.stingerClick(); break;
      case 'violation': this.stingerViolation(); break;
      case 'death': this.stingerDeath(); break;
      case 'contradiction': this.stingerContradiction(); break;
      case 'item_use': this.stingerItemUse(); break;
      case 'true_ending': this.stingerTrueEnding(); break;
    }
  }

  /** Short white-noise click (< 50ms). */
  private stingerClick(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const dur = 0.03 + Math.random() * 0.02;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(g);
    g.connect(this.masterGain!);
    src.start(now);
    src.stop(now + dur);
  }

  /** Low descending sweep — rule broken. */
  private stingerViolation(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const dur = 0.5;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.linearRampToValueAtTime(0, now + dur);
    osc.connect(g);
    g.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + dur);
  }

  /** Sharp dissonant chord then fade — death ending. */
  private stingerDeath(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const dur = 2.0;
    // Two dissonant frequencies — tritone interval
    for (const freq of [196, 277, 370]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, now);
      g.gain.linearRampToValueAtTime(0.08, now + 1.5);
      g.gain.linearRampToValueAtTime(0, now + dur);
      // Detune slightly each oscillator
      osc.detune.value = (Math.random() - 0.5) * 10;
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + dur);
    }
  }

  /** Dissonant dual tone + brief silence — contradiction discovered. */
  private stingerContradiction(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    // Dual tone: perfect fifth but with microtonal detune
    for (const freq of [330, 466]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 15;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, now);
      g.gain.linearRampToValueAtTime(0, now + 0.3);
      g.gain.linearRampToValueAtTime(0.06, now + 0.4);
      g.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  }

  /** Short bright ping — item used. */
  private stingerItemUse(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const dur = 0.25;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + dur);
  }

  /** Pure ascending tone that fades — true ending peace. */
  private stingerTrueEnding(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const dur = 3.0;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(261, now); // C4
    osc.frequency.linearRampToValueAtTime(523, now + dur); // C5
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1, now);
    g.gain.linearRampToValueAtTime(0.12, now + 1.5);
    g.gain.linearRampToValueAtTime(0, now + dur);
    osc.connect(g);
    g.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + dur);
  }
}
