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
  canSwapTile,
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
import {
  seedOpeningHazards,
  crackAdjacentHazards,
  clearJellyUnder,
  maybeSpawnHazards,
  quakeBoard,
  countJelly,
  movesUntilQuake,
  isStone,
  HAZARD,
} from './hazards.js';

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
  seedOpeningHazards(game.grid, game.cols, game.rows);
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
  seedOpeningHazards(game.grid, game.cols, game.rows);
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
  game.pendingQuake = false;
  computeSize(game);
  game.p5.resizeCanvas(game.canvasW, game.canvasH);
  game.ui.hideGameOver();
  game.ui.setPlaying(true);
  game.ui.updateHud(hudPayload(game));
  const jelly = countJelly(game.grid, game.cols, game.rows);
  game.ui.showToast(
    jelly > 0
      ? `Clear ${jelly} jelly · ice blocks swaps · quake every ${HAZARD.quakeEvery}`
      : `Ice blocks swaps · quake every ${HAZARD.quakeEvery} moves`
  );
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
    jelly: countJelly(game.grid, game.cols, game.rows),
    quakeIn: movesUntilQuake(game.moves),
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

  const t1 = game.grid[a.y][a.x];
  const t2 = game.grid[b.y][b.x];
  if (!canSwapTile(t1) || !canSwapTile(t2)) {
    sfx.invalid();
    game.ui.showToast('Frozen or blocked!');
    return;
  }

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
  game.quakeDoneForMove = false;
  game.lastSwapPair = null;
  beginClear(game, matches);
}

