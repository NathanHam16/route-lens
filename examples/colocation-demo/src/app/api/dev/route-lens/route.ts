import { createRouteLensHandler } from '@nathanham16/route-lens/next';

export const GET = createRouteLensHandler({
  okPrefixes: ['components/shared/'],
});
