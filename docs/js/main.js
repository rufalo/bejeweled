import {
  createGame,
  setupP5,
  windowResized,
  drawFrame,
  pointerDown,
  pointerMove,
  pointerUp,
  pointerCancel,
} from './game.js';

const game = createGame();

function canvasEl() {
  return document.querySelector('#board-host canvas');
}

function eventOnCanvas(event) {
  const canvas = canvasEl();
  if (!canvas) return false;
  if (!event || !event.target) {
    // Fallback: accept if pointer is inside canvas bounds
    return (
      typeof mouseX === 'number' &&
      typeof mouseY === 'number' &&
      mouseX >= 0 &&
      mouseY >= 0 &&
      mouseX <= game.canvasW &&
      mouseY <= game.canvasH
    );
  }
  return event.target === canvas || canvas.contains(event.target);
}

// p5 global-mode hooks
window.setup = function setup() {
  setupP5(game, window);
};

window.draw = function draw() {
  drawFrame(game);
};

window.windowResized = function onResize() {
  windowResized(game);
};

window.mousePressed = function mousePressed(event) {
  if (!eventOnCanvas(event)) return;
  pointerDown(game, mouseX, mouseY);
};

window.mouseDragged = function mouseDragged(event) {
  if (!eventOnCanvas(event) && !game.input.state.down) return;
  pointerMove(game, mouseX, mouseY);
};

window.mouseReleased = function mouseReleased(event) {
  if (!game.input.state.down) return;
  pointerUp(game, mouseX, mouseY);
};

window.touchStarted = function touchStarted(event) {
  // Do not steal touches meant for HUD buttons
  if (!eventOnCanvas(event)) return true;
  if (touches.length) {
    pointerDown(game, touches[0].x, touches[0].y);
  }
  return false;
};

window.touchMoved = function touchMoved(event) {
  if (!game.input.state.down) return true;
  if (touches.length) {
    pointerMove(game, touches[0].x, touches[0].y);
  }
  return false;
};

window.touchEnded = function touchEnded() {
  if (!game.input.state.down) return true;
  pointerUp(game, mouseX, mouseY);
  return false;
};

window.keyPressed = function keyPressed() {
  if (keyCode === ESCAPE) {
    pointerCancel(game);
  }
};
