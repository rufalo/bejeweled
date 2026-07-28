import { SPECIAL, SCORE } from './config.js';
import { flattenMatches, findMatchGroups } from './match.js';

/**
 * Decide which specials to create from match groups.
 * Match 5+ → bomb; Match 4 → rocket.
 * With easyRockets, match length >= 3 that is exactly a long-enough group of 3+
 * still only rockets at 4 — but groups of length >= 4 always rocket, and we also
 * upgrade any group of length >= 3 when easyRockets and length >= 4... 
 * easyRockets: create rocket on matches of 3 that are part of a 4+ ... simpler:
 * easyRockets means length >= 3 creates a rocket (length >= 5 still bomb).
 */
export function planSpecials(groups, preferredCell = null, opts = {}) {
  const planned = [];
  const minForRocket = opts.easyRockets ? 3 : 4;

  for (const g of groups) {
    if (g.length < minForRocket) continue;
    const special = g.length >= 5 ? SPECIAL.BOMB : SPECIAL.ROCKET;
    let cell = null;
    if (preferredCell && g.cells.some((c) => c.x === preferredCell.x && c.y === preferredCell.y)) {
      cell = preferredCell;
    } else {
      cell = g.cells[Math.floor(g.cells.length / 2)];
    }
    planned.push({ x: cell.x, y: cell.y, special, type: g.type });
  }

  const byKey = new Map();
  for (const p of planned) {
    const k = `${p.x},${p.y}`;
    const prev = byKey.get(k);
    if (!prev || p.special > prev.special) byKey.set(k, p);
  }
  return [...byKey.values()];
}

export function expandWithSpecials(grid, cols, rows, cells, opts = {}) {
  const bombRadius = opts.bigBombs ? 2 : 1;
  const result = new Map();
  const queue = [...cells];
  const key = (c) => `${c.x},${c.y}`;

  while (queue.length) {
    const c = queue.pop();
    const k = key(c);
    if (result.has(k)) continue;
    if (c.x < 0 || c.y < 0 || c.x >= cols || c.y >= rows) continue;
    result.set(k, c);

    const tile = grid[c.y][c.x];
    if (!tile || !tile.alive) continue;

    if (tile.special === SPECIAL.ROCKET) {
      for (let x = 0; x < cols; x++) queue.push({ x, y: c.y });
      for (let y = 0; y < rows; y++) queue.push({ x: c.x, y });
    } else if (tile.special === SPECIAL.BOMB) {
      for (let dy = -bombRadius; dy <= bombRadius; dy++) {
        for (let dx = -bombRadius; dx <= bombRadius; dx++) {
          queue.push({ x: c.x + dx, y: c.y + dy });
        }
      }
    }
  }

  return [...result.values()];
}

export function scoreForClear(cellCount, combo, hadSpecial) {
  let base;
  if (cellCount <= 3) base = SCORE.match3;
  else if (cellCount === 4) base = SCORE.match4;
  else if (cellCount === 5) base = SCORE.match5;
  else base = SCORE.match5 + (cellCount - 5) * SCORE.matchExtra;

  if (hadSpecial) base += SCORE.specialBonus;
  return base * combo;
}

export function analyzeMatches(grid, cols, rows, preferredCell = null, opts = {}) {
  const groups = findMatchGroups(grid, cols, rows);
  if (groups.length === 0) {
    return { cells: [], specials: [], groups: [] };
  }
  const matched = flattenMatches(groups);
  const specials = planSpecials(groups, preferredCell, opts);
  const cells = expandWithSpecials(grid, cols, rows, matched, opts);
  return { cells, specials, groups };
}
