# Match Three Improvement Plan

## Vision
- Keep the “neon arcade” match-three feel while remaining a 100% static project: open `docs/index.html` in any modern browser and play.
- Use only plain JavaScript, HTML, CSS, and assets inside `docs/`; no Node.js, bundlers, build steps, or server dependencies.

## Constraints & Principles
- Structure code with simple ES modules or script tags that the browser can load directly from `docs/`.
- Avoid any tooling that requires installation (Node.js, npm, yarn, CLI generators, etc.).
- Prefer manual asset management and hand-written documentation over automated pipelines.
- Keep the repo friendly for GitHub Pages and local file browsing; optionally allow `python3 -m http.server` for testing but do not rely on it.

## Phase 1 – Core Cleanup
- Break `docs/game.js` into small modules (e.g., `docs/js/state.js`, `docs/js/grid.js`, `docs/js/ui.js`) and wire them with `<script type="module">`.
- Replace global state mutations with explicit module exports/imports and a lightweight pub/sub helper implemented manually.
- Add deterministic seeding helpers so the current plain JS code can recreate the same boards when needed.
- Create a short manual test checklist (board loads, swapping works, matches resolve, score updates) and store it in `README.md`.

## Phase 2 – Gameplay Depth
- Rebalance scoring: clarify combo tiers, move efficiency bonuses, and streak multipliers; surface numbers directly in the HUD.
- Introduce special tiles (line clears, bombs, color changers) using simple factory functions and data tables stored in plain JSON files under `docs/data/`.
- Expand inventory/boosters by extending the existing state modules; persist progress with vanilla `localStorage`.
- Add themed gem sets and backdrop animations using CSS classes and pre-rendered assets (no runtime asset pipeline).

## Phase 3 – Progression & UX
- Build level goals (score targets, blockers, rescue items) with configuration files that the game loads via `fetch` from `docs/data/`.
- Implement a basic profile screen that reads/writes JSON in `localStorage`; include schema migration helpers in plain JS.
- Improve responsiveness and accessibility using CSS media queries, optional reduced-motion toggles, and keyboard-only controls.
- Hook in `p5.sound` directly from `docs/addons/` and provide a simple audio settings overlay.

## Phase 4 – Community & Polish
- Ship daily/weekly seeded challenges by rotating the deterministic seed list; share codes via plain text copy buttons.
- Offer an optional manual leaderboard export/import (e.g., download/upload JSON) instead of an online backend.
- Add screenshot helpers using `canvas.toDataURL()` and simple share instructions in the UI.
- Optimize performance with selective redraws, sprite atlases prepared manually, and documented testing steps.

## Manual Workflow
- Edit files directly under `docs/`; when module splitting is necessary, keep relative paths simple and update the HTML manually.
- Test changes by opening `docs/index.html` in the browser (double-click or drag into the window); optionally run `python3 -m http.server` when a local host is required.
- When committing, include updated assets and note any manual steps taken (e.g., how sprites were exported).
- Track issues and feature ideas in `README.md` or GitHub Issues—no automated project boards needed.

## Immediate Next Steps
- Sketch the desired module layout inside `docs/js/` and create placeholder files without introducing any build tooling.
- Document the manual test checklist and seed/testing instructions in `README.md`.
- Audit existing assets in `docs/` and list replacements or new art/audio pieces needed for the neon arcade theme.
- Draft a lightweight roadmap for implementing level goals and special tiles within the current static setup.
