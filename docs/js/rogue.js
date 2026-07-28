/** Rogue meta-progression + difficulty tuning. */

export const MODES = {
  ZEN: 'zen',
  ROGUE: 'rogue',
};

export const DIFFICULTIES = {
  normal: {
    id: 'normal',
    label: 'Normal',
    blurb: '25 moves · fair targets',
    moveBase: 25,
    moveStep: 1,
    moveMin: 14,
    targetBase: 450,
    targetStep: 380,
    xpMult: 1,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    blurb: '20 moves · steeper goals',
    moveBase: 20,
    moveStep: 1,
    moveMin: 12,
    targetBase: 550,
    targetStep: 460,
    xpMult: 1.35,
  },
  brutal: {
    id: 'brutal',
    label: 'Brutal',
    blurb: '16 moves · mean targets',
    moveBase: 16,
    moveStep: 1,
    moveMin: 10,
    targetBase: 650,
    targetStep: 520,
    xpMult: 1.75,
  },
};

export function xpToNextLevel(level) {
  return Math.floor(80 + (level - 1) * 55 + Math.pow(level, 1.35) * 8);
}

export function floorMoves(difficulty, depth, bonusMoves = 0) {
  const d = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  return Math.max(d.moveMin, d.moveBase - (depth - 1) * d.moveStep) + bonusMoves;
}

export function floorTarget(difficulty, depth) {
  const d = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  return Math.floor(d.targetBase + (depth - 1) * d.targetStep + depth * depth * 12);
}

export function calcRunXp({ score, depthReached, floorsCleared, bestCombo, difficulty, wonFloor }) {
  const d = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const base =
    Math.floor(score / 40) +
    floorsCleared * 30 +
    Math.max(0, depthReached - 1) * 10 +
    Math.max(0, bestCombo - 1) * 8 +
    (wonFloor ? 15 : 0);
  return Math.max(5, Math.floor(base * d.xpMult));
}
