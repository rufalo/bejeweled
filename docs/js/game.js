import { GRID, TIMING, GEM_COLORS, SPECIAL } from './config.js';
import {
  createBoard,
  applyGravity,
  rotateGrid,
  anyDropping,
  anySliding,
  tickMotion,
  createTile,
} from './board.js';
import {
  areAdjacent,
  hasValidMoves,
  findHint,
  swapInPlace,
} from './match.js';
import { analyzeMatches, scoreForClear } from './specials.js';
import { createParticleSystem, spawnBurst, updateParticles, drawParticles } from './particles.js';
import {
  drawBoardBackground,
  drawGem,
  drawFloatingTexts,
  drawComboBanner,
} from './render.js';
import { createInputController } from './input.js';
import { createUI } from './ui.js';
import { sfx, setMuted, unlockAudio } from './audio.js';
import {
  loadHighScore,
  saveHighScore,
  loadBestCombo,
  saveBestCombo,
  loadMuted,
} from './storage.js';
import { loadProfile, saveProfile, grantXp, addMetaPerk, xpProgress } from './meta.js';
import { MODES, floorMoves, floorTarget, calcRunXp } from './rogue.js';
import {
  PERKS,
  RUN_PERK_IDS,
  META_PERK_IDS,
  createEmptyRunModifiers,
  applyMetaToRun,
  startingInventoryFromMeta,
  targetMultiplierFromMeta,
  rollPerkChoices,
} from './perks.js';

export function createGame() {
  const game = blankGame();
  game.highScore = loadHighScore();
  game.bestCombo = loadBestCombo();
  game.profile = loadProfile();
  game.difficulty = game.profile.preferredDifficulty || 'normal';
  setMuted(loadMuted());

  game.ui = createUI({
    onPlayZen: () => beginSession(game, MODES.ZEN),
    onPlayRogue: (diff) => beginSession(game, MODES.ROGUE, diff),
    onRestart: () => abortToMenu(game),
    onHint: () => showHint(game),
    onRotate: (dir) => requestRotate(game, dir),
    onBooster: (name) => activateBooster(game, name),
    onCancelBooster: () => cancelBooster(game),
    onPickPerk: (perkId) => resolvePerkPick(game, perkId),
    onContinueAfterOver: () => abortToMenu(game),
  });

  game.input = createInputController({
    onTap: (cell) => handleTap(game, cell),
    onSwipe: (a, b) => trySwap(game, a, b),
  });

  game.canInteract = () =>
    game.started &&
    game.phase === 'idle' &&
    !game.rotating &&
    !game.pendingPerkChoices;

  game.screenToCell = (sx, sy) => screenToCell(game, sx, sy);
  return game;
}

function blankGame() {
  return {
    cols: GRID.cols,
    rows: GRID.rows,
    grid: null,
    tileSize: 48,
    canvasW: 0,
    canvasH: 0,
    score: 0,
    moves: 0,
    movesLeft: 0,
    floorScore: 0,
    floorTarget: 0,
    highScore: 0,
    bestCombo: 1,
    combo: 1,
    selected: null,
    hover: null,
    hint: null,
    hintTimer: 0,
    floating: [],
    particles: createParticleSystem(),
    inventory: { hammer: 0, scramble: 0, cycle: 0 },
    activeBooster: null,
    phase: 'idle',
    destroyTimer: 0,
    pendingClear: null,
    lastSwapTarget: null,
    lastSwapPair: null,
    rotation: 0,
    targetRotation: 0,
    rotDir: 0,
    rotating: false,
    started: false,
    p5: null,
    ui: null,
    input: null,
    mode: MODES.ROGUE,
    difficulty: 'normal',
    depth: 1,
    floorsCleared: 0,
    runBestCombo: 1,
    runMods: createEmptyRunModifiers(),
    profile: null,
    pendingMetaLevels: 0,
    pendingPerkChoices: null,
    lastXpGain: 0,
    endReason: '',
  };
}

