# A mathematical model of Hexashift

This document formalizes the puzzle so we can reason about board positions now
and build a solver later. It records the model, the equivalence-class structure,
the hypotheses that were tried (and where each led), and a solver blueprint.

> **On the numbers:** figures marked _(approx.)_ come from empirical search by
> exploratory runs against the real move logic in [game.js](game.js); they are
> estimates, not proofs. Items under **Open questions** are genuinely unknown.
> Exact values need a Schreier–Sims pass (see §7).

---

## 1. Game formalization

**Positions.** The board is 24 triangles with stable ids, `P = {0, …, 23}`.
Geometry is built in [game.js](game.js) section 1 from 5 horizontal grid lines of
a side-2 flat-top hexagon. (SVG is y-up; the rendering `<g transform="scale(1,-1)">`
flips y — irrelevant to the model, which only cares about ids and adjacency of
positions within move rows.)

**Sectors.** Each position has a fixed sector `σ(p) ∈ {0, …, 5}` (the 60° wedge of
its centroid). Each sector contains exactly 4 positions: `|σ⁻¹(s)| = 4`.

**Colors and boards.** A board is a coloring `f : P → C` with `C = {0, …, 5}`.
The game starts from a solved board and only permutes existing tiles, so every
playable board has **exactly 4 tiles of each color** — this multiset is invariant
(see §4).

