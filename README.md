# Jewel Cascade

Mobile-first match-three puzzle game. Static site — no build step, no backend.

**Play:** [https://rufalo.github.io/bejeweled/](https://rufalo.github.io/bejeweled/)

## Local

```bash
python3 -m http.server 8000
# open http://localhost:8000/docs/
```

ES modules need an HTTP server (`file://` will fail CORS).

## What’s new
- Swipe-to-swap controls tuned for phones
- Thumb-zone toolbar + single-screen layout (no scroll)
- Shape-coded gems (colorblind-friendlier)
- Specials: match 4 → rocket, match 5 → bomb
- Boosters: Hammer, Scramble, Cycle (earned from color clears)
- Hint, board rotate, combo scoring, particles, Web Audio SFX
- High score / mute / best combo in `localStorage`

## Manual test checklist
- Board loads with no opening matches
- Swipe adjacent gems to swap; invalid swaps bounce back
- Tap-select + tap-adjacent still works
- Cascades award combo multipliers
- Match-4 creates a rocket; matching it clears a cross
- Match-5 creates a bomb; matching it clears a 3×3
- Boosters enable when earned; cancel exits targeting
- Hint pulses a valid move
- Rotate remaps the board without breaking input
- Mute and high score persist across refresh
- Game-over overlay + Play again
- Dragging on the board does not scroll the page

## Stack
- `docs/` is the GitHub Pages root
- p5.js (vendored) + vanilla ES modules
- See `plan.md` for the remake roadmap
