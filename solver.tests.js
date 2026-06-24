"use strict";

const G = require('./game.js');
const { solve } = require('./game.js');

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

// A scramble built with depth `d` is at most `d` moves from the canonical solved
// board (true_dist <= d; cancellation can only lower it). So:
//   - depth <= maxSteps  => a solution of length <= maxSteps MUST exist.
//                           solve() must return a non-null, valid, in-bound list.
//   - depth >  maxSteps  => a short solution usually does NOT exist, so null is a
//                           clean "not found" (PASS). If cancellation pulled
//                           true_dist down to <= maxSteps, solve() may instead
//                           return a list, which must still be valid.
//
// Validity (required whenever a non-null list is returned):
//   length <= maxSteps  AND  simulating it from initialState yields isSolved().
function assert(name, initialState, depth, maxSteps) {
  total++;
  const moves = solve(initialState.slice(), G.HALVES, maxSteps);

  let ok = true;
  let reason = '';

  if (moves === null) {
    // null only acceptable when no short solution is guaranteed (depth > maxSteps).
    if (depth <= maxSteps) {
      ok = false;
      reason = `solver returned null but a solution <= ${maxSteps} is guaranteed (depth=${depth})`;
    }
  } else {
    // A returned list must be valid regardless of depth.
    if (!Array.isArray(moves)) {
      ok = false;
      reason = `solver returned non-array, non-null result`;
    } else if (moves.length > maxSteps) {
      ok = false;
      reason = `solver returned ${moves.length} moves, max allowed: ${maxSteps}`;
    } else {
      const { solved } = simulate(initialState, moves);
      if (!solved) {
        ok = false;
        reason = `solver returned ${moves.length} moves but board not solved`;
      }
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

// --- fixed-depth cases, each maxSteps in 1..5 -------------------------------
// For every (depth, maxSteps) pair we hit both branches:
//   depth <= maxSteps  -> guaranteed solution
//   depth >  maxSteps  -> expect null (or validated short solution)
console.log(`--- fixed depth x maxSteps grid (depth 1..6, maxSteps 1..5) ---`);
const BASE_SEED = 0xABCDEF;
for (let depth = 1; depth <= 6; depth++) {
  G.scramble(BASE_SEED + depth, depth);
  const snapshot = G.getState();
  for (let maxSteps = 1; maxSteps <= 5; maxSteps++) {
    assert(
      `depth=${depth} maxSteps=${maxSteps} (seed=${BASE_SEED + depth})`,
      snapshot, depth, maxSteps
    );
  }
}

// --- random batch -----------------------------------------------------------
// Random depths span both below and above maxSteps so both branches are
// exercised heavily. maxSteps is also randomized within 1..5.
console.log(`\n--- random tests (200 iter, outer seed=0xDEADBEEF) ---`);
const rng = G.mulberry32(0xDEADBEEF);
for (let i = 1; i <= 200; i++) {
  // depths 1..8 straddle the maxSteps (1..5) window on both sides.
  const depth = (rng() * 8 | 0) + 1;
  const maxSteps = (rng() * 5 | 0) + 1;
  const testSeed = (rng() * 2 ** 32) >>> 0;
  G.scramble(testSeed, depth);
  const snapshot = G.getState();
  assert(`[${i}] depth=${depth} maxSteps=${maxSteps} seed=${testSeed}`, snapshot, depth, maxSteps);
}

console.log(`\nResults: ${passed} / ${total} passed`);
process.exit(passed === total ? 0 : 1);
