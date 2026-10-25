import { describe, expect, it } from 'vitest';
import { formChips, frameDisplay, ovrDelta, recordText, sparkPath, statColor, statText, statsVisible, tierFromOvr, winPct } from '../src/ui/card/helpers';

describe('stat colours', () => {
  it('follows the §10.10 thresholds', () => {
    expect(statColor(99)).toBe('#F5C84B');
    expect(statColor(85)).toBe('#F5C84B');
    expect(statColor(84)).toBe('#FFFFFF');
    expect(statColor(75)).toBe('#FFFFFF');
    expect(statColor(74)).toBe('#A1A1AA');
    expect(statColor(65)).toBe('#A1A1AA');
    expect(statColor(64)).toBe('#52525B');
  });
  it('hides stats under 3 matches', () => {
    expect(statsVisible(null)).toBe(false);
    expect(statsVisible({ matches: 2 })).toBe(false);
    expect(statsVisible({ matches: 3 })).toBe(true);
    expect(statText(null, 'spd')).toBe('–');
  });
});

describe('form chips', () => {
  it('reverses newest-first data into oldest-to-newest chips', () => {
    expect(formChips('WLWPL').map((c) => c.result)).toEqual(['L', 'P', 'W', 'L', 'W']);
  });
  it('tones: W gold, P silver, L hollow', () => {
    expect(formChips('WPL').map((c) => c.tone)).toEqual(['hollow', 'silver', 'gold']);
    expect(formChips('L')[0]!.filled).toBe(false);
  });
  it('handles empty and junk input', () => {
    expect(formChips('')).toEqual([]);
    expect(formChips(null)).toEqual([]);
    expect(formChips('WxL').length).toBe(2);
  });
});

describe('frame display', () => {
  it('maps tiers by OVR', () => {
    expect([64, 65, 74, 75, 84, 85].map(tierFromOvr)).toEqual(['bronze', 'silver', 'silver', 'gold', 'gold', 'elite']);
  });
  it('special frames carry ribbons', () => {
    expect(frameDisplay('hot_streak', { streak: 5, upsetUntil: null }).ribbon).toBe('🔥 ×5');
    expect(frameDisplay('hot_streak', null).ribbon).toBe('🔥 ×3');
    expect(frameDisplay('upset', null, 9.5).ribbon).toBe('UPSET 9.5×');
    expect(frameDisplay('rookie').ribbon).toBe('ROOKIE');
    expect(frameDisplay('gold').ribbon).toBeNull();
    expect(frameDisplay('upset').special).toBe(true);
    expect(frameDisplay('silver').special).toBe(false);
  });
  it('foil only for gold, elite and special action frames', () => {
    expect(frameDisplay('bronze').foil).toBe(false);
    expect(frameDisplay('elite').foil).toBe(true);
  });
});

describe('misc', () => {
  it('win pct and record', () => {
    expect(winPct({ matches: 20, wins: 14 })).toBe('70%');
    expect(winPct(null)).toBe('–');
    expect(recordText({ matches: 20, wins: 14 })).toBe('W 14 · L 6');
  });
  it('sparkline path', () => {
    expect(sparkPath([], 10, 10)).toBe('');
    expect(sparkPath([0, 1], 100, 20, 0, 0, 1)).toBe('M0.0 20.0 L100.0 0.0');
  });
  it('ovr delta', () => {
    expect(ovrDelta(null, 80)).toBeNull();
    expect(ovrDelta(80, 82)).toBe('up');
    expect(ovrDelta(80, 78)).toBe('down');
    expect(ovrDelta(80, 80)).toBeNull();
  });
});
