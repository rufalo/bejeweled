# Jewel Cascade

Mobile-first match-three with a **Rogue** descent mode. Static site — no build step, no backend.

**Play:** [https://rufalo.github.io/bejeweled/](https://rufalo.github.io/bejeweled/)

## Local

```bash
python3 -m http.server 8000
# open http://localhost:8000/docs/
```

ES modules need an HTTP server (`file://` will fail CORS).

## Modes
- **Rogue** — limited moves, floor score goals, run perks, XP + permanent meta perks on level-up (Normal / Hard / Brutal)
- **Zen** — endless classic high-score mode

## Features
- Swipe-to-swap controls tuned for phones
- Shape-coded gems, rockets, bombs, boosters
- Hint, board rotate, combos, particles, Web Audio SFX
- Progress saved in `localStorage` (high score, mute, rogue profile)

## Manual test checklist
- Start screen shows level / XP / difficulties
- Rogue Normal: moves count down, goal fills, floor advances after perk pick
- Hard/Brutal start with fewer moves
- Level-up after enough XP offers a permanent perk
- Zen mode still plays without move limits
- Hint, rotate, mute, menu still work

## Stack
- `docs/` is the GitHub Pages root
- p5.js (vendored) + vanilla ES modules
- See `plan.md` for the longer roadmap
