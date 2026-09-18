# Colocation demo

```bash
npm install && npm run dev
```

Open **http://localhost:3000/blog** · **`Alt+Shift+C`**

| Route | Smells |
|-------|--------|
| `/blog` | Red: `ShopCard` from `/shop`. Orange: `OrphanWidget` in `components/orphan/`. |
| `/shop` | Clean — `ShopCard` is colocated. |

Screenshots: [`docs/screenshots/`](./docs/screenshots/) · re-capture: `npm run screenshots` (dev server on `PORT=3099`).

Main docs: [README visual tour](../../README.md#screenshots).
