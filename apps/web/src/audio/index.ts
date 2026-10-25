import { useStore } from '../data/store';
import { createAudio, type Audio } from './manager';

export { createAudio, soundsFor, MUTE_KEY, MAX_VOICES } from './manager';
export type { Audio } from './manager';
export { useAudio, MuteToggle } from './react';

let shared: Audio | null = null;
/** The app-wide manager (lazy). Reads watch.playing / watch.speed from the store at cue time. */
export function getAudio(): Audio {
  return shared ??= createAudio({ env: () => { const w = useStore.getState().watch; return { playing: w.playing, speed: w.speed }; } });
}

/** Call once at app start: `useEffect(() => installAudio(), [])` in App.tsx. Returns the teardown. */
export function installAudio(): () => void {
  const a = getAudio();
  a.start();
  const off = useStore.getState().cues$((c) => a.onCue(c));
  return () => { off(); a.stop(); };
}

/** ElevenLabs hook (ADR-025, FC-F-321): no-op today; barks plug in here later with the same signature. */
export function voice(_fighterId: string, _text: string): void { /* deferred */ }
