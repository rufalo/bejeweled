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

window.mousePressed = function mousePressed() {
  pointerDown(game, mouseX, mouseY);
};

window.mouseDragged = function mouseDragged() {
  pointerMove(game, mouseX, mouseY);
};

window.mouseReleased = function mouseReleased() {
  pointerUp(game, mouseX, mouseY);
};

window.touchStarted = function touchStarted() {
  if (touches.length) {
    pointerDown(game, touches[0].x, touches[0].y);
  }
  return false;
};

window.touchMoved = function touchMoved() {
  if (touches.length) {
    pointerMove(game, touches[0].x, touches[0].y);
  }
  return false;
};

window.touchEnded = function touchEnded() {
  // Use last mouse coords which p5 updates from touch
  pointerUp(game, mouseX, mouseY);
  return false;
};

window.keyPressed = function keyPressed() {
  if (keyCode === ESCAPE) {
    pointerCancel(game);
  }
};
