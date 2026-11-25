// Sizzle & Serve: keyboard and mouse. One file, one job: turn keys and clicks
// into the small input object the world steps with. Clicking the floor sets a
// walk target; clicking a pantry bin grabs that ingredient; clicking a station
// in reach uses it.
import { PANTRY, STATIONS, TRASH, COUNTERS } from './config.js';
import { stationAt } from './world.js';

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

/** Fresh input state, wired to one canvas element. */
export function createInput(canvas, hooks) {
  const keys = new Set();
  const input = {
    dx: 0,
    dy: 0,
    moveTarget: null,
    interactQueued: false,
    pickQueued: null,
  };
  let interactLocked = false;

  function updateDirection() {
    let x = 0;
    let y = 0;
    for (const code of keys) {
      const dir = MOVE_KEYS[code];
      if (dir) {
        x += dir[0];
        y += dir[1];
      }
    }
    input.dx = x;
    input.dy = y;
    if (x !== 0 || y !== 0) input.moveTarget = null;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function pantryBinAt(point) {
    const pantry = STATIONS.pantry;
    if (point.y < COUNTERS.y + 8 || point.y > COUNTERS.y + COUNTERS.height - 26) return null;
    const binWidth = pantry.width / PANTRY.length;
    const index = Math.floor((point.x - pantry.x) / binWidth);
    if (index < 0 || index >= PANTRY.length) return null;
    return PANTRY[index].id;
  }

  function stationPointAt(point) {
    for (const id of Object.keys(STATIONS)) {
      const s = STATIONS[id];
      if (point.x >= s.x && point.x <= s.x + s.width && point.y >= COUNTERS.y && point.y <= COUNTERS.y + COUNTERS.height) return id;
    }
    if (point.x >= TRASH.x && point.x <= TRASH.x + TRASH.width && point.y >= TRASH.y && point.y <= TRASH.y + TRASH.height) return 'trash';
    return null;
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') event.preventDefault();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    updateDirection();
    if (event.code === 'KeyE' || event.code === 'Space') {
      if (!interactLocked) {
        interactLocked = true;
        input.interactQueued = true;
      }
    }
    if (event.code === 'KeyP' || event.code === 'Escape') hooks.onPause();
    if (event.code === 'Enter') hooks.onConfirm();
    if (event.code === 'KeyM') hooks.onMute();
    const bin = PANTRY.find((item) => `Digit${item.key}` === event.code);
    if (bin) input.pickQueued = bin.id;
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'KeyE' || event.code === 'Space') interactLocked = false;
    updateDirection();
  });

  window.addEventListener('blur', () => {
    keys.clear();
    interactLocked = false;
    updateDirection();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const world = hooks.world();
    if (!world || world.screen !== 'play') {
      hooks.onConfirm();
      return;
    }
    const bin = pantryBinAt(point);
    if (bin && stationAt(world) === 'pantry') {
      input.pickQueued = bin;
      return;
    }
    const station = stationPointAt(point);
    if (station && stationAt(world) === station) {
      input.interactQueued = true;
      return;
    }
    if (point.y >= COUNTERS.y + COUNTERS.height) {
      input.moveTarget = { x: point.x, y: Math.max(point.y, 330) };
    }
  });

  return input;
}

/** Take the one-shot actions out of the input after the world used them. */
export function consumeActions(input) {
  const actions = { interact: input.interactQueued, pick: input.pickQueued };
  input.interactQueued = false;
  input.pickQueued = null;
  return actions;
}
