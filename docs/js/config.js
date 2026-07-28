/** Game constants and theme tokens. */

export const GRID = { cols: 8, rows: 8 };

export const GEM_COUNT = 6;

/** Distinct silhouettes for colorblind-friendly play. */
export const GEM_SHAPES = ['circle', 'diamond', 'hex', 'triangle', 'square', 'star'];

export const GEM_COLORS = [
  { fill: [46, 204, 113], glow: [39, 174, 96] },   // emerald
  { fill: [52, 152, 219], glow: [41, 128, 185] },  // azure
  { fill: [231, 76, 60], glow: [192, 57, 43] },    // ruby
  { fill: [241, 196, 15], glow: [243, 156, 18] },  // topaz
  { fill: [26, 188, 156], glow: [22, 160, 133] },  // teal
  { fill: [230, 126, 34], glow: [211, 84, 0] },    // amber
];

export const SPECIAL = {
  NONE: 0,
  ROCKET: 1,
  BOMB: 2,
};

export const TIMING = {
  swapSpeed: 0.22,       // fraction of tile per frame-ish (lerp)
  dropSpeed: 0.28,
  destroyFrames: 18,
  flashFrames: 22,
  comboHoldFrames: 50,
};

export const SCORE = {
  match3: 30,
  match4: 60,
  match5: 100,
  matchExtra: 25,
  specialBonus: 40,
};

export const STORAGE_KEYS = {
  highScore: 'jewelCascade.highScore',
  bestCombo: 'jewelCascade.bestCombo',
  muted: 'jewelCascade.muted',
};

export const SWIPE_THRESHOLD = 24; // px before a drag counts as swipe
