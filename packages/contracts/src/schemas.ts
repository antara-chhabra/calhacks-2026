// zod schemas for every event `data` and every domain type (K-02). Stub until K-02 lands.
import { z } from 'zod';
import type { FightEvent } from './events.js';

export const fightEventSchema: z.ZodType<FightEvent> = z.any() as unknown as z.ZodType<FightEvent>;
