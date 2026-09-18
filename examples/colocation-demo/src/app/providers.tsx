'use client';

import '@nathanham16/route-lens/react/styles.css';
import { RouteLens } from '@nathanham16/route-lens/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {process.env.NODE_ENV === 'development' ? <RouteLens /> : null}
      {children}
    </>
  );
}
