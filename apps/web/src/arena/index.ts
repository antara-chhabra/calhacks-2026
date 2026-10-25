// O1 exports (PRD §8.7). HEAD stub at G-1; O1 replaces the bodies (A-02+), never the signatures.
import { createElement } from 'react';
import type { JSX } from 'react';
import type { SkinSpec } from '@fc/contracts';

export function ArenaCanvas(_props: { reducedMotion: boolean }): JSX.Element {
  return createElement('div', { 'data-stub': 'ArenaCanvas', style: { aspectRatio: '16 / 9', background: '#000' } });
}

export function FighterPortrait(props: { skin: SkinSpec; pose: 'hero' | 'victory' | 'ko' | 'idle'; size: number; flip?: boolean }): JSX.Element {
  return createElement('div', {
    'data-stub': 'FighterPortrait',
    style: { width: props.size, height: props.size, borderRadius: 8, background: props.skin.palette.primary },
  });
}
