// The screenshot scenes behind ?shot=start|play|end. Each one stages a real,
// reachable kitchen state — a fresh day, a dish mid-assembly with chopping
// under way, and a plate ready to serve — then the renderer paints it, so
// every screenshot is a true render of the game's own code.
import { DAY_SECONDS } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, startDay } from './world.js';

/** Stage `name` (start, play or end) on a fresh world and return the screen. */
export function stageShot(name, world) {
  startDay(world, 1);
  if (name === 'play') return stagePlay(world);
  if (name === 'end') return stageEnd(world);
  return stageStart(world);
}

function stageStart(world) {
  // Title screen over a kitchen that is already alive: two orders on the
  // board, a plate mid-assembly on the counter, ingredients in the pantry.
  world.assembly = { contents: ['bun', 'patty_cooked'] };
  world.chef.x = 300;
  world.chef.y = 460;
  world.timeLeft = DAY_SECONDS;
  world.orders = [
    { id: 1, recipe: { id: 'burger', name: 'Melt Burger', items: ['bun', 'patty_cooked', 'cheese'], price: 12 }, patience: 41, maxPatience: 50 },
    { id: 2, recipe: { id: 'salad', name: 'Garden Salad', items: ['tomato_chopped', 'lettuce_chopped'], price: 8 }, patience: 30, maxPatience: 50 },
  ];
  return { screen: SCREEN_TITLE, best: 0 };
}

function stagePlay(world) {
  // Mid-rush: the chef chops a tomato at the board, a Melt Burger waits on
  // the plate counter with two of its three parts, the timer is running and
  // three orders crowd the board.
  world.chef.x = 487;
  world.chef.y = 360;
  world.board.item = 'tomato';
  world.board.progress = 0.6;
  world.board.done = false;
  world.assembly = { contents: ['bun', 'patty_cooked'] };
  world.timeLeft = 87;
  world.elapsed = DAY_SECONDS - 87;
  world.coins = 24;
  world.served = 2;
  // startDay seeded one order; give the board its second and third tickets
  // by hand so the rush reads at a glance.
  world.orders = [
    { id: 1, recipe: { id: 'burger', name: 'Melt Burger', items: ['bun', 'patty_cooked', 'cheese'], price: 12 }, patience: 38, maxPatience: 50 },
    { id: 2, recipe: { id: 'salad', name: 'Garden Salad', items: ['tomato_chopped', 'lettuce_chopped'], price: 8 }, patience: 22, maxPatience: 50 },
    { id: 3, recipe: { id: 'noodles', name: 'Ember Noodle Bowl', items: ['noodle_cooked', 'carrot_chopped', 'broth'], price: 13 }, patience: 44, maxPatience: 50 },
  ];
  return { screen: SCREEN_PLAY, best: 24 };
}

function stageEnd(world) {
  // The serve moment: the chef holds a finished Melt Burger at the window,
  // coins already earned, the day nearly over — the plate is ready to serve.
  world.chef.x = 1090;
  world.chef.y = 360;
  world.held = { kind: 'plate', contents: ['bun', 'patty_cooked', 'cheese'] };
  world.timeLeft = 12;
  world.elapsed = DAY_SECONDS - 12;
  world.coins = 61;
  world.served = 5;
  world.orders = [
    { id: 7, recipe: { id: 'burger', name: 'Melt Burger', items: ['bun', 'patty_cooked', 'cheese'], price: 12 }, patience: 31, maxPatience: 50 },
    { id: 8, recipe: { id: 'salad', name: 'Garden Salad', items: ['tomato_chopped', 'lettuce_chopped'], price: 8 }, patience: 15, maxPatience: 50 },
  ];
  world.toasts = [{ text: 'Served Ember Noodle Bowl! +$16 (tip $3)', ttl: 2.6, kind: 'good' }];
  return { screen: SCREEN_PLAY, best: 61 };
}

export { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE };
