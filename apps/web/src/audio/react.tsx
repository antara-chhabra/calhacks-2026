import { createElement, useSyncExternalStore, type ReactElement } from 'react';
import type { Audio } from './manager';
import { getAudio } from './index';

/** { muted, setMuted, toggle } for the shared manager. */
export function useAudio(): { muted: boolean; setMuted: (b: boolean) => void; toggle: () => void } {
  const a: Audio = getAudio();
  const muted = useSyncExternalStore(a.subscribe, a.muted, a.muted);
  return { muted, setMuted: a.setMuted, toggle: () => a.setMuted(!a.muted()) };
}

/** Small speaker button; O2 places it. Unstyled beyond inline basics so it inherits the theme. */
export function MuteToggle(props: { className?: string }): ReactElement {
  const { muted, toggle } = useAudio();
  return createElement('button', {
    type: 'button', className: props.className, onClick: toggle,
    'aria-pressed': muted, 'aria-label': muted ? 'Unmute sound effects' : 'Mute sound effects',
    title: muted ? 'Sound off' : 'Sound on',
    style: { background: 'none', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '1.1em', lineHeight: 1 },
  }, muted ? '🔇' : '🔊');
}
