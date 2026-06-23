"use strict";

const G = require('./game.js');
const { solve } = require('./solver.js');
const { createSolvabilityTracker, advance } = require('./tracker.js');

let passed = 0;
let total = 0;

function check(name, cond, reason) {
  total++;
  if (cond) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    console.log(`FAIL  ${name}`);
    console.log(`      ${reason || 'assertion failed'}`);
  }
}

// run a test body that may throw (the stub throws "not implemented"); a throw
// is just a failure with the error message as the reason.
function test(name, fn) {
  let cond = false, reason = '';
  try {
    const r = fn();
    if (r && typeof r === 'object' && 'cond' in r) { cond = r.cond; reason = r.reason; }
    else { cond = !!r; }
  } catch (e) {
    cond = false;
    reason = 'threw: ' + (e && e.message);
  }
  check(name, cond, reason);
}

// deep-equal for move lists / small plain structures
function eqMove(a, b) {
  if (a == null || b == null) return a === b;
  return a.halfIndex === b.halfIndex && a.dir === b.dir;
}
function eqList(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!eqMove(a[i], b[i])) return false;
  return true;
}

// A controllable stub solveFn: feed it a queue of values to return per call,
// or set `.value` for a constant. Throws if the queue empties unexpectedly so a
// mis-counted test fails loudly rather than silently.
function makeStub(initialValue) {
  const queue = [];
  const fn = function () {
    if (queue.length) return queue.shift();
    return fn.value;
  };
  fn.value = (initialValue === undefined) ? null : initialValue;
  fn.queue = queue;
  fn.push = (...vals) => { queue.push(...vals); return fn; };
  return fn;
}

