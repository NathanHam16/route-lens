# Agent install prompt

Copy everything inside the fence below into your coding agent.

```text
Install @nathanham16/route-lens into this Next.js App Router repo (dev-only colocation overlay).
Docs: https://github.com/NathanHam16/route-lens

Do not commit unless the user asks.

1. npm install -D @nathanham16/route-lens (from the Next.js app root)
2. next.config: transpilePackages: ['@nathanham16/route-lens']
3. app/api/dev/route-lens/route.ts:
     import { notFound } from 'next/navigation';
     import { createRouteLensHandler } from '@nathanham16/route-lens/next';
     const handler = createRouteLensHandler();
     export async function GET(req: Request) {
       if (process.env.NODE_ENV !== 'development') notFound();
       return handler(req);
     }
4. Root providers — dynamic import RouteLens + styles.css, ssr: false, dev-only render
5. If middleware/auth 401s /api/dev/route-lens in dev, add a dev-only bypass for that path
6. Verify: npx tsc --noEmit && npm exec --no -- route-lens <existing-route>

Tell the user:
- Run dev server, open any page, Alt+Shift+C (or bottom-left widget)
- Green = colocated, red = cross-route, orange = shared-feature smell
- CLI: npm exec --no -- route-lens <route> --suspects-only
```
