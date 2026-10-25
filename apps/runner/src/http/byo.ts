// BYO HTTP protocol fightcard/1 (PRD §8.10). O4 implements. HEAD stub: an empty router so http/app.ts can mount it.
import { Router } from 'express';

export function createByoRouter(): Router {
  return Router();
}
