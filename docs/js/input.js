import { SWIPE_THRESHOLD } from './config.js';
import { areAdjacent } from './match.js';

/**
 * Unified pointer input: tap-select and swipe-to-swap.
 * Coordinates are in canvas space.
 */
export function createInputController(callbacks) {
  const state = {
    down: false,
    startX: 0,
    startY: 0,
    startCell: null,
    swiped: false,
    suppressClick: false,
  };

  function cellAt(game, canvasX, canvasY) {
    return game.screenToCell(canvasX, canvasY);
  }

  function onPointerDown(game, x, y) {
    if (!game.canInteract()) return;
    state.down = true;
    state.swiped = false;
    state.suppressClick = false;
    state.startX = x;
    state.startY = y;
    state.startCell = cellAt(game, x, y);
  }

  function onPointerMove(game, x, y) {
    if (!state.down || !state.startCell || state.swiped) return;
    if (!game.canInteract()) return;

    const dx = x - state.startX;
    const dy = y - state.startY;
    if (Math.hypot(dx, dy) < SWIPE_THRESHOLD) return;

    // Dominant axis
    let target = null;
    if (Math.abs(dx) >= Math.abs(dy)) {
      target = { x: state.startCell.x + (dx > 0 ? 1 : -1), y: state.startCell.y };
    } else {
      target = { x: state.startCell.x, y: state.startCell.y + (dy > 0 ? 1 : -1) };
    }

    if (
      target.x >= 0 &&
      target.y >= 0 &&
      target.x < game.cols &&
      target.y < game.rows &&
      areAdjacent(state.startCell, target)
    ) {
      state.swiped = true;
      state.suppressClick = true;
      state.down = false;
      callbacks.onSwipe(state.startCell, target);
    }
  }

  function onPointerUp(game, x, y) {
    if (!state.down) {
      state.down = false;
      return;
    }
    state.down = false;

    if (state.suppressClick || state.swiped) return;
    if (!game.canInteract()) return;

    const cell = cellAt(game, x, y);
    if (cell) callbacks.onTap(cell);
  }

  function onPointerCancel() {
    state.down = false;
    state.swiped = false;
  }

  return {
    state,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