export function setupP5(game, p5) {
  game.p5 = p5;
  computeSize(game);
  const canvas = p5.createCanvas(game.canvasW, game.canvasH);
  canvas.parent('board-host');
  const el = canvas.elt;
  el.style.touchAction = 'none';
  el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  game.grid = createBoard(game.cols, game.rows);
  game.ui.updateHud(hudPayload(game));
  game.ui.showStart(game.profile, game.difficulty);

  requestAnimationFrame(() => {
    computeSize(game);
    p5.resizeCanvas(game.canvasW, game.canvasH);
  });
}

export function windowResized(game) {
  computeSize(game);
  game.p5.resizeCanvas(game.canvasW, game.canvasH);
}

function computeSize(game) {
  const host = document.getElementById('board-host');
  const maxW = host ? host.clientWidth : Math.min(window.innerWidth - 24, 480);
  const maxH = host ? host.clientHeight : Math.min(window.innerHeight * 0.55, 480);
  const side = Math.min(maxW, maxH);
  game.tileSize = Math.max(32, Math.min(Math.floor(side / game.cols), 72));
  game.canvasW = game.cols * game.tileSize;
  game.canvasH = game.rows * game.tileSize;
}

function beginSession(game, mode, difficulty) {
  unlockAudio();
  game.mode = mode;
  if (mode === MODES.ROGUE) {
    game.difficulty = difficulty || 'normal';
    game.profile.preferredDifficulty = game.difficulty;
    saveProfile(game.profile);
  }
  wipeBoard(game);
  if (mode === MODES.ROGUE) startRogueRun(game);
  else startZenRun(game);
  game.started = true;
  game.ui.hideAllOverlays();
  game.ui.setPlaying(true);
  game.ui.updateHud(hudPayload(game));
}

function startZenRun(game) {
  game.depth = 0;
  game.movesLeft = 0;
  game.floorScore = 0;
  game.floorTarget = 0;
  game.floorsCleared = 0;
  game.runMods = createEmptyRunModifiers();
  game.inventory = { hammer: 0, scramble: 0, cycle: 0 };
  game.score = 0;
  game.moves = 0;
}

function startRogueRun(game) {
  game.depth = 1;
  game.floorsCleared = 0;
  game.runBestCombo = 1;
  game.lastXpGain = 0;
  game.pendingMetaLevels = 0;
  game.score = 0;
  game.moves = 0;
  game.runMods = createEmptyRunModifiers();
  applyMetaToRun(game.runMods, game.profile.metaPerks || []);
  game.inventory = startingInventoryFromMeta(game.profile.metaPerks || []);
  game.profile.totalRuns = (game.profile.totalRuns || 0) + 1;
  saveProfile(game.profile);
  setupFloor(game, true);
}

function setupFloor(game, freshBoard) {
  const tMult = targetMultiplierFromMeta(game.profile.metaPerks || []);
  game.floorTarget = Math.floor(floorTarget(game.difficulty, game.depth) * tMult);
  game.floorScore = 0;
  game.movesLeft = floorMoves(game.difficulty, game.depth, game.runMods.bonusMoves);
  game.combo = game.runMods.comboStart || 1;
  game.runMods.secondWindUsed = false;
  if (freshBoard) {
    game.grid = createBoard(game.cols, game.rows);
  }
  game.ui.showToast(`Floor ${game.depth} — score ${game.floorTarget} · ${game.movesLeft} moves`);
}

