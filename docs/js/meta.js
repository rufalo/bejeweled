import { STORAGE_KEYS } from './config.js';
import { xpToNextLevel } from './rogue.js';
import { META_PERK_IDS } from './perks.js';

const DEFAULT_PROFILE = () => ({
  xp: 0,
  level: 1,
  metaPerks: [],
  bestDepth: 0,
  totalRuns: 0,
  totalFloors: 0,
  preferredDifficulty: 'normal',
});

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile);
    if (!raw) return DEFAULT_PROFILE();
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE(),
      ...parsed,
      metaPerks: Array.isArray(parsed.metaPerks)
        ? parsed.metaPerks.filter((id) => META_PERK_IDS.includes(id))
        : [],
    };
  } catch {
    return DEFAULT_PROFILE();
  }
}

export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

/**
 * Add XP; returns { profile, levelsGained }.
 * Does not auto-pick meta perks — caller shows level-up UI.
 */
export function grantXp(profile, amount) {
  const next = { ...profile, xp: profile.xp + Math.max(0, amount) };
  let levelsGained = 0;
  let needed = xpToNextLevel(next.level);
  while (next.xp >= needed) {
    next.xp -= needed;
    next.level += 1;
    levelsGained += 1;
    needed = xpToNextLevel(next.level);
  }
  saveProfile(next);
  return { profile: next, levelsGained };
}

export function addMetaPerk(profile, perkId) {
  if (!META_PERK_IDS.includes(perkId)) return profile;
  if (profile.metaPerks.includes(perkId)) return profile;
  const next = { ...profile, metaPerks: [...profile.metaPerks, perkId] };
  saveProfile(next);
  return next;
}

export function xpProgress(profile) {
  const need = xpToNextLevel(profile.level);
  return {
    level: profile.level,
    xp: profile.xp,
    need,
    ratio: Math.min(1, profile.xp / need),
  };
}
