// Sizzle & Serve: the kitchen itself. One file, one job: the game state, the
// rules (orders, chopping, cooking, plating, serving) and the fixed-step
// update. It knows nothing about drawing or keys; input.js feeds it, and
// render.js paints what it holds.
import {
  BURN_SECONDS, CHEF_RADIUS, CHEF_SPEED, COUNTERS, DAY_SECONDS, FLOOR,
  INGREDIENTS, MAX_HEARTS, MAX_PLATE_ITEMS, MAX_TIP, PANTRY, PREP, RECIPES,
  STATIONS, STEP, TRASH, dayTuning,
} from './config.js';
import { createRandom, pick } from './random.js';
import { sfx } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_GAMEOVER = 'gameover';

/** An empty pair of stove burners. */
function freshBurners() {
  return [
    { item: null, progress: 0, done: false, overcook: 0 },
    { item: null, progress: 0, done: false, overcook: 0 },
  ];
}

/** A fresh run: day one, no coins, a clean kitchen. */
export function createWorld(random) {
  const state = {
    random,
    screen: SCREEN_TITLE,
    day: 1,
    coins: 0,
    served: 0,
    lost: 0,
    hearts: MAX_HEARTS,
    timeLeft: DAY_SECONDS,
    elapsed: 0,
    chef: { x: 640, y: 520, dir: 1, moving: false, moveTarget: null },
    held: null,
    board: { item: null, progress: 0, done: false, chopTick: 0 },
    burners: freshBurners(),
    assembly: null,
    orders: [],
    spawnIn: 4,
    nextOrderId: 1,
    toasts: [],
    particles: [],
    shake: 0,
    best: 0,
  };
  return state;
}

/** Start (or restart) a day: fresh orders, a full timer, full hearts. */
export function startDay(state, day) {
  state.day = day;
  state.hearts = MAX_HEARTS;
  state.timeLeft = DAY_SECONDS;
  state.elapsed = 0;
  state.held = null;
  state.board = { item: null, progress: 0, done: false, chopTick: 0 };
  state.burners = freshBurners();
  state.assembly = null;
  state.orders = [];
  state.spawnIn = 3;
  state.chef.x = 640;
  state.chef.y = 520;
  state.chef.moveTarget = null;
  state.toasts = [];
  state.screen = SCREEN_PLAY;
  spawnOrder(state);
}

export function resetRun(state) {
  state.coins = 0;
  state.served = 0;
  state.lost = 0;
  startDay(state, 1);
}

function toast(state, text, kind = 'info') {
  state.toasts.push({ text, ttl: 2.6, kind });
  if (state.toasts.length > 3) state.toasts.shift();
}

function burst(state, x, y, color, count = 18) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.random() * Math.PI * 2;
    const speed = 60 + state.random() * 140;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      ttl: 0.6 + state.random() * 0.5,
      color,
    });
  }
}

/** The tuning for the current day (spawn speed, board size, patience). */
export function tuning(state) {
  return dayTuning(state.day);
}

function spawnOrder(state) {
  const tune = tuning(state);
  const menu = RECIPES.slice(0, tune.menuSize);
  const recipe = pick(state.random, menu);
  const patience = tune.patienceSeconds;
  state.orders.push({
    id: state.nextOrderId,
    recipe,
    patience,
    maxPatience: patience,
  });
  state.nextOrderId += 1;
}

/** Do two ingredient lists hold the same items, in any order? */
function sameDish(a, b) {
  if (a.length !== b.length) return false;
  const rest = [...b];
  return a.every((item) => {
    const index = rest.indexOf(item);
    if (index === -1) return false;
    rest.splice(index, 1);
    return true;
  });
}

function stationRect(id) {
  if (id === 'trash') return TRASH;
  const station = STATIONS[id];
  return { x: station.x, y: COUNTERS.y, width: station.width, height: COUNTERS.height };
}

