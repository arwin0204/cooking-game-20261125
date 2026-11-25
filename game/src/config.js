// Sizzle & Serve: the numbers that tune the kitchen. One file, one job: every
// constant the world and the renderer share lives here, so a tweak lands in
// exactly one place.
export const VIEW = { width: 1280, height: 720 };

// Fixed-step world: the loop advances in 1/60 s slices, so the same seed
// always plays the same day.
export const STEP = 1 / 60;
export const DAY_SECONDS = 150;
export const CHEF_SPEED = 270;
export const CHEF_RADIUS = 22;

// The day timer is the big bar at the top; the order board sits under it.
export const HUD = { height: 64 };
export const BOARD = { y: 72, height: 118 };
export const COUNTERS = { y: 208, height: 92 };
export const FLOOR = { top: 300, bottom: 704, left: 16, right: 1264 };

// Stations along the top counter, left to right: pantry, chopping board,
// stove (two burners), plate counter, serving window. Trash sits on the floor.
export const STATIONS = {
  pantry: { x: 16, width: 380, label: 'PANTRY' },
  board: { x: 412, width: 150, label: 'CHOPPING BOARD' },
  stove: { x: 578, width: 200, label: 'STOVE' },
  plates: { x: 794, width: 130, label: 'PLATES' },
  serve: { x: 940, width: 324, label: 'SERVE HERE' },
};
export const TRASH = { x: 1150, y: 616, width: 114, height: 88 };

// Pantry bins, left to right. Keys 1-8 grab one when the chef is at the pantry.
export const PANTRY = [
  { id: 'tomato', name: 'Tomato', key: '1' },
  { id: 'lettuce', name: 'Lettuce', key: '2' },
  { id: 'carrot', name: 'Carrot', key: '3' },
  { id: 'patty', name: 'Patty', key: '4' },
  { id: 'noodle', name: 'Noodle', key: '5' },
  { id: 'bun', name: 'Bun', key: '6' },
  { id: 'cheese', name: 'Cheese', key: '7' },
  { id: 'broth', name: 'Broth', key: '8' },
];

// What a raw ingredient becomes, and how long it takes. Chop on the board,
// cook on a burner; a cooked dish left on the burner burns.
export const PREP = {
  tomato: { kind: 'chop', result: 'tomato_chopped', seconds: 1.6 },
  lettuce: { kind: 'chop', result: 'lettuce_chopped', seconds: 1.6 },
  carrot: { kind: 'chop', result: 'carrot_chopped', seconds: 1.6 },
  patty: { kind: 'cook', result: 'patty_cooked', seconds: 3.0 },
  noodle: { kind: 'cook', result: 'noodle_cooked', seconds: 3.0 },
};
export const BURN_SECONDS = 5;

// Every ingredient the game can show, with its display name and colour.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e5484d' },
  tomato_chopped: { name: 'Chopped Tomato', color: '#e5484d' },
  lettuce: { name: 'Lettuce', color: '#46a758' },
  lettuce_chopped: { name: 'Chopped Lettuce', color: '#46a758' },
  carrot: { name: 'Carrot', color: '#f76b15' },
  carrot_chopped: { name: 'Chopped Carrot', color: '#f76b15' },
  patty: { name: 'Raw Patty', color: '#b25e09' },
  patty_cooked: { name: 'Cooked Patty', color: '#7c4a12' },
  patty_burnt: { name: 'Burnt Patty', color: '#2b2b2b' },
  noodle: { name: 'Dry Noodle', color: '#f5d90a' },
  noodle_cooked: { name: 'Cooked Noodle', color: '#eab308' },
  noodle_burnt: { name: 'Burnt Noodle', color: '#2b2b2b' },
  bun: { name: 'Bun', color: '#d9a066' },
  cheese: { name: 'Cheese', color: '#ffd60a' },
  broth: { name: 'Broth', color: '#8ecae6' },
};

// The menu: six original dishes. A plate serves when its contents match a
// recipe exactly, in any order.
export const RECIPES = [
  { id: 'salad', name: 'Garden Salad', items: ['tomato_chopped', 'lettuce_chopped'], price: 8 },
  { id: 'burger', name: 'Melt Burger', items: ['bun', 'patty_cooked', 'cheese'], price: 12 },
  { id: 'noodles', name: 'Ember Noodle Bowl', items: ['noodle_cooked', 'carrot_chopped', 'broth'], price: 13 },
  { id: 'wrap', name: 'Garden Wrap', items: ['bun', 'lettuce_chopped', 'tomato_chopped', 'cheese'], price: 12 },
  { id: 'soup', name: 'Tomato Broth Soup', items: ['tomato_chopped', 'broth', 'carrot_chopped'], price: 11 },
  { id: 'cheesy', name: 'Cheesy Noodles', items: ['noodle_cooked', 'cheese', 'tomato_chopped'], price: 12 },
];

export const BEST_KEY = 'sizzle-and-serve-best-coins';
export const MAX_HEARTS = 3;
export const MAX_PLATE_ITEMS = 4;
export const MAX_TIP = 5;

// Day difficulty: later days spawn orders faster, allow more on the board at
// once, and give customers less patience.
export function dayTuning(day) {
  return {
    spawnSeconds: Math.max(8, 16 - (day - 1) * 2),
    maxActive: Math.min(4, 2 + Math.floor((day - 1) / 2)),
    patienceSeconds: Math.max(32, 50 - (day - 1) * 3),
    // Day one only serves the two simplest dishes; the full menu opens later.
    menuSize: day === 1 ? 2 : day === 2 ? 4 : RECIPES.length,
  };
}
