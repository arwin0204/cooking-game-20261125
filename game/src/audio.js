// Procedural sound effects, all synthesized with WebAudio: no audio files,
// no network, just oscillators and a burst of noise. Sound starts only after
// the player first interacts, so the page never needs permission up front.
let context = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}
export function isMuted() {
  return muted;
}

function audio() {
  if (muted) return null;
  try {
    if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

/** One short oscillator note: frequency, seconds, shape and volume. */
function tone(freq, seconds, type, volume, when = 0) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + seconds);
  } catch {
    // Sound is garnish: a failure here must never break the game.
  }
}

/** A short burst of filtered noise, for chopping and sizzling. */
function noise(seconds, volume, frequency) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  } catch {
    // See tone(): sound must never break the game.
  }
}

export const sfx = {
  pickup() { tone(520, 0.08, 'sine', 0.12); },
  place() { tone(340, 0.07, 'triangle', 0.12); },
  chop() { noise(0.06, 0.25, 1800); tone(180, 0.05, 'square', 0.06); },
  chopDone() { tone(660, 0.1, 'sine', 0.12); tone(880, 0.12, 'sine', 0.1, 0.08); },
  cookDone() { tone(740, 0.12, 'sine', 0.12); tone(990, 0.16, 'sine', 0.1, 0.1); },
  serve() { tone(523, 0.1, 'sine', 0.14); tone(659, 0.1, 'sine', 0.14, 0.09); tone(784, 0.18, 'sine', 0.14, 0.18); },
  error() { tone(160, 0.16, 'sawtooth', 0.08); },
  expire() { tone(220, 0.25, 'triangle', 0.12); tone(165, 0.3, 'triangle', 0.1, 0.18); },
  burn() { noise(0.25, 0.2, 900); },
  start() { tone(392, 0.1, 'sine', 0.12); tone(523, 0.14, 'sine', 0.12, 0.1); },
};
