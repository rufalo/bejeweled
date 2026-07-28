/**
 * Board hazards: ice, stone blockers, jelly, cursed gems, quakes.
 */

export const HAZARD = {
  quakeEvery: 8,
  iceSpawnStartMove: 6,
  stoneSpawnStartMove: 14,
  curseSpawnStartMove: 10,
};

export function isStone(tile) {
  return !!(tile && tile.alive && (tile.stone || 0) > 0);
}

export function isGem(tile) {
  return !!(tile && tile.alive && (tile.stone || 0) <= 0 && tile.type >= 0);
}

export function canSwapTile(tile) {
  if (!tile || !tile.alive) return false;
  if ((tile.stone || 0) > 0) return false;
  if ((tile.ice || 0) > 0) return false;
  return tile.type >= 0;
}

export function matchableType(tile) {
  if (!isGem(tile)) return null;
  return tile.type;
}

/** Seed opening board with light jelly + a few iced gems. */
export function seedOpeningHazards(grid, cols, rows) {
  const jellyBudget = 6 + Math.floor(Math.random() * 4);
  const iceBudget = 2 + Math.floor(Math.random() * 2);
  let placed = 0;

  // Jelly on lower half (more strategic)
  while (placed < jellyBudget) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(rows / 2 + Math.random() * (rows / 2));
    const t = grid[y]?.[x];
    if (t && isGem(t) && !t.jelly) {
      t.jelly = 1;
      placed++;
    }
  }

  placed = 0;
  let guard = 0;
  while (placed < iceBudget && guard++ < 80) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    const t = grid[y]?.[x];
    if (t && isGem(t) && !t.ice) {
      t.ice = Math.random() < 0.35 ? 2 : 1;
      placed++;
    }
  }
}

/**
 * After a clear, crack ice/stones orthogonally adjacent to cleared cells.
 * Returns list of {x,y,kind} for FX.
 */
export function crackAdjacentHazards(grid, cols, rows, clearedCells) {
  const cracked = [];
  const seen = new Set();
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const c of clearedCells) {
    for (const [dx, dy] of dirs) {
      const x = c.x + dx;
      const y = c.y + dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = grid[y][x];
      if (!t || !t.alive) continue;

      if ((t.ice || 0) > 0) {
        t.ice -= 1;
        t.pop = 10;
        cracked.push({ x, y, kind: 'ice', left: t.ice });
      } else if ((t.stone || 0) > 0) {
        t.stone -= 1;
        t.pop = 10;
        if (t.stone <= 0) {
          t.alive = false;
          t.flash = 18;
          t.stone = 0;
          cracked.push({ x, y, kind: 'stone-break', left: 0 });
        } else {
          cracked.push({ x, y, kind: 'stone', left: t.stone });
        }
      }
    }
  }
  return cracked;
}

/** Clear jelly under matched gems; returns count cleared. */
export function clearJellyUnder(grid, cells) {
  let n = 0;
  for (const c of cells) {
    const t = grid[c.y]?.[c.x];
    if (t && (t.jelly || 0) > 0) {
      t.jelly = 0;
      n++;
    }
  }
  return n;
}

/** When cursed gems are cleared, freeze random nearby gems. */
export function triggerCurses(grid, cols, rows, clearedCells) {
  const cursed = clearedCells.filter((c) => grid[c.y]?.[c.x]?.cursed);
  const iced = [];
  for (const c of cursed) {
    let placed = 0;
    let tries = 0;
    while (placed < 2 && tries++ < 24) {
      const x = Math.min(cols - 1, Math.max(0, c.x + Math.floor(Math.random() * 5) - 2));
      const y = Math.min(rows - 1, Math.max(0, c.y + Math.floor(Math.random() * 5) - 2));
      const t = grid[y][x];
      if (isGem(t) && (t.ice || 0) === 0 && !(x === c.x && y === c.y)) {
        t.ice = 1;
        t.pop = 12;
        iced.push({ x, y });
        placed++;
      }
    }
  }
  return iced;
}

/**
 * Progressive spawn after a cascade settles.
 * Mutates some living gems / empty fills.
 */
export function maybeSpawnHazards(grid, cols, rows, moves) {
  const events = [];

  if (moves >= HAZARD.iceSpawnStartMove && Math.random() < iceChance(moves)) {
    const t = randomGem(grid, cols, rows, (g) => !g.ice && !g.cursed);
    if (t) {
      t.tile.ice = Math.random() < 0.25 ? 2 : 1;
      t.tile.pop = 10;
      events.push({ kind: 'ice', x: t.x, y: t.y });
    }
  }

  if (moves >= HAZARD.curseSpawnStartMove && Math.random() < curseChance(moves)) {
    const t = randomGem(grid, cols, rows, (g) => !g.cursed && !g.ice);
    if (t) {
      t.tile.cursed = true;
      t.tile.pop = 10;
      events.push({ kind: 'curse', x: t.x, y: t.y });
    }
  }

  if (moves >= HAZARD.stoneSpawnStartMove && Math.random() < stoneChance(moves)) {
    const t = randomGem(grid, cols, rows, (g) => !g.jelly);
    if (t) {
      // Convert a gem into a stone blocker
      t.tile.stone = Math.random() < 0.4 ? 2 : 1;
      t.tile.type = -1;
      t.tile.special = 0;
      t.tile.ice = 0;
      t.tile.cursed = false;
      t.tile.pop = 12;
      events.push({ kind: 'stone', x: t.x, y: t.y });
    }
  }

  return events;
}

function iceChance(moves) {
  return Math.min(0.45, 0.12 + (moves - HAZARD.iceSpawnStartMove) * 0.015);
}
function curseChance(moves) {
  return Math.min(0.22, 0.06 + (moves - HAZARD.curseSpawnStartMove) * 0.01);
}
function stoneChance(moves) {
  return Math.min(0.28, 0.08 + (moves - HAZARD.stoneSpawnStartMove) * 0.012);
}

function randomGem(grid, cols, rows, pred) {
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    const tile = grid[y][x];
    if (isGem(tile) && pred(tile)) return { x, y, tile };
  }
  return null;
}

/** Shift a random row left or right by one — returns description. */
export function quakeBoard(grid, cols, rows) {
  const y = Math.floor(Math.random() * rows);
  const dir = Math.random() < 0.5 ? -1 : 1;
  const row = grid[y].map((t) => t);
  const next = new Array(cols);
  for (let x = 0; x < cols; x++) {
    const src = (x - dir + cols) % cols;
    next[x] = row[src];
    next[x].slideX = dir;
    next[x].selected = false;
  }
  grid[y] = next;
  return { row: y, dir };
}

export function countJelly(grid, cols, rows) {
  let n = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if ((grid[y][x].jelly || 0) > 0) n++;
    }
  }
  return n;
}

export function movesUntilQuake(moves) {
  const every = HAZARD.quakeEvery;
  return every - (moves % every);
}
