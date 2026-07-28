# AGENTS.md

## Cursor Cloud specific instructions

This is a **static-only browser game** (match-three puzzle — Jewel Cascade) built with p5.js + vanilla ES modules. There is no backend, no database, no package manager, no build step, and no automated test suite.

### Running the game

Serve static files and open in a browser:

```
python3 -m http.server 8000
# Then visit http://localhost:8000/docs/index.html
```

All game source lives under `docs/`. Entry point: `docs/index.html` → `docs/p5.min.js` + `docs/js/main.js` (ES modules) + `docs/css/game.css`.

### Linting / Testing / Building

- **No linter, test runner, or build tool** is configured. Vanilla JS by design (see `plan.md`).
- Verify in Chrome (mobile viewport): swipe-to-swap, matches/cascades, specials, boosters, hint, rotate, restart, mute, game over.

### Key gotchas

- ES module imports require a real HTTP server; `file://` won't work due to CORS. Always use `python3 -m http.server`.
- The `docs/` directory is the GitHub Pages deploy root. Do not rename it without updating Pages settings.
- Primary controls are **swipe-to-swap**; tap-select remains as a fallback.
