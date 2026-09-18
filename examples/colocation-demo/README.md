# Route Lens — colocation demo

Minimal Next.js app that demonstrates **Route Lens** with intentional colocation smells.

## Run

```bash
cd examples/colocation-demo
npm install
npm run dev
```

Open **http://localhost:3000/blog** and press `Alt+Shift+C`.

## What to look at

| Route | Smells |
|-------|--------|
| `/blog` | **Red** — `ShopCard` imported from `/shop` (cross-route). **Orange** — `OrphanWidget` in `components/orphan/` (shared-feature). |
| `/shop` | Clean — `ShopCard` is colocated under the route. |

## Screenshots

Captured PNGs live in [`docs/screenshots/`](./docs/screenshots/). Re-capture after UI changes:

```bash
PORT=3099 npm run dev   # separate terminal
npm run screenshots
```

See the [main README visual tour](../../README.md#visual-tour) for annotated screenshots.
