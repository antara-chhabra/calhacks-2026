// One-screen Forge: name, fighting style, colour, then forge. Styles fill persona, strategy and look from tested presets,
// so a new agent is valid by construction and joins the next match (debutPending). The six-step wizard stays as "Advanced".
import { useMemo, useState } from 'react';
import { formatCents } from '@fc/contracts';
import type { Archetype, EmblemId, HeadId, Strategy, WeaponId, Build } from '@fc/contracts';
import { FighterPortrait } from '@/arena';
import { ButtonX, Panel, toast } from '@/components/fightcard/primitives';
import { useStore } from '@/data/store';
import { cn } from '@/lib/utils';
import { PALETTE_PRESETS, buildSpec, initialDraft, type Draft } from './spec';
import { FORGE_FEE_CENTS, NAME_MAX, checkName, forgeErrorCopy } from './validate';

type Style = {
  id: string; label: string; blurb: string; title: string; catchphrase: string; persona: string; archetype: Archetype;
  order: Strategy['order']; risk: Strategy['risk']; taunts: Strategy['taunts'];
  head: HeadId; weapon: WeaponId; emblem: EmblemId; build: Build;
};

export const STYLES: Style[] = [
  { id: 'villain', label: 'Villain', blurb: 'Fast, bold, never checks', title: 'The Upstart', catchphrase: 'Bow.', archetype: 'brawler',
    persona: 'A cold, imperial conqueror. Speaks in two or three words. Solves in order, submits the first answer it sees and never apologises.',
    order: 'in_order', risk: 'bold', taunts: 3, head: 'horned_helm', weapon: 'greatsword', emblem: 'skull', build: 'heavy' },
  { id: 'monk', label: 'Monk', blurb: 'Careful, checks every answer', title: 'The Calm', catchphrase: 'Breathe first.', archetype: 'scholar',
    persona: 'A calm monk who speaks in short proverbs. Checks every answer before striking and never guesses.',
    order: 'in_order', risk: 'cautious', taunts: 1, head: 'topknot', weapon: 'katana', emblem: 'lotus', build: 'lean' },
  { id: 'gremlin', label: 'Gremlin', blurb: 'Hardest first, pure chaos', title: 'The Gremlin', catchphrase: 'lol watch this', archetype: 'trickster',
    persona: 'A cheerful lowercase gremlin. Starts with the hardest problem, guesses when stuck and treats every miss as content.',
    order: 'hard_first', risk: 'bold', taunts: 3, head: 'goggles_mohawk', weapon: 'sawblade', emblem: 'bolt', build: 'lean' },
  { id: 'rookie', label: 'Rookie', blurb: 'Easy ones first, big heart', title: 'The Rookie', catchphrase: 'I got this!', archetype: 'speedster',
    persona: 'An eager, nervous rookie. Banks the easy problems first, submits fast and cheers itself on.',
    order: 'easy_first', risk: 'bold', taunts: 2, head: 'big_helmet', weapon: 'wooden_sword', emblem: 'star', build: 'standard' },
  { id: 'wall', label: 'Wall', blurb: 'Best points per risk, no misses', title: 'The Wall', catchphrase: 'Steady.', archetype: 'tank',
    persona: 'A flat, unbothered defender. Picks the safest high-value problem first and skips rather than misses.',
    order: 'points_per_risk', risk: 'cautious', taunts: 1, head: 'great_helm', weapon: 'cleaver', emblem: 'shield', build: 'heavy' },
];

function draftFor(name: string, style: Style, palette: number): Draft {
  const d = initialDraft();
  return {
    ...d, name, title: style.title, catchphrase: style.catchphrase, persona: style.persona, archetype: style.archetype,
    order: style.order, risk: style.risk, taunts: style.taunts, tier: 'standard',
    skin: { palette: { ...PALETTE_PRESETS[palette]!.palette }, head: style.head, weapon: style.weapon, emblem: style.emblem, build: style.build },
  };
}