function wipeBoard(game) {
  game.cols = GRID.cols;
  game.rows = GRID.rows;
  game.grid = createBoard(game.cols, game.rows);
  game.score = 0;
  game.moves = 0;
  game.combo = 1;
  game.selected = null;
  game.hover = null;
  game.hint = null;
  game.hintTimer = 0;
  game.floating = [];
  game.particles = createParticleSystem();
  game.activeBooster = null;
  game.phase = 'idle';
  game.destroyTimer = 0;
  game.pendingClear = null;
  game.lastSwapTarget = null;
  game.lastSwapPair = null;
  game.rotation = 0;
  game.targetRotation = 0;
  game.rotDir = 0;
  game.rotating = false;
  game.pendingPerkChoices = null;
  computeSize(game);
  if (game.p5) game.p5.resizeCanvas(game.canvasW, game.canvasH);
}

function abortToMenu(game) {
  game.started = false;
  game.phase = 'idle';
  game.pendingPerkChoices = null;
  game.ui.hideAllOverlays();
  game.ui.showStart(game.profile, game.difficulty);
  game.ui.setPlaying(false);
  game.ui.updateHud(hudPayload(game));
}

function hudPayload(game) {
  const progress = xpProgress(game.profile);
  return {
    mode: game.mode,
    score: game.score,
    moves: game.mode === MODES.ROGUE ? game.movesLeft : game.moves,
    movesLabel: game.mode === MODES.ROGUE ? 'Left' : 'Moves',
    best: game.highScore,
    combo: game.combo,
    inventory: game.inventory,
    activeBooster: game.activeBooster,
    busy: game.phase !== 'idle' || game.rotating || !!game.pendingPerkChoices,
    depth: game.mode === MODES.ROGUE ? game.depth : null,
    floorScore: game.mode === MODES.ROGUE ? game.floorScore : null,
    floorTarget: game.mode === MODES.ROGUE ? game.floorTarget : null,
    xp: progress,
    runPerks: (game.runMods.perkIds || []).map((id) => PERKS[id]?.name).filter(Boolean),
  };
}

function matchOpts(game) {
  return {
    easyRockets: !!game.runMods.easyRockets,
    bigBombs: !!game.runMods.bigBombs,
  };
}

function activateBooster(game, name) {
  if (!game.canInteract()) return;
  if (game.inventory[name] <= 0) return;
  if (game.activeBooster === name) {
    cancelBooster(game);
    return;
  }
  game.activeBooster = name;
  clearSelection(game);
  game.ui.updateHud(hudPayload(game));
}

function cancelBooster(game) {
  game.activeBooster = null;
  game.ui.updateHud(hudPayload(game));
}

function showHint(game) {
  if (!game.canInteract()) return;
  const hint = findHint(game.grid, game.cols, game.rows);
  if (!hint) {
    game.ui.showToast('No moves found');
    return;
  }
  game.hint = hint;
  game.hintTimer = 150;
  sfx.hint();
  game.ui.showToast('Swap the glowing gems');
}

function requestRotate(game, dir) {
  if (!game.canInteract()) return;
  game.rotating = true;
  game.rotDir = dir;
  game.targetRotation = dir * (Math.PI / 2);
  game.phase = 'rotating';
  clearSelection(game);
  game.ui.updateHud(hudPayload(game));
}

function handleTap(game, cell) {
  if (!cell) return;
  unlockAudio();
  if (game.activeBooster) {
    useBooster(game, cell);
    return;
  }
  if (!game.selected) {
    game.selected = { ...cell };
    game.grid[cell.y][cell.x].selected = true;
    sfx.select();
    return;
  }
  if (game.selected.x === cell.x && game.selected.y === cell.y) {
    clearSelection(game);
    return;
  }
  if (areAdjacent(game.selected, cell)) {
    const a = { ...game.selected };
    clearSelection(game);
    trySwap(game, a, cell);
  } else {
    clearSelection(game);
    game.selected = { ...cell };
    game.grid[cell.y][cell.x].selected = true;
    sfx.select();
  }
}

function clearSelection(game) {
  if (game.selected) {
    const t = game.grid[game.selected.y]?.[game.selected.x];
    if (t) t.selected = false;
  }
  game.selected = null;
}

