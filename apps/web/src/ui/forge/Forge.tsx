// The Forge wizard (PRD §10.11, FC-F-200/-201): six steps, live preview, review + mint.
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatCents } from '@fc/contracts';
import type { Archetype, Build, EmblemId, HeadId, SkinSpec, WeaponId } from '@fc/contracts';
import { FighterPortrait } from '@/arena';
import { ButtonX, Panel, toast } from '@/components/fightcard/primitives';
import { useStore } from '@/data/store';
import { cn } from '@/lib/utils';
import { FighterCard } from '@/ui/card';
import {
  ARCHETYPES, BUILDS, EMBLEMS, HEADS, ORDERS, PALETTE_KEYS, PALETTE_PRESETS, PERSONA_EXAMPLES, STEPS, WEAPONS,
  allErrors, buildSpec, initialDraft, previewCard, stepErrors, type Draft,
} from './spec';
import { CATCH_MAX, FORGE_FEE_CENTS, NAME_MAX, PERSONA_MAX, TITLE_MAX, forgeErrorCopy } from './validate';

const FOCUS = 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400/60';
const label = (id: string) => id.split('_').map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ');
const INPUT = cn('w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 placeholder:text-zinc-600', FOCUS);

/** Live preview: alternates the idle and hero (attack) portraits. The Pixi rig is not mountable outside ArenaCanvas. */
export function LivePreview({ skin, size = 180 }: { skin: SkinSpec; size?: number }) {
  const [attack, setAttack] = useState(false);   // hover to see the attack pose; no auto-flicker
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl bg-zinc-900 p-2 ring-1 ring-zinc-800" data-testid="forge-preview" onMouseEnter={() => setAttack(true)} onMouseLeave={() => setAttack(false)}>
        <FighterPortrait pose={attack ? 'hero' : 'idle'} size={size} skin={skin} />
      </div>
      <span className="text-[11px] text-zinc-500">Hover to preview the attack</span>
    </div>
  );
}

function Field({ label: l, error, hint, children }: { label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-[13px] text-zinc-300">{l}<span className="text-[11px] text-zinc-600">{hint}</span></span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-rose-400" role="alert">{error}</span>}
    </label>
  );
}

function Choice({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button aria-pressed={active} className={cn('rounded-xl px-3 py-2 text-left text-sm ring-1 transition-colors', FOCUS,
      active ? 'bg-zinc-100 text-zinc-950 ring-zinc-100' : 'bg-zinc-900 text-zinc-300 ring-zinc-800 hover:ring-zinc-600', className)} data-no-press onClick={onClick} type="button">
      {children}
    </button>
  );
}

function Thumb({ skin, active, name, onClick }: { skin: SkinSpec; active: boolean; name: string; onClick: () => void }) {
  return (
    <button aria-label={name} aria-pressed={active} className={cn('flex w-[84px] flex-col items-center gap-1 rounded-xl bg-zinc-900 p-1.5 ring-1 transition-colors', FOCUS,
      active ? 'ring-2 ring-zinc-100' : 'ring-zinc-800 hover:ring-zinc-600')} data-no-press onClick={onClick} type="button">
      <FighterPortrait pose="hero" size={68} skin={skin} />
      <span className="text-[11px] text-zinc-400">{name}</span>
    </button>
  );
}

