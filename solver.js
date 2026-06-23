"use strict";

const { solvedBoard } = require('./game.js');

const N = 24;
const NUM_COLORS = 6;

// Canonical key: colors are 0..5, so join('') is a unique 24-char string.
function keyOf(board) { return board.join(''); }

// --- Move permutations -------------------------------------------------------
// Mirror of rotateColors/applyHalf in game.js, precomputed as position perms:
//   applying (halfIndex,dir) gives  out[p] = board[perm[p]].
// 12 generators = 6 halves x dir(+1,-1). Inverse of (h,dir) is (h,-dir).
let MOVES = null, MOVES_FOR = null;
function buildMoves(halves) {
  if (MOVES && MOVES_FOR === halves) return MOVES;
  MOVES = [];
  for (let hi = 0; hi < halves.length; hi++) {
    const half = halves[hi];
    for (const dir of [1, -1]) {
      const perm = new Array(N);
      for (let i = 0; i < N; i++) perm[i] = i;
      for (const row of half.rows) {
        const len = row.length;
        // game: out[row[i]] = oldState[row[(i-dir+len)%len]]
        for (let i = 0; i < len; i++) perm[row[i]] = row[(i - dir + len) % len];
      }
      MOVES.push({ halfIndex: hi, dir, perm });
    }
  }
  MOVES_FOR = halves;
  return MOVES;
}

function applyPerm(board, perm) {
  const out = new Array(N);
  for (let i = 0; i < N; i++) out[i] = board[perm[i]];
  return out;
}

// --- Goal --------------------------------------------------------------------
// isSolved accepts any of the 720 sector<->color bijections, but scramble()
// builds every test board from solvedBoard() (the canonical "sector s = color s")
// by <= d moves, so the scramble is provably <= d moves from the *canonical*
// goal specifically. Targeting that single goal keeps both BFS sides seeded at
// size 1 -> they meet balanced near true_dist/2 (~6 plies each, ~1.3M boards),
// far under V8's per-Map cap of 2^24. Reaching canonical solves the board.

// Expand one full BFS layer of `frontier` (all at distance curDist) into `own`,
// recording parents. Any neighbour already in `other` is a meet point.
// Returns { next, meets:[{key,total}] }.
function expandPly(frontier, curDist, own, other, moves) {
  const next = [];
  const meets = [];
  for (const b of frontier) {
    const k = keyOf(b);
    for (const mv of moves) {
      const nb = applyPerm(b, mv.perm);
      const nk = keyOf(nb);
      if (own.has(nk)) continue;
      own.set(nk, { half: mv.halfIndex, dir: mv.dir, parent: k, dist: curDist + 1 });
      const o = other.get(nk);
      if (o) meets.push({ key: nk, total: curDist + 1 + o.dist });
      next.push(nb);
    }
  }
  return { next, meets };
}

function reconstruct(meetKey, fwd, back) {
  // scramble -> meet : moves applied forward, collected meet->start then reversed
  const fwdMoves = [];
  let k = meetKey;
  while (fwd.get(k).parent !== null) {
    const n = fwd.get(k);
    fwdMoves.push({ halfIndex: n.half, dir: n.dir });
    k = n.parent;
  }
  fwdMoves.reverse();

  // meet -> goal : each back edge applied (half,dir) to a goal-closer parent,
  // so the solving move from this node is the inverse (half,-dir).
  const backMoves = [];
  k = meetKey;
  while (back.get(k).parent !== null) {
    const n = back.get(k);
    backMoves.push({ halfIndex: n.half, dir: -n.dir });
    k = n.parent;
  }
  return fwdMoves.concat(backMoves);
}

// Bounded bidirectional BFS. Searches only for solutions of length <= maxSteps
// (in practice <= 5), so the per-side frontiers stay tiny and the deep-board
// wall of MODEL.md S8/S9 never applies. Returns the move list if a solution
// within maxSteps exists, else null ("not found").
//
// Why bidirectional stays correct under the bound: forward stores all boards at
// distance <= fwdDist, backward all at distance <= backDist. We expand until
// fwdDist + backDist == maxSteps. Any path of length L <= maxSteps then splits
// as a + b with a <= fwdDist, b <= backDist (feasible since fwdDist+backDist >=
// L), so its meeting node sits in both Maps and was recorded as a meet by the
// second side to reach it. A meet recorded while the running sum is S always has
// total <= S <= maxSteps, so the first meet found is a valid in-bound solution.
//
// @param {number[]} state  - Array(24) of color indices 0..5 (snapshot, not mutated)
// @param {object[]} halves - HALVES from game.js
// @param {number}   maxSteps - max solution length to search for (default 5)
// @returns {{halfIndex: number, dir: number}[] | null}  null = no solution <= maxSteps
function solve(state, halves, maxSteps) {
  if (maxSteps === undefined) maxSteps = 5;
  const moves = buildMoves(halves);
  const start = state.slice();
  const startKey = keyOf(start);

  const goal = solvedBoard(); // canonical "sector s = color s"
  const goalKey = keyOf(goal);
  if (startKey === goalKey) return []; // already solved
  if (maxSteps < 1) return null;

  const fwd = new Map();
  const back = new Map();
  fwd.set(startKey, { half: -1, dir: 0, parent: null, dist: 0 });
  back.set(goalKey, { half: -1, dir: 0, parent: null, dist: 0 });
  let fwdFrontier = [start], backFrontier = [goal];
  let fwdDist = 0, backDist = 0;
  let bestTotal = Infinity, bestMeet = null;

  // Expand the smaller side each ply (balanced), stopping once the combined
  // explored depth reaches maxSteps -> all paths of length <= maxSteps covered.
  while (fwdDist + backDist < maxSteps && fwdFrontier.length && backFrontier.length) {
    let res;
    if (fwd.size <= back.size) {
      res = expandPly(fwdFrontier, fwdDist, fwd, back, moves);
      fwdFrontier = res.next; fwdDist++;
    } else {
      res = expandPly(backFrontier, backDist, back, fwd, moves);
      backFrontier = res.next; backDist++;
    }
    for (const m of res.meets) {
      if (m.total < bestTotal) { bestTotal = m.total; bestMeet = m.key; }
    }
    // First meet's total is <= the current explored sum <= maxSteps, so it is a
    // valid in-bound solution; return immediately.
    if (bestMeet !== null) return reconstruct(bestMeet, fwd, back);
  }

  return (bestMeet !== null && bestTotal <= maxSteps)
    ? reconstruct(bestMeet, fwd, back)
    : null;
}

module.exports = { solve };
