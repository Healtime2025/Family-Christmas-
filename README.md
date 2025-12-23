# Mirror OS • Family Christmas Tree 🎄

A looping, animated Christmas tree that celebrates your family with names + affirmations,
with optional voice, pause/play, shuffle, speed, brightness, and two tree styles.

## Run locally
Because browsers restrict some PWA features on `file://`, use a tiny local server:

### Option A: Python (recommended)
```bash
cd mirroros-family-christmas-tree
python -m http.server 8080
```
Open: http://localhost:8080

### Option B: Node
```bash
npx serve .
```

## Install as an app (PWA)
- Open in Chrome/Edge
- Click **Install** in the address bar (or menu)

## Customize family
Open `app.js` and edit:

- `FAMILY` (names + traits)
- `EXTRA_TRAITS`
- `PHRASE_TEMPLATES`

## Deploy (Vercel)
This is a static app. You can deploy it as-is:
- Create a new Vercel project
- Import this folder
- Framework preset: **Other**
- Build command: *(none)*
- Output directory: `./`

Enjoy your Christmas loop ✨
