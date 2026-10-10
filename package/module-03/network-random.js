export function createHostRandom(text) {
  let seed = 2166136261, count = 0;
  for (const ch of String(text)) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  return {
    next() { count++; seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; },
    snapshot() { return {algorithm: 'mulberry32', draws: count, state: seed}; }
  };
}
