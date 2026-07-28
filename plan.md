# Jewel Cascade — Next Features Roadmap

## Status (2026-07-28)
- Remake PR [#17](https://github.com/rufalo/bejeweled/pull/17) is **merged**.
- Vercel checks: **pass**.
- GitHub Pages live: [https://rufalo.github.io/bejeweled/](https://rufalo.github.io/bejeweled/) (Jewel Cascade shell confirmed).

## Constraints (unchanged)
- Static only under `docs/` — no backend, npm, or build step.
- Mobile-first; thumb-zone UI; ES modules + vendored p5.js.
- Persist with `localStorage`; optional `docs/data/*.json` for levels/seeds.

---

## Design north star
Lean into what already makes this game *weird in a good way*: **board rotation as a real tactic**, swipe-native mobile play, and readable shape-coded gems. Next features should create “one more run” hooks without turning it into a generic Candy Crush clone.

---

## Wave A — Instant fun (small, high juice)

### 1. Gravity Flip (rotation 2.0)
Rotation already exists — make it a *skill*.
- Spending a rotate costs 0 moves but **changes fall direction** until the next rotate (visual gravity arrow).
- Optional: “Gyro tip” — after rotate, briefly show which way gems will fall.
- Why it’s fun: players plan setups *above* the match, then flip the board to drop a cascade.

### 2. Prism / Color Burst special
New special from L / T shapes (or match-of-4 in both axes):
- **Prism** — tap/match it to convert adjacent gems to one chosen color (or the most common neighbor color).
- Chains beautifully with rockets/bombs.
- Modules: extend `specials.js` + badge in `render.js`.

### 3. Streak meter & Fever Mode
- Fill a meter with consecutive matches without an invalid swap.
- At full: **Fever** for ~8 seconds — 2× score, gems shimmer, slightly faster drops.
- Mobile-friendly: meter sits in the existing HUD row (no new chrome clutter).

### 4. Daily Seed Challenge
- Deterministic board from `YYYY-MM-DD` (+ optional player salt).
- Same puzzle worldwide that day; share a plain-text result card:
  `Jewel Cascade Daily 2026-07-28 — 12,400 pts · 34 moves · 6× best combo`
- Copy button; no server. Seed list / generator in `docs/js/seed.js`.

---

## Wave B — Modes that change how you think

### 5. Zen vs Surge (two run types)
| Mode | Feel |
|------|------|
| **Zen** | Unlimited moves, chase high score / best combo (current vibe) |
| **Surge** | 30 moves; score targets with star ratings (1–3) |

- Mode picker on the start overlay.
- Surge goals from `docs/data/surge.json` (static).

### 6. Quake Boards
Timed board “quakes”:
- Every N moves, a random column/row **shuffles one step** or a stone drops in.
- Teaches recovery skills; pairs with Hammer/Scramble.
- Telegraphed 1 move ahead with a crack overlay so it never feels cheap.

### 7. Relic Run (roguelite lite)
- After each game over, pick **1 of 3 relics** that modify the *next* run only (or persist in a short season):
  - *Double Hammer starts*
  - *Rockets clear both row and column always*
  - *First rotate is free + Fever kick*
  - *Gems of one shape score +50%*
- Stored as a tiny `localStorage` “run card”. Deep without accounts.

### 8. Twin Swap (co-op hotseat / pass-phone)
- Two local players alternate moves on one phone.
- Shared board; separate scores; “steal” when you start a cascade on the opponent’s leftover setup.
- Perfect for the mobile form factor.

---

## Wave C — Spectacle & identity

### 9. Theme packs (cosmetic, data-driven)
- JSON packs: colors, shape set, backdrop gradient, SFX pitch profile.
  - *Tideglass* (current teal)
  - *Ember Quarry* (warm stone + lava accents — not purple-glow AI default)
  - *Aurora Ice*
- Unlock by reaching score milestones or clearing Daily N times.
- Still static assets / CSS variables — no downloads.

### 10. Gem personalities (lightweight narrative juice)
- Rare “echo gems” with a one-line taunt when matched (“Nice chain.” / “Again!”).
- Purely flavor; toggle in settings for players who want silence.

### 11. Replay ribbon
- Record the last ~60 swaps as a compact seed + move list.
- “Watch last run” replays swaps at 2× with combo callouts.
- Shareable as a short code string (no video upload).

### 12. Accessibility pack
- High-contrast / pattern fills on gems.
- Reduced-motion (skip particles, instant swaps).
- Larger tap targets option; screen-reader labels already partly there — finish them.

---

## Wave D — Stretch (still static-friendly)

### 13. Campaign pockets
- 20 handcrafted boards in `docs/data/levels.json` with goals: score, clear N bombs, survive quakes, rotate exactly twice.
- Not a live-ops treadmill — a finite postcard collection.

### 14. Exportable hall of fame
- Local bests export/import as JSON file (download + file picker).
- Friends can compare Daily results by pasting score lines in chat.

### 15. Optional soft PWA
- `manifest.webmanifest` + icons so “Add to Home Screen” feels like an app.
- Still no service-worker complexity required at first (or a tiny cache-first SW later).

---

## Suggested build order
1. **Fever Mode + streak meter** — juice everyone feels immediately.
2. **Daily Seed Challenge** — reason to open the link tomorrow.
3. **Gravity Flip clarity** — doubles down on the unique rotate mechanic.
4. **Prism special** — new puzzle vocabulary.
5. **Zen / Surge modes** — structure for goals without a backend.
6. Then Relic Run or Quake, then themes / campaign.

## Explicit non-goals (for now)
- Accounts, online leaderboards, ads, IAP.
- Rewriting off p5 unless forced by perf.
- Anything that breaks GitHub Pages / `docs/` root.

## Decision ask
Pick a first wave to implement (recommended: **Fever + Daily Seed**), or call out favorites from Waves B–D and we’ll sequence those instead.
