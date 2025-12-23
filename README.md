# Mirror OS • Family Christmas Tree 🎄 (v2)

A looping, animated Christmas tree that celebrates your family with names + affirmations.

## Features
- Two tree styles: **Golden Spiral** + **String Lights Cone**
- **Words scroll ON the tree** (glowing light text)
- Pause/Play, Next, Shuffle, Speed, Brightness
- Optional Voice (Web Speech API)
- **Cinematic mode** (hide UI) — click the button or press **C**
- Offline-ready PWA (service worker + manifest)

## Run locally
Use a local server (recommended):
```bash
cd mirroros-family-christmas-tree-v2
python -m http.server 8080
```
Open: http://localhost:8080

## Customize family
Edit `app.js` → `FAMILY` array (names + traits).

## Deploy
Deploy as a static site (Vercel preset: **Other**).