/** The station the chef can reach right now, or null. */
export function stationAt(state) {
  const chef = state.chef;
  const reachY = COUNTERS.y + COUNTERS.height + 56;
  let best = null;
  let bestDistance = Infinity;
  for (const id of Object.keys(STATIONS)) {
    const rect = stationRect(id);
    const centreX = rect.x + rect.width / 2;
    const dx = Math.abs(chef.x - centreX) - rect.width / 2;
    const dy = chef.y - CHEF_RADIUS - (rect.y + rect.height);
    if (dx <= 26 && dy >= -8 && dy <= 56) {
      const distance = Math.max(0, dx) + Math.max(0, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = id;
      }
    }
  }
  if (best) return best;
  // Trash lives on the floor, bottom right.
  const tx = TRASH.x + TRASH.width / 2;
  const ty = TRASH.y + TRASH.height / 2;
  if (Math.hypot(chef.x - tx, chef.y - ty) < 110) return 'trash';
  return null;
}

/** Is the chef close enough to the pantry to grab from a bin? */
export function nearPantry(state) {
  return stationAt(state) === 'pantry';
}

/** Grab one pantry ingredient into empty hands. */
export function pickIngredient(state, id) {
  if (state.screen !== SCREEN_PLAY) return;
  if (!nearPantry(state)) {
    toast(state, 'Walk up to the pantry first!', 'bad');
    sfx.error();
    return;
  }
  if (state.held) {
    toast(state, 'Hands full — plate it or bin it first.', 'bad');
    sfx.error();
    return;
  }
  const found = PANTRY.find((bin) => bin.id === id);
  if (!found) return;
  state.held = { kind: 'item', id };
  sfx.pickup();
}

/** The one-button interaction (E / Space / click a station). */
export function interact(state) {
  if (state.screen !== SCREEN_PLAY) return;
  const station = stationAt(state);
  if (!station) return;
  if (station === 'pantry') {
    toast(state, 'Press 1-8 or click a bin to grab an ingredient.', 'info');
    return;
  }
  if (station === 'trash') {
    if (!state.held) {
      toast(state, 'Nothing to toss.', 'info');
      return;
    }
    const name = state.held.kind === 'plate' ? 'the plate' : INGREDIENTS[state.held.id].name;
    state.held = null;
    toast(state, `Tossed ${name}.`, 'info');
    sfx.place();
    return;
  }
  if (station === 'board') return interactBoard(state);
  if (station === 'stove') return interactStove(state);
  if (station === 'plates') return interactPlates(state);
  if (station === 'serve') return interactServe(state);
}

function interactBoard(state) {
  const board = state.board;
  if (!board.item) {
    if (!state.held || state.held.kind !== 'item') {
      toast(state, 'Bring something to chop.', 'info');
      return;
    }
    const prep = PREP[state.held.id];
    if (!prep || prep.kind !== 'chop') {
      toast(state, `${INGREDIENTS[state.held.id].name} does not need chopping.`, 'bad');
      sfx.error();
      return;
    }
    board.item = state.held.id;
    board.progress = 0;
    board.done = false;
    board.chopTick = 0;
    state.held = null;
    sfx.place();
    return;
  }
  if (!board.done) {
    toast(state, 'Still chopping…', 'info');
    return;
  }
  if (state.held) {
    toast(state, 'Hands full — plate it or bin it first.', 'bad');
    sfx.error();
    return;
  }
  state.held = { kind: 'item', id: board.item };
  board.item = null;
  board.progress = 0;
  board.done = false;
  sfx.pickup();
}

function interactStove(state) {
  const free = state.burners.find((burner) => !burner.item);
  const ready = state.burners.find((burner) => burner.item && (burner.done || burner.item.endsWith('_burnt')));
  if (state.held && state.held.kind === 'item') {
    const prep = PREP[state.held.id];
    if (prep && prep.kind === 'cook' && free) {
      free.item = state.held.id;
      free.progress = 0;
      free.done = false;
      free.overcook = 0;
      state.held = null;
      sfx.place();
      return;
    }
    if (!prep || prep.kind !== 'cook') {
      toast(state, `${INGREDIENTS[state.held.id].name} does not go on the stove.`, 'bad');
      sfx.error();
      return;
    }
    toast(state, 'Both burners are busy!', 'bad');
    sfx.error();
    return;
  }
  if (state.held) {
    toast(state, 'Put the plate down first.', 'bad');
    sfx.error();
    return;
  }
  if (ready) {
    const burnt = ready.item.endsWith('_burnt');
    state.held = { kind: 'item', id: ready.item };
    ready.item = null;
    ready.progress = 0;
    ready.done = false;
    ready.overcook = 0;
    if (burnt) toast(state, 'Burnt! Only the bin will take it.', 'bad');
    sfx.pickup();
    return;
  }
  if (state.burners.some((burner) => burner.item)) {
    toast(state, 'Still cooking…', 'info');
    return;
  }
  toast(state, 'Bring a patty or noodles to cook.', 'info');
}

