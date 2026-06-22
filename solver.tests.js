"use strict";

const G = require('./game.js');
const { solve } = require('./solver.js');

// Apply solver move-list to a state snapshot; return { solved }
function simulate(initialState, moves) {
  G.setRawState(initialState);
  for (const { halfIndex, dir } of moves) {
    G.applyHalf(G.HALVES[halfIndex], dir);
  }
  return { solved: G.isSolved() };
}

let passed = 0;
let total = 0;

function assert(name, initialState, maxMoves) {
  total++;
  const moves = solve(initialState.slice(), G.HALVES);
  let ok = true;
  let reason = '';

  if (moves.length > maxMoves) {
    ok = false;
    reason = `solver returned ${moves.length} moves, max allowed: ${maxMoves}`;
  } else {
    const { solved } = simulate(initialState, moves);
    if (!solved) {
      ok = false;
      reason = `solver returned ${moves.length} moves but board not solved`;
    }
  }

  if (ok) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    console.log(`FAIL  ${name}`);
    console.log(`      ${reason}`);
    console.log(`      board: ${G.encodeBoard(initialState)}`);
  }
}

// --- specific-depth scrambles (depths 1-5, fixed seeds) ---
const BASE_SEED = 0xABCDEF;
for (let depth = 1; depth <= 5; depth++) {
  G.scramble(BASE_SEED + depth, depth);
  const snapshot = G.getState();
  assert(`depth=${depth} scramble (seed=${BASE_SEED + depth})`, snapshot, depth);
}

// --- 100 random-depth tests ---
console.log(`\n--- random tests (100 iter, outer seed=0xDEADBEEF) ---`);
const rng = G.mulberry32(0xDEADBEEF);
for (let i = 1; i <= 100; i++) {
  const depth = (rng() * 100 | 0) + 1;
  const testSeed = (rng() * 2 ** 32) >>> 0;
  G.scramble(testSeed, depth);
  const snapshot = G.getState();
  assert(`[${i}] depth=${depth} scramble seed=${testSeed}`, snapshot, depth);
}

console.log(`\nResults: ${passed} / ${total} passed`);
process.exit(passed === total ? 0 : 1);