function trySwap(game, a, b) {
  if (!game.canInteract()) return;
  if (!areAdjacent(a, b)) return;
  if (game.mode === MODES.ROGUE && game.movesLeft <= 0) return;

  clearSelection(game);
  game.hint = null;
  game.activeBooster = null;

  swapInPlace(game.grid, a.x, a.y, b.x, b.y);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  game.grid[a.y][a.x].slideX = dx;
  game.grid[a.y][a.x].slideY = dy;
  game.grid[b.y][b.x].slideX = -dx;
  game.grid[b.y][b.x].slideY = -dy;

  game.lastSwapPair = { a, b };
  game.lastSwapTarget = { ...b };
  game.phase = 'swapping';
  game.combo = game.runMods.comboStart || 1;
  sfx.swap();
  game.ui.updateHud(hudPayload(game));
}

function finishSwap(game) {
  const matches = analyzeMatches(
    game.grid, game.cols, game.rows, game.lastSwapTarget, matchOpts(game)
  );

  if (matches.cells.length === 0 && game.lastSwapPair) {
    const { a, b } = game.lastSwapPair;
    swapInPlace(game.grid, a.x, a.y, b.x, b.y);
    game.lastSwapPair = null;
    game.lastSwapTarget = null;
    game.phase = 'idle';
    sfx.invalid();
    game.ui.updateHud(hudPayload(game));
    return;
  }

  if (game.mode === MODES.ROGUE) game.movesLeft = Math.max(0, game.movesLeft - 1);
  else game.moves++;

  game.lastSwapPair = null;
  beginClear(game, matches);
}

function beginClear(game, plan) {
  const hadSpecial = plan.cells.some(
    (c) => game.grid[c.y][c.x].special !== SPECIAL.NONE
  );

  const colorCounts = {};
  for (const c of plan.cells) {
    const t = game.grid[c.y][c.x];
    if (!t.alive) continue;
    colorCounts[t.type] = (colorCounts[t.type] || 0) + 1;
  }

  const scav = (game.runMods.boosterChance || 1) > 1;
  if ((colorCounts[2] || 0) >= 3) game.inventory.hammer += scav ? 2 : 1;
  if ((colorCounts[1] || 0) >= 3) game.inventory.scramble += scav ? 2 : 1;
  if ((colorCounts[0] || 0) >= 3) game.inventory.cycle += scav ? 2 : 1;

  let points = scoreForClear(plan.cells.length, game.combo, hadSpecial);
  points = Math.floor(points * (game.runMods.scoreMult || 1));
  game.score += points;
  if (game.mode === MODES.ROGUE) game.floorScore += points;
  if (game.score > game.highScore) game.highScore = saveHighScore(game.score);

  let ax = 0;
  let ay = 0;
  for (const c of plan.cells) {
    ax += (c.x + 0.5) * game.tileSize;
    ay += (c.y + 0.5) * game.tileSize;
  }
  ax /= plan.cells.length;
  ay /= plan.cells.length;
  game.floating.push({
    bx: ax,
    by: ay,
    text: `+${points}`,
    life: 50,
    maxLife: 50,
    rise: 0,
    size: 20 + Math.min(game.combo, 6) * 3,
  });

  game.pendingClear = plan;
  for (const c of plan.cells) {
    const tile = game.grid[c.y][c.x];
    const rgb = GEM_COLORS[tile.type % GEM_COLORS.length].fill;
    const pos = cellCenterScreen(game, c.x, c.y);
    spawnBurst(game.particles, pos.x, pos.y, rgb, tile.special ? 16 : 10);
    tile.alive = false;
    tile.flash = TIMING.flashFrames;
    tile.special = SPECIAL.NONE;
  }

  for (const s of plan.specials) {
    if (!plan.cells.some((c) => c.x === s.x && c.y === s.y)) continue;
    const tile = createTile(s.type, s.special);
    tile.pop = 12;
    game.grid[s.y][s.x] = tile;
  }

  game.phase = 'destroying';
  game.destroyTimer = TIMING.destroyFrames;
  if (hadSpecial || plan.specials.length) sfx.special();
  else sfx.match(game.combo);

  if (game.combo > game.bestCombo) game.bestCombo = saveBestCombo(game.combo);
  if (game.combo > game.runBestCombo) game.runBestCombo = game.combo;
  game.ui.updateHud(hudPayload(game));
}

