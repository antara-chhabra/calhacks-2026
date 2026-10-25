// Public bookie routes (PRD §8.10). O6 implements (COULD). HEAD stub: an empty router so http/app.ts can mount it.
import { Router } from 'express';

export function createPublicBookieRouter(): Router {
  return Router();
}
