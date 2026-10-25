// Dev-only page (vite dev: /src/arena/dev/portraits.html). Not part of the production build entry.
import { createRoot } from 'react-dom/client';
import { HOUSE_ROSTER } from '@fc/contracts';
import { FighterPortrait } from '../portrait';

const poses = ['idle', 'hero', 'victory', 'ko'] as const;
const alt = { palette: { primary: '#2A9D8F', secondary: '#264653', accent: '#E9C46A', skin: '#F4A261' }, head: 'crown', weapon: 'katana', emblem: 'bolt', build: 'lean' } as const;
createRoot(document.getElementById('root')!).render(
  <>
    {poses.map((p) => <figure key={p}><FighterPortrait skin={HOUSE_ROSTER.vex.skin} pose={p} size={260} /><figcaption>VEX {p}</figcaption></figure>)}
    <figure><FighterPortrait skin={HOUSE_ROSTER.vex.skin} pose="idle" size={260} flip /><figcaption>flip</figcaption></figure>
    <figure><FighterPortrait skin={alt} pose="idle" size={260} /><figcaption>recolour (VEX fallback parts)</figcaption></figure>
    <figure><FighterPortrait skin={HOUSE_ROSTER.vex.skin} pose="hero" size={64} /><figcaption>64px</figcaption></figure>
  </>,
);