function afterDestroy(game) {
  if (applyGravity(game.grid, game.cols, game.rows)) game.phase = 'falling';
  else afterFall(game);
}

function afterFall(game) {
  const plan = analyzeMatches(game.grid, game.cols, game.rows, null, matchOpts(game));
  if (plan.cells.length > 0) {
    game.combo++;
    beginClear(game, plan);
    return;
  }

  game.combo = game.runMods.comboStart || 1;
  game.phase = 'idle';
  game.lastSwapTarget = null;

  if (game.mode === MODES.ROGUE) {
    if (game.floorScore >= game.floorTarget) {
      onFloorCleared(game);
      return;
    }
    if (game.movesLeft <= 0) {
      if (trySecondWind(game)) {
        game.ui.updateHud(hudPayload(game));
        return;
      }
      endRun(game, 'Out of moves');
      return;
    }
  }

  if (!hasValidMoves(game.grid, game.cols, game.rows)) {
    if (game.mode === MODES.ROGUE) endRun(game, 'Board locked');
    else endZen(game);
    return;
  }
  game.ui.updateHud(hudPayload(game));
}

function trySecondWind(game) {
  if (!game.runMods.secondWind || game.runMods.secondWindUsed) return false;
  game.runMods.secondWindUsed = true;
  game.movesLeft += 5;
  game.ui.showToast('Second Wind! +5 moves');
  sfx.special();
  return true;
}

function onFloorCleared(game) {
  game.floorsCleared += 1;
  game.profile.totalFloors = (game.profile.totalFloors || 0) + 1;
  if (game.depth > (game.profile.bestDepth || 0)) {
    game.profile.bestDepth = game.depth;
  }
  saveProfile(game.profile);
  sfx.special();

  const choices = rollPerkChoices(RUN_PERK_IDS, game.runMods.perkIds, 3);
  if (choices.length === 0) {
    advanceFloor(game, null);
    return;
  }
  game.phase = 'perkpick';
  game.pendingPerkChoices = { kind: 'run', choices };
  game.ui.showPerkPick({
    title: `Floor ${game.depth} cleared!`,
    subtitle: 'Choose a run perk',
    choices,
  });
  game.ui.updateHud(hudPayload(game));
}

function resolvePerkPick(game, perkId) {
  const pending = game.pendingPerkChoices;
  if (!pending) return;
  const perk = PERKS[perkId];
  if (!perk) return;

  if (pending.kind === 'run') {
    if (!game.runMods.perkIds.includes(perkId)) {
      game.runMods.perkIds.push(perkId);
      if (typeof perk.applyRun === 'function') perk.applyRun(game.runMods, game);
    }
    game.pendingPerkChoices = null;
    game.ui.hidePerkPick();
    advanceFloor(game, perk);
  } else if (pending.kind === 'meta') {
    game.profile = addMetaPerk(game.profile, perkId);
    game.pendingMetaLevels = Math.max(0, game.pendingMetaLevels - 1);
    game.pendingPerkChoices = null;
    game.ui.hidePerkPick();
    if (game.pendingMetaLevels > 0) {
      offerMetaPerk(game);
    } else {
      showRunSummary(game);
    }
  }
}

function advanceFloor(game) {
  game.depth += 1;
  wipeBoardKeepScore(game);
  setupFloor(game, true);
  game.phase = 'idle';
  game.ui.updateHud(hudPayload(game));
}