function LookStep({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  const skin = d.skin;
  const upd = (p: Partial<SkinSpec>) => set({ skin: { ...skin, ...p } });
  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-[13px] text-zinc-300">Palette</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {PALETTE_PRESETS.map((p) => (
            <Choice active={PALETTE_KEYS.every((k) => p.palette[k].toLowerCase() === skin.palette[k].toLowerCase())} key={p.name} onClick={() => upd({ palette: { ...p.palette } })}>
              <span className="flex items-center gap-2">{PALETTE_KEYS.map((k) => <span className="size-3 rounded-full ring-1 ring-black/40" key={k} style={{ background: p.palette[k] }} />)}{p.name}</span>
            </Choice>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PALETTE_KEYS.map((k) => (
            <label className="flex items-center gap-2 rounded-lg bg-zinc-900 px-2 py-1.5 text-[12px] text-zinc-400 ring-1 ring-zinc-800" key={k}>
              <input aria-label={`${k} color`} className="size-6 cursor-pointer rounded border-0 bg-transparent p-0" onChange={(e) => upd({ palette: { ...skin.palette, [k]: e.target.value } })} type="color" value={skin.palette[k]} />
              <span className="capitalize">{k}</span>
            </label>
          ))}
        </div>
      </div>
      <PickerRow title="Head">{HEADS.map((h: HeadId) => <Thumb active={skin.head === h} key={h} name={label(h)} onClick={() => upd({ head: h })} skin={{ ...skin, head: h }} />)}</PickerRow>
      <PickerRow title="Weapon">{WEAPONS.map((w: WeaponId) => <Thumb active={skin.weapon === w} key={w} name={label(w)} onClick={() => upd({ weapon: w })} skin={{ ...skin, weapon: w }} />)}</PickerRow>
      <PickerRow title="Emblem">{EMBLEMS.map((e: EmblemId) => <Thumb active={skin.emblem === e} key={e} name={label(e)} onClick={() => upd({ emblem: e })} skin={{ ...skin, emblem: e }} />)}</PickerRow>
      <PickerRow title="Build">{BUILDS.map((b: Build) => <Thumb active={skin.build === b} key={b} name={label(b)} onClick={() => upd({ build: b })} skin={{ ...skin, build: b }} />)}</PickerRow>
    </div>
  );
}
function PickerRow({ title, children }: { title: string; children: ReactNode }) {
  return <div><h3 className="mb-2 text-[13px] text-zinc-300">{title}</h3><div className="flex flex-wrap gap-2">{children}</div></div>;
}

function Seg<T extends string | number>({ value, options, onChange, label: l }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div>
      <h3 className="mb-2 text-[13px] text-zinc-300">{l}</h3>
      <div className="flex flex-wrap gap-2">{options.map((o) => <Choice active={o.id === value} key={String(o.id)} onClick={() => onChange(o.id)}>{o.label}</Choice>)}</div>
    </div>
  );
}

