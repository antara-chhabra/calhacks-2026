import { useParams, type RouteObject } from 'react-router-dom';
import { ResultsScreen } from '@/ui/match';

function ById() { const { id } = useParams(); return <ResultsScreen id={id ?? null} key={id} />; }

export const order = 25;
export const route: RouteObject = { path: '/match/:id/results', element: <ById /> };
