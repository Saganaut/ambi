/**
 * Deterministic per-round shuffle (Fisher–Yates over a string-seeded PRNG):
 * seeded by the slide id, a board's bank order is stable across re-renders and
 * reconnects on one device but varies per round, without impure
 * `Math.random()` in render. Shared by the placement boards (grid, axis).
 */
const seededShuffle = <T,>(source: T[], seed: string): T[] => {
  let state = 0;
  for (const char of seed) state = (state * 31 + char.charCodeAt(0)) >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const out = [...source];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export { seededShuffle };