function beginClear(game, plan) {
  // Split stones hit by specials from actual gem clears
  const gemCells = [];
  const stoneHits = [];
  for (const c of plan.cells) {
    const t = game.grid[c.y][c.x];
    if (isStone(t)) stoneHits.push(c);
    else gemCells.push(c);
  }

  // Snapshot cursed flags before we wipe tiles
  const curseSources = gemCells.filter((c) => game.grid[c.y][c.x].cursed);

  const hadSpecial = gemCells.some(
    (c) => game.grid[c.y][c.x].special !== SPECIAL.NONE
  );

  const colorCounts = {};
  for (const c of gemCells) {
    const t = game.grid[c.y][c.x];
    if (!t.alive || t.type < 0) continue;
    colorCounts[t.type] = (colorCounts[t.type] || 0) + 1;
  }
  if ((colorCounts[2] || 0) >= 3) game.inventory.hammer++;
  if ((colorCounts[1] || 0) >= 3) game.inventory.scramble++;
  if ((colorCounts[0] || 0) >= 3) game.inventory.cycle++;

  const jellyCleared = clearJellyUnder(game.grid, gemCells);
  let points = scoreForClear(gemCells.length, game.combo, hadSpecial);
  points += jellyCleared * 40 * game.combo;
  game.score += points;
  if (game.score > game.highScore) {
    game.highScore = saveHighScore(game.score);
  }

  if (gemCells.length) {
    let ax = 0;
    let ay = 0;
    for (const c of gemCells) {
      ax += (c.x + 0.5) * game.tileSize;
      ay += (c.y + 0.5) * game.tileSize;
    }
    ax /= gemCells.length;
    ay /= gemCells.length;
    game.floating.push({
      bx: ax,
      by: ay,
      text: jellyCleared ? `+${points} ★` : `+${points}`,
      life: 50,
      maxLife: 50,
      rise: 0,
      size: 20 + Math.min(game.combo, 6) * 3,
    });
  }

  // Crack adjacent ice/stones from gem clears
  crackAdjacentHazards(game.grid, game.cols, game.rows, gemCells);

  // Stones hit by rockets/bombs take damage
  for (const c of stoneHits) {
    const t = game.grid[c.y][c.x];
    if (!isStone(t)) continue;
    t.stone -= 1;
    t.pop = 10;
    if (t.stone <= 0) {
      t.alive = false;
      t.flash = TIMING.flashFrames;
      t.stone = 0;
      const pos = cellCenterScreen(game, c.x, c.y);
      spawnBurst(game.particles, pos.x, pos.y, [90, 84, 76], 12);
    }
  }

  game.pendingClear = plan;
  for (const c of gemCells) {
    const tile = game.grid[c.y][c.x];
    const rgb =
      tile.type >= 0
        ? GEM_COLORS[tile.type % GEM_COLORS.length].fill
        : [200, 200, 200];
    const pos = cellCenterScreen(game, c.x, c.y);
    spawnBurst(game.particles, pos.x, pos.y, rgb, tile.special ? 16 : 10);
    tile.alive = false;
    tile.flash = TIMING.flashFrames;
    tile.special = SPECIAL.NONE;
    tile.ice = 0;
    tile.cursed = false;
    tile.jelly = 0;
  }

  // Curses trigger after clear (freeze neighbors still alive)
  if (curseSources.length) {
    // Mark temporarily so triggerCurses can see them — already wiped.
    // Re-run freeze using saved positions:
    for (const c of curseSources) {
      let placed = 0;
      let tries = 0;
      while (placed < 2 && tries++ < 24) {
        const x = Math.min(
          game.cols - 1,
          Math.max(0, c.x + Math.floor(Math.random() * 5) - 2)
        );
        const y = Math.min(
          game.rows - 1,
          Math.max(0, c.y + Math.floor(Math.random() * 5) - 2)
        );
        const t = game.grid[y][x];
        if (t.alive && !isStone(t) && (t.ice || 0) === 0 && t.type >= 0) {
          t.ice = 1;
          t.pop = 12;
          placed++;
        }
      }
    }
    game.ui.showToast('Curse spreads ice!');
  }

  for (const s of plan.specials) {
    if (!gemCells.some((c) => c.x === s.x && c.y === s.y)) continue;
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
  game.lastSwapTarget = null;

  // Quake on schedule after cascades settle
  if (game.moves > 0 && game.moves % HAZARD.quakeEvery === 0 && !game.quakeDoneForMove) {
    game.quakeDoneForMove = true;
    const q = quakeBoard(game.grid, game.cols, game.rows);
    game.ui.showToast(`Quake! Row ${q.row + 1} shifts`);
    sfx.special();
    game.phase = 'idle';
    // Allow slide animation then check matches
    game.phase = 'falling'; // reuse falling wait for slide
    // Actually slides use slideX — wait via swapping-like check
    game.phase = 'quaking';
    game.ui.updateHud(hudPayload(game));
    return;
  }

  // Progressive hazard spawns
  const spawned = maybeSpawnHazards(game.grid, game.cols, game.rows, game.moves);
  if (spawned.length) {
    const kinds = spawned.map((e) => e.kind).join(', ');
    game.ui.showToast(`Hazard: ${kinds}`);
  }

  game.phase = 'idle';

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
    const pos = cellCenterScreen(game, cell.x, cell.y);
    if (isStone(tile)) {
      tile.stone -= 1;
      tile.pop = 10;
      spawnBurst(game.particles, pos.x, pos.y, [90, 84, 76], 12);
      if (tile.stone <= 0) {
        tile.alive = false;
        tile.flash = TIMING.flashFrames;
        tile.stone = 0;
        game.phase = 'destroying';
        game.destroyTimer = TIMING.destroyFrames;
        game.pendingClear = { cells: [cell], specials: [], groups: [] };
      }
    } else if ((tile.ice || 0) > 0) {
      tile.ice = 0;
      tile.pop = 10;
      spawnBurst(game.particles, pos.x, pos.y, [170, 220, 255], 10);
      game.ui.showToast('Ice shattered');
    } else {
      const rgb = GEM_COLORS[Math.max(0, tile.type) % GEM_COLORS.length].fill;
      spawnBurst(game.particles, pos.x, pos.y, rgb, 14);
      tile.alive = false;
      tile.flash = TIMING.flashFrames;
      tile.jelly = 0;
      tile.cursed = false;
      game.phase = 'destroying';
      game.destroyTimer = TIMING.destroyFrames;
      game.pendingClear = { cells: [cell], specials: [], groups: [] };
    }
    game.inventory.hammer--;
    game.activeBooster = null;
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

function scrambleLine(game, cell) {
  const axis = Math.random() < 0.5 ? 'row' : 'col';
  if (axis === 'row') {
    for (let x = 0; x < game.cols; x++) {
      const t = game.grid[cell.y][x];
      if (t.alive && !isStone(t) && t.type >= 0) {
        t.type = Math.floor(Math.random() * 6);
        t.pop = 10;
        t.cursed = false;
      }
    }
  } else {
    for (let y = 0; y < game.rows; y++) {
      const t = game.grid[y][cell.x];
      if (t.alive && !isStone(t) && t.type >= 0) {
        t.type = Math.floor(Math.random() * 6);
        t.pop = 10;
        t.cursed = false;
      }
    }
  }
}

function cycleLine(game, cell) {
  const axis = Math.random() < 0.5 ? 'row' : 'col';
  if (axis === 'row') {
    for (let x = 0; x < game.cols; x++) {
      const t = game.grid[cell.y][x];
      if (t.alive && !isStone(t) && t.type >= 0) {
        t.type = (t.type + 1) % 6;
        t.pop = 10;
      }
    }
  } else {
    for (let y = 0; y < game.rows; y++) {
      const t = game.grid[y][cell.x];
      if (t.alive && !isStone(t) && t.type >= 0) {
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
        ice: tile.ice || 0,
        stone: tile.stone || 0,
        jelly: tile.jelly || 0,
        cursed: !!tile.cursed,
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
  } else if (game.phase === 'quaking') {
    if (!anySliding(game.grid, game.cols, game.rows)) {
      const plan = analyzeMatches(game.grid, game.cols, game.rows, null);
      if (plan.cells.length > 0) {
        game.combo = 1;
        beginClear(game, plan);
      } else {
        const spawned = maybeSpawnHazards(
          game.grid,
          game.cols,
          game.rows,
          game.moves
        );
        if (spawned.length) {
          game.ui.showToast(`Hazard: ${spawned.map((e) => e.kind).join(', ')}`);
        }
        game.phase = 'idle';
        if (!hasValidMoves(game.grid, game.cols, game.rows)) endGame(game);
        game.ui.updateHud(hudPayload(game));
      }
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
