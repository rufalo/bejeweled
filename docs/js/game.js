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

export function createGame() {
  const game = {
    cols: GRID.cols,
    rows: GRID.rows,
    grid: null,
    tileSize: 48,
    canvasW: 0,
    canvasH: 0,
    score: 0,
    moves: 0,
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
    phase: 'idle', // idle | swapping | destroying | falling | rotating | gameover
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
  };

  game.highScore = loadHighScore();
  game.bestCombo = loadBestCombo();
  setMuted(loadMuted());

  game.ui = createUI({
    onPlay: () => startGame(game),
    onRestart: () => restartGame(game),
    onHint: () => showHint(game),
    onRotate: (dir) => requestRotate(game, dir),
    onBooster: (name) => activateBooster(game, name),
    onCancelBooster: () => cancelBooster(game),
  });

  game.input = createInputController({
    onTap: (cell) => handleTap(game, cell),
    onSwipe: (a, b) => trySwap(game, a, b),
  });

  game.canInteract = () =>
    game.started &&
    game.phase === 'idle' &&
    !game.rotating;

  game.screenToCell = (sx, sy) => screenToCell(game, sx, sy);

  return game;
}

export function setupP5(game, p5) {
  game.p5 = p5;
  computeSize(game);
  const canvas = p5.createCanvas(game.canvasW, game.canvasH);
  canvas.parent('board-host');

  // Prevent browser gestures on the canvas
  const el = canvas.elt;
  el.style.touchAction = 'none';
  el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  game.grid = createBoard(game.cols, game.rows);
  game.ui.updateHud(hudPayload(game));
  game.ui.setPlaying(false);

  // Recompute after layout settles (mobile browser chrome, flex sizing)
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
  game.tileSize = Math.floor(side / game.cols);
  game.tileSize = Math.max(32, Math.min(game.tileSize, 72));
  game.canvasW = game.cols * game.tileSize;
  game.canvasH = game.rows * game.tileSize;
}

function startGame(game) {
  unlockAudio();
  restartGame(game);
  game.started = true;
  game.ui.setPlaying(true);
  game.ui.hideGameOver();
}

function restartGame(game) {
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
  game.inventory = { hammer: 0, scramble: 0, cycle: 0 };
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
  game.started = true;
  computeSize(game);
  game.p5.resizeCanvas(game.canvasW, game.canvasH);
  game.ui.hideGameOver();
  game.ui.setPlaying(true);
  game.ui.updateHud(hudPayload(game));
}

