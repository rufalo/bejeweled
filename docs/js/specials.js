import { SPECIAL, SCORE } from './config.js';
import { flattenMatches, findMatchGroups } from './match.js';

/**
 * Decide which specials to create from match groups.
 * Match 5+ → bomb at center; Match 4 → rocket at center.
 * Prefer placing on the cell the player swapped into when provided.
 */
export function planSpecials(groups, preferredCell = null) {
  const planned = []; // { x, y, special, type }

  for (const g of groups) {
    if (g.length < 4) continue;
    const special = g.length >= 5 ? SPECIAL.BOMB : SPECIAL.ROCKET;
    let cell = null;
    if (preferredCell && g.cells.some((c) => c.x === preferredCell.x && c.y === preferredCell.y)) {
      cell = preferredCell;
    } else {
      cell = g.cells[Math.floor(g.cells.length / 2)];
    }
    planned.push({ x: cell.x, y: cell.y, special, type: g.type });
  }

  // Deduplicate: if two groups share a cell, keep stronger special
  const byKey = new Map();
  for (const p of planned) {
    const k = `${p.x},${p.y}`;
    const prev = byKey.get(k);
    if (!prev || p.special > prev.special) byKey.set(k, p);
  }
  return [...byKey.values()];
}

/**
 * Expand a set of matched cells by detonating any specials among them.
 * Returns unique list of all cells to clear.
 */
export function expandWithSpecials(grid, cols, rows, cells) {
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
      // Clear entire row and column
      for (let x = 0; x < cols; x++) queue.push({ x, y: c.y });
      for (let y = 0; y < rows; y++) queue.push({ x: c.x, y });
    } else if (tile.special === SPECIAL.BOMB) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
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

/**
 * Analyze current board matches and return clear plan.
 */
export function analyzeMatches(grid, cols, rows, preferredCell = null) {
  const groups = findMatchGroups(grid, cols, rows);
  if (groups.length === 0) {
    return { cells: [], specials: [], groups: [] };
  }
  const matched = flattenMatches(groups);
  const specials = planSpecials(groups, preferredCell);
  const cells = expandWithSpecials(grid, cols, rows, matched);
  return { cells, specials, groups };
}
