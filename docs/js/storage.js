import { STORAGE_KEYS } from './config.js';

export function loadHighScore() {
  const v = localStorage.getItem(STORAGE_KEYS.highScore);
  return v !== null ? parseInt(v, 10) || 0 : 0;
}

export function saveHighScore(score) {
  const current = loadHighScore();
  if (score > current) {
    localStorage.setItem(STORAGE_KEYS.highScore, String(score));
    return score;
  }
  return current;
}

export function loadBestCombo() {
  const v = localStorage.getItem(STORAGE_KEYS.bestCombo);
  return v !== null ? parseInt(v, 10) || 1 : 1;
}

export function saveBestCombo(combo) {
  const current = loadBestCombo();
  if (combo > current) {
    localStorage.setItem(STORAGE_KEYS.bestCombo, String(combo));
    return combo;
  }
  return current;
}

export function loadMuted() {
  return localStorage.getItem(STORAGE_KEYS.muted) === '1';
}

export function saveMuted(muted) {
  localStorage.setItem(STORAGE_KEYS.muted, muted ? '1' : '0');
}