function interactPlates(state) {
  if (!state.held && !state.assembly) {
    state.held = { kind: 'plate', contents: [] };
    sfx.pickup();
    return;
  }
  if (state.held && state.held.kind === 'plate' && !state.assembly) {
    state.assembly = { contents: state.held.contents };
    state.held = null;
    sfx.place();
    return;
  }
  if (state.held && state.held.kind === 'plate' && state.assembly) {
    toast(state, 'A plate is already on the counter.', 'bad');
    sfx.error();
    return;
  }
  if (state.held && state.held.kind === 'item' && state.assembly) {
    if (state.assembly.contents.length >= MAX_PLATE_ITEMS) {
      toast(state, 'The plate is full.', 'bad');
      sfx.error();
      return;
    }
    state.assembly.contents.push(state.held.id);
    state.held = null;
    sfx.place();
    return;
  }
  if (state.held && state.held.kind === 'item' && !state.assembly) {
    // Holding food at an empty plate counter starts the dish: a fresh plate
    // appears on the counter with this ingredient already on it.
    state.assembly = { contents: [state.held.id] };
    state.held = null;
    sfx.place();
    return;
  }
  if (!state.held && state.assembly) {
    state.held = { kind: 'plate', contents: state.assembly.contents };
    state.assembly = null;
    sfx.pickup();
  }
}

function interactServe(state) {
  if (!state.held) {
    toast(state, 'Bring a finished plate to serve.', 'info');
    return;
  }
  if (state.held.kind !== 'plate') {
    toast(state, 'That is not a dish — plate it first.', 'bad');
    sfx.error();
    return;
  }
  const index = state.orders.findIndex((order) => sameDish(state.held.contents, order.recipe.items));
  if (index === -1) {
    toast(state, 'No order wants this dish!', 'bad');
    state.shake = 0.3;
    sfx.error();
    return;
  }
  const order = state.orders[index];
  const tip = Math.round(MAX_TIP * (order.patience / order.maxPatience));
  const earned = order.recipe.price + tip;
  state.coins += earned;
  state.served += 1;
  state.orders.splice(index, 1);
  state.held = null;
  burst(state, 1100, 250, '#ffd60a');
  burst(state, 1100, 250, '#46a758');
  toast(state, `Served ${order.recipe.name}! +$${earned} (tip $${tip})`, 'good');
  sfx.serve();
}

/** The hint line: what the chef can do from exactly where they stand. */
export function promptFor(state) {
  if (state.screen !== SCREEN_PLAY) return '';
  const station = stationAt(state);
  if (station === 'pantry') return 'Pantry: press 1-8 or click a bin to grab an ingredient';
  if (station === 'board') {
    if (!state.board.item) return 'Board: press E to chop what you are holding';
    if (!state.board.done) return 'Chopping… wait for the chop to finish';
    return 'Board: press E to pick up the chopped food';
  }
  if (station === 'stove') {
    if (state.held && state.held.kind === 'item') return 'Stove: press E to start cooking';
    if (state.burners.some((b) => b.item && (b.done || b.item.endsWith('_burnt')))) return 'Stove: press E to take it off the burner';
    return 'Stove: bring a patty or noodles to cook';
  }
  if (station === 'plates') {
    if (!state.held && !state.assembly) return 'Plates: press E to take a plate';
    if (state.held && state.held.kind === 'plate') return 'Plates: press E to set the plate down';
    if (state.held && state.held.kind === 'item' && state.assembly) return 'Plates: press E to add it to the dish';
    if (!state.held && state.assembly) return 'Plates: press E to pick the dish up';
    if (state.held && state.held.kind === 'item' && !state.assembly) return 'Plates: press E to start the dish on a fresh plate';
    return 'Plates: put a plate on the counter first';
  }
  if (station === 'serve') return 'Serve: press E to hand over a finished plate';
  if (station === 'trash') return 'Bin: press E to toss what you are holding';
  return 'Move with WASD / arrows, or click the floor. E interacts. P pauses.';
}

