import { sfx, setMuted, isMuted, unlockAudio } from './audio.js';
import { saveMuted } from './storage.js';
import { DIFFICULTIES } from './rogue.js';
import { xpProgress } from './meta.js';

export function createUI(handlers) {
  const els = {
    score: document.getElementById('score-value'),
    moves: document.getElementById('moves-value'),
    movesLabel: document.getElementById('moves-label'),
    best: document.getElementById('best-value'),
    combo: document.getElementById('combo-value'),
    depthStat: document.getElementById('depth-stat'),
    depthValue: document.getElementById('depth-value'),
    goalStat: document.getElementById('goal-stat'),
    goalValue: document.getElementById('goal-value'),
    xpFill: document.getElementById('xp-fill'),
    xpLabel: document.getElementById('xp-label'),
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
    perkOverlay: document.getElementById('perk-overlay'),
    perkTitle: document.getElementById('perk-title'),
    perkSubtitle: document.getElementById('perk-subtitle'),
    perkChoices: document.getElementById('perk-choices'),
    playZen: document.getElementById('btn-play-zen'),
    diffNormal: document.getElementById('btn-diff-normal'),
    diffHard: document.getElementById('btn-diff-hard'),
    diffBrutal: document.getElementById('btn-diff-brutal'),
    againBtn: document.getElementById('btn-again'),
    overTitle: document.getElementById('over-title'),
    overReason: document.getElementById('over-reason'),
    overScore: document.getElementById('over-score'),
    overBest: document.getElementById('over-best'),
    overDepth: document.getElementById('over-depth'),
    overXp: document.getElementById('over-xp'),
    overDepthWrap: document.getElementById('over-depth-wrap'),
    overXpWrap: document.getElementById('over-xp-wrap'),
    overLevel: document.getElementById('over-level'),
    modeHint: document.getElementById('mode-hint'),
    hammerCount: document.getElementById('count-hammer'),
    scrambleCount: document.getElementById('count-scramble'),
    cycleCount: document.getElementById('count-cycle'),
    startLevel: document.getElementById('start-level'),
    startXp: document.getElementById('start-xp'),
    startMeta: document.getElementById('start-meta'),
    startBestDepth: document.getElementById('start-best-depth'),
  };

  let selectedDiff = 'normal';

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
    el.addEventListener('pointerup', go);
  }

  bind(els.playZen, () => handlers.onPlayZen());
  bind(els.diffNormal, () => {
    selectedDiff = 'normal';
    highlightDiff();
    handlers.onPlayRogue('normal');
  });
  bind(els.diffHard, () => {
    selectedDiff = 'hard';
    highlightDiff();
    handlers.onPlayRogue('hard');
  });
  bind(els.diffBrutal, () => {
    selectedDiff = 'brutal';
    highlightDiff();
    handlers.onPlayRogue('brutal');
  });
  bind(els.againBtn, () => handlers.onContinueAfterOver());
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

  function highlightDiff() {
    [els.diffNormal, els.diffHard, els.diffBrutal].forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle('selected', btn.dataset.diff === selectedDiff);
    });
  }

  function updateMuteButton() {
    if (!els.mute) return;
    els.mute.textContent = isMuted() ? 'Sound Off' : 'Sound On';
    els.mute.setAttribute('aria-pressed', isMuted() ? 'true' : 'false');
  }

  function setPlaying(playing) {
    document.getElementById('app')?.classList.toggle('playing', playing);
  }

  function showStart(profile, difficulty) {
    selectedDiff = difficulty || 'normal';
    highlightDiff();
    const prog = xpProgress(profile);
    if (els.startLevel) els.startLevel.textContent = String(prog.level);
    if (els.startXp) els.startXp.textContent = `${prog.xp} / ${prog.need} XP`;
    if (els.startBestDepth) els.startBestDepth.textContent = String(profile.bestDepth || 0);
    if (els.startMeta) {
      const n = (profile.metaPerks || []).length;
      els.startMeta.textContent = n ? `${n} permanent perk${n === 1 ? '' : 's'}` : 'No permanent perks yet';
    }
    if (els.startOverlay) els.startOverlay.classList.remove('hidden');
  }

  function hideAllOverlays() {
    els.startOverlay?.classList.add('hidden');
    els.overOverlay?.classList.add('hidden');
    els.perkOverlay?.classList.add('hidden');
  }

  function showGameOver(data) {
    if (els.overTitle) {
      els.overTitle.textContent = data.mode === 'rogue' ? 'Run over' : 'Game over';
    }
    if (els.overReason) els.overReason.textContent = data.reason || '';
    if (els.overScore) els.overScore.textContent = String(data.score);
    if (els.overBest) els.overBest.textContent = String(data.best);
    if (els.overDepthWrap) {
      els.overDepthWrap.classList.toggle('hidden', data.mode !== 'rogue');
    }
    if (els.overXpWrap) {
      els.overXpWrap.classList.toggle('hidden', data.mode !== 'rogue');
    }
    if (els.overDepth) {
      els.overDepth.textContent = String(data.floorsCleared || 0);
    }
    if (els.overXp) els.overXp.textContent = `+${data.xpGain || 0}`;
    if (els.overLevel && data.profile) {
      els.overLevel.textContent = `Lvl ${data.profile.level}`;
    }
    els.overOverlay?.classList.remove('hidden');
  }

  function hideGameOver() {
    els.overOverlay?.classList.add('hidden');
  }

  function showPerkPick({ title, subtitle, choices }) {
    if (els.perkTitle) els.perkTitle.textContent = title;
    if (els.perkSubtitle) els.perkSubtitle.textContent = subtitle;
    if (els.perkChoices) {
      els.perkChoices.innerHTML = '';
      choices.forEach((perk) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `perk-card rarity-${perk.rarity}`;
        btn.innerHTML = `<strong>${perk.name}</strong><span>${perk.desc}</span>`;
        btn.addEventListener('pointerup', (e) => {
          e.preventDefault();
          unlockAudio();
          sfx.special();
          handlers.onPickPerk(perk.id);
        });
        els.perkChoices.appendChild(btn);
      });
    }
    els.perkOverlay?.classList.remove('hidden');
  }

  function hidePerkPick() {
    els.perkOverlay?.classList.add('hidden');
  }

  function setCount(countEl, btn, n, active, busy) {
    if (countEl) countEl.textContent = String(n);
    if (btn) {
      btn.disabled = busy || (n <= 0 && !active);
      btn.classList.toggle('active', !!active);
    }
  }

  function updateHud(p) {
    if (els.score) els.score.textContent = String(p.score);
    if (els.moves) els.moves.textContent = String(p.moves);
    if (els.movesLabel) els.movesLabel.textContent = p.movesLabel || 'Moves';
    if (els.best) els.best.textContent = String(p.best);
    if (els.combo) {
      els.combo.textContent = p.combo > 1 ? `${p.combo}×` : '—';
      els.combo.parentElement?.classList.toggle('hot', p.combo > 1);
    }

    const rogue = p.mode === 'rogue';
    if (els.depthStat) els.depthStat.classList.toggle('hidden', !rogue);
    if (els.goalStat) els.goalStat.classList.toggle('hidden', !rogue);
    if (rogue) {
      if (els.depthValue) els.depthValue.textContent = String(p.depth);
      if (els.goalValue) {
        els.goalValue.textContent = `${p.floorScore}/${p.floorTarget}`;
        els.goalStat?.classList.toggle('hot', p.floorScore >= p.floorTarget * 0.75);
      }
    }

    if (els.xpFill && p.xp) {
      els.xpFill.style.width = `${Math.round(p.xp.ratio * 100)}%`;
    }
    if (els.xpLabel && p.xp) {
      els.xpLabel.textContent = `Lvl ${p.xp.level} · ${p.xp.xp}/${p.xp.need} XP`;
    }

    const lock = !!p.busy;
    if (els.hint) els.hint.disabled = lock;
    if (els.rotateL) els.rotateL.disabled = lock;
    if (els.rotateR) els.rotateR.disabled = lock;
    setCount(els.hammerCount, els.hammer, p.inventory.hammer, p.activeBooster === 'hammer', lock);
    setCount(els.scrambleCount, els.scramble, p.inventory.scramble, p.activeBooster === 'scramble', lock);
    setCount(els.cycleCount, els.cycle, p.inventory.cycle, p.activeBooster === 'cycle', lock);

    if (els.cancel) els.cancel.classList.toggle('visible', !!p.activeBooster);
    if (els.modeHint && p.activeBooster) {
      els.modeHint.textContent = boosterHint(p.activeBooster);
      els.modeHint.classList.add('visible');
    } else if (els.modeHint && !toastTimer) {
      els.modeHint.classList.remove('visible');
    }
  }

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
      toastTimer = null;
      if (!els.cancel?.classList.contains('visible')) {
        els.modeHint.classList.remove('visible');
      }
    }, 2400);
  }

  // Prefill difficulty button labels
  if (els.diffNormal) {
    els.diffNormal.dataset.diff = 'normal';
    els.diffNormal.querySelector('.diff-blurb')?.remove();
  }
  Object.values(DIFFICULTIES).forEach((d) => {
    const btn = document.getElementById(`btn-diff-${d.id}`);
    if (!btn) return;
    btn.dataset.diff = d.id;
  });

  updateMuteButton();
  highlightDiff();

  return {
    setPlaying,
    showStart,
    hideAllOverlays,
    showGameOver,
    hideGameOver,
    showPerkPick,
    hidePerkPick,
    updateHud,
    updateMuteButton,
    showToast,
  };
}
