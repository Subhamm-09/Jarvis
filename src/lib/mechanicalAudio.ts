/**
 * Mechanical Audio Synthesizer for JARVIS
 * 
 * Generates tactile, physical, industrial sound effects natively via Web Audio API.
 * Zero external audio assets, zero network latency, 100% reliable.
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;

// Initialize mute state from localStorage
try {
  isMuted = localStorage.getItem('jarvis_audio_muted') === 'true';
} catch {
  // Ignore storage errors
}

function getAudioContext(): AudioContext | null {
  if (isMuted) return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function isAudioMuted(): boolean {
  return isMuted;
}

export function toggleAudioMute(): boolean {
  isMuted = !isMuted;
  try {
    localStorage.setItem('jarvis_audio_muted', String(isMuted));
  } catch {
    // Ignore storage errors
  }
  return isMuted;
}

/**
 * 1. Solenoid Relay Clack (Quest Complete stamp)
 * Simulates a heavy industrial relay solenoid snapping shut with damped resonance.
 */
export function playSolenoidClick() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    
    // Noise buffer for the mechanical impact click
    const bufferSize = ctx.sampleRate * 0.035; // 35ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2200, t);
    bandpass.Q.setValueAtTime(3.5, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);

    // Sub-harmonic mechanical body clunk
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.05);

    oscGain.gain.setValueAtTime(0.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.055);
  } catch {
    // Ignore audio error
  }
}

/**
 * 2. Odometer Ratchet Tick
 * High-speed mechanical micro-click for tumbling digits.
 */
export function playRatchetTick() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(3400, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.012);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.014);
  } catch {
    // Ignore audio error
  }
}

/**
 * 3. Hydraulic Piston Thud (Attribute Bump)
 * Deep mechanical impact when an attribute score increases.
 */
export function playPistonThud() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  } catch {
    // Ignore audio error
  }
}

/**
 * 4. Resonant Industrial Promotion Chime (Level Up)
 * Metallic, monumental dual harmonic brass chime when clearance level elevates.
 */
export function playLevelUpChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;

    // Harmonic 1: Fundamental
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(330, t); // E4
    osc1.frequency.exponentialRampToValueAtTime(659.25, t + 0.15); // E5

    gain1.gain.setValueAtTime(0.25, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.75);

    // Harmonic 2: Octave overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, t); // E5
    osc2.frequency.exponentialRampToValueAtTime(1318.5, t + 0.18); // E6

    gain2.gain.setValueAtTime(0.18, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(t);
    osc2.stop(t + 0.9);
  } catch {
    // Ignore audio error
  }
}