**Goal.** A board is solved when `f` is constant on each sector
(`isSolved` in [game.js](game.js#L93)). Because every sector holds 4 tiles and
there are exactly 4 tiles of each color, a uniform sector consumes a whole color,
so a solved board is a **bijection between the 6 sectors and the 6 colors**.

> **There are 720 = 6! solved boards, not 1.** `isSolved` does *not* require
> "sector `s` has color `s`" — any sector↔color bijection counts. The solver
> therefore has a goal *set* of size 720, not a single target.

---

## 2. The move group `G`

**Moves.** There are 6 "halves" `h₀, …, h₅` (3 axes × 2 halves), built in
[game.js](game.js) section 2. A move cyclically rotates the colors along each of
the half's two rows (wrap-around), with a direction `dir = ±1`. As an action on
colorings a move is `f ↦ f ∘ g⁻¹` for a fixed **position permutation** `g ∈ S₂₄`;
the two directions give `g` and `g⁻¹`. So there are **12 generators**
(6 halves × 2 directions), forming 6 inverse pairs.

**Cycle structure.** The 4 rows of an axis have sizes `5, 7, 7, 5` and partition
all 24 positions; the halves pair rows `[0,1]` and `[2,3]`. Each half acts on two
disjoint rows of sizes 5 and 7, so every generator is a

```
(5-cycle) × (7-cycle)   on disjoint supports
```

Hence each generator has **order lcm(5,7) = 35** and is an **even** permutation
(a 5-cycle is even, a 7-cycle is even, product is even).

**The group.** `G = ⟨h₀, …, h₅⟩`. Because every generator is even,
`G ≤ A₂₄` (the alternating group). Empirically `G` is **transitive** on the 24
positions — there is no invariant subset of positions; every tile can reach every
location.

**Abelian vs non-abelian structure.**
- *Within one axis*, the two halves act on disjoint position sets (rows `{0,1}`
  vs rows `{2,3}`), so they **commute**. Each axis's two halves generate an
  abelian subgroup `≅ Z₃₅ × Z₃₅` (order 1225).
- *Across axes*, halves share 4–8 positions, so they **do not commute**.
  Only 3 of the 15 generator pairs commute — exactly the within-axis pairs.

Therefore `G` is **non-abelian**, with a "coupled product of abelian axis pieces"
flavor. This single fact is what kills the linear model (§5, H-C).

---

## 3. State space

Playable boards are exactly the **orbit of a solved board under `G`**:

```
Reachable = { f₀ ∘ g⁻¹ : g ∈ G },   |orbit| = |G| / |Stab(f₀)|
```

where `Stab(f₀)` is the subgroup of `G` fixing the solved coloring (i.e.
permuting positions only within color classes).

Scale, for intuition _(approx., context only)_:

| Set | Size |
|-----|------|
| All colorings `6²⁴` | ≈ 4.7 × 10¹⁸ |
| Colorings with 4-of-each `24! / (4!)⁶` | ≈ 3.25 × 10¹⁵ |
| **Reachable from solved** | ≈ 10⁶ _(approx.; search bracketed it near 1–2 × 10⁶)_ |

The reachable set is a minute, highly structured slice of the 4-of-each colorings
— consistent with `G` being a small subgroup of `A₂₄` rather than all of it.

---

## 4. Equivalence classes and invariants

This is the `tasks.md` question — "equivalence classes of board positions."

**Definition.** Two boards are equivalent iff related by some `g ∈ G`. The
equivalence classes are the **`G`-orbits**; the set of playable boards is the
single orbit of the solved boards.

**Genuine invariants** (constant across an orbit):
1. **Color multiset.** Moves only permute positions, so the count of each color
   is fixed (4 each). This is the defining constraint of the playable orbit.
2. **Parity / `G ≤ A₂₄`.** Every reachable position-permutation (relative to
   solved, modulo the color-class symmetry) is even. This restricts *which*
   rearrangements are achievable, beyond the color counts.

**Invariants that look real but are not.** Empirical search surfaced "invariants"
like *sum of colors mod 2/3/6 = 0*, *XOR of colors = 0*, *product mod 7 = 1*.
These are **trivial artifacts of the fixed color multiset**: the solved multiset
sums to `4·(0+1+2+3+4+5) = 60` and every color appears an even number of times,
so these quantities are constant for *any* 4-of-each board, reachable or not.
They carry no structural information and are not used here.

**Completeness is open.** Color-multiset + parity do **not** fully characterize
the reachable orbit (the orbit is far smaller than "all even 4-of-each boards").
A complete invariant description is unknown; the practical route is to compute the
orbit/stabilizer directly via **Schreier–Sims** (§7).

---

## 5. Hypotheses explored, and where each led

Four modeling families were tried against the real move logic.

**H-A — Permutation group (subgroup of `S₂₄`).** _ACCEPTED — primary model._
Positions permuted by `G = ⟨6 halves⟩ ≤ A₂₄`, acting on colorings. Clean cycle
structure (5×7), transitive, even. Everything in §1–§4 is this model. It supports
membership testing, stabilizer chains, and orbit reasoning.

**H-B — Computational state-graph / search.** _ACCEPTED — solver substrate._
The reachable orbit (~10⁶, approx.) with low branching (~5–6 per direction, since
each move leaves 12 of 24 positions untouched) is small enough for
bidirectional BFS and IDA*. This is the engine the solver is built on (§6).

**H-C — Algebraic / abelian / linear (`Z_n`-module).** _REJECTED._
A light-flip-style linear model needs commuting generators. Only 3/15 pairs
commute (within-axis); cross-axis generators share positions and do not commute,
so `G` is non-abelian. There is an abelian *substructure* per axis
(`Z₃₅ × Z₃₅`), but no global linear model captures the coupling. No closed-form
algebraic solver.

**H-D — Invariants / equivalence classes.** _PARTIAL._
The real invariants are color-multiset and parity (`G ≤ A₂₄`); the extra modular
"invariants" were trivial (§4). Equivalence classes are exactly the `G`-orbits.
A complete, closed-form class description was not found; it reduces to computing
`G` (Schreier–Sims). This is the right *language* for the question even though it
doesn't yield a slick invariant.

---

## 6. Solver blueprint (design, no code yet)

Target: given a scrambled board, output a move sequence to any solved board.

**Representation.**
- Board key: base-6 integer / 24-char string. Reuse `encodeBoard` / `decodeBoard`
  in [game.js](game.js#L153) for canonical keys and shareable fingerprints.
- Moves: 12 permutation arrays `P[src] = dest`, derived from the pure `HALVES`
  data in [game.js](game.js) sections 1–2 (no DOM needed). Applying a move to a
  board is `new[P[i]] = old[i]` (and the inverse for `dir = -1`).

**Search — bidirectional BFS (recommended).**

```
forward  := { scramble }            // expand by the 12 moves
backward := { all 720 solved boards } // or 1 representative + color relabels
loop:
    expand the smaller frontier by one ply (dedup by board key)
    if frontiers intersect at board m:
        return  path(scramble → m)  ++  reverse(path(m → goal))
```

With diameter ≈16–20 _(approx.)_ each side meets near depth ~8, keeping both
frontiers modest in memory.

**Heuristic for IDA\* (if memory-bound).**
- Pattern database: project a board onto the 4 positions occupied by one color
  → index space `C(24,4) = 10626`. Precompute, by BFS from solved, the minimum
  moves to fix that color's 4 tiles. One DB per color (~10k entries × 6 ≈ cheap).
- Admissible heuristic `h(board) = max over colors of DB[color-projection]`.
- Run IDA* with `h`; optimal, low memory.

**Symmetry reductions** (shrink search and DB):
- Color relabeling `S₆` (720): collapse the 720 goals to one representative; relabel.
- Hexagon symmetry `D₆` (order 12): canonicalize boards up to rotation/reflection.

---

## 7. Open questions

- **Exact `|G|`** and the exact **reachable-orbit size** (estimated ~10⁶).
- **How many of the 720 solved boards are reachable** from a given scramble
  (color-multiset + parity do not settle this).
- **Diameter / God's number** (estimated ~16–20).
- A **complete invariant** characterization of the reachable orbit, if one exists.

All four are answered by computing `G` exactly with **Schreier–Sims**
(strong generating set + stabilizer chain): it gives `|G|`, `O(1)`-ish membership
testing, orbit sizes, and a constructive solver (the "factor through the
stabilizer chain" method) as a fallback to search. Out of scope for this pass.

> Note: the maximum scramble depth offered by the UI is 35
> ([game.js](game.js#L110)), which happens to equal each generator's order — a
> coincidence, but it means hard scrambles are deep.
