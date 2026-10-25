// Admin API (PRD §8.10). O4 implements (R-03). HEAD stub: an empty router so http/app.ts can mount it.
import { Router } from 'express';

export function createAdminRouter(): Router {
  return Router();
}