function StepBody({ step, d, set, errors, show }: { step: number; d: Draft; set: (p: Partial<Draft>) => void; errors: Record<string, string>; show: boolean }) {
  const e = (k: string) => (show ? errors[k] : undefined);
  switch (step) {
    case 0:
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {ARCHETYPES.map((a) => (
            <Choice active={d.archetype === a.id} key={a.id} onClick={() => set({ archetype: a.id as Archetype })}>
              <span className="block font-medium">{a.label}</span><span className="text-[12px] opacity-70">{a.blurb}</span>
            </Choice>
          ))}
        </div>
      );
    case 1:
      return (
        <div className="space-y-4">
          <Field label="Name" error={e('name')} hint={`${d.name.length}/${NAME_MAX}`}>
            <input className={INPUT} maxLength={40} onChange={(ev) => set({ name: ev.target.value })} placeholder="Name (3–14)" value={d.name} />
          </Field>
          <Field label="Title" error={e('title')} hint={`${d.title.length}/${TITLE_MAX}`}>
            <input className={INPUT} onChange={(ev) => set({ title: ev.target.value })} placeholder="Title, e.g. The Professor" value={d.title} />
          </Field>
          <Field label="Catchphrase" error={e('catchphrase')} hint={`${d.catchphrase.length}/${CATCH_MAX}`}>
            <input className={INPUT} onChange={(ev) => set({ catchphrase: ev.target.value })} placeholder="Catchphrase (optional)" value={d.catchphrase} />
          </Field>
        </div>
      );
    case 2:
      return (
        <div className="space-y-3">
          <Field label="Persona" error={e('persona')} hint={`${d.persona.length}/${PERSONA_MAX}`}>
            <textarea className={cn(INPUT, 'min-h-36 resize-y')} onChange={(ev) => set({ persona: ev.target.value })} placeholder="Describe how your fighter talks and thinks (600 max)." value={d.persona} />
          </Field>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">Examples:
            {PERSONA_EXAMPLES.map((p) => <button className={cn('rounded-full bg-zinc-900 px-2.5 py-1 text-zinc-300 ring-1 ring-zinc-800 hover:ring-zinc-600', FOCUS)} key={p} onClick={() => set({ persona: p })} type="button">{p.split(' who')[0]!.replace(/^An? /, '')}</button>)}
          </div>
          <p className="text-[12px] text-zinc-600">Personas are character flavor only. Links and commands are rejected.</p>
        </div>
      );
    case 3:
      return (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-3 py-2.5 ring-1 ring-zinc-800">
            <div><div className="text-sm text-zinc-300">Verify answers</div><div className="text-[12px] text-zinc-500">Locked off for community fighters in H0.</div></div>
            <span aria-checked="false" aria-disabled="true" className="inline-flex h-6 w-11 cursor-not-allowed items-center rounded-full bg-zinc-800 p-0.5 opacity-60" role="switch"><span className="size-5 rounded-full bg-zinc-500" /></span>
          </div>
          <Seg label="Problem order" onChange={(v) => set({ order: v })} options={ORDERS} value={d.order} />
          <Seg label="Risk" onChange={(v) => set({ risk: v })} options={[{ id: 'cautious', label: 'Cautious' }, { id: 'bold', label: 'Bold' }]} value={d.risk} />
          <Seg label="Taunt level" onChange={(v) => set({ taunts: v as Draft['taunts'] })} options={[0, 1, 2, 3].map((n) => ({ id: n, label: String(n) }))} value={d.taunts} />
        </div>
      );
    case 4:
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice active={d.tier === 'standard'} onClick={() => set({ tier: 'standard' })}><span className="block font-medium">Standard</span><span className="text-[12px] opacity-70">Fast and affordable.</span></Choice>
          <Choice active={d.tier === 'pro'} onClick={() => set({ tier: 'pro' })}><span className="block font-medium">Pro</span><span className="text-[12px] opacity-70">Stronger reasoning, slower.</span></Choice>
        </div>
      );
    default:
      return <LookStep d={d} set={set} />;
  }
}

