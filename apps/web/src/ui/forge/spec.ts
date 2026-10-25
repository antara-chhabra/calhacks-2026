// Draft state, option lists and the ForgeSpec builder for the wizard (PRD §8.1/§8.2, FC-F-200).
import type { Archetype, Build, EmblemId, EngineTier, ForgeSpec, HeadId, SkinSpec, Strategy, WeaponId } from '@fc/contracts';
import type { FighterCardData } from '@/data/store';
import { checkCatchphrase, checkName, checkPersona, checkTitle } from './validate';

export const ARCHETYPES: { id: Archetype; label: string; blurb: string }[] = [
  { id: 'brawler', label: 'Brawler', blurb: 'Wide wind-ups, heavy hits.' },
  { id: 'scholar', label: 'Scholar', blurb: 'Precise thrusts, careful work.' },
  { id: 'trickster', label: 'Trickster', blurb: 'Extra hop, extra spin.' },
  { id: 'tank', label: 'Tank', blurb: 'Slow to start, huge impact.' },
  { id: 'speedster', label: 'Speedster', blurb: 'Quick strikes, short breaths.' },
];
export const HEADS: HeadId[] = ['horned_helm', 'topknot', 'goggles_mohawk', 'monocle_tophat', 'great_helm', 'big_helmet', 'hood', 'crown'];
export const WEAPONS: WeaponId[] = ['greatsword', 'katana', 'sawblade', 'rapier', 'cleaver', 'wooden_sword'];
export const EMBLEMS: EmblemId[] = ['skull', 'lotus', 'bolt', 'quill', 'shield', 'star', 'flame', 'eye'];
export const BUILDS: Build[] = ['lean', 'standard', 'heavy'];
export const ORDERS: { id: Strategy['order']; label: string }[] = [
  { id: 'in_order', label: 'In order' }, { id: 'easy_first', label: 'Easy first' },
  { id: 'hard_first', label: 'Hard first' }, { id: 'points_per_risk', label: 'Points per risk' },
];
export const PERSONA_EXAMPLES = [
  'A stoic samurai who answers in few, careful words and never rushes a cut.',
  'A chaotic gremlin who laughs at hard problems and guesses with style.',
  'An overconfident CEO who calls every integral a quick win.',
];
export const PALETTE_PRESETS: { name: string; palette: SkinSpec['palette'] }[] = [
  { name: 'Crimson', palette: { primary: '#E5383B', secondary: '#22202E', accent: '#F2C14E', skin: '#C98B6B' } },
  { name: 'Jade', palette: { primary: '#2EC4A6', secondary: '#F1E3C8', accent: '#1B4D45', skin: '#E0B48C' } },
  { name: 'Violet', palette: { primary: '#8B5CF6', secondary: '#B6FF3B', accent: '#1E1B2E', skin: '#9FD4A3' } },
  { name: 'Cobalt', palette: { primary: '#3A6FF2', secondary: '#F2C14E', accent: '#1A2350', skin: '#F0C9A6' } },
  { name: 'Ember', palette: { primary: '#FF8A2B', secondary: '#5B6475', accent: '#2B2F3A', skin: '#B9825E' } },
];
export const PALETTE_KEYS = ['primary', 'secondary', 'accent', 'skin'] as const;

export type Draft = {
  archetype: Archetype; name: string; title: string; catchphrase: string; persona: string;
  order: Strategy['order']; risk: Strategy['risk']; taunts: Strategy['taunts']; tier: EngineTier; skin: SkinSpec;
};
export const initialDraft = (): Draft => ({
  archetype: 'brawler', name: '', title: '', catchphrase: '', persona: '',
  order: 'in_order', risk: 'cautious', taunts: 1, tier: 'standard',
  skin: { palette: { ...PALETTE_PRESETS[0]!.palette }, head: 'horned_helm', weapon: 'greatsword', emblem: 'skull', build: 'standard' },
});

/** FC-F-200: verify is shown but locked off for community fighters in H0. */
export function buildSpec(d: Draft): ForgeSpec {
  return {
    name: d.name, title: d.title, catchphrase: d.catchphrase, archetype: d.archetype, persona: d.persona,
    strategy: { verify: false, order: d.order, risk: d.risk, taunts: d.taunts },
    tier: d.tier, skin: { ...d.skin, palette: { ...d.skin.palette } },
  };
}

export const STEPS = ['Archetype', 'Identity', 'Persona', 'Strategy', 'Engine', 'Look'] as const;

/** Per-step validation (inline errors before submit). Returns field -> message. */
export function stepErrors(step: number, d: Draft): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (k: string, r: ReturnType<typeof checkName>) => { if (!r.ok) out[k] = r.error; };
  if (step === 1) { put('name', checkName(d.name)); put('title', checkTitle(d.title)); put('catchphrase', checkCatchphrase(d.catchphrase)); }
  if (step === 2) put('persona', checkPersona(d.persona));
  return out;
}
export const allErrors = (d: Draft): Record<string, string> => ({ ...stepErrors(1, d), ...stepErrors(2, d) });

/** The minted Rookie card shown on the review step. */
export function previewCard(d: Draft, handle: string | null): FighterCardData {
  return {
    id: 'forge-preview', name: d.name || 'YOUR FIGHTER', title: d.title || 'The Newcomer', archetype: d.archetype, skin: d.skin,
    catchphrase: d.catchphrase, bio: '', strategyBlurb: '', origin: 'community', creatorHandle: handle, status: 'provisional',
    elo: 1000, stats: null, frame: 'rookie', walletAddress: null, version: 1,
  };
}
