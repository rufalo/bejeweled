/**
 * Perk catalog for Rogue runs.
 * Run perks apply only for the current descent.
 * Meta perks (permanent) stack across runs via the profile.
 */

export const PERKS = {
  // ── Run perks (picked after clearing a floor) ──
  extra_moves: {
    id: 'extra_moves',
    name: 'Deep Breath',
    desc: '+3 moves this floor (and each new floor).',
    kind: 'run',
    rarity: 'common',
    applyRun(run) {
      run.bonusMoves += 3;
      run.movesLeft += 3;
    },
  },
  score_surge: {
    id: 'score_surge',
    name: 'Gilded Touch',
    desc: '+25% score from matches.',
    kind: 'run',
    rarity: 'common',
    applyRun(run) {
      run.scoreMult *= 1.25;
    },
  },
  starter_hammer: {
    id: 'starter_hammer',
    name: 'Pocket Hammer',
    desc: 'Gain 2 Hammers now.',
    kind: 'run',
    rarity: 'common',
    applyRun(run, game) {
      game.inventory.hammer += 2;
    },
  },
  starter_kit: {
    id: 'starter_kit',
    name: 'Tool Belt',
    desc: '+1 Hammer, Scramble, and Cycle.',
    kind: 'run',
    rarity: 'common',
    applyRun(run, game) {
      game.inventory.hammer += 1;
      game.inventory.scramble += 1;
      game.inventory.cycle += 1;
    },
  },
  combo_spark: {
    id: 'combo_spark',
    name: 'Cascade Spark',
    desc: 'Combos start at 2× after each swap.',
    kind: 'run',
    rarity: 'uncommon',
    applyRun(run) {
      run.comboStart = Math.max(run.comboStart, 2);
    },
  },
  rocket_rich: {
    id: 'rocket_rich',
    name: 'Fuse Shortener',
    desc: 'Match-3 leaves a Rocket (5+ still Bomb).',
    kind: 'run',
    rarity: 'uncommon',
    applyRun(run) {
      run.easyRockets = true;
    },
  },
  bomb_buddy: {
    id: 'bomb_buddy',
    name: 'Blast Cap',
    desc: 'Bombs clear a 5×5 area instead of 3×3.',
    kind: 'run',
    rarity: 'rare',
    applyRun(run) {
      run.bigBombs = true;
    },
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger',
    desc: 'Booster drops are twice as likely.',
    kind: 'run',
    rarity: 'uncommon',
    applyRun(run) {
      run.boosterChance = 2;
    },
  },
  second_wind: {
    id: 'second_wind',
    name: 'Second Wind',
    desc: 'Once per floor, hitting 0 moves restores 5 moves.',
    kind: 'run',
    rarity: 'rare',
    applyRun(run) {
      run.secondWind = true;
      run.secondWindUsed = false;
    },
  },
  xp_hunter: {
    id: 'xp_hunter',
    name: 'Archivist',
    desc: '+40% XP earned this run.',
    kind: 'run',
    rarity: 'uncommon',
    applyRun(run) {
      run.xpMult *= 1.4;
    },
  },

  // ── Meta perks (permanent, picked on level-up) ──
  meta_moves: {
    id: 'meta_moves',
    name: 'Seasoned Path',
    desc: 'Permanent: +1 move on every Rogue floor.',
    kind: 'meta',
    rarity: 'common',
  },
  meta_hammer: {
    id: 'meta_hammer',
    name: 'Always Packed',
    desc: 'Permanent: start each Rogue run with +1 Hammer.',
    kind: 'meta',
    rarity: 'common',
  },
  meta_score: {
    id: 'meta_score',
    name: 'Keen Eye',
    desc: 'Permanent: +10% match score in Rogue.',
    kind: 'meta',
    rarity: 'common',
  },
  meta_xp: {
    id: 'meta_xp',
    name: 'Quick Study',
    desc: 'Permanent: +15% XP from Rogue runs.',
    kind: 'meta',
    rarity: 'uncommon',
  },
  meta_scramble: {
    id: 'meta_scramble',
    name: 'Lucky Bag',
    desc: 'Permanent: start each Rogue run with +1 Scramble.',
    kind: 'meta',
    rarity: 'common',
  },
  meta_combo: {
    id: 'meta_combo',
    name: 'Momentum',
    desc: 'Permanent: first combo step is free (start at 2×).',
    kind: 'meta',
    rarity: 'uncommon',
  },
  meta_target: {
    id: 'meta_target',
    name: 'Negotiator',
    desc: 'Permanent: floor score targets are 8% lower.',
    kind: 'meta',
    rarity: 'rare',
  },
  meta_wind: {
    id: 'meta_wind',
    name: 'Lucky Break',
    desc: 'Permanent: Second Wind once per run (5 moves at 0).',
    kind: 'meta',
    rarity: 'rare',
  },
};

export const RUN_PERK_IDS = Object.keys(PERKS).filter((id) => PERKS[id].kind === 'run');
export const META_PERK_IDS = Object.keys(PERKS).filter((id) => PERKS[id].kind === 'meta');

const RARITY_WEIGHT = { common: 5, uncommon: 3, rare: 1 };

export function createEmptyRunModifiers() {
  return {
    bonusMoves: 0,
    scoreMult: 1,
    comboStart: 1,
    easyRockets: false,
    bigBombs: false,
    boosterChance: 1,
    secondWind: false,
    secondWindUsed: false,
    xpMult: 1,
    perkIds: [],
  };
}

/** Apply meta permanent bonuses into a fresh run modifier bag. */
export function applyMetaToRun(run, metaPerkIds) {
  for (const id of metaPerkIds) {
    if (id === 'meta_moves') run.bonusMoves += 1;
    if (id === 'meta_score') run.scoreMult *= 1.1;
    if (id === 'meta_xp') run.xpMult *= 1.15;
    if (id === 'meta_combo') run.comboStart = Math.max(run.comboStart, 2);
    if (id === 'meta_wind') {
      run.secondWind = true;
      run.secondWindUsed = false;
    }
  }
}

export function startingInventoryFromMeta(metaPerkIds) {
  const inv = { hammer: 0, scramble: 0, cycle: 0 };
  for (const id of metaPerkIds) {
    if (id === 'meta_hammer') inv.hammer += 1;
    if (id === 'meta_scramble') inv.scramble += 1;
  }
  return inv;
}

export function targetMultiplierFromMeta(metaPerkIds) {
  return metaPerkIds.includes('meta_target') ? 0.92 : 1;
}

/**
 * Pick `count` unique perks from a pool, weighted by rarity.
 * Excludes ids already owned.
 */
export function rollPerkChoices(poolIds, ownedIds, count = 3) {
  const owned = new Set(ownedIds);
  const available = poolIds.filter((id) => !owned.has(id) && PERKS[id]);
  if (available.length === 0) return [];

  const picks = [];
  const bag = [...available];
  while (picks.length < count && bag.length > 0) {
    const weights = bag.map((id) => RARITY_WEIGHT[PERKS[id].rarity] || 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < bag.length; idx++) {
      roll -= weights[idx];
      if (roll <= 0) break;
    }
    idx = Math.min(idx, bag.length - 1);
    picks.push(bag[idx]);
    bag.splice(idx, 1);
  }
  return picks.map((id) => PERKS[id]);
}
