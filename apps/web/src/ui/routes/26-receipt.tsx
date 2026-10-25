import { useParams, type RouteObject } from 'react-router-dom';
import { ReceiptScreen } from '@/ui/receipt/screen';

function ById() { const { id } = useParams(); return <ReceiptScreen id={id ?? null} key={id} />; }

export const order = 26;
export const route: RouteObject = { path: '/match/:id/receipt', element: <ById /> };
