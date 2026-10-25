import { useParams, type RouteObject } from 'react-router-dom';
import { MatchScreen } from '@/ui/match';

function ById() { const { id } = useParams(); return <MatchScreen id={id ?? null} key={id} />; }

export const order = 20;
export const routes: RouteObject[] = [
  { path: '/match/live', element: <MatchScreen id={null} /> },
  { path: '/match/:id', element: <ById /> },
];
