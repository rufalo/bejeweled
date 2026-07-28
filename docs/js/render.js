import { GEM_COLORS, GEM_SHAPES, SPECIAL } from './config.js';

export function drawBoardBackground(p5, w, h, tile) {
  // Deep teal-slate board well
  p5.noStroke();
  p5.fill(12, 22, 28);
  p5.rect(0, 0, w, h, tile * 0.12);

  p5.stroke(255, 255, 255, 18);
  p5.strokeWeight(1);
  for (let i = 1; i < w / tile; i++) {
    p5.line(i * tile, 0, i * tile, h);
  }
  for (let j = 1; j < h / tile; j++) {
    p5.line(0, j * tile, w, j * tile);
  }
}

export function drawGem(p5, tile, type, special, opts = {}) {
  const {
    selected = false,
    hover = false,
    highlight = false,
    hint = false,
    flash = 0,
    pop = 0,
    alpha = 255,
  } = opts;

  const pad = tile * 0.1;
  const size = tile - pad * 2;
  const cx = tile / 2;
  const cy = tile / 2;
  const colors = GEM_COLORS[type % GEM_COLORS.length];
  const shape = GEM_SHAPES[type % GEM_SHAPES.length];

  let scale = 1;
  if (flash > 0) scale = Math.max(0.15, flash / 22);
  if (pop > 0) scale = 1 + (1 - pop / 12) * 0.12;

  p5.push();
  p5.translate(cx, cy);
  p5.scale(scale);
  p5.translate(-cx, -cy);

  // Selection / hint ring
  if (selected || hint || highlight || hover) {
    p5.noFill();
    if (selected) {
      p5.stroke(255, 236, 150);
      p5.strokeWeight(3);
    } else if (hint) {
      p5.stroke(120, 255, 210, 180 + Math.sin(p5.frameCount * 0.25) * 60);
      p5.strokeWeight(3);
    } else if (highlight) {
      p5.stroke(255, 160, 60);
      p5.strokeWeight(2.5);
    } else {
      p5.stroke(255, 255, 255, 70);
      p5.strokeWeight(2);
    }
    p5.rect(pad * 0.4, pad * 0.4, tile - pad * 0.8, tile - pad * 0.8, tile * 0.18);
  }

  // Soft shadow
  p5.noStroke();
  p5.fill(0, 0, 0, Math.min(90, alpha * 0.35));
  drawShape(p5, shape, cx + 1.5, cy + 2.5, size * 0.92);

  // Body
  p5.fill(colors.fill[0], colors.fill[1], colors.fill[2], alpha);
  drawShape(p5, shape, cx, cy, size);

  // Specular
  p5.fill(255, 255, 255, Math.min(90, alpha * 0.35));
  drawShape(p5, shape, cx - size * 0.08, cy - size * 0.12, size * 0.45);

  // Special badges
  if (special === SPECIAL.ROCKET) {
    drawRocketBadge(p5, cx, cy, size, alpha);
  } else if (special === SPECIAL.BOMB) {
    drawBombBadge(p5, cx, cy, size, alpha);
  }

  p5.pop();
}

function drawShape(p5, shape, cx, cy, size) {
  const r = size / 2;
  p5.beginShape();
  if (shape === 'circle') {
    p5.circle(cx, cy, size);
    return;
  }
  if (shape === 'square') {
    p5.rectMode(p5.CENTER);
    p5.rect(cx, cy, size * 0.88, size * 0.88, size * 0.12);
    p5.rectMode(p5.CORNER);
    return;
  }
  if (shape === 'diamond') {
    p5.vertex(cx, cy - r);
    p5.vertex(cx + r * 0.85, cy);
    p5.vertex(cx, cy + r);
    p5.vertex(cx - r * 0.85, cy);
    p5.endShape(p5.CLOSE);
    return;
  }
  if (shape === 'triangle') {
    p5.vertex(cx, cy - r * 0.95);
    p5.vertex(cx + r * 0.95, cy + r * 0.75);
    p5.vertex(cx - r * 0.95, cy + r * 0.75);
    p5.endShape(p5.CLOSE);
    return;
  }
  if (shape === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      p5.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    p5.endShape(p5.CLOSE);
    return;
  }
  if (shape === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      p5.vertex(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    p5.endShape(p5.CLOSE);
    return;
  }
  p5.circle(cx, cy, size);
}

function drawRocketBadge(p5, cx, cy, size, alpha) {
  p5.push();
  p5.stroke(255, 255, 255, alpha);
  p5.strokeWeight(Math.max(2, size * 0.08));
  p5.line(cx - size * 0.28, cy, cx + size * 0.28, cy);
  p5.line(cx, cy - size * 0.28, cx, cy + size * 0.28);
  p5.noStroke();
  p5.fill(255, 255, 255, alpha);
  p5.circle(cx, cy, size * 0.18);
  p5.pop();
}

function drawBombBadge(p5, cx, cy, size, alpha) {
  p5.push();
  p5.noFill();
  p5.stroke(255, 255, 255, alpha);
  p5.strokeWeight(Math.max(2, size * 0.07));
  p5.circle(cx, cy, size * 0.42);
  p5.noStroke();
  p5.fill(255, 255, 255, alpha);
  p5.circle(cx, cy, size * 0.14);
  p5.pop();
}

export function drawFloatingTexts(p5, texts, boardToScreen) {
  for (const ft of texts) {
    const pos = boardToScreen(ft.bx, ft.by);
    const a = Math.floor((ft.life / ft.maxLife) * 255);
    p5.push();
    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.textSize(Math.max(16, ft.size || 22));
    p5.stroke(0, 0, 0, a * 0.7);
    p5.strokeWeight(3);
    p5.fill(255, 245, 200, a);
    p5.text(ft.text, pos.x, pos.y - ft.rise);
    p5.pop();
  }
}

export function drawComboBanner(p5, combo, w, tile) {
  if (combo <= 1) return;
  p5.push();
  p5.textAlign(p5.CENTER, p5.CENTER);
  p5.textSize(Math.max(22, tile * 0.55));
  p5.stroke(0, 40);
  p5.strokeWeight(4);
  p5.fill(255, 210, 90);
  p5.text(`${combo}× COMBO`, w / 2, tile * 0.7);
  p5.pop();
}
