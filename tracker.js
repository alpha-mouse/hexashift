"use strict";

(function (root) {

/*
 * Solvability tracker — sticky "path to victory" state machine.
 *
 * Pure logic, no DOM. `solveFn(state)` is injected (so this is unit-testable
 * without the real solver): it returns an ordered move-list
 * `[{halfIndex, dir}, ...]` solving `state` (possibly `[]` when already solved),
 * or `null` when no in-bound solution exists.
 *
 * Behavior (see plan): at every board transition we ALWAYS adopt a fresh
 * bounded solution when one exists; otherwise we maintain the previously
 * acquired path by tracking the applied move (front-match -> shift; walk-away
 * -> prepend the inverse). Once acquired, the path stays valid through any
 * later move or undo, even after mis-moving back out of bounded-solvability.
 */

// Update a still-valid victory `path` for the board reached by applying `move`.
// Invariant: if `path` solved the pre-move board, the result solves the
// post-move board.
function advance(path, move) {
  if (path[0] && path[0].halfIndex === move.halfIndex && path[0].dir === move.dir) {
    return path.slice(1);
  }
  return [{ halfIndex: move.halfIndex, dir: -move.dir }, ...path];
}

// Create a tracker. `solveFn(state) -> array | null`.
function createSolvabilityTracker(solveFn) {
  let path = null;

  return {
    reset(state) {
      path = solveFn(state);
    },
    record(appliedMove, state) {
      const fresh = solveFn(state);
      if (fresh != null) {
        path = fresh;
      } else if (path && path.length) {
        path = advance(path, appliedMove);
      }
      // else: leave `path` unchanged (null)
    },
    hasPath() {
      return !!(path && path.length);
    },
    next() {
      return (path && path.length) ? path[0] : null;
    },
    snapshot() {
      if (path == null) return path;
      return path.map(m => ({ halfIndex: m.halfIndex, dir: m.dir }));
    },
  };
}

if (typeof module !== 'undefined') module.exports = { createSolvabilityTracker, advance };
else root.createSolvabilityTracker = createSolvabilityTracker;

})(typeof globalThis !== 'undefined' ? globalThis : this);
