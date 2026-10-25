import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';

// Kept tiny and lazy: the page chunk loads only when /m is visited.
const MobilePage = lazy(() => import('@/ui/mobile/page'));

export const order = 60;
export const route: RouteObject = {
  path: '/m',
  element: <Suspense fallback={<div style={{ background: '#000', minHeight: '100vh' }} />}><MobilePage /></Suspense>,
};