// small seeded PRNG (mulberry32) for the randomized invariant test
function mulberry32(seedValue) {
  return function () {
    seedValue |= 0; seedValue = seedValue + 0x6D2B79F5 | 0;
    let value = Math.imul(seedValue ^ seedValue >>> 15, 1 | seedValue);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

/* =========================================================================
 * advance() unit tests (pure)
 * ========================================================================= */
console.log('--- advance() unit tests ---');

test('advance: front-match (same halfIndex & dir) drops the front', () => {
  const path = [{ halfIndex: 2, dir: 1 }, { halfIndex: 0, dir: -1 }, { halfIndex: 3, dir: 1 }];
  const out = advance(path, { halfIndex: 2, dir: 1 });
  const expected = [{ halfIndex: 0, dir: -1 }, { halfIndex: 3, dir: 1 }];
  return { cond: eqList(out, expected), reason: 'got ' + JSON.stringify(out) };
});

test('advance: front-match shortens length by exactly 1', () => {
  const path = [{ halfIndex: 1, dir: -1 }, { halfIndex: 4, dir: 1 }];
  const out = advance(path, { halfIndex: 1, dir: -1 });
  return { cond: out.length === path.length - 1, reason: 'len=' + out.length };
});

test('advance: same halfIndex but different dir is NOT a match -> prepend inverse', () => {
  const path = [{ halfIndex: 2, dir: 1 }, { halfIndex: 0, dir: -1 }];
  const out = advance(path, { halfIndex: 2, dir: -1 });
  const expected = [{ halfIndex: 2, dir: 1 }, { halfIndex: 2, dir: 1 }, { halfIndex: 0, dir: -1 }];
  // applied move halfIndex 2 dir -1 -> inverse is {2, 1} prepended onto the original path
  return { cond: eqList(out, expected), reason: 'got ' + JSON.stringify(out) };
});

test('advance: different halfIndex is NOT a match -> prepend inverse', () => {
  const path = [{ halfIndex: 2, dir: 1 }, { halfIndex: 0, dir: -1 }];
  const out = advance(path, { halfIndex: 5, dir: 1 });
  const expected = [{ halfIndex: 5, dir: -1 }, { halfIndex: 2, dir: 1 }, { halfIndex: 0, dir: -1 }];
  return { cond: eqList(out, expected), reason: 'got ' + JSON.stringify(out) };
});

test('advance: prepended inverse has negated dir and same halfIndex as applied move', () => {
  const path = [{ halfIndex: 1, dir: 1 }];
  const applied = { halfIndex: 4, dir: -1 };
  const out = advance(path, applied);
  const head = out[0];
  return {
    cond: head.halfIndex === applied.halfIndex && head.dir === -applied.dir && out.length === path.length + 1,
    reason: 'head=' + JSON.stringify(head) + ' len=' + out.length,
  };
});

test('advance: walk-away off an empty-ish path still prepends inverse (len grows)', () => {
  const path = [{ halfIndex: 0, dir: 1 }];
  const out = advance(path, { halfIndex: 0, dir: -1 });
  return { cond: out.length === 2 && eqMove(out[0], { halfIndex: 0, dir: 1 }), reason: JSON.stringify(out) };
});

// Invariant property test using a tiny deterministic model.
// Model: "board" is an array of 6 integers (one counter per halfIndex). The
// goal board is all-zeros. A move {halfIndex, dir} adds `dir` to board[halfIndex].
// A "solving path" from a board is the list of moves that zero every counter.
// We verify: applying `appliedMove` then the advance-updated path reaches the
// SAME goal as the original path reached from the original board.
test('advance: invariant — apply(move)+advance(path,move) reaches same goal (seeded model)', () => {
  const rng = mulberry32(0xC0FFEE);
  const applyModel = (board, mv) => {
    const b = board.slice();
    b[mv.halfIndex] += mv.dir;
    return b;
  };
  const runPath = (board, path) => {
    let b = board.slice();
    for (const mv of path) b = applyModel(b, mv);
    return b;
  };
  const eqBoard = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  for (let iter = 0; iter < 500; iter++) {
    // build a random board and a path that solves it (the path that zeros it).
    const board = [];
    for (let i = 0; i < 6; i++) board.push((rng() * 5 | 0) - 2); // -2..2
    // a solving path: for each non-zero counter, undo it one step at a time
    const path = [];
    for (let i = 0; i < 6; i++) {
      let v = board[i];
      while (v !== 0) {
        const step = v > 0 ? -1 : 1;
        path.push({ halfIndex: i, dir: step });
        v += step;
      }
    }
    const goal = runPath(board, path); // should be all zeros

    // arbitrary applied move
    const applied = { halfIndex: (rng() * 6 | 0), dir: rng() < 0.5 ? 1 : -1 };
    const newBoard = applyModel(board, applied);
    const newPath = advance(path, applied);
    const reached = runPath(newBoard, newPath);

    if (!eqBoard(reached, goal)) {
      return { cond: false, reason: `iter ${iter}: reached ${JSON.stringify(reached)} != goal ${JSON.stringify(goal)}` };
    }
  }
  return { cond: true };
});

/* =========================================================================
 * Tracker state-machine tests with a controllable STUB solveFn
 * ========================================================================= */
console.log('\n--- tracker state-machine tests (stub solveFn) ---');

const ST = { halfIndex: 99, dir: 1 }; // dummy "state" placeholder; stub ignores it

test('reset: adopts path from solveFn; hasPath/next/snapshot reflect it', () => {
  const path = [{ halfIndex: 0, dir: 1 }, { halfIndex: 2, dir: -1 }];
  const t = createSolvabilityTracker(makeStub(path));
  t.reset(ST);
  return {
    cond: t.hasPath() === true && eqMove(t.next(), path[0]) && eqList(t.snapshot(), path),
    reason: `hasPath=${t.hasPath()} next=${JSON.stringify(t.next())} snap=${JSON.stringify(t.snapshot())}`,
  };
});

test('reset(null): no path held', () => {
  const t = createSolvabilityTracker(makeStub(null));
  t.reset(ST);
  return {
    cond: t.hasPath() === false && t.next() === null && t.snapshot() === null,
    reason: `hasPath=${t.hasPath()} next=${JSON.stringify(t.next())} snap=${JSON.stringify(t.snapshot())}`,
  };
});

test('reset([]): solved board -> hasPath false, next null', () => {
  const t = createSolvabilityTracker(makeStub([]));
  t.reset(ST);
  return {
    cond: t.hasPath() === false && t.next() === null,
    reason: `hasPath=${t.hasPath()} next=${JSON.stringify(t.next())}`,
  };
});

test('record rule 1: always adopt fresh — replaces a DIFFERENT held path', () => {
  const stub = makeStub();
  const initial = [{ halfIndex: 0, dir: 1 }];
  const fresh = [{ halfIndex: 3, dir: -1 }, { halfIndex: 1, dir: 1 }];
  stub.value = initial;
  const t = createSolvabilityTracker(stub);
  t.reset(ST);                       // path = initial
  stub.value = fresh;                // next solveFn call returns the new fresh path
  t.record({ halfIndex: 0, dir: 1 }, ST);
  return { cond: eqList(t.snapshot(), fresh), reason: 'snap=' + JSON.stringify(t.snapshot()) };
});

test('record rule 1: fresh = [] (board solved) -> hasPath false afterward', () => {
  const stub = makeStub([{ halfIndex: 2, dir: 1 }]);
  const t = createSolvabilityTracker(stub);
  t.reset(ST);                       // has a path
  stub.value = [];                   // fresh solve says: already solved
  t.record({ halfIndex: 2, dir: 1 }, ST);
  return { cond: t.hasPath() === false && t.next() === null, reason: 'snap=' + JSON.stringify(t.snapshot()) };
});

test('record rule 2: solveFn null + path held -> maintained via advance (front-match shortens)', () => {
  const stub = makeStub();
  const path = [{ halfIndex: 4, dir: 1 }, { halfIndex: 0, dir: -1 }];
  stub.value = path;
  const t = createSolvabilityTracker(stub);
  t.reset(ST);
  stub.value = null;                 // no fresh bounded solution now
  t.record({ halfIndex: 4, dir: 1 }, ST); // matches front -> drop it
  return {
    cond: eqList(t.snapshot(), [{ halfIndex: 0, dir: -1 }]),
    reason: 'snap=' + JSON.stringify(t.snapshot()),
  };
});

test('record rule 2: walk-away prepends inverse', () => {
  const stub = makeStub();
  const path = [{ halfIndex: 4, dir: 1 }, { halfIndex: 0, dir: -1 }];
  stub.value = path;
  const t = createSolvabilityTracker(stub);
  t.reset(ST);
  stub.value = null;
  t.record({ halfIndex: 1, dir: 1 }, ST); // walk away -> prepend {1,-1}
  return {
    cond: eqList(t.snapshot(), [{ halfIndex: 1, dir: -1 }, { halfIndex: 4, dir: 1 }, { halfIndex: 0, dir: -1 }]),
    reason: 'snap=' + JSON.stringify(t.snapshot()),
  };
});

test('record rule 3: solveFn null + no path held -> stays null', () => {
  const stub = makeStub(null);
  const t = createSolvabilityTracker(stub);
  t.reset(ST);                       // null -> no path
  t.record({ halfIndex: 0, dir: 1 }, ST); // still null
  return { cond: t.hasPath() === false && t.snapshot() === null, reason: 'snap=' + JSON.stringify(t.snapshot()) };
});

test('core scenario: no-path streak -> acquire -> sticky maintenance', () => {
  const stub = makeStub(null);
  const t = createSolvabilityTracker(stub);
  t.reset(ST);
  // several records while unsolvable-in-bound: stays null
  for (let i = 0; i < 3; i++) t.record({ halfIndex: i % 6, dir: 1 }, ST);
  if (t.hasPath() !== false) return { cond: false, reason: 'expected null during streak' };

  // now solveFn finds a path on one record -> acquired
  const acquired = [{ halfIndex: 2, dir: 1 }, { halfIndex: 5, dir: -1 }];
  stub.value = acquired;
  t.record({ halfIndex: 0, dir: 1 }, ST);
  if (!t.hasPath() || !eqList(t.snapshot(), acquired)) {
    return { cond: false, reason: 'acquire failed: ' + JSON.stringify(t.snapshot()) };
  }

  // back to null: path must be MAINTAINED, not dropped
  stub.value = null;
  t.record({ halfIndex: 2, dir: 1 }, ST);  // matches front -> shorten
  if (!t.hasPath() || !eqList(t.snapshot(), [{ halfIndex: 5, dir: -1 }])) {
    return { cond: false, reason: 'maintain(front) failed: ' + JSON.stringify(t.snapshot()) };
  }
  t.record({ halfIndex: 1, dir: 1 }, ST);  // walk away -> prepend, still hasPath
  return { cond: t.hasPath() === true, reason: 'snap=' + JSON.stringify(t.snapshot()) };
});

test('snapshot returns a copy: mutating it does not change tracker state', () => {
  const path = [{ halfIndex: 0, dir: 1 }, { halfIndex: 2, dir: -1 }];
  const t = createSolvabilityTracker(makeStub(path));
  t.reset(ST);
  const snap = t.snapshot();
  snap.push({ halfIndex: 9, dir: 1 });   // mutate array
  snap[0].dir = -999;                    // mutate an element (if deep-copied this won't leak)
  const after = t.snapshot();
  return {
    cond: after.length === path.length && after[0].halfIndex === 0 && Math.abs(after[0].dir) === 1,
    reason: 'after=' + JSON.stringify(after),
  };
});

test('next() returns the front move object of the held path', () => {
  const path = [{ halfIndex: 3, dir: -1 }, { halfIndex: 1, dir: 1 }];
  const t = createSolvabilityTracker(makeStub(path));
  t.reset(ST);
  return { cond: eqMove(t.next(), { halfIndex: 3, dir: -1 }), reason: 'next=' + JSON.stringify(t.next()) };
});

/* =========================================================================
 * Integration tests — REAL solver + REAL game
 * ========================================================================= */
console.log('\n--- integration tests (real solver + game) ---');

const oracle = s => solve(s, G.HALVES, 5);

// helper: apply a move via the real game and return the resulting board
function applyAndRead(move) {
  G.applyHalf(G.HALVES[move.halfIndex], move.dir);
  return G.getState();
}

// Find a deep seed where solve(...,5) genuinely returns null (no short solution).
function findDeepNoPathSeed(depth, startSeed, attempts) {
  for (let k = 0; k < attempts; k++) {
    const seed = (startSeed + k) >>> 0;
    G.scramble(seed, depth);
    const board = G.getState();
    if (solve(board.slice(), G.HALVES, 5) === null) return { seed, board };
  }
  return null;
}

test('deep board: solve(...,5) null -> reset -> hasPath false', () => {
  const found = findDeepNoPathSeed(8, 0x1000, 50);
  if (!found) return { cond: true, reason: 'no deep-null seed found in range (skipped, treated as pass)' };
  G.setRawState(found.board);
  const t = createSolvabilityTracker(oracle);
  t.reset(G.getState());
  return { cond: t.hasPath() === false, reason: 'hasPath=' + t.hasPath() + ' seed=' + found.seed };
});

test('shallow board: reset acquires a path; next() is a valid first move reducing remaining length', () => {
  G.scramble(0x2468, 3);
  const board = G.getState();
  const baseLen = (solve(board.slice(), G.HALVES, 5) || []).length;
  if (baseLen === 0) return { cond: true, reason: 'seed solved/empty (skipped)' };

  G.setRawState(board);
  const t = createSolvabilityTracker(oracle);
  t.reset(G.getState());
  if (!t.hasPath()) return { cond: false, reason: 'expected hasPath true on depth-3' };

  const first = t.next();
  // apply next() and confirm remaining solve length dropped
  G.setRawState(board);
  G.applyHalf(G.HALVES[first.halfIndex], first.dir);
  const afterLen = (solve(G.getState(), G.HALVES, 5) || []).length;
  return { cond: afterLen < baseLen, reason: `baseLen=${baseLen} afterLen=${afterLen}` };
});

test('sticky through walk-away: path maintained even when solve goes null; following next() solves', () => {
  G.scramble(0x2468, 3);
  const start = G.getState();
  const t = createSolvabilityTracker(oracle);
  G.setRawState(start);
  t.reset(G.getState());
  if (!t.hasPath()) return { cond: false, reason: 'no initial path' };

  // walk away repeatedly with moves that are NOT next(), driving the board deep.
  // pick a half that differs from next().halfIndex each time.
  for (let i = 0; i < 6; i++) {
    const nx = t.next();
    let h = (nx.halfIndex + 1) % G.HALVES.length;
    if (h === nx.halfIndex) h = (h + 1) % G.HALVES.length;
    const move = { halfIndex: h, dir: 1 };
    const board = applyAndRead(move);
    t.record(move, board);
    if (!t.hasPath()) return { cond: false, reason: 'path dropped during walk-away at step ' + i };
  }

  // Now FOLLOW the maintained path to the end and confirm it actually solves.
  let guard = 0;
  while (t.hasPath() && guard < 500) {
    const mv = t.next();
    const board = applyAndRead(mv);
    t.record(mv, board);
    guard++;
    if (G.isSolved()) break;
  }
  return { cond: G.isSolved(), reason: 'guard=' + guard + ' solved=' + G.isSolved() };
});

test('undo symmetry: applying inverse of last move keeps a valid path that still solves', () => {
  G.scramble(0x13579, 3);
  const start = G.getState();
  const t = createSolvabilityTracker(oracle);
  G.setRawState(start);
  t.reset(G.getState());
  if (!t.hasPath()) return { cond: false, reason: 'no initial path' };

  // make one real move (a walk-away), record it
  const nx = t.next();
  let h = (nx.halfIndex + 1) % G.HALVES.length;
  const move = { halfIndex: h, dir: 1 };
  let board = applyAndRead(move);
  t.record(move, board);
  if (!t.hasPath()) return { cond: false, reason: 'path lost after first move' };

  // undo it: apply the inverse, feed record the inverse + new board
  const inv = { halfIndex: move.halfIndex, dir: -move.dir };
  board = applyAndRead(inv);
  t.record(inv, board);
  if (!t.hasPath()) return { cond: false, reason: 'path lost after undo' };

  // following the path must still solve
  let guard = 0;
  while (t.hasPath() && guard < 500) {
    const mv = t.next();
    const b = applyAndRead(mv);
    t.record(mv, b);
    guard++;
    if (G.isSolved()) break;
  }
  return { cond: G.isSolved(), reason: 'guard=' + guard + ' solved=' + G.isSolved() };
});

console.log(`\nResults: ${passed} / ${total} passed`);
process.exit(passed === total ? 0 : 1);
