// Mock skill profiles (PRD §11.3, FC-F-045) and canned taunts. Runner-only.

export type MockProfile = {
  pCorrect: [number, number, number, number, number];   // by difficulty 1..5
  latencyMeanS: number; latencySdS: number;             // first-attempt latency
  pSloppy: number;                                      // P(wrong answer is the sloppy "trap" kind)
  taunts: number;                                       // per match
  pRefereeDeny: number;                                 // per attempt: tries a forbidden tool
  pInvalidSyntax: number;                               // per wrong non-sloppy answer
  taunts_lines: string[];
};

export const MOCK_PROFILES: Record<string, MockProfile> = {
  vex: {
    pCorrect: [.95, .85, .70, .50, .30], latencyMeanS: 8, latencySdS: 3, pSloppy: .60, taunts: 3, pRefereeDeny: .08, pInvalidSyntax: .15,
    taunts_lines: ['Kneel.', 'Is that all you have?', 'I do not check. I do not need to.', 'Read it and weep.'],
  },
  sage: {
    pCorrect: [.98, .95, .90, .75, .55], latencyMeanS: 20, latencySdS: 6, pSloppy: .05, taunts: 1, pRefereeDeny: 0, pInvalidSyntax: .05,
    taunts_lines: ['Measure twice. Cut once.', 'Patience is also a strike.', 'The answer was always there.'],
  },
  glitch: {
    pCorrect: [.85, .70, .55, .45, .40], latencyMeanS: 12, latencySdS: 8, pSloppy: .50, taunts: 3, pRefereeDeny: .15, pInvalidSyntax: .30,
    taunts_lines: ['lol. lmao, even.', 'hardest one first. skill issue.', 'syntax is a social construct', 'bzzt. nice try.'],
  },
  quill: {
    pCorrect: [.97, .90, .80, .60, .40], latencyMeanS: 16, latencySdS: 5, pSloppy: .20, taunts: 2, pRefereeDeny: .02, pInvalidSyntax: .08,
    taunts_lines: ['As the literature suggests...', 'One must show one\'s work.', 'Fascinating. And incorrect.'],
  },
  brick: {
    pCorrect: [.97, .92, .85, .65, .45], latencyMeanS: 18, latencySdS: 4, pSloppy: .10, taunts: 1, pRefereeDeny: 0, pInvalidSyntax: .05,
    taunts_lines: ['Slow is smooth.', 'Not moving.', 'Derived twice. Trust the wall.'],
  },
  pip: {
    pCorrect: [.90, .70, .45, .25, .10], latencyMeanS: 10, latencySdS: 4, pSloppy: .50, taunts: 2, pRefereeDeny: .10, pInvalidSyntax: .25,
    taunts_lines: ['I got this! ...probably.', 'Wait, is this the easy one?', 'Full send!', 'Okay okay okay...'],
  },
};

export const DEFAULT_PROFILE: MockProfile = {
  pCorrect: [.9, .75, .6, .45, .3], latencyMeanS: 14, latencySdS: 5, pSloppy: .3, taunts: 1, pRefereeDeny: 0.03, pInvalidSyntax: .15,
  taunts_lines: ['Let us begin.', 'Good luck.'],
};

export const THINKING_INTERVAL_S: [number, number] = [4, 8];
export const TOOL_INTERVAL_S: [number, number] = [6, 10];

// Tool labels (≤ 48 chars). `{n}` is replaced by a problem index.
export const TOOL_LABELS: { tool: 'read' | 'write' | 'run' | 'other'; label: string }[] = [
  { tool: 'read', label: 'reading PROBLEMS.md' },
  { tool: 'write', label: 'writing scratch/p{n}.py' },
  { tool: 'run', label: 'running python' },
  { tool: 'read', label: 'reading scratch/p{n}.py' },
  { tool: 'run', label: 'running python scratch/p{n}.py' },
  { tool: 'other', label: 'checking derivative' },
];

export const SLOPPY_FALLBACK = 'x';                 // garbage-but-valid when no reference is known
export const INVALID_ANSWERS = ['x^^2 +', 'integral(x)', '2x(', 'sin x +* 3'];
