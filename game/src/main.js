// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, day over and game over.
//
// ?seed=N fixes the day's orders. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  SCREEN_GAMEOVER, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
  createWorld, interact, pickIngredient, resetRun, startDay, step,
} from './world.js';
import { consumeActions, createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { isMuted, setMuted, sfx } from './audio.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts one visit.
  }
}

world.best = readBest();

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, world);
  world.best = scene.best;
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, {
    world: () => world,
    onPause() {
      if (world.screen === SCREEN_PLAY) {
        world.screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (world.screen === SCREEN_PAUSED) {
        world.screen = SCREEN_PLAY;
        announce('Playing.');
      }
    },
    onConfirm() {
      if (world.screen === SCREEN_TITLE) {
        resetRun(world);
        world.best = readBest();
        sfx.start();
        announce('Playing. Serve every order before the customers walk out.');
      } else if (world.screen === SCREEN_OVER) {
        if (world.coins > world.best) {
          world.best = world.coins;
          saveBest(world.best);
        }
        startDay(world, world.day + 1);
        announce(`Day ${world.day}. The rush comes faster now.`);
      } else if (world.screen === SCREEN_GAMEOVER) {
        if (world.coins > world.best) {
          world.best = world.coins;
          saveBest(world.best);
        }
        resetRun(world);
        world.best = readBest();
        announce('A new run. Serve every order before the customers walk out.');
      }
    },
    onMute() {
      setMuted(!isMuted());
      announce(isMuted() ? 'Sound off.' : 'Sound on.');
    },
  });

  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const actions = consumeActions(input);
      if (actions.pick) pickIngredient(world, actions.pick);
      if (actions.interact) interact(world);
      step(world, input);
    }
    if (world.screen !== screen) {
      screen = world.screen;
      if (screen === SCREEN_OVER || screen === SCREEN_GAMEOVER) {
        if (world.coins > world.best) {
          world.best = world.coins;
          saveBest(world.best);
        }
      }
    }
    renderer.draw(world, world.screen);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
