import { GEM_COUNT, SPECIAL } from './config.js';

export function createTile(type = null, special = SPECIAL.NONE) {
  return {
    type: type === null ? Math.floor(Math.random() * GEM_COUNT) : type,
    special,
    alive: true,
    selected: false,
    // visual offsets in tile fractions (0..1 scale applied at render)
    slideX: 0,
    slideY: 0,
    drop: 0,
    flash: 0,
    pop: 0,
  };
}

export function cloneVisualState(from, to) {
  to.slideX = from.slideX;
  to.slideY = from.slideY;
  to.drop = from.drop;
  to.flash = from.flash;
  to.pop = from.pop;
  to.selected = false;
}

/**
 * Create an empty NxM grid of nulls, then fill without initial matches.
 */
export function createBoard(cols, rows) {
  const grid = [];
  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      grid[y][x] = createTileNoMatch(grid, x, y);
    }
  }
  return grid;
}

function createTileNoMatch(grid, x, y) {
  let tile;
  for (let attempt = 0; attempt < 40; attempt++) {
    tile = createTile();
    if (!wouldMatchAt(grid, x, y, tile.type)) return tile;
  }
  return tile;
}

function wouldMatchAt(grid, x, y, type) {
  if (x >= 2 && grid[y][x - 1]?.type === type && grid[y][x - 2]?.type === type) return true;
  if (y >= 2 && grid[y - 1]?.[x]?.type === type && grid[y - 2]?.[x]?.type === type) return true;
  return false;
}

export function applyGravity(grid, cols, rows) {
  let moved = false;
  for (let x = 0; x < cols; x++) {
    for (let y = rows - 1; y >= 0; y--) {
      if (!grid[y][x].alive) {
        for (let above = y - 1; above >= 0; above--) {
          if (grid[above][x].alive) {
            const falling = grid[above][x];
            grid[y][x] = falling;
            grid[above][x] = createTile();
            grid[above][x].alive = false;
            falling.drop += (y - above);
            moved = true;
            break;
          }
        }
      }
    }
  }

  for (let x = 0; x < cols; x++) {
    let spawnCount = 0;
    for (let y = 0; y < rows; y++) {
      if (!grid[y][x].alive) spawnCount++;
    }
    let spawned = 0;
    for (let y = 0; y < rows; y++) {
      if (!grid[y][x].alive) {
        const tile = createTile();
        tile.drop = spawnCount - spawned;
        grid[y][x] = tile;
        spawned++;
        moved = true;
      }
    }
  }

  return moved;
}

/** Rotate grid 90° clockwise (dir=1) or counter-clockwise (dir=-1). */
export function rotateGrid(grid, cols, rows, dir) {
  const newCols = rows;
  const newRows = cols;
  const next = Array.from({ length: newRows }, () => new Array(newCols));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = grid[y][x];
      tile.slideX = 0;
      tile.slideY = 0;
      tile.drop = 0;
      tile.selected = false;
      let nx;
      let ny;
      if (dir === 1) {
        nx = rows - 1 - y;
        ny = x;
      } else {
        nx = y;
        ny = cols - 1 - x;
      }
      next[ny][nx] = tile;
    }
  }

  return { grid: next, cols: newCols, rows: newRows };
}

export function anyDropping(grid, cols, rows) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x].drop > 0.01) return true;
    }
  }
  return false;
}

export function anySliding(grid, cols, rows) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = grid[y][x];
      if (Math.abs(t.slideX) > 0.01 || Math.abs(t.slideY) > 0.01) return true;
    }
  }
  return false;
}

export function tickMotion(grid, cols, rows, dropSpeed, swapSpeed) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = grid[y][x];
      if (t.drop > 0) {
        t.drop = Math.max(0, t.drop - dropSpeed);
      }
      if (t.slideX !== 0) {
        const step = Math.sign(t.slideX) * Math.min(Math.abs(t.slideX), swapSpeed);
        t.slideX -= step;
        if (Math.abs(t.slideX) < 0.001) t.slideX = 0;
      }
      if (t.slideY !== 0) {
        const step = Math.sign(t.slideY) * Math.min(Math.abs(t.slideY), swapSpeed);
        t.slideY -= step;
        if (Math.abs(t.slideY) < 0.001) t.slideY = 0;
      }
      if (t.flash > 0) t.flash--;
      if (t.pop > 0) t.pop--;
    }
  }
}
