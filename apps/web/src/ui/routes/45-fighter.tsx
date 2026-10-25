import { type RouteObject, useParams } from "react-router-dom";
import { FighterProfileScreen } from "@/ui/profile";

function ById() { const { id } = useParams(); return <FighterProfileScreen id={id ?? ""} key={id} />; }

export const order = 45;
export const route: RouteObject = { path: "/fighter/:id", element: <ById /> };
