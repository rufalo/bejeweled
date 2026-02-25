# AGENTS.md

## Cursor Cloud specific instructions

This is a **static-only browser game** (match-three puzzle) built with p5.js. There is no backend, no database, no package manager, no build step, and no automated test suite.

### Running the game

Serve static files and open in a browser:

```
python3 -m http.server 8000
# Then visit http://localhost:8000/docs/index.html
```

All game source lives under `docs/`. The entry point is `docs/index.html` which loads `docs/p5.min.js` and `docs/game.js`.

### Linting / Testing / Building

- **No linter, test runner, or build tool** is configured. The project uses vanilla JS with no tooling by design (see `plan.md` constraints).
- To verify correctness, open the game in Chrome and manually test: board loads, tile swapping works, matches resolve, score updates, rotation and restart buttons function.

### Key gotchas

- ES module imports (e.g. `SoundManager.js`) require a real HTTP server; `file://` won't work due to CORS. Always use `python3 -m http.server` rather than opening `index.html` directly.
- The `docs/` directory is also the GitHub Pages deploy root. Do not rename or restructure it without updating the repo's Pages settings.
