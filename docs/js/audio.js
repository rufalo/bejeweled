/** Lightweight Web Audio SFX — no external audio files. */

let ctx = null;
let muted = false;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function setMuted(value) {
  muted = !!value;
}

export function isMuted() {
  return muted;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') {
    return c.resume().catch(() => {});
  }
  return Promise.resolve();
}

function tone(freq, duration, type = 'sine', gain = 0.08, slideTo = null) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), c.currentTime + duration);
  }
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration + 0.02);
}

export const sfx = {
  select() {
    tone(520, 0.06, 'triangle', 0.05);
  },
  swap() {
    tone(340, 0.08, 'sine', 0.06, 420);
  },
  match(combo = 1) {
    const base = 440 + Math.min(combo, 8) * 40;
    tone(base, 0.12, 'triangle', 0.07);
    setTimeout(() => tone(base * 1.25, 0.1, 'triangle', 0.05), 40);
  },
  special() {
    tone(220, 0.18, 'sawtooth', 0.05, 660);
  },
  drop() {
    tone(180, 0.05, 'sine', 0.03);
  },
  invalid() {
    tone(160, 0.12, 'square', 0.04, 90);
  },
  gameOver() {
    tone(300, 0.2, 'triangle', 0.06, 120);
    setTimeout(() => tone(200, 0.25, 'triangle', 0.05, 80), 120);
  },
  hint() {
    tone(660, 0.1, 'sine', 0.04);
  },
  button() {
    tone(480, 0.05, 'triangle', 0.04);
  },
};
