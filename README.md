# route-lens

Dev-only overlay for **Next.js App Router**: see what the **current page** imports, colored by colocation (green / red / orange). Draggable, resizable, focus subtree, inspect mode.

Not affiliated with Vercel or the Next.js project.

## Install

```bash
npm install -D route-lens
```

Peers: `react`, `react-dom`, `next` (14+).

## Quick start

**1. API route** — `app/api/dev/route-lens/route.ts`:

```ts
import { createRouteLensHandler } from 'route-lens/next';

export const GET = createRouteLensHandler();
```

Optional config:

```ts
export const GET = createRouteLensHandler({
  okPrefixes: ['components/ui/', 'lib/', 'components/copilot/'],
  productSibling: true, // app/foo/[id] + app/foo/_product/
});
```

**2. Widget** — in your root client providers:

```tsx
import { RouteLens } from 'route-lens/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {process.env.NODE_ENV === 'development' && <RouteLens />}
      {children}
    </>
  );
}
```

**3. Use:** click **loc** (bottom-left) or `Alt+Shift+C`. Drag to move, resize from the bottom-right corner.

## CLI

```bash
npx route-lens submissions/[id]
npx route-lens submissions/[id] --json
npx route-lens submissions/[id] --suspects-only
```

## Default rules (Next App Router)

| Color | Meaning |
|-------|---------|
| **Green** | Under the same route folder as `page.tsx` |
| **Red** | Another `app/...` route tree |
| **Orange** | `components/...` used here — single owner? |
| **Hidden** | `lib/`, `components/ui/`, etc. (toggle **lib**) |

## License

MIT
