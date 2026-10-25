// Dev-only clip gallery (vite dev: /src/arena/dev/clips.html). Every PRD §10.8 clip on VEX in one Pixi canvas, with replay buttons.
// Query: ?build=lean|standard|heavy  ?reduced=1  ?archetype=brawler|scholar|trickster|tank|speedster  ?still=1 (pause each clip on its key frame)
import gsap from 'gsap';
import { Application, Container, Graphics } from 'pixi.js';
import { HOUSE_ROSTER } from '@fc/contracts';
import { buildRig } from '../rig';
import { ATTACK_CLIPS, CLIPS, createPoseDriver, resetPose, type Archetype, type ClipName, type ClipTimeline, type PoseDriver } from '../clips';

const q = new URLSearchParams(location.search);
const build = (q.get('build') ?? 'heavy') as 'lean' | 'standard' | 'heavy';
const archetype = (q.get('archetype') || undefined) as Archetype | undefined;
const reduced = q.get('reduced') === '1', still = q.get('still') === '1';
const COLS = 6, CW = 220, CH = 250, SCALE = 0.4;
const names = Object.keys(CLIPS) as ClipName[];
const startX: Partial<Record<ClipName, number>> = { dash: 0.28, slashLight: 0.4, slashHeavy: 0.4, special: 0.4, whiff: 0.4, knockback: 0.7, koBlast: 0.7 };

const bar = document.getElementById('bar')!;
const opt = (k: string, vals: string[], cur: string) => `<label>${k} <select data-k="${k}">${vals.map((v) => `<option${v === cur ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`;
bar.innerHTML = `<b>VEX · ${names.length} clips</b>${opt('build', ['lean', 'standard', 'heavy'], build)}${opt('archetype', ['', 'brawler', 'scholar', 'trickster', 'tank', 'speedster'], archetype ?? '')}<label><input type="checkbox" data-k="reduced"${reduced ? ' checked' : ''}> reduced motion</label><button id="all">Replay all</button>`;
bar.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement; const u = new URLSearchParams(location.search);
  if (t.dataset.k === 'reduced') (t.checked ? u.set('reduced', '1') : u.delete('reduced')); else if (t.value) u.set(t.dataset.k!, t.value); else u.delete(t.dataset.k!);
  location.search = u.toString();
});

async function main() {
  const wrap = document.getElementById('wrap')!;
  const rows = Math.ceil(names.length / COLS);
  const app = new Application();
  await app.init({ width: COLS * CW, height: rows * CH, background: 0x000000, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
  wrap.style.width = `${COLS * CW}px`;
  wrap.appendChild(app.canvas);
  const skin = { ...HOUSE_ROSTER.vex.skin, build };
  const runs: Array<() => void> = [];
  const rigs = await Promise.all(names.map(() => buildRig(skin)));

  for (const [i, name] of names.entries()) {
    const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH;
    const cell = new Container(); cell.position.set(cx, cy);
    const mask = new Graphics().rect(0, 0, CW, CH).fill(0xffffff);
    cell.addChild(mask); cell.mask = mask;
    const floor = new Graphics().rect(8, CH - 36, CW - 16, 2).fill(0x24242c);
    cell.addChild(floor);
    const rig = rigs[i]!;
    app.stage.addChild(cell);
    const driver: PoseDriver = createPoseDriver(rig);
    // The driver owns rig.root's scale (facing * squash); the gallery scale lives on a wrapper.
    const holder = new Container(); holder.scale.set(SCALE); holder.position.set(CW * (startX[name] ?? 0.5), CH - 36);
    cell.addChild(holder); holder.addChild(rig.root);

    const el = document.createElement('div');
    el.className = 'cell'; Object.assign(el.style, { left: `${cx}px`, top: `${cy}px`, width: `${CW}px`, height: `${CH}px` });
    el.innerHTML = `<b>${name}</b><i></i><button>replay</button><u>IMPACT</u>`;
    wrap.appendChild(el);
    const info = el.querySelector('i')!, flash = el.querySelector('u') as HTMLElement;
    let tl: ClipTimeline | null = null;
    const play = () => {
      tl?.kill(); gsap.killTweensOf(flash);
      resetPose(driver); driver.setFacing(1);
      tl = CLIPS[name](driver, {
        archetype, reduced, power: 'heavy', damagePct: 50, color: i % 2 ? 'red' : 'yellow', tool: 'write', distance: name === 'dash' ? 150 : undefined,
        onImpact: () => { flash.style.opacity = '1'; gsap.to(flash, { opacity: 0, duration: 0.4 }); },
      });
      info.textContent = `${Math.round(tl.duration() * 1000)} ms${tl.repeat() === -1 ? ' loop' : ''}${ATTACK_CLIPS.includes(name) ? ` · impact @${Math.round((tl.labels.impact ?? 0) * 1000)}` : ''}`;
      if (still) { const t = tl.labels.impact ?? tl.labels.land ?? tl.labels.swing ?? tl.labels.parry ?? tl.duration() * (tl.repeat() === -1 ? 0.3 : 0.4); tl.time(t); driver.flush(); return; }
      if (tl.repeat() !== -1) tl.eventCallback('onComplete', () => { driver.flush(); gsap.delayedCall(0.8, play); });
      tl.play(0);
    };
    el.querySelector('button')!.addEventListener('click', play);
    runs.push(play);
    play();
  }
  document.getElementById('all')!.addEventListener('click', () => runs.forEach((r) => r()));
  document.body.dataset.ready = '1';
}
main().catch((e) => { document.body.dataset.error = String(e); console.error(e); });