export function ForgeWizard({ onDone, activeCount }: { onDone: (id: string) => void; activeCount: number }) {
  const me = useStore((s) => s.me);
  const createFighter = useStore((s) => s.createFighter);
  const [d, setD] = useState<Draft>(initialDraft);
  const [step, setStep] = useState(0);   // 0..5 steps, 6 = review
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const errors = useMemo(() => allErrors(d), [d]);
  const stepErr = stepErrors(step, d);
  const review = step === 6;
  const card = useMemo(() => previewCard(d, me?.handle ?? null), [d, me?.handle]);

  const next = () => {
    if (Object.keys(stepErr).length) { setTried(true); return; }
    setTried(false); setStep((s) => Math.min(6, s + 1));
  };
  const jumpTo = (i: number) => {
    // allow going back freely; forward only if every earlier step validates
    for (let s = 0; s < i && s < 6; s++) if (Object.keys(stepErrors(s, d)).length) { setStep(s); setTried(true); return; }
    setTried(false); setStep(i);
  };
  const submit = async () => {
    if (Object.keys(errors).length) { setErr('Fix the highlighted fields first.'); return; }
    setBusy(true); setErr(null);
    try {
      const id = await createFighter(buildSpec(d));
      toast(`${d.name} forged`, 'success');
      onDone(id);
    } catch (e) { setErr(forgeErrorCopy(e)); } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Panel className="flex flex-col items-center gap-3" title="Live preview">
        <LivePreview skin={d.skin} />
        <div className="text-center"><div className="font-semibold text-zinc-100">{d.name || 'Your fighter'}</div><div className="text-[12px] text-zinc-500">{d.title || 'Untitled'}</div></div>
      </Panel>
      <Panel title={<span>The Forge <span className="text-zinc-500">· step {Math.min(step + 1, 6)} of 6 · {review ? 'REVIEW' : STEPS[step]!.toUpperCase()}</span></span>}>
        <ol aria-label="Steps" className="mb-5 flex flex-wrap gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button aria-current={i === step ? 'step' : undefined} className={cn('rounded-full px-2.5 py-1 text-[12px] ring-1', FOCUS,
                i === step ? 'bg-zinc-100 text-zinc-950 ring-zinc-100' : i < step || review ? 'text-emerald-400 ring-zinc-800' : 'text-zinc-500 ring-zinc-900')} onClick={() => jumpTo(i)} type="button">
                {i + 1} {s}{(i < step || review) && ' ✓'}
              </button>
            </li>
          ))}
        </ol>
        {review ? (
          <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
            <div data-testid="forge-review-card"><FighterCard fighter={card} size="sm" /></div>
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-[100px_1fr] gap-y-1 text-[13px]">
                <dt className="text-zinc-500">Archetype</dt><dd className="text-zinc-200">{label(d.archetype)}</dd>
                <dt className="text-zinc-500">Engine</dt><dd className="text-zinc-200">{label(d.tier)}</dd>
                <dt className="text-zinc-500">Order</dt><dd className="text-zinc-200">{ORDERS.find((o) => o.id === d.order)!.label}</dd>
                <dt className="text-zinc-500">Risk · taunts</dt><dd className="text-zinc-200">{label(d.risk)} · {d.taunts}</dd>
              </dl>
              <p className="rounded-lg bg-zinc-900 p-2 text-[12px] text-zinc-400 ring-1 ring-zinc-800">{d.persona}</p>
              <div className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2 ring-1 ring-zinc-800"><span className="text-zinc-400">Forge fee</span><span className="font-medium text-zinc-100">{formatCents(FORGE_FEE_CENTS)}</span></div>
              {activeCount >= 2 && <p className="text-[12px] text-amber-300">You already have 2 active fighters. Retire one to forge another.</p>}
              {err && <p className="text-[13px] text-rose-400" role="alert">{err}</p>}
              <ButtonX disabled={busy || !me} loading={busy} onClick={submit} size="lg" tone="primary">Forge for {formatCents(FORGE_FEE_CENTS)}</ButtonX>
              {!me && <p className="text-[12px] text-zinc-500">Connect to a live match to forge.</p>}
              <p className="text-[12px] text-zinc-500">Ledger mode · no funds moved</p>
            </div>
          </div>
        ) : (
          <StepBody d={d} errors={stepErr} set={set} show={tried} step={step} />
        )}
        <div className="mt-6 flex justify-between">
          <ButtonX disabled={step === 0} onClick={() => { setTried(false); setStep((s) => Math.max(0, s - 1)); }} tone="ghost">Back</ButtonX>
          {!review && <ButtonX onClick={next} tone="primary">{step === 5 ? 'Review' : 'Next →'}</ButtonX>}
        </div>
      </Panel>
    </div>
  );
}

export function ForgeDone({ id, onAgain }: { id: string; onAgain: () => void }) {
  const f = useStore((s) => s.fighters[id]);
  const matches = useStore((s) => s.matches);
  const nxt = Object.values(matches).filter((m) => m.status === 'open' || m.status === 'scheduled').sort((a, b) => a.number - b.number)[0];
  return (
    <Panel title="Fighter forged">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-lg font-semibold text-zinc-100">{f?.name ?? 'Your fighter'} is in the arena</p>
        <p className="text-sm text-zinc-400">{nxt ? `Debuts in Match #${nxt.number}` : 'Debuts in an upcoming match'}</p>
        <div className="flex gap-2"><Link className="inline-flex h-10 items-center rounded-lg bg-zinc-100 px-5 text-sm font-medium text-zinc-950" to="/markets">Enter the arena</Link><ButtonX onClick={onAgain} size="lg" tone="ghost">Forge another</ButtonX></div>
      </div>
    </Panel>
  );
}
