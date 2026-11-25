// A tiny seeded random generator (mulberry32). The world uses this and
// nothing else for chance, so a day played from one seed is reproducible.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one entry of `list` with the seeded generator. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}
