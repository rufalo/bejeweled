# Jewel Cascade — Remake Plan

## Vision
Turn the existing Bejeweled-style prototype into a polished, **mobile-first** match-three that deploys on GitHub Pages with zero build steps. Keep neon arcade energy, but make phones the primary target: swipe to swap, thumb-zone controls, and a single-screen layout that never requires scrolling.

## Non-negotiables
- Static only: HTML / CSS / JS under `docs/` (GitHub Pages root).
- No Node, npm, bundlers, or backend.
- ES modules loaded by the browser; serve via GitHub Pages or `python3 -m http.server`.
- Keep p5.js for canvas rendering (already vendored).
- Works offline after first load (localStorage only).

## Current gaps
| Area | Problem |
|------|---------|
| Controls | Click-select then click-adjacent; no swipe; awkward on phones |
| Layout | Buttons below canvas; UI overflows small viewports |
| Touch | No `touch-action` / gesture handling; hover-centric feedback |
| Depth | No special gems from 4+/5 matches |
| Feedback | Flat colored squares; weak audio/particles |
| Structure | Monolithic `game.js` (~1.2k lines) |

## Architecture
```
docs/
  index.html          # shell + HUD markup
  css/game.css        # mobile-first layout + theme
  js/
    main.js           # p5 bridge (setup/draw/input)
    game.js           # state machine / loop orchestration
    config.js         # sizes, scoring, colors, timings
    board.js          # grid, gravity, spawn, rotation
    match.js          # match find, valid moves, hints
    specials.js       # rockets, bombs, activation
    input.js          # swipe + tap (touch & mouse)
    render.js         # gem shapes, highlights, FX draw
    particles.js      # burst particles
    audio.js          # Web Audio SFX (no asset files)
    ui.js             # HUD, overlays, button wiring
    storage.js        # high score / settings
  p5.min.js
```

## Feature set (this remake)

### Core gameplay
- 8×8 board, 6 gem types with distinct shapes (colorblind-friendly).
- Match 3+ clears; cascades with rising combo multiplier.
- Invalid swaps animate back.
- Board rotation (kept as optional power move).
- Game over when no valid swaps remain.

### Specials
- **Match 4** → Rocket (clears full row *or* column on activate).
- **Match 5+** → Bomb (clears 3×3 when matched/activated).
- Matching a special activates it; specials can chain.

### Boosters (earned from color clears)
- Hammer — destroy one gem.
- Scramble — reshuffle a row or column.
- Cycle — shift colors along a row or column.

### Mobile controls
- **Swipe** adjacent gems to swap (primary).
- Tap-select still supported.
- Large bottom toolbar for boosters / hint / rotate / restart.
- `touch-action: none`, no page scroll/zoom while playing.
- Dynamic board sizing with safe-area insets.

### Juice & UX
- Particle bursts + floating score text.
- Combo banner.
- Hint pulse (highlights one valid move).
- Web Audio blips (match, swap, special, game over).
- Mute toggle; volume persisted.
- Start splash + game-over overlay (HTML, not canvas text).

### Persistence
- High score, mute preference, best combo via `localStorage`.

## Phased delivery
1. **Shell + modules** — new HTML/CSS, module skeleton, config.
2. **Playable core** — board, match, gravity, cascades, scoring.
3. **Mobile input** — swipe/tap, responsive canvas, thumb UI.
4. **Specials + boosters** — rockets/bombs + inventory tools.
5. **Polish** — particles, audio, hints, overlays, README.

## Manual test checklist
- [ ] Board fills with no initial matches
- [ ] Swipe swaps adjacent gems on phone-sized viewport
- [ ] Tap-select + tap-adjacent still works
- [ ] Matches clear, gems fall, cascades score with combo
- [ ] Match-4 creates rocket; activating clears line
- [ ] Match-5 creates bomb; activating clears neighborhood
- [ ] Boosters enable/disable correctly; cancel works
- [ ] Hint highlights a real move
- [ ] Rotate works without breaking touch mapping
- [ ] Mute persists; high score updates
- [ ] Game over overlay + restart
- [ ] No vertical page scroll while dragging on board
- [ ] GitHub Pages path works (`/bejeweled/` or `/docs/` locally)

## Out of scope (later)
- Online leaderboards, accounts, ads
- Bundlers / TypeScript / frameworks
- Level campaign / blockers (can follow as data-driven JSON under `docs/data/`)
