import { sfx, setMuted, isMuted, unlockAudio } from './audio.js';
import { saveMuted } from './storage.js';

export function createUI(handlers) {
  const els = {
    score: document.getElementById('score-value'),
    moves: document.getElementById('moves-value'),
    best: document.getElementById('best-value'),
    combo: document.getElementById('combo-value'),
    hammer: document.getElementById('btn-hammer'),
    scramble: document.getElementById('btn-scramble'),
    cycle: document.getElementById('btn-cycle'),
    hint: document.getElementById('btn-hint'),
    rotateL: document.getElementById('btn-rotate-l'),
    rotateR: document.getElementById('btn-rotate-r'),
    restart: document.getElementById('btn-restart'),
    mute: document.getElementById('btn-mute'),
    cancel: document.getElementById('btn-cancel'),
    startOverlay: document.getElementById('start-overlay'),
    overOverlay: document.getElementById('gameover-overlay'),
    playBtn: document.getElementById('btn-play'),
    againBtn: document.getElementById('btn-again'),
    overScore: document.getElementById('over-score'),
    overBest: document.getElementById('over-best'),
    modeHint: document.getElementById('mode-hint'),
    hammerCount: document.getElementById('count-hammer'),
    scrambleCount: document.getElementById('count-scramble'),
    cycleCount: document.getElementById('count-cycle'),
  };

  function bind(el, fn) {
    if (!el) return;
    let lock = false;
    const go = (e) => {
      if (e) e.preventDefault();
      if (lock) return;
      lock = true;
      setTimeout(() => {
        lock = false;
      }, 280);
      unlockAudio();
      sfx.button();
      fn();
    };
    // pointerup covers mouse + touch without double-firing
    el.addEventListener('pointerup', go);
  }

  bind(els.playBtn, () => handlers.onPlay());
  bind(els.againBtn, () => handlers.onRestart());
  bind(els.restart, () => handlers.onRestart());
  bind(els.hint, () => handlers.onHint());
  bind(els.rotateL, () => handlers.onRotate(-1));
  bind(els.rotateR, () => handlers.onRotate(1));
  bind(els.hammer, () => handlers.onBooster('hammer'));
  bind(els.scramble, () => handlers.onBooster('scramble'));
  bind(els.cycle, () => handlers.onBooster('cycle'));
  bind(els.cancel, () => handlers.onCancelBooster());
  bind(els.mute, () => {
    const next = !isMuted();
    setMuted(next);
    saveMuted(next);
    updateMuteButton();
  });

  function updateMuteButton() {
    if (!els.mute) return;
    els.mute.textContent = isMuted() ? 'Sound Off' : 'Sound On';
    els.mute.setAttribute('aria-pressed', isMuted() ? 'true' : 'false');
  }

  function setPlaying(playing) {
    if (els.startOverlay) {
      els.startOverlay.classList.toggle('hidden', playing);
    }
  }

  function showGameOver(score, best) {
    if (els.overScore) els.overScore.textContent = String(score);
    if (els.overBest) els.overBest.textContent = String(best);
    if (els.overOverlay) els.overOverlay.classList.remove('hidden');
  }

  function hideGameOver() {
    if (els.overOverlay) els.overOverlay.classList.add('hidden');
  }

  function updateHud({ score, moves, best, combo, inventory, activeBooster, busy }) {
    if (els.score) els.score.textContent = String(score);
    if (els.moves) els.moves.textContent = String(moves);
    if (els.best) els.best.textContent = String(best);
    if (els.combo) {
      els.combo.textContent = combo > 1 ? `${combo}×` : '—';
      els.combo.parentElement?.classList.toggle('hot', combo > 1);
    }

    const lock = !!busy;
    if (els.hint) els.hint.disabled = lock;
    if (els.rotateL) els.rotateL.disabled = lock;
    if (els.rotateR) els.rotateR.disabled = lock;
    // Boosters: disabled when empty (unless active) or when board is busy
    setCount(els.hammerCount, els.hammer, inventory.hammer, activeBooster === 'hammer', lock);
    setCount(els.scrambleCount, els.scramble, inventory.scramble, activeBooster === 'scramble', lock);
    setCount(els.cycleCount, els.cycle, inventory.cycle, activeBooster === 'cycle', lock);

  function boosterHint(name) {
    if (name === 'hammer') return 'Tap a gem to smash it';
    if (name === 'scramble') return 'Tap a gem to scramble its row/col';
    if (name === 'cycle') return 'Tap a gem to cycle its row/col colors';
    return '';
  }

  let toastTimer = null;
  function showToast(message) {
    if (!els.modeHint) return;
    els.modeHint.textContent = message;
    els.modeHint.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (!document.getElementById('btn-cancel')?.classList.contains('visible')) {
        els.modeHint.classList.remove('visible');
      }
    }, 2200);
  }

  updateMuteButton();

  return {
    setPlaying,
    showGameOver,
    hideGameOver,
    updateHud,
    updateMuteButton,
    showToast,
  };
}
