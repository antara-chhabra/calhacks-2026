// HEAD-owned dev tool: `?debug=1` state panel for the replay route (PRD §8.7 / K-06). Plain inline styles on purpose.
import { useEffect, useState } from 'react';
import { statusLine, type ArenaCue } from '@fc/engine';
import { getReplay, restartReplay, seekReplay, useStore } from './store';

const box: React.CSSProperties = { position: 'fixed', right: 8, bottom: 8, width: 380, maxHeight: '90vh', overflow: 'auto', zIndex: 9999,
  background: 'rgba(0,0,0,.88)', color: '#d7ffd7', font: '11px/1.35 ui-monospace,monospace', padding: 10, border: '1px solid #2a2a2a', borderRadius: 6 };
const btn: React.CSSProperties = { marginRight: 4, padding: '1px 6px', font: 'inherit', cursor: 'pointer' };

export function DebugPanel(): React.JSX.Element {
  const watch = useStore((s) => s.watch);
  const conn = useStore((s) => s.conn);
  const markets = useStore((s) => s.markets);
  const [cues, setCues] = useState<ArenaCue[]>([]);
  useEffect(() => useStore.getState().cues$((c) => setCues((x) => [...x.slice(-7), c])), []);
  const st = watch.state;
  const fs = st.order.map((id) => st.fighters[id]).filter(Boolean);
  const dur = getReplay()?.duration ?? 0;
  return (
    <div style={box} data-testid="debug-panel">
      <div><b>{statusLine(st)}</b></div>
      <div>conn={conn} status={st.status} t={st.t} lastSeq={st.lastSeq} rev={watch.playbackRevision}</div>
      <div>
        speed={watch.speed} playing={String(watch.playing)}{' '}
        <button style={btn} onClick={() => useStore.getState().setPlaying(!watch.playing)}>{watch.playing ? 'pause' : 'play'}</button>
        {[1, 2, 5, 10].map((n) => <button key={n} style={btn} onClick={() => useStore.getState().setSpeed(n)}>{n}x</button>)}
        <button style={btn} onClick={restartReplay}>restart</button>
      </div>
      <div>
        seek <input type="range" min={0} max={dur} step={500} value={Math.min(st.t, dur)} style={{ width: 240, verticalAlign: 'middle' }}
          onChange={(e) => seekReplay(Number(e.target.value))} />
      </div>
      <div style={{ marginTop: 6 }}>
        {fs.map((f) => <div key={f!.id}>{f!.id.padEnd(7)} {String(f!.points).padStart(4)} pts  {f!.status}  H{f!.hits}/M{f!.misses}</div>)}
      </div>
      <div style={{ marginTop: 6 }}>markets: {Object.values(markets).map((m) => `${m.kind}:${m.status}${m.result ? `=${m.result}` : ''}`).join(' | ')}</div>
      <div style={{ marginTop: 6 }}><b>feed</b>
        {st.feed.slice(-10).map((l) => <div key={l.seq}>[{l.seq}] {l.kind}: {l.text}</div>)}
      </div>
      <div style={{ marginTop: 6 }}><b>cues</b>
        {cues.map((c, i) => <div key={i}>{JSON.stringify(c)}</div>)}
      </div>
    </div>
  );
}
