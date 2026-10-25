// 10 Hz event batcher. Events are queued in atomic groups (e.g. submit+verdict.live) which are never split across
// postEvents calls; each call carries ≤ 64 events.
export type OutEvent = { type: string; data: unknown };

export class EventBatcher {
  private q: OutEvent[][] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private chain: Promise<void> = Promise.resolve();
  private closed = false;
  dropped = 0;
  constructor(
    private post: (events: { type: string; data: string }[]) => Promise<void>,
    private o: { intervalMs?: number; max?: number; onError?: (e: unknown, n: number) => void } = {},
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.flush(); }, this.o.intervalMs ?? 100);
    this.timer.unref?.();
  }
  /** Queue events that must stay together in one call. Ignored after stop(). */
  push(...events: OutEvent[]): boolean {
    if (this.closed || events.length === 0) return false;
    this.q.push(events);
    return true;
  }
  /** Flush everything queued now; resolves when the posts have completed. */
  flush(): Promise<void> {
    const max = this.o.max ?? 64;
    const chunks: OutEvent[][] = [];
    let cur: OutEvent[] = [];
    for (const g of this.q.splice(0)) {
      if (cur.length + g.length > max && cur.length > 0) { chunks.push(cur); cur = []; }
      cur.push(...g);
      while (cur.length > max) { chunks.push(cur.slice(0, max)); cur = cur.slice(max); }   // single oversize group: unavoidable split
    }
    if (cur.length) chunks.push(cur);
    for (const ch of chunks) {
      this.chain = this.chain.then(async () => {
        try { await this.post(ch.map((e) => ({ type: e.type, data: JSON.stringify(e.data) }))); }
        catch (err) { this.dropped += ch.length; this.o.onError?.(err, ch.length); }
      });
    }
    return this.chain;
  }
  /** Stop the timer, flush what is left, then reject further pushes. */
  async stop(): Promise<void> {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    await this.flush();
    this.closed = true;
  }
}