function wipeBoardKeepScore(game) {
  const score = game.score;
  const inv = { ...game.inventory };
  const mods = game.runMods;
  const depth = game.depth;
  const floors = game.floorsCleared;
  const runBest = game.runBestCombo;
  wipeBoard(game);
  game.score = score;
  game.inventory = inv;
  game.runMods = mods;
  game.depth = depth;
  game.floorsCleared = floors;
  game.runBestCombo = runBest;
}

function endZen(game) {
  game.phase = 'gameover';
  game.highScore = saveHighScore(game.score);
  game.endReason = 'No moves left';
  sfx.gameOver();
  game.ui.showGameOver({
    mode: MODES.ZEN,
    reason: game.endReason,
    score: game.score,
    best: game.highScore,
    xpGain: 0,
    profile: game.profile,
  });
  game.ui.updateHud(hudPayload(game));
}

function endRun(game, reason) {
  game.phase = 'gameover';
  game.endReason = reason;
  game.highScore = saveHighScore(game.score);
  sfx.gameOver();

  let xp = calcRunXp({
    score: game.score,
    depthReached: game.depth,
    floorsCleared: game.floorsCleared,
    bestCombo: game.runBestCombo,
    difficulty: game.difficulty,
    wonFloor: false,
  });
  xp = Math.floor(xp * (game.runMods.xpMult || 1));
  game.lastXpGain = xp;

  const result = grantXp(game.profile, xp);
  game.profile = result.profile;
  game.pendingMetaLevels = result.levelsGained;

  if (game.pendingMetaLevels > 0) {
    offerMetaPerk(game);
  } else {
    showRunSummary(game);
  }
  game.ui.updateHud(hudPayload(game));
}

function offerMetaPerk(game) {
  const owned = game.profile.metaPerks || [];
  const choices = rollPerkChoices(META_PERK_IDS, owned, 3);
  if (choices.length === 0) {
    game.pendingMetaLevels = 0;
    showRunSummary(game);
    return;
  }
  game.pendingPerkChoices = { kind: 'meta', choices };
  game.ui.showPerkPick({
    title: `Level up! → ${game.profile.level}`,
    subtitle: 'Choose a permanent perk',
    choices,
  });
}

function showRunSummary(game) {
  game.pendingPerkChoices = null;
  game.ui.hidePerkPick();
  game.ui.showGameOver({
    mode: MODES.ROGUE,
    reason: game.endReason,
    score: game.score,
    best: game.highScore,
    depth: game.depth,
    floorsCleared: game.floorsCleared,
    xpGain: game.lastXpGain,
    profile: game.profile,
    runPerks: game.runMods.perkIds.map((id) => PERKS[id]).filter(Boolean),
  });
}

function useBooster(game, cell) {
  const name = game.activeBooster;
  if (!name || game.inventory[name] <= 0) {
    cancelBooster(game);
    return;
  }

  if (name === 'hammer') {
    const tile = game.grid[cell.y][cell.x];
    if (!tile.alive) return;
    tile.alive = false;
    tile.flash = TIMING.flashFrames;
    const rgb = GEM_COLORS[tile.type].fill;
    const pos = cellCenterScreen(game, cell.x, cell.y);
    spawnBurst(game.particles, pos.x, pos.y, rgb, 14);
    game.inventory.hammer--;
    game.activeBooster = null;
    game.phase = 'destroying';
    game.destroyTimer = TIMING.destroyFrames;
    game.pendingClear = { cells: [cell], specials: [], groups: [] };
    sfx.special();
  } else if (name === 'scramble') {
    scrambleLine(game, cell);
    game.inventory.scramble--;
    game.activeBooster = null;
    const plan = analyzeMatches(game.grid, game.cols, game.rows, cell, matchOpts(game));
    if (plan.cells.length) beginClear(game, plan);
    else game.ui.updateHud(hudPayload(game));
    sfx.swap();
  } else if (name === 'cycle') {
    cycleLine(game, cell);
    game.inventory.cycle--;
    game.activeBooster = null;
    const plan = analyzeMatches(game.grid, game.cols, game.rows, cell, matchOpts(game));
    if (plan.cells.length) beginClear(game, plan);
    else game.ui.updateHud(hudPayload(game));
    sfx.swap();
  }
  game.ui.updateHud(hudPayload(game));
}

