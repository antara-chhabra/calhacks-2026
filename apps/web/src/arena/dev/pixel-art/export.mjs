// Export the pixel part library to rig SVGs under apps/web/public/art (1 px = 4 units, pivot at the SVG origin).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const ART = process.argv[2];
const ctx = { window: {}, document: undefined, Math, Map, Set, Number, String, Object, Array, JSON };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('./pixel.js', import.meta.url), 'utf8'), ctx);
const { partFor, U } = ctx.window.PixelFighters;

// Token → SVG colour. Palette tokens become placeholders (substituted per skin by palette.ts); the rest are fixed.
const HEX = {
  P: '#FF00FF', Q: '#FF01FF', p: '#FF02FF', d: '#FF03FF',
  S: '#00FFFF', T: '#01FFFF', s: '#02FFFF', e: '#03FFFF',
  A: '#FFFF00', B: '#FFFF01', a: '#FFFF02', c: '#FFFF03',
  K: '#FFAA88', L: '#FFAA89', k: '#FFAA8A', n: '#FFAA8B',
  O: '#14121F', E: '#14121F', W: '#F7F1E3', w: '#C9C1D8', G: '#EEF3FA', M: '#A9B3C8', m: '#626B86', g: '#3B4058',
  X: '#B9824A', x: '#7E522E', z: '#4E2F1C', Y: '#F7CF5A', y: '#B5802C', R: '#C2364E', r: '#6E1C30',
};

function toSvg(px, name, extra = '') {
  const keys = [...px.p.keys()].map((k) => k.split(',').map(Number));
  let vb;
  if (!keys.length) vb = [0, 0, U, U];
  else {
    const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
    vb = [x0 * U, y0 * U, (x1 - x0 + 1) * U, (y1 - y0 + 1) * U];
  }
  // Merge horizontal runs of one colour into a rect.
  const rows = new Map();
  for (const [x, y] of keys) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x); }
  const rects = [];
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = rows.get(y).sort((a, b) => a - b);
    let start = xs[0], prev = xs[0], col = HEX[px.get(start, y)];
    const flush = () => { if (col) rects.push(`<rect x="${start * U}" y="${y * U}" width="${(prev - start + 1) * U}" height="${U}" fill="${col}"/>`); };
    for (const x of xs.slice(1)) {
      const c = HEX[px.get(x, y)];
      if (x === prev + 1 && c === col) { prev = x; continue; }
      flush(); start = prev = x; col = c;
    }
    flush();
  }
  const unknown = [...new Set([...px.p.values()].filter((t) => !HEX[t]))];
  if (unknown.length) throw new Error(`${name}: unmapped tokens ${unknown}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}" data-part="${name}" data-pivot="0,0" data-pixel="${U}"${extra}>\n<g shape-rendering="crispEdges">\n${rects.join('\n')}\n</g>\n</svg>\n`;
}

const out = {};   // part key → viewBox, for parts.json
const write = (rel, px, name, extra) => {
  const svg = toSvg(px, name, extra);
  writeFileSync(`${ART}/${rel}`, svg);
  out[rel] = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  return out[rel];
};

// Bodies per build + the shared head and faces.
const BODY = ['torso', 'upperArm', 'forearm', 'hand', 'thigh', 'shin', 'foot'];
const vbByBuild = {};
for (const b of ['lean', 'standard', 'heavy']) {
  vbByBuild[b] = {};
  for (const part of BODY) vbByBuild[b][part] = write(`builds/${b}/${part}.svg`, partFor({ part }, 'neutral', { build: b }), part);
}
const common = { head: write('builds/common/head.svg', partFor({ part: 'head' }, 'neutral', {}), 'head') };
for (const e of ['neutral', 'focus', 'smug', 'hurt', 'ko'])
  for (const kind of ['eyes', 'brows', 'mouth']) common[`${kind}-${e}`] = write(`builds/common/${kind}-${e}.svg`, partFor({ part: kind }, e, {}), `${kind}-${e}`);

// Slot libraries. Weapons keep their socket/length/tip data from the current files.
const lib = {};
for (const f of readdirSync(`${ART}/heads`).filter((n) => n.endsWith('.svg'))) {
  const id = f.slice(0, -4);
  lib[id] = write(`heads/${f}`, partFor({ part: 'helm' }, '', { head: id }), id, ' data-head="neck-base" data-anchor="head-pivot"');
}
for (const f of readdirSync(`${ART}/weapons`).filter((n) => n.endsWith('.svg'))) {
  const id = f.slice(0, -4), old = readFileSync(`${ART}/weapons/${f}`, 'utf8');
  const keep = ['socket', 'length', 'tip', 'blade'].map((k) => { const m = new RegExp(`data-${k}="([^"]+)"`).exec(old); return m ? ` data-${k}="${m[1]}"` : ''; }).join('');
  lib[id] = write(`weapons/${f}`, partFor({ part: 'weapon' }, '', { weapon: id }), id, keep);
}
for (const f of readdirSync(`${ART}/emblems`).filter((n) => n.endsWith('.svg'))) {
  const id = f.slice(0, -4);
  lib[id] = write(`emblems/${f}`, partFor({ part: 'emblem' }, '', { emblem: id }), id, ' data-anchor="torso:emblem"');
}

// VEX keeps a byte-identical copy of the heavy body (tests and references read it).
for (const f of readdirSync(`${ART}/fighters/vex`).filter((n) => n.endsWith('.svg'))) {
  const key = f.slice(0, -4);
  const src = BODY.includes(key) ? `builds/heavy/${f}` : `builds/common/${f}`;
  writeFileSync(`${ART}/fighters/vex/${f}`, readFileSync(`${ART}/${src}`, 'utf8'));
}

// parts.json: only viewBoxes change (nodes, pivots, anchors and poses stay).
const vbFor = (build, key) => vbByBuild[build]?.[key] ?? common[key] ?? lib[key];
for (const [file, build] of [['builds/lean/parts.json', 'lean'], ['builds/standard/parts.json', 'standard'], ['builds/heavy/parts.json', 'heavy'], ['fighters/vex/parts.json', 'heavy']]) {
  let text = readFileSync(`${ART}/${file}`, 'utf8');
  const m = JSON.parse(text);
  for (const key of Object.keys(m.parts)) {
    const vb = vbFor(build, key);
    if (!vb) throw new Error(`${file}: no pixel part for ${key}`);
    // Text edit of this part's viewBox only, so the rest of the manifest keeps its formatting.
    const at = text.indexOf(`"${key}": {`, text.indexOf('"parts"'));
    const re = /"viewBox":\s*\[[^\]]*\]/y;
    const v = text.indexOf('"viewBox"', at);
    re.lastIndex = v;
    const hit = re.exec(text);
    if (at < 0 || !hit) throw new Error(`${file}: cannot find viewBox for ${key}`);
    text = text.slice(0, v) + `"viewBox": [${vb.join(', ')}]` + text.slice(v + hit[0].length);
  }
  JSON.parse(text);
  writeFileSync(`${ART}/${file}`, text);
}
console.log('exported', Object.keys(out).length, 'svgs');
