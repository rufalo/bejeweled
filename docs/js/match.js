/**
 * Match detection, valid-move search, and hints.
 */

export function findMatchGroups(grid, cols, rows) {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const groups = [];

  // Horizontal runs
  for (let y = 0; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      if (!grid[y][x].alive) {
        x++;
        continue;
      }
      const type = grid[y][x].type;
      let len = 1;
      while (x + len < cols && grid[y][x + len].alive && grid[y][x + len].type === type) len++;
      if (len >= 3) {
        const cells = [];
        for (let i = 0; i < len; i++) cells.push({ x: x + i, y });
        groups.push({ cells, type, axis: 'h', length: len });
        for (let i = 0; i < len; i++) visited[y][x + i] = true;
      }
      x += len;
    }
  }

  // Vertical runs
  for (let x = 0; x < cols; x++) {
    let y = 0;
    while (y < rows) {
      if (!grid[y][x].alive) {
        y++;
        continue;
      }
      const type = grid[y][x].type;
      let len = 1;
      while (y + len < rows && grid[y + len][x].alive && grid[y + len][x].type === type) len++;
      if (len >= 3) {
        const cells = [];
        for (let i = 0; i < len; i++) cells.push({ x, y: y + i });
        groups.push({ cells, type, axis: 'v', length: len });
        for (let i = 0; i < len; i++) visited[y + i][x] = true;
      }
      y += len;
    }
  }

  return groups;
}

/** Unique set of matched cell coordinates. */
export function flattenMatches(groups) {
  const key = (c) => `${c.x},${c.y}`;
  const map = new Map();
  for (const g of groups) {
    for (const c of g.cells) map.set(key(c), c);
  }
  return [...map.values()];
}

export function checkMatchAt(grid, cols, rows, x, y) {
  if (!grid[y]?.[x]?.alive) return false;
  const type = grid[y][x].type;

  let h = 1;
  for (let i = x - 1; i >= 0 && grid[y][i].alive && grid[y][i].type === type; i--) h++;
  for (let i = x + 1; i < cols && grid[y][i].alive && grid[y][i].type === type; i++) h++;
  if (h >= 3) return true;

  let v = 1;
  for (let i = y - 1; i >= 0 && grid[i][x].alive && grid[i][x].type === type; i--) v++;
  for (let i = y + 1; i < rows && grid[i][x].alive && grid[i][x].type === type; i++) v++;
  return v >= 3;
}

export function wouldCreateMatch(grid, cols, rows, x1, y1, x2, y2) {
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

/** Returns { a:{x,y}, b:{x,y} } for one valid swap, or null. */
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
