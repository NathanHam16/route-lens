# next-colocation-widget

Dev-only overlay for **Next.js App Router**: see what the **current page** imports, colored by colocation (green / red / orange). Draggable, resizable, focus subtree, inspect mode.

Not affiliated with Vercel or the Next.js project.

## Install

```bash
npm install -D next-colocation-widget
```

Peers: `react`, `react-dom`, `next` (14+).

## Quick start

**1. API route** — `app/api/dev/colocation/route.ts`:

```ts
import { createColocationRouteHandler } from 'next-colocation-widget/next';

export const GET = createColocationRouteHandler();
```

Optional config (extend defaults):

```ts
export const GET = createColocationRouteHandler({
  okPrefixes: ['components/ui/', 'lib/', 'components/copilot/'],
  productSibling: true, // app/foo/[id] + app/foo/_product/
});
```

**2. Widget** — in your root client providers:

```tsx
import { NextColocationWidget } from 'next-colocation-widget/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {process.env.NODE_ENV === 'development' && <NextColocationWidget />}
      {children}
    </>
  );
}
```

**3. Use:** click **loc** (bottom-left) or `Alt+Shift+C`. Drag title bar to move, bottom-right corner to resize.

## CLI

```bash
npx next-colocation-widget submissions/[id]
npx next-colocation-widget submissions/[id] --json
npx next-colocation-widget submissions/[id] --suspects-only
```

## Default rules (Next App Router)

| Bucket | Meaning |
|--------|---------|
| **ok** (green) | Under the same route folder as `page.tsx` |
| **cross** (red) | Another `app/...` route tree |
| **audit** (orange) | `components/...` used here — single owner? |
| **shared** (hidden) | `lib/`, `components/ui/`, etc. |

Override with `okPrefixes` and `productSibling` on the route handler (and matching CLI config later).

## vs architecture graph tools

[ReactGraph](https://github.com/robinnayak/reactgraph) and [Arch Atlas](https://github.com/phemymii/arch-atlas) map the **whole repo** in a separate window. This widget scopes to **the URL you're on** and sits over the running app — for "why is this component on *this* page?" while you click around.

## License

MIT