function stepChef(state, dt, input) {
  const chef = state.chef;
  let dx = input.dx;
  let dy = input.dy;
  if (input.moveTarget) {
    const tx = input.moveTarget.x;
    const ty = input.moveTarget.y;
    const distX = tx - chef.x;
    const distY = ty - chef.y;
    const dist = Math.hypot(distX, distY);
    if (dist < 8) {
      input.moveTarget = null;
    } else {
      dx = distX / dist;
      dy = distY / dist;
    }
  }
  const length = Math.hypot(dx, dy);
  chef.moving = length > 0.01;
  if (chef.moving) {
    if (Math.abs(dx) > 0.2) chef.dir = dx > 0 ? 1 : -1;
    chef.x += (dx / Math.max(1, length)) * CHEF_SPEED * dt;
    chef.y += (dy / Math.max(1, length)) * CHEF_SPEED * dt;
  }
  chef.x = Math.min(FLOOR.right - CHEF_RADIUS, Math.max(FLOOR.left + CHEF_RADIUS, chef.x));
  chef.y = Math.min(FLOOR.bottom - CHEF_RADIUS, Math.max(FLOOR.top + CHEF_RADIUS, chef.y));
}

function stepPrep(state, dt) {
  const board = state.board;
  if (board.item && !board.done) {
    const prep = PREP[board.item];
    board.progress += dt / prep.seconds;
    board.chopTick += dt;
    if (board.chopTick >= 0.4) {
      board.chopTick = 0;
      sfx.chop();
    }
    if (board.progress >= 1) {
      board.item = prep.result;
      board.progress = 1;
      board.done = true;
      sfx.chopDone();
    }
  }
  for (const burner of state.burners) {
    if (!burner.item) continue;
    if (!burner.done) {
      const prep = PREP[burner.item];
      burner.progress += dt / prep.seconds;
      if (burner.progress >= 1) {
        burner.item = prep.result;
        burner.progress = 1;
        burner.done = true;
        burner.overcook = 0;
        sfx.cookDone();
      }
    } else if (!burner.item.endsWith('_burnt')) {
      burner.overcook += dt;
      if (burner.overcook >= BURN_SECONDS) {
        burner.item = `${burner.item.split('_')[0]}_burnt`;
        sfx.burn();
        toast(state, 'Something burnt on the stove!', 'bad');
      }
    }
  }
}

function stepOrders(state, dt) {
  const tune = tuning(state);
  state.spawnIn -= dt;
  if (state.spawnIn <= 0 && state.orders.length < tune.maxActive) {
    spawnOrder(state);
    state.spawnIn = tune.spawnSeconds * (0.85 + state.random() * 0.3);
  }
  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const order = state.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders.splice(i, 1);
      state.lost += 1;
      state.hearts -= 1;
      toast(state, `A customer walked out — ${order.recipe.name} was too slow!`, 'bad');
      sfx.expire();
      if (state.hearts <= 0) {
        state.screen = SCREEN_GAMEOVER;
        return;
      }
    }
  }
}

function stepFx(state, dt) {
  for (let i = state.toasts.length - 1; i >= 0; i -= 1) {
    state.toasts[i].ttl -= dt;
    if (state.toasts[i].ttl <= 0) state.toasts.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.ttl -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
    if (p.ttl <= 0) state.particles.splice(i, 1);
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
}

/** Advance the world one fixed step. `input` carries the keys held this step. */
export function step(state, input) {
  if (state.screen !== SCREEN_PLAY) {
    stepFx(state, STEP);
    return;
  }
  state.elapsed += STEP;
  state.timeLeft -= STEP;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.screen = SCREEN_OVER;
    stepFx(state, STEP);
    return;
  }
  stepChef(state, STEP, input);
  stepPrep(state, STEP);
  stepOrders(state, STEP);
  stepFx(state, STEP);
}
