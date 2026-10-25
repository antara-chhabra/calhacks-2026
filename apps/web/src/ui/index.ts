// O2 exports (PRD §8.7): routes() → RouteObject[]. App.tsx mounts these.
import { createElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import Landing from '@/pages/Landing';
import Markets from '@/pages/Markets';

export function routes(): RouteObject[] {
  return [
    { path: '/', element: createElement(Landing) },
    { path: '/markets', element: createElement(Markets) },
    { path: '/markets/:category', element: createElement(Markets) },
    { path: '*', element: createElement(Landing) },
  ];
}
