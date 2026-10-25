import type { RouteObject } from 'react-router-dom';
import { DirectorPanel } from '@/ui/director/panel';
import { AppShell } from '@/ui/shell';

function Director() { return <AppShell title="Director"><DirectorPanel /></AppShell>; }

export const order = 70;
export const route: RouteObject = { path: '/director', element: <Director /> };
