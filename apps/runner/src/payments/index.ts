// x402 / CDP payments (PRD §8.9, E15). HEAD stub returns the 'off' implementation; O6 implements testnet.
import type { FighterId } from '@fc/contracts';
import type { Router } from 'express';

export interface Payments {
  readonly enabled: boolean;
  ensureWallet(fighterId: FighterId): Promise<{ address: string } | null>;
  payEntry(matchId: string, fighterId: FighterId): Promise<{ ok: true; txRef: string } | { ok: false; reason: string }>;
  payPurse(matchId: string, fighterId: FighterId, to: string, amountUsdc: number): Promise<{ ok: true; txHash: string } | { ok: false; reason: string }>;
  hintRoute?: Router;   // mounted on the public listener when present
  entryRoute?: Router;
}

const off: Payments = {
  enabled: false,
  async ensureWallet() { return null; },
  async payEntry() { return { ok: false, reason: 'payments_off' }; },
  async payPurse() { return { ok: false, reason: 'payments_off' }; },
};

export async function createPayments(): Promise<Payments> {
  return off;   // FC_PAYMENTS=off|testnet; testnet lands with O6 (I-02)
}