function scrambleLine(game, cell) {
  const axis = Math.random() < 0.5 ? 'row' : 'col';
  if (axis === 'row') {
    for (let x = 0; x < game.cols; x++) {
      if (game.grid[cell.y][x].alive) {
        game.grid[cell.y][x].type = Math.floor(Math.random() * 6);
        game.grid[cell.y][x].pop = 10;
      }
    }
  } else {
    for (let y = 0; y < game.rows; y++) {
      if (game.grid[y][cell.x].alive) {
        game.grid[y][cell.x].type = Math.floor(Math.random() * 6);
        game.grid[y][cell.x].pop = 10;
      }
    }
  }
}

function cycleLine(game, cell) {
  const axis = Math.random() < 0.5 ? 'row' : 'col';
  if (axis === 'row') {
    for (let x = 0; x < game.cols; x++) {
      const t = game.grid[cell.y][x];
      if (t.alive) {
        t.type = (t.type + 1) % 6;
        t.pop = 10;
      }
    }
  } else {
    for (let y = 0; y < game.rows; y++) {
      const t = game.grid[y][cell.x];
      if (t.alive) {
        t.type = (t.type + 1) % 6;
        t.pop = 10;
      }
    }
  }
}

export function drawFrame(game) {
  const p5 = game.p5;
  p5.background(7, 16, 22);

  updateRotation(game);
  tickMotion(game.grid, game.cols, game.rows, TIMING.dropSpeed, TIMING.swapSpeed);
  updatePhase(game);
  updateHover(game);
  updateFloating(game);
  updateParticles(game.particles);
  if (game.hintTimer > 0) {
    game.hintTimer--;
    if (game.hintTimer <= 0) game.hint = null;
  }

  p5.push();
  p5.translate(game.canvasW / 2, game.canvasH / 2);
  p5.rotate(game.rotation);
  p5.translate(-game.canvasW / 2, -game.canvasH / 2);
  drawBoardBackground(p5, game.canvasW, game.canvasH, game.tileSize);

  for (let y = 0; y < game.rows; y++) {
    for (let x = 0; x < game.cols; x++) {
      const tile = game.grid[y][x];
      if (!tile.alive && tile.flash <= 0) continue;
      const px = (x + tile.slideX) * game.tileSize;
      const py = (y + tile.slideY - tile.drop) * game.tileSize;
      p5.push();
      p5.translate(px, py);
      const isHint =
        game.hint &&
        ((game.hint.a.x === x && game.hint.a.y === y) ||
          (game.hint.b.x === x && game.hint.b.y === y));
      const isHover = game.hover && game.hover.x === x && game.hover.y === y;
      const boosterHL =
        game.activeBooster &&
        game.hover &&
        (game.activeBooster === 'scramble' || game.activeBooster === 'cycle') &&
        (x === game.hover.x || y === game.hover.y);
      drawGem(p5, game.tileSize, tile.type, tile.special, {
        selected: tile.selected,
        hover: isHover && !game.activeBooster,
        highlight: !!boosterHL,
        hint: !!isHint,
        flash: tile.flash,
        pop: tile.pop,
        alpha: tile.alive ? 255 : Math.floor((tile.flash / TIMING.flashFrames) * 255),
      });
      p5.pop();
    }
  }
  p5.pop();

  drawParticles(p5, game.particles);
  drawFloatingTexts(p5, game.floating, (bx, by) => boardToScreen(game, bx, by));
  if (game.combo > 1 && game.phase !== 'idle' && game.phase !== 'gameover') {
    drawComboBanner(p5, game.combo, game.canvasW, game.tileSize);
  }
}