export function QuickForge({ onDone, onAdvanced }: { onDone: (id: string) => void; onAdvanced: () => void }) {
  const me = useStore((s) => s.me);
  const register = useStore((s) => s.register);
  const createFighter = useStore((s) => s.createFighter);
  const [name, setName] = useState('');
  const [style, setStyle] = useState(0);
  const [palette, setPalette] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const draft = useMemo(() => draftFor(name.trim(), STYLES[style]!, palette), [name, style, palette]);
  const nameCheck = checkName(name.trim());

  const submit = async () => {
    if (!nameCheck.ok) { setErr(nameCheck.error); return; }
    setBusy(true); setErr(null);
    try {
      if (!me?.handle) await register(`fan_${Math.random().toString(36).slice(2, 8)}`);   // welcome $100 covers the fee
      const id = await createFighter(buildSpec(draft));
      toast(`${draft.name} forged. Debuts next match.`, 'success');
      onDone(id);
    } catch (e) { setErr(forgeErrorCopy(e)); } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Panel className="flex flex-col items-center gap-3" title="Your fighter">
        <div className="rounded-xl bg-zinc-900 p-2 ring-1 ring-zinc-800" data-testid="forge-preview">
          <FighterPortrait pose="idle" size={200} skin={draft.skin} />
        </div>
        <div className="text-center">
          <div className="font-semibold text-zinc-100">{draft.name || 'Name your fighter'}</div>
          <div className="text-[12px] text-zinc-500">{STYLES[style]!.title} · “{STYLES[style]!.catchphrase}”</div>
        </div>
      </Panel>
      <Panel title="Forge a fighter">
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1 block text-[13px] text-zinc-300">1 · Name</span>
            <input autoFocus className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 placeholder:text-zinc-600"
              maxLength={NAME_MAX} onChange={(e) => { setName(e.target.value); setErr(null); }} placeholder="e.g. NOVA" value={name} />
          </label>
          <div>
            <span className="mb-1 block text-[13px] text-zinc-300">2 · Fighting style</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {STYLES.map((s, i) => (
                <button aria-pressed={i === style} className={cn('rounded-xl px-3 py-2 text-left ring-1 transition-colors',
                  i === style ? 'bg-zinc-100 text-zinc-950 ring-zinc-100' : 'bg-zinc-900 text-zinc-300 ring-zinc-800 hover:ring-zinc-600')}
                  key={s.id} onClick={() => setStyle(i)} type="button">
                  <div className="font-semibold text-sm">{s.label}</div><div className="text-[11px] opacity-70">{s.blurb}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[13px] text-zinc-300">3 · Colour</span>
            <div className="flex gap-2">
              {PALETTE_PRESETS.map((p, i) => (
                <button aria-label={p.name} aria-pressed={i === palette} className={cn('size-9 rounded-full ring-2', i === palette ? 'ring-zinc-100' : 'ring-transparent')}
                  key={p.name} onClick={() => setPalette(i)} style={{ background: p.palette.primary }} type="button" />
              ))}
            </div>
          </div>
          {err && <p className="text-[13px] text-rose-400" role="alert">{err}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <ButtonX disabled={busy || !name.trim()} loading={busy} onClick={submit} size="lg" tone="primary">
              Forge &amp; enter the arena · {formatCents(FORGE_FEE_CENTS)}
            </ButtonX>
            <button className="text-[12px] text-zinc-500 underline-offset-2 hover:underline" onClick={onAdvanced} type="button">Advanced builder</button>
          </div>
          <p className="text-[12px] text-zinc-500">{me?.handle ? `Playing as ${me.handle} · ${formatCents(me.balanceCents ?? 0)}` : 'No account yet: forging signs you up with $100 in demo funds.'} Ledger mode · no funds moved.</p>
        </div>
      </Panel>
    </div>
  );
}
