/**
 * Match detection that skips stones and only matches gems.
 */
import { isGem, canSwapTile, matchableType } from './hazards.js';

export function findMatchGroups(grid, cols, rows) {
  const groups = [];

  for (let y = 0; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      const type = matchableType(grid[y][x]);
      if (type === null) {
        x++;
        continue;
      }
      let len = 1;
      while (x + len < cols && matchableType(grid[y][x + len]) === type) len++;
      if (len >= 3) {
        const cells = [];
        for (let i = 0; i < len; i++) cells.push({ x: x + i, y });
        groups.push({ cells, type, axis: 'h', length: len });
      }
      x += len;
    }
  }

  for (let x = 0; x < cols; x++) {
    let y = 0;
    while (y < rows) {
      const type = matchableType(grid[y][x]);
      if (type === null) {
        y++;
        continue;
      }
      let len = 1;
      while (y + len < rows && matchableType(grid[y + len][x]) === type) len++;
      if (len >= 3) {
        const cells = [];
        for (let i = 0; i < len; i++) cells.push({ x, y: y + i });
        groups.push({ cells, type, axis: 'v', length: len });
      }
      y += len;
    }
  }

  return groups;
}

export function flattenMatches(groups) {
  const map = new Map();
  for (const g of groups) {
    for (const c of g.cells) map.set(`${c.x},${c.y}`, c);
  }
  return [...map.values()];
}

export function checkMatchAt(grid, cols, rows, x, y) {
  const type = matchableType(grid[y]?.[x]);
  if (type === null) return false;

  let h = 1;
  for (let i = x - 1; i >= 0 && matchableType(grid[y][i]) === type; i--) h++;
  for (let i = x + 1; i < cols && matchableType(grid[y][i]) === type; i++) h++;
  if (h >= 3) return true;

  let v = 1;
  for (let i = y - 1; i >= 0 && matchableType(grid[i][x]) === type; i--) v++;
  for (let i = y + 1; i < rows && matchableType(grid[i][x]) === type; i++) v++;
  return v >= 3;
}

export function wouldCreateMatch(grid, cols, rows, x1, y1, x2, y2) {
  if (!canSwapTile(grid[y1][x1]) || !canSwapTile(grid[y2][x2])) return false;
  swapInPlace(grid, x1, y1, x2, y2);
  const ok = checkMatchAt(grid, cols, rows, x1, y1) || checkMatchAt(grid, cols, rows, x2, y2);
  swapInPlace(grid, x1, y1, x2, y2);
  return ok;
}

export function swapInPlace(grid, x1, y1, x2, y2) {
  const tmp = grid[y1][x1];
  grid[y1][x1] = grid[y2][x2];
  grid[y2][x2] = tmp;
}

export function areAdjacent(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

export function hasValidMoves(grid, cols, rows) {
  return findHint(grid, cols, rows) !== null;
}

export function findHint(grid, cols, rows) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols - 1; x++) {
      if (wouldCreateMatch(grid, cols, rows, x, y, x + 1, y)) {
        return { a: { x, y }, b: { x: x + 1, y } };
      }
    }
  }
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols; x++) {
      if (wouldCreateMatch(grid, cols, rows, x, y, x, y + 1)) {
        return { a: { x, y }, b: { x, y: y + 1 } };
      }
    }
  }
  return null;
}

export { isGem, canSwapTile };