function updatePhase(game) {
  if (game.phase === 'swapping') {
    if (!anySliding(game.grid, game.cols, game.rows)) finishSwap(game);
  } else if (game.phase === 'destroying') {
    game.destroyTimer--;
    if (game.destroyTimer <= 0) afterDestroy(game);
  } else if (game.phase === 'falling') {
    if (!anyDropping(game.grid, game.cols, game.rows)) afterFall(game);
  }
}

function updateRotation(game) {
  if (!game.rotating) return;
  const diff = game.targetRotation - game.rotation;
  const step = Math.sign(diff) * Math.min(Math.abs(diff), 0.14);
  game.rotation += step;
  if (Math.abs(game.targetRotation - game.rotation) < 0.001) {
    game.rotation = 0;
    game.targetRotation = 0;
    const result = rotateGrid(game.grid, game.cols, game.rows, game.rotDir);
    game.grid = result.grid;
    game.cols = result.cols;
    game.rows = result.rows;
    game.rotating = false;
    game.rotDir = 0;
    computeSize(game);
    game.p5.resizeCanvas(game.canvasW, game.canvasH);

    const plan = analyzeMatches(game.grid, game.cols, game.rows, null, matchOpts(game));
    if (plan.cells.length) {
      game.combo = game.runMods.comboStart || 1;
      beginClear(game, plan);
    } else {
      game.phase = 'idle';
      if (!hasValidMoves(game.grid, game.cols, game.rows)) {
        if (game.mode === MODES.ROGUE) endRun(game, 'Board locked');
        else endZen(game);
      }
    }
    game.ui.updateHud(hudPayload(game));
  }
}

function updateHover(game) {
  if (!game.started || game.phase === 'gameover' || game.pendingPerkChoices) {
    game.hover = null;
    return;
  }
  game.hover = screenToCell(game, game.p5.mouseX, game.p5.mouseY);
}

function updateFloating(game) {
  for (let i = game.floating.length - 1; i >= 0; i--) {
    const ft = game.floating[i];
    ft.life--;
    ft.rise += 1.4;
    if (ft.life <= 0) game.floating.splice(i, 1);
  }
}

function cellCenterScreen(game, x, y) {
  return boardToScreen(game, (x + 0.5) * game.tileSize, (y + 0.5) * game.tileSize);
}

function boardToScreen(game, x, y) {
  const cx = game.canvasW / 2;
  const cy = game.canvasH / 2;
  const dx = x - cx;
  const dy = y - cy;
  const cosR = Math.cos(game.rotation);
  const sinR = Math.sin(game.rotation);
  return {
    x: dx * cosR - dy * sinR + cx,
    y: dx * sinR + dy * cosR + cy,
  };
}

function screenToBoard(game, x, y) {
  const cx = game.canvasW / 2;
  const cy = game.canvasH / 2;
  const dx = x - cx;
  const dy = y - cy;
  const cosR = Math.cos(game.rotation);
  const sinR = Math.sin(game.rotation);
  return {
    x: dx * cosR + dy * sinR + cx,
    y: -dx * sinR + dy * cosR + cy,
  };
}

function screenToCell(game, sx, sy) {
  if (sx < 0 || sy < 0 || sx > game.canvasW || sy > game.canvasH) return null;
  const b = screenToBoard(game, sx, sy);
  const x = Math.floor(b.x / game.tileSize);
  const y = Math.floor(b.y / game.tileSize);
  if (x < 0 || y < 0 || x >= game.cols || y >= game.rows) return null;
  return { x, y };
}

export function pointerDown(game, x, y) {
  unlockAudio();
  game.input.onPointerDown(game, x, y);
}
export function pointerMove(game, x, y) {
  game.input.onPointerMove(game, x, y);
}
export function pointerUp(game, x, y) {
  game.input.onPointerUp(game, x, y);
}
export function pointerCancel(game) {
  game.input.onPointerCancel();
}
