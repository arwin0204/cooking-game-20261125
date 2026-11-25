// Sizzle & Serve: everything the player sees. One file, one job: paint the
// kitchen, the chef, the orders and the screens from the world state, with
// all food drawn as vector shapes — no image files, nothing to download.
import {
  BOARD, CHEF_RADIUS, COUNTERS, DAY_SECONDS, FLOOR, HUD, INGREDIENTS,
  PANTRY, PREP, STATIONS, TRASH, VIEW,
} from './config.js';
import { promptFor, stationAt } from './world.js';

const WOOD = '#8b5a2b';
const WOOD_DARK = '#6f4520';
const COUNTER_TOP = '#d9a066';
const WALL = '#f7e8d0';
const FLOOR_A = '#e8c99a';
const FLOOR_B = '#dfbd85';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/** Draw one ingredient as a little vector picture, centred on (x, y). */
export function drawIngredient(ctx, id, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  switch (id) {
    case 'tomato': {
      circle(ctx, 0, 0, r);
      ctx.fillStyle = '#e5484d';
      ctx.fill();
      ctx.fillStyle = '#46a758';
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(-r * 0.45, -r * 0.45);
      ctx.lineTo(r * 0.45, -r * 0.45);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'tomato_chopped': {
      ctx.fillStyle = '#e5484d';
      for (const [ox, oy] of [[-r * 0.4, -r * 0.2], [r * 0.4, -r * 0.2], [0, r * 0.4]]) {
        ctx.beginPath();
        ctx.arc(ox, oy, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ff8a80';
      circle(ctx, 0, r * 0.1, r * 0.2);
      ctx.fill();
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#2f9e44';
      for (const [ox, oy] of [[-r * 0.45, 0], [r * 0.45, 0], [0, -r * 0.4]]) {
        ctx.beginPath();
        ctx.ellipse(ox, oy, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#69db7c';
      circle(ctx, 0, 0, r * 0.4);
      ctx.fill();
      break;
    }
    case 'lettuce_chopped': {
      ctx.strokeStyle = '#40c057';
      ctx.lineWidth = r * 0.28;
      ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [
        [-r * 0.6, -r * 0.3, r * 0.6, -r * 0.5],
        [-r * 0.6, r * 0.1, r * 0.6, -r * 0.1],
        [-r * 0.6, r * 0.5, r * 0.6, r * 0.3],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      break;
    }
    case 'carrot': {
      ctx.fillStyle = '#f76b15';
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.3);
      ctx.lineTo(r * 0.5, -r * 0.3);
      ctx.lineTo(0, r);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2f9e44';
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = 'round';
      for (const dx of [-r * 0.3, 0, r * 0.3]) {
        ctx.beginPath();
        ctx.moveTo(dx, -r * 0.3);
        ctx.lineTo(dx * 1.4, -r * 0.95);
        ctx.stroke();
      }
      break;
    }
    case 'carrot_chopped': {
      ctx.fillStyle = '#f76707';
      for (const [ox, oy] of [[-r * 0.4, -r * 0.3], [r * 0.4, -r * 0.3], [0, r * 0.4]]) {
        circle(ctx, ox, oy, r * 0.42);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd8a8';
      circle(ctx, 0, 0, r * 0.18);
      ctx.fill();
      break;
    }
    case 'patty': {
      roundRect(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.5);
      ctx.fillStyle = '#c47f4a';
      ctx.fill();
      break;
    }
    case 'patty_cooked': {
      roundRect(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.5);
      ctx.fillStyle = '#7c4a12';
      ctx.fill();
      ctx.strokeStyle = '#4a2c07';
      ctx.lineWidth = r * 0.14;
      for (const dx of [-r * 0.5, 0, r * 0.5]) {
        ctx.beginPath();
        ctx.moveTo(dx, -r * 0.45);
        ctx.lineTo(dx, r * 0.45);
        ctx.stroke();
      }
      break;
    }
    case 'patty_burnt':
    case 'noodle_burnt': {
      circle(ctx, 0, 0, r * 0.9);
      ctx.fillStyle = '#222';
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.5);
      ctx.quadraticCurveTo(-r * 0.6, -r * 1.1, -r * 0.2, -r * 1.2);
      ctx.stroke();
      break;
    }
    case 'noodle': {
      roundRect(ctx, -r, -r * 0.7, r * 2, r * 1.4, r * 0.3);
      ctx.fillStyle = '#f5d90a';
      ctx.fill();
      ctx.strokeStyle = '#d9b400';
      ctx.lineWidth = r * 0.1;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.8, i * r * 0.4);
        ctx.lineTo(r * 0.8, i * r * 0.4);
        ctx.stroke();
      }
      break;
    }
    case 'noodle_cooked': {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = r * 0.3;
      ctx.lineCap = 'round';
      for (const [cx, cy, rad] of [[-r * 0.3, -r * 0.2, r * 0.45], [r * 0.35, r * 0.25, r * 0.45]]) {
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0.5, Math.PI * 1.6);
        ctx.stroke();
      }
      break;
    }
    case 'bun': {
      ctx.beginPath();
      ctx.arc(0, r * 0.25, r, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#d9a066';
      ctx.fill();
      ctx.fillStyle = '#f7e8d0';
      for (const [ox, oy] of [[-r * 0.4, -r * 0.3], [r * 0.35, -r * 0.45], [0, -r * 0.6]]) {
        circle(ctx, ox, oy, r * 0.1);
        ctx.fill();
      }
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.6);
      ctx.lineTo(r, r * 0.6);
      ctx.lineTo(0, -r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f08c00';
      for (const [ox, oy] of [[-r * 0.3, r * 0.2], [r * 0.25, r * 0.3]]) {
        circle(ctx, ox, oy, r * 0.14);
        ctx.fill();
      }
      break;
    }
    case 'broth': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#74c0fc';
      ctx.fill();
      ctx.strokeStyle = '#1971c2';
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = '#adb5bd';
      ctx.lineWidth = r * 0.12;
      for (const dx of [-r * 0.3, r * 0.3]) {
        ctx.beginPath();
        ctx.moveTo(dx, -r * 0.5);
        ctx.quadraticCurveTo(dx + r * 0.2, -r * 0.9, dx, -r * 1.15);
        ctx.stroke();
      }
      break;
    }
    default: {
      circle(ctx, 0, 0, r);
      ctx.fillStyle = '#adb5bd';
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A white plate with its contents drawn as a neat row of icons. */
function drawPlate(ctx, contents, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.5, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f8f9fa';
  ctx.fill();
  ctx.strokeStyle = '#ced4da';
  ctx.lineWidth = 2;
  ctx.stroke();
  const count = contents.length;
  contents.forEach((id, i) => {
    const ox = count === 1 ? 0 : (i - (count - 1) / 2) * r * 0.75;
    drawIngredient(ctx, id, ox, -r * 0.1, r * 0.42);
  });
  ctx.restore();
}

function drawProgressRing(ctx, x, y, r, fraction, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

function drawKitchen(state, ctx) {
  // Wall and floor.
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, VIEW.width, COUNTERS.y);
  ctx.fillStyle = '#e9d8b8';
  for (let x = 0; x < VIEW.width; x += 96) {
    ctx.fillRect(x, 168, 92, 4);
  }
  for (let y = COUNTERS.y + COUNTERS.height; y < VIEW.height; y += 48) {
    for (let x = 0; x < VIEW.width; x += 48) {
      const odd = ((x / 48 + y / 48) % 2 + 2) % 2 === 0;
      ctx.fillStyle = odd ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x, y, 48, 48);
    }
  }
  // A rug in the middle of the floor and a potted herb by the wall.
  ctx.fillStyle = '#c2255c';
  roundRect(ctx, 480, 470, 320, 130, 16);
  ctx.fill();
  ctx.fillStyle = '#a61e4d';
  roundRect(ctx, 496, 486, 288, 98, 12);
  ctx.fill();
  ctx.fillStyle = '#b25e09';
  roundRect(ctx, 90, 640, 34, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#40c057';
  circle(ctx, 107, 632, 16);
  ctx.fill();
}

function drawCounters(state, ctx) {
  const active = stationAt(state);
  for (const [id, station] of Object.entries(STATIONS)) {
    const x = station.x;
    const y = COUNTERS.y;
    const w = station.width;
    const h = COUNTERS.height;
    ctx.fillStyle = active === id ? '#ffe066' : COUNTER_TOP;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = WOOD;
    ctx.fillRect(x, y + h - 12, w, 12);
    ctx.fillStyle = '#5c3d24';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(station.label, x + w / 2, y + h - 20);
  }

  // Pantry bins: one per ingredient, with its key.
  const pantry = STATIONS.pantry;
  const binWidth = pantry.width / PANTRY.length;
  PANTRY.forEach((bin, i) => {
    const bx = pantry.x + i * binWidth;
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, bx + 4, COUNTERS.y + 8, binWidth - 8, 52, 6);
    ctx.fill();
    drawIngredient(ctx, bin.id, bx + binWidth / 2, COUNTERS.y + 32, 15);
    ctx.fillStyle = '#5c3d24';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(bin.key, bx + binWidth / 2, COUNTERS.y + 56);
  });

  // Chopping board.
  const board = STATIONS.board;
  const boardX = board.x + board.width / 2;
  ctx.fillStyle = '#f1e3c6';
  roundRect(ctx, board.x + 18, COUNTERS.y + 10, board.width - 36, 48, 8);
  ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (state.board.item) {
    drawIngredient(ctx, state.board.item, boardX, COUNTERS.y + 34, 16);
    if (!state.board.done) {
      drawProgressRing(ctx, boardX, COUNTERS.y + 34, 24, state.board.progress, '#e8590c');
    }
  }

  // Stove: two burners with a pot or pan on each when cooking.
  const stove = STATIONS.stove;
  state.burners.forEach((burner, i) => {
    const bx = stove.x + 28 + i * 92;
    const by = COUNTERS.y + 34;
    circle(ctx, bx, by, 30);
    ctx.fillStyle = '#343a40';
    ctx.fill();
    circle(ctx, bx, by, 22);
    ctx.fillStyle = burner.item ? '#e8590c' : '#495057';
    ctx.fill();
    if (burner.item) {
      drawIngredient(ctx, burner.item, bx, by, 15);
      if (!burner.done) {
        drawProgressRing(ctx, bx, by, 28, burner.progress, '#ffd43b');
      } else if (burner.item.endsWith('_burnt')) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('BURNT!', bx, by - 36);
      } else {
        const left = Math.max(0, 5 - burner.overcook);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`READY ${left.toFixed(0)}s`, bx, by - 36);
      }
    }
  });

  // Plate stack, and the plate being assembled on the counter.
  const plates = STATIONS.plates;
  const platesX = plates.x + plates.width / 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(platesX, COUNTERS.y + 44 - i * 5, 34, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#dee2e6' : '#f8f9fa';
    ctx.fill();
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (state.assembly) {
    drawPlate(ctx, state.assembly.contents, platesX, COUNTERS.y + 26, 26);
  }

  // Serving window: a hatch with a bell.
  const serve = STATIONS.serve;
  ctx.fillStyle = '#495057';
  roundRect(ctx, serve.x + 10, COUNTERS.y + 8, serve.width - 20, 52, 8);
  ctx.fill();
  ctx.fillStyle = '#ffe066';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('★ SERVE ★', serve.x + serve.width / 2, COUNTERS.y + 40);
  circle(ctx, serve.x + serve.width / 2, COUNTERS.y + 52, 6);
  ctx.fillStyle = '#ffd43b';
  ctx.fill();

  // Trash bin on the floor.
  ctx.fillStyle = active === 'trash' ? '#ffe066' : '#868e96';
  roundRect(ctx, TRASH.x, TRASH.y, TRASH.width, TRASH.height, 8);
  ctx.fill();
  ctx.fillStyle = '#495057';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('BIN', TRASH.x + TRASH.width / 2, TRASH.y + TRASH.height - 10);
}

function drawOrderBoard(state, ctx) {
  ctx.fillStyle = '#5c3d24';
  roundRect(ctx, 12, BOARD.y - 4, VIEW.width - 24, BOARD.height + 8, 10);
  ctx.fill();
  ctx.fillStyle = '#ffe8cc';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ORDER BOARD', 28, BOARD.y + 18);
  ctx.fillStyle = '#ffd43b';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Serve the dish before the patience bar runs out!', VIEW.width - 28, BOARD.y + 18);
  ctx.textAlign = 'center';
  if (state.orders.length === 0) {
    ctx.fillStyle = '#ffe8cc';
    ctx.font = 'italic 16px sans-serif';
    ctx.fillText('No orders yet — the lunch rush is coming…', VIEW.width / 2, BOARD.y + 70);
    return;
  }
  state.orders.forEach((order, i) => {
    const x = 28 + i * 216;
    const y = BOARD.y + 28;
    const w = 200;
    const h = 78;
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = '#212529';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`#${order.id} ${order.recipe.name}`, x + 10, y + 20);
    ctx.fillStyle = '#868e96';
    ctx.font = '12px sans-serif';
    ctx.fillText(`$${order.recipe.price} + tip`, x + 10, y + 38);
    order.recipe.items.forEach((item, j) => {
      drawIngredient(ctx, item, x + 24 + j * 34, y + 58, 13);
    });
    const fraction = Math.max(0, order.patience / order.maxPatience);
    ctx.fillStyle = '#e9ecef';
    roundRect(ctx, x + 10, y + h - 12, w - 20, 6, 3);
    ctx.fill();
    ctx.fillStyle = fraction > 0.5 ? '#40c057' : fraction > 0.25 ? '#fab005' : '#e03131';
    roundRect(ctx, x + 10, y + h - 12, (w - 20) * fraction, 6, 3);
    ctx.fill();
  });
}

function drawHud(state, ctx) {
  ctx.fillStyle = '#3b2f2f';
  ctx.fillRect(0, 0, VIEW.width, HUD.height);
  ctx.fillStyle = '#ffd43b';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🍳 SIZZLE & SERVE', 16, 40);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`💰 $${state.coins}`, 330, 40);
  ctx.fillText(`Day ${state.day}`, 480, 40);
  ctx.fillStyle = '#ff6b6b';
  ctx.font = '20px sans-serif';
  ctx.fillText('♥'.repeat(Math.max(0, state.hearts)) + '♡'.repeat(Math.max(0, 3 - state.hearts)), 580, 40);
  // Day timer: a bar plus seconds, right-aligned.
  const fraction = Math.max(0, state.timeLeft / DAY_SECONDS);
  ctx.fillStyle = '#495057';
  roundRect(ctx, 760, 18, 300, 28, 8);
  ctx.fill();
  ctx.fillStyle = fraction > 0.3 ? '#40c057' : '#e03131';
  roundRect(ctx, 760, 18, 300 * fraction, 28, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`⏱ ${Math.ceil(state.timeLeft)}s`, 910, 38);
  ctx.fillStyle = '#adb5bd';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Best $${state.best} · Served ${state.served}`, VIEW.width - 16, 40);
  ctx.textAlign = 'center';
}

function drawChef(state, ctx) {
  const chef = state.chef;
  const bob = chef.moving ? Math.sin(state.elapsed * 14) * 2 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  // Shadow.
  ctx.beginPath();
  ctx.ellipse(0, CHEF_RADIUS - 2, 24, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();
  // Body: white apron over a shirt.
  ctx.fillStyle = '#f8f9fa';
  roundRect(ctx, -20, -6, 40, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#1971c2';
  ctx.fillRect(-20, -6, 40, 8);
  // Head and tall chef hat.
  circle(ctx, 0, -18, 14);
  ctx.fillStyle = '#ffdbac';
  ctx.fill();
  ctx.fillStyle = '#fff';
  roundRect(ctx, -13, -46, 26, 18, 6);
  ctx.fill();
  circle(ctx, -9, -44, 8);
  ctx.fill();
  circle(ctx, 0, -48, 9);
  ctx.fill();
  circle(ctx, 9, -44, 8);
  ctx.fill();
  // Eyes look the way the chef faces.
  ctx.fillStyle = '#212529';
  circle(ctx, chef.dir * 4 - 4, -20, 2);
  ctx.fill();
  circle(ctx, chef.dir * 4 + 4, -20, 2);
  ctx.fill();
  // What the chef carries, held up high.
  if (state.held) {
    if (state.held.kind === 'plate') {
      drawPlate(ctx, state.held.contents, 0, -58, 22);
    } else {
      drawIngredient(ctx, state.held.id, 0, -58, 16);
      ctx.fillStyle = '#212529';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(INGREDIENTS[state.held.id].name, 0, -78);
    }
  }
  ctx.restore();
}

function drawFx(state, ctx) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.ttl);
    ctx.fillStyle = p.color;
    circle(ctx, p.x, p.y, 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Toasts stack at the bottom centre.
  state.toasts.forEach((toast, i) => {
    const alpha = Math.min(1, toast.ttl);
    ctx.globalAlpha = alpha;
    const colors = { info: '#343a40', good: '#2b8a3e', bad: '#c92a2a' };
    ctx.fillStyle = colors[toast.kind] ?? colors.info;
    ctx.font = 'bold 15px sans-serif';
    const width = ctx.measureText(toast.text).width + 28;
    const x = (VIEW.width - width) / 2;
    const y = VIEW.height - 96 + i * 30;
    roundRect(ctx, x, y, width, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(toast.text, VIEW.width / 2, y + 18);
    ctx.textAlign = 'center';
  });
  ctx.globalAlpha = 1;
  // The hint line at the very bottom.
  const hint = promptFor(state);
  if (hint) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, VIEW.height - 26, VIEW.width, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hint, VIEW.width / 2, VIEW.height - 8);
  }
}

function drawOverlay(state, ctx, title, lines, footnote, rect = { x: 340, y: 150, w: 600, h: 380 }) {
  ctx.fillStyle = 'rgba(30, 20, 10, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
  ctx.fill();
  ctx.fillStyle = '#3b2f2f';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, rect.x + rect.w / 2, rect.y + 70);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#495057';
  lines.forEach((line, i) => ctx.fillText(line, rect.x + rect.w / 2, rect.y + 118 + i * 30));
  ctx.fillStyle = '#e8590c';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(footnote, rect.x + rect.w / 2, rect.y + rect.h - 40);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const screens = {
    title: 'title', play: 'play', paused: 'paused', over: 'over', gameover: 'gameover',
  };
  return {
    draw(state, screen) {
      ctx.save();
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * state.shake * 24, (Math.random() - 0.5) * state.shake * 24);
      }
      drawKitchen(state, ctx);
      drawCounters(state, ctx);
      drawOrderBoard(state, ctx);
      drawChef(state, ctx);
      drawHud(state, ctx);
      drawFx(state, ctx);
      ctx.restore();
      if (screen === screens.title) {
        // The title card sits low so the whole counter row — pantry, board,
        // stove, plates with a dish mid-assembly — stays visible above it.
        drawOverlay(state, ctx, '🍳 SIZZLE & SERVE', [
          'Run the tiniest kitchen in town.',
          'Grab ingredients, chop and cook them,',
          'plate the dish and serve it before',
          'the customer walks out!',
          '',
          'WASD / arrows to move · E to interact',
          '1-8 to grab from the pantry · P to pause',
        ], 'Press ENTER to open the kitchen', { x: 390, y: 305, w: 500, h: 375 });
      } else if (screen === screens.paused) {
        drawOverlay(state, ctx, 'PAUSED', ['The stove is off and the orders wait.', '', 'Take a breath, chef.'], 'Press P or ENTER to keep cooking');
      } else if (screen === screens.over) {
        drawOverlay(state, ctx, `DAY ${state.day} DONE!`, [
          `Coins earned: $${state.coins}`,
          `Dishes served: ${state.served} · Customers lost: ${state.lost}`,
          `Best run: $${state.best}`,
          '',
          'Tomorrow the rush comes faster…',
        ], 'Press ENTER for the next day');
      } else if (screen === screens.gameover) {
        drawOverlay(state, ctx, 'KITCHEN CLOSED', [
          'Too many customers walked out.',
          `Final coins: $${state.coins} · Dishes served: ${state.served}`,
          `Best run: $${state.best}`,
          '',
          'Every great chef has an off day.',
        ], 'Press ENTER to start a new run');
      }
    },
  };
}

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_GAMEOVER = 'gameover';