function hudPayload(game) {
  return {
    score: game.score,
    moves: game.moves,
    best: game.highScore,
    combo: game.combo,
    inventory: game.inventory,
    activeBooster: game.activeBooster,
    busy: game.phase !== 'idle' || game.rotating,
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
  if (!hint) return;
  game.hint = hint;
  game.hintTimer = 90;
  sfx.hint();
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
  game.combo = 1;
  sfx.swap();
  game.ui.updateHud(hudPayload(game));
}

function finishSwap(game) {
  const matches = analyzeMatches(
    game.grid,
    game.cols,
    game.rows,
    game.lastSwapTarget
  );

  if (matches.cells.length === 0 && game.lastSwapPair) {
    // Revert
    const { a, b } = game.lastSwapPair;
    swapInPlace(game.grid, a.x, a.y, b.x, b.y);
    game.lastSwapPair = null;
    game.lastSwapTarget = null;
    game.phase = 'idle';
    sfx.invalid();
    game.ui.updateHud(hudPayload(game));
    return;
  }

  game.moves++;
  game.lastSwapPair = null;
  beginClear(game, matches);
}

function beginClear(game, plan) {
  const hadSpecial = plan.cells.some(
    (c) => game.grid[c.y][c.x].special !== SPECIAL.NONE
  );

  // Award boosters from gem colors in the clear
  const colorCounts = {};
  for (const c of plan.cells) {
    const t = game.grid[c.y][c.x];
    if (!t.alive) continue;
    colorCounts[t.type] = (colorCounts[t.type] || 0) + 1;
  }
  // ruby(2)->hammer, azure(1)->scramble, emerald(0)->cycle
  if ((colorCounts[2] || 0) >= 3) game.inventory.hammer++;
  if ((colorCounts[1] || 0) >= 3) game.inventory.scramble++;
  if ((colorCounts[0] || 0) >= 3) game.inventory.cycle++;

  const points = scoreForClear(plan.cells.length, game.combo, hadSpecial);
  game.score += points;

  // Floating text at average position
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

  // Mark tiles for destruction; reserve specials to place after
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

  // Place new specials on reserved cells (revive as special gem)
  for (const s of plan.specials) {
    const still = plan.cells.some((c) => c.x === s.x && c.y === s.y);
    if (!still) continue;
    const tile = createTile(s.type, s.special);
    tile.pop = 12;
    game.grid[s.y][s.x] = tile;
  }

  game.phase = 'destroying';
  game.destroyTimer = TIMING.destroyFrames;
  if (hadSpecial || plan.specials.length) sfx.special();
  else sfx.match(game.combo);

  if (game.combo > game.bestCombo) {
    game.bestCombo = saveBestCombo(game.combo);
  }
  game.ui.updateHud(hudPayload(game));
}

function afterDestroy(game) {
  const moved = applyGravity(game.grid, game.cols, game.rows);
  if (moved) {
    game.phase = 'falling';
  } else {
    afterFall(game);
  }
}

function afterFall(game) {
  const plan = analyzeMatches(game.grid, game.cols, game.rows, null);
  if (plan.cells.length > 0) {
    game.combo++;
    beginClear(game, plan);
    return;
  }

  game.combo = 1;
  game.phase = 'idle';
  game.lastSwapTarget = null;

  if (!hasValidMoves(game.grid, game.cols, game.rows)) {
    endGame(game);
  }
  game.ui.updateHud(hudPayload(game));
}

function endGame(game) {
  game.phase = 'gameover';
  game.highScore = saveHighScore(game.score);
  sfx.gameOver();
  game.ui.showGameOver(game.score, game.highScore);
  game.ui.updateHud(hudPayload(game));
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
    const plan = analyzeMatches(game.grid, game.cols, game.rows, cell);
    if (plan.cells.length) beginClear(game, plan);
    else game.ui.updateHud(hudPayload(game));
    sfx.swap();
  } else if (name === 'cycle') {
    cycleLine(game, cell);
    game.inventory.cycle--;
    game.activeBooster = null;
    const plan = analyzeMatches(game.grid, game.cols, game.rows, cell);
    if (plan.cells.length) beginClear(game, plan);
    else game.ui.updateHud(hudPayload(game));
    sfx.swap();
  }
  game.ui.updateHud(hudPayload(game));
}

function preferAxis(game, cell) {
  // Prefer the longer clear opportunity; fallback to row
  return Math.random() < 0.5 ? 'row' : 'col';
}

function scrambleLine(game, cell) {
  const axis = preferAxis(game, cell);
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
  const axis = preferAxis(game, cell);
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
  p5.clear();

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

  // Draw in board space with rotation
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
    if (!anySliding(game.grid, game.cols, game.rows)) {
      finishSwap(game);
    }
  } else if (game.phase === 'destroying') {
    game.destroyTimer--;
    if (game.destroyTimer <= 0) {
      afterDestroy(game);
    }
  } else if (game.phase === 'falling') {
    if (!anyDropping(game.grid, game.cols, game.rows)) {
      afterFall(game);
    }
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

    const plan = analyzeMatches(game.grid, game.cols, game.rows, null);
    if (plan.cells.length) {
      game.combo = 1;
      beginClear(game, plan);
    } else {
      game.phase = 'idle';
      if (!hasValidMoves(game.grid, game.cols, game.rows)) endGame(game);
    }
    game.ui.updateHud(hudPayload(game));
  }
}

function updateHover(game) {
  if (!game.started || game.phase === 'gameover') {
    game.hover = null;
    return;
  }
  const cell = screenToCell(game, game.p5.mouseX, game.p5.mouseY);
  game.hover = cell;
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
  return boardToScreen(
    game,
    (x + 0.5) * game.tileSize,
    (y + 0.5) * game.tileSize
  );
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

/* ── Pointer bridges from main.js ── */
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
