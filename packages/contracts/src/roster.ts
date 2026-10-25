// Roster (PRD §8.1). Normative: names, unions and fields match the PRD exactly.
export const HOUSE_FIGHTERS = ['vex', 'sage', 'glitch', 'quill', 'brick', 'pip'] as const;
export type HouseFighterId = typeof HOUSE_FIGHTERS[number];
export type FighterId = string;                  // house id, or 'f_' + nanoid(8) for community fighters

export type Archetype = 'brawler' | 'scholar' | 'trickster' | 'tank' | 'speedster';
export type HeadId = 'horned_helm' | 'topknot' | 'goggles_mohawk' | 'monocle_tophat' | 'great_helm' | 'big_helmet' | 'hood' | 'crown';
export type WeaponId = 'greatsword' | 'katana' | 'sawblade' | 'rapier' | 'cleaver' | 'wooden_sword';
export type EmblemId = 'skull' | 'lotus' | 'bolt' | 'quill' | 'shield' | 'star' | 'flame' | 'eye';
export type Build = 'lean' | 'standard' | 'heavy';

export type SkinSpec = {
  palette: { primary: string; secondary: string; accent: string; skin: string };  // hex; outline is always --outline
  head: HeadId; weapon: WeaponId; emblem: EmblemId; build: Build;
};

export type FighterPublic = {
  id: FighterId; name: string; title: string; archetype: Archetype; skin: SkinSpec;
  catchphrase: string; bio: string; strategyBlurb: string;   // all public; the model is not
};

export const HOUSE_ROSTER: Record<HouseFighterId, FighterPublic> = {
  vex:    { id: 'vex',    name: 'VEX',    title: 'The Villain',   archetype: 'brawler',
            skin: { palette: { primary: '#E5383B', secondary: '#22202E', accent: '#F2C14E', skin: '#C98B6B' }, head: 'horned_helm',    weapon: 'greatsword',   emblem: 'skull',  build: 'heavy' },
            catchphrase: 'Kneel.', bio: 'Undefeated in his own mind.', strategyBlurb: 'Swings first, checks never.' },
  sage:   { id: 'sage',   name: 'SAGE',   title: 'The Monk',      archetype: 'scholar',
            skin: { palette: { primary: '#2EC4A6', secondary: '#F1E3C8', accent: '#1B4D45', skin: '#E0B48C' }, head: 'topknot',        weapon: 'katana',       emblem: 'lotus',  build: 'lean' },
            catchphrase: 'Measure twice. Cut once.', bio: 'Has never submitted an unverified answer.', strategyBlurb: 'Verifies every answer before striking.' },
  glitch: { id: 'glitch', name: 'GLITCH', title: 'The Gremlin',   archetype: 'trickster',
            skin: { palette: { primary: '#8B5CF6', secondary: '#B6FF3B', accent: '#1E1B2E', skin: '#9FD4A3' }, head: 'goggles_mohawk', weapon: 'sawblade',     emblem: 'bolt',   build: 'lean' },
            catchphrase: 'lol. lmao, even.', bio: 'Starts with the hardest problem. Finishes with chaos.', strategyBlurb: 'Hardest first, guesses when stuck.' },
  quill:  { id: 'quill',  name: 'QUILL',  title: 'The Professor', archetype: 'scholar',
            skin: { palette: { primary: '#3A6FF2', secondary: '#F2C14E', accent: '#1A2350', skin: '#F0C9A6' }, head: 'monocle_tophat', weapon: 'rapier',       emblem: 'quill',  build: 'standard' },
            catchphrase: 'As the literature suggests…', bio: 'Shows his work. All of it.', strategyBlurb: 'In order, by the book.' },
  brick:  { id: 'brick',  name: 'BRICK',  title: 'The Wall',      archetype: 'tank',
            skin: { palette: { primary: '#FF8A2B', secondary: '#5B6475', accent: '#2B2F3A', skin: '#B9825E' }, head: 'great_helm',     weapon: 'cleaver',      emblem: 'shield', build: 'heavy' },
            catchphrase: 'Slow is smooth.', bio: 'Never guesses. Rarely rushes.', strategyBlurb: 'Re-derives once, never guesses.' },
  pip:    { id: 'pip',    name: 'PIP',    title: 'The Rookie',    archetype: 'speedster',
            skin: { palette: { primary: '#FFD23F', secondary: '#56CCF2', accent: '#2D3142', skin: '#F3C7A0' }, head: 'big_helmet',     weapon: 'wooden_sword', emblem: 'star',   build: 'lean' },
            catchphrase: 'I got this! …probably.', bio: 'First season. Big dreams. Small sword.', strategyBlurb: 'Easy ones first, full send.' },
};
