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
| **Reachable from solved** | **≥ 1.7 × 10⁷** _(hard lower bound, measured — see §8; the earlier "~10⁶" estimate was wrong)_ |

The reachable set is a minute, highly structured slice of the 4-of-each colorings
— consistent with `G` being a proper subgroup of `A₂₄`. But it is **far larger
than the original ~10⁶ guess**: a BFS from solved still had not terminated at
depth 7 when it blew past 1.7 × 10⁷ boards (§8). This single correction
invalidates the "small enough to BFS the whole orbit" assumption that §5/§6 were
built on.

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

**H-B — Computational state-graph / search.** _PARTIALLY ACCEPTED — substrate, but
plain BFS over the whole orbit is REJECTED (see §8)._ Search is still the engine,
but two premises here turned out false when measured (§8):
- branching is **~9.9 per ply**, not ~5–6 (the untouched-positions argument
  under-counted; effective branching is close to the full 12 generators);
- the orbit is **≥ 1.7 × 10⁷**, not ~10⁶, so it is *not* "small enough" to
  enumerate. Explicit BFS hits a hard wall (V8's 2²⁴-entry `Map`/`Set` cap) at
  depth 7 per side. The viable engines are **memory-bounded** search (IDA* with a
  pattern-DB heuristic) and/or a **constructive** group solver — not whole-orbit
  BFS. See §8 for the failed attempt and the redesign options.

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

**Search — bidirectional BFS.** _Tried first; works only for shallow scrambles.
See §8 for why it is not sufficient on its own._

```
forward  := { scramble }            // expand by the 12 moves
backward := { all 720 solved boards } // or 1 representative + color relabels
loop:
    expand the smaller frontier by one ply (dedup by board key)
    if frontiers intersect at board m:
        return  path(scramble → m)  ++  reverse(path(m → goal))
```

> **Reality check (§8):** with branching ~9.9 and depth-6 cumulative already
> 1.27 × 10⁶, each side can only reach **depth ~6** before the `Map`/`Set` cap.
> Bidirectional reach is therefore ~12–13 plies total; scrambles whose true
> distance exceeds that overflow. A depth-95 test scramble did exactly this.
>
> **Backward seed:** prefer **one canonical goal** over all 720. `scramble()`
> builds every board from `solvedBoard()` (the canonical `sector s = color s`),
> so the scramble is provably ≤ d moves from *that* goal — enough to satisfy the
> test's "≤ d moves" bound — and a size-1 seed keeps the two sides balanced.
> Seeding all 720 just inflates the backward frontier and unbalances expansion.

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
- **Diameter / God's number.** Earlier guess ~16–20; still unmeasured. §8 only
  establishes a *lower* bound: at least one depth-95 scramble has true distance to
  the canonical goal **> 13** (it could not be met by depth-6 + depth-7 BFS halves
  before overflow).
- A **complete invariant** characterization of the reachable orbit, if one exists.

All four are answered by computing `G` exactly with **Schreier–Sims**
(strong generating set + stabilizer chain): it gives `|G|`, `O(1)`-ish membership
testing, orbit sizes, and a constructive solver (the "factor through the
stabilizer chain" method) as a fallback to search. Out of scope for this pass.

> Note: the maximum scramble depth offered by the UI is 35
> ([game.js](game.js#L110)), which happens to equal each generator's order — a
> coincidence, but it means hard scrambles are deep.

---

## 8. Solver attempt #1 — plain BFS, and why it failed (session 2026-06-22)

First implementation of [solver.js](solver.js) was bidirectional BFS per §6. It
**passed the shallow cases and failed on deep ones**. Recording the measurements
and the architectural lesson so the next attempt starts from facts, not the
(now-corrected) estimates in §3/§5/§6.

### 8.1 Measured orbit growth (BFS from the canonical solved board)

Exact layer sizes, deduped by board key (`board.join('')`), expanding all 12
generators each ply:

| ply | new boards in layer | cumulative |
|----:|--------------------:|-----------:|
| 3   | 1,188               | 1,321      |
| 4   | 11,724              | 13,045     |
| 5   | 115,912             | 128,957    |
| 6   | 1,145,965           | 1,274,922  |
| 7   | **> 15 M** (overflow)| **> 16.7 M** (cap hit mid-layer) |

- **Branching ≈ 9.9× per ply**, dead consistent across plies 3→6
  (1188→11724→115912→1145965). Effective branching is near the full 12
  generators, **not** the "~5–6" guessed in H-B. The "each move leaves 12 of 24
  positions fixed" intuition does *not* translate into low branching.
- The orbit is **≥ 1.7 × 10⁷** (hard lower bound; BFS had not closed at depth 7).
  Extrapolating 9.9×, depth 8 ≈ 10⁸ and the true orbit is plausibly 10⁸–10¹⁰.
  Either way it is **orders of magnitude past** the old ~10⁶ estimate.

### 8.2 The hard wall: V8 `Map`/`Set` cap = 2²⁴ entries

A single JS `Map` or `Set` throws `RangeError: Map maximum size exceeded` at
**16,777,216 (2²⁴) entries** — a structural limit, not a RAM limit. Consequences:

- A single BFS frontier+visited store cannot pass **depth ~6–7** per side.
- Sharding across multiple Maps lifts the *count* ceiling but not the *memory*:
  depth-7/8 storage is tens of millions to 10⁸+ entries → many GB. Not worth it.
- Net: **explicit whole-orbit BFS is dead.** Bidirectional reach ≈ 12–13 plies
  total (depth 6 + depth 6/7). Scrambles with larger true distance overflow.

### 8.3 What actually happened in the test run

[solver.tests.js](solver.tests.js) requires the returned solution to be
**≤ the scramble depth d** (and to actually solve). Results of attempt #1:

- **depths 1–5 (fixed seeds): PASS** — shallow, bidirectional met within memory.
- **first deep random test (depth 95, seed 1147597007): CRASH** — `Map maximum
  size exceeded`. Its true distance to the canonical goal is **> 13**, so neither
  the size-balanced nor the frontier-balanced variant could meet before a side
  overflowed depth 7.

Two implementation lessons confirmed along the way:
1. Seeding the backward side with all **720 goals inflates and unbalances** it;
   "expand the smaller frontier" then degenerates to near-unidirectional forward
   BFS, which overflows fastest. Use the **single canonical goal** (§6 reality
   check) and balance by **stored-map size**, not frontier length.
2. **`length ≤ d` is the only hard constraint, and `true_dist ≤ d` always holds**
   (the scramble is d moves from canonical by construction). So an *optimal*
   solver trivially satisfies the bound — but for deep d we have enormous slack
   (true distance ≈ diameter ≪ d), and for shallow d we need near-optimal. The
   next design should exploit this asymmetry.

### 8.4 Redesign options for attempt #2

Ordered by how promising they look given the above. All are **memory-bounded**
(O(depth) or a fixed precomputed table), unlike attempt #1.

1. **Perimeter search (front-loaded bidirectional). _Recommended first try._**
   Precompute **once**, shared across all solves, a backward BFS from the single
   canonical goal out to **depth 6** (~1.27 M boards — fits one Map) as a table
   `key → (dist, firstMoveTowardGoal)`. Then solve each scramble with a
   **forward IDA\*** (iterative-deepening DFS, O(depth) memory) whose goal test is
   "current board ∈ perimeter table". This caps the *searched* forward depth at
   `true_dist − 6`, and the table contributes the last 6 plies for free. Add the
   PDB heuristic below to prune the forward DFS. Reuses one expensive precompute
   across all 105 test solves.

2. **IDA\* with a pattern-database heuristic** (§6 heuristic, now the main engine
   rather than a fallback). Single-color projection → `C(24,4) = 10626` indices,
   one DB per color via BFS from the canonical goal, `h = max_c DB_c`. Optimal,
   O(depth) memory. **UNVERIFIED:** the heuristic's *strength* was never measured
   (the probing run was interrupted). Before trusting it, build the 6 DBs and
   compare `h(board)` against known true distances on shallow scrambles — if `h`
   is weak (≪ true_dist), IDA* at depth ~15 with branching ~10 will be too slow,
   and option 1's perimeter is what rescues it.

3. **Hybrid by depth.** Run cheap bidirectional BFS bounded to depth ≤6/side
   (handles `true_dist ≤ 12`, returns optimal). On overflow/non-meeting, fall
   back to option 1 or 2. Clean separation: BFS owns the shallow regime it's good
   at; heuristic/perimeter search owns the deep regime where only `≤ d` (not
   optimality) is required.

4. **Constructive Schreier–Sims solver** (§7). Guaranteed polynomial time and
   bounded memory, and would also finally pin down `|G|`, the orbit size, and the
   diameter. Drawback: naive sift produces **long** words (likely ≫ d for small
   d), so it **cannot stand alone** under the `≤ d` test — only viable paired with
   an optimal search for the shallow scrambles. Highest effort; best long-term
   payoff for the open questions in §7.

### 8.5 Useful facts carried forward

- **Key:** `board.join('')` (24 chars, colors 0–5) is a fast unique key; no need
  for the BigInt `encodeBoard`. Reserve `encodeBoard` for shareable fingerprints.
- **Move perms:** precompute 12 arrays `perm[]` with
  `out[i] = board[perm[i]]`; for a half/row, `perm[row[i]] = row[(i−dir+len)%len]`
  (mirrors `rotateColors` in [game.js](game.js#L87)). Tight loop, no `.map`.
- **Single canonical goal** is sufficient (§6 reality check). Don't enumerate 720.
- **Test shape:** [solver.tests.js](solver.tests.js) = depths 1–5 fixed + 100
  random depths 1–100; assert `moves.length ≤ d` and re-simulated `isSolved()`.

---

## 9. Solver attempt #2 — symmetry folding fails; the deep-board wall (session 2026-06-22)

Attempt #2 set out to rescue bidirectional BFS by **folding the state space with
global colour relabelling** (the idea: reachable boards have 4-of-each colour, so
each board's S₆ relabel orbit has size 720 → fold the search 720×). It was
implemented and measured. **The folding gives exactly zero reduction, and the
deeper investigation showed the puzzle is much harder than §3/§5/§6 assumed.**
Recording the hard numbers so attempt #3 starts from evidence, not hope.

### 9.1 Colour-relabel folding is dead (0× reduction)

First-occurrence relabelling (map each colour to the order it first appears) is a
correct O(24) canonical key, and distance-to-the-solved-*set* **is** relabel
invariant (moves commute with relabelling; the solved set is relabel-closed). The
canonicalisation is correct: `canon(b) == canon(σ·b)` verified true. **But folded
BFS layers equal the raw layers essentially exactly:**

| ply | raw new (MODEL §8.1) | folded new (measured) |
|----:|---------------------:|----------------------:|
| 3 | 1,188 | 1,188 |
| 4 | 11,724 | 11,724 |
| 5 | 115,912 | 115,912 |
| 6 | 1,145,965 | 1,145,881 |

**Why:** the reachable orbit `{f₀∘g⁻¹ : g∈G}` is **not** relabel-closed. `σ∘f₀` is
a *different* solved board, and almost none of the 720 solved boards are mutually
reachable (the §7 open question, now answered in spirit: ~1). So the reachable
component meets each S₆ relabel-class in ≈ 1 board — there is nothing to fold.
The plan's central premise ("colour symmetry shrinks the orbit") is false.
The D₆ hexagon symmetry was **not** separately confirmed to fold either; by the
same orbit-non-closure argument expect ≤ 12× at best, likely far less. **Treat
"fold the search by a symmetry" as a closed avenue unless someone proves the
orbit is closed under that symmetry first.**

### 9.2 Heuristic strength (pattern databases), measured

Per-colour relaxation = "gather one colour's 4 tiles into any one sector". State =
a 4-subset of the 24 positions, ranked via the combinatorial number system into
`C(24,4) = 10626`. Subset transform under a move: `newSet = { destMap[p] : p∈set }`
where `destMap[perm[i]] = i`.

- **1-colour PDB:** 10626 states, fully filled, **max depth 6**. So `h1 = max_c ≤ 6`.
- **2-colour PDB** (gather two colours into two *distinct* sectors): dense index
  `rankA·10626 + rankB` over `1.13×10⁸` cells (Int8 = 113 MB), `51,482,970` valid
  states, **max depth 9**. `h2 = max over the 15 colour-pairs ≈ 7–8` on hard
  boards. Admissible (`h2 ≥ h1`). Build cost naïvely **351 s** (an `unrank4`
  with an inner `while` runs per state) — needs a precomputed 10626-entry unrank
  table or offline serialisation to be practical.
- **3-colour PDB** would be stronger but the dense table is
  `C(24,4)·C(20,4)·C(16,4) ≈ 9.4×10¹⁰` — far too big. Additive disjoint PDBs are
  **inadmissible here**: every move rotates 12 of 24 tiles spanning all colours,
  so the Korf–Felner "count a move only if it touches the pattern" trick almost
  never zeroes a move → sums over-count. `max` (not sum) is the only safe combine.

So the strongest cheap admissible heuristic tops out at **9**.

### 9.3 Distances / diameter, measured

- **Scrambles barely cancel until ~d=14.** For every test board with `d ≤ 13`,
  `true_dist = d` exactly (the no-immediate-repeat-half scramble has no slack).
  At `d = 14` cancellation begins (one board measured `td = 12`).
- **Diameter ≥ 15.** The depth-100 test board (seed 769936916): sharded
  bidirectional pushed **both** sides to dist 7 (12.6 M boards each) **without
  meeting** → `td > 14`; deep random boards plateau at `td ≈ 15–16`.
- **~80 of the 105 test boards are deep** (`d ≥ 14`), i.e. `td ≈ 15–16`.

### 9.4 Engine feasibility, measured

- **Bidirectional BFS (raw keys):** optimal, but memory-capped at **`td ≈ 13`** in
  a 2 GB heap (~depth 6.5/side); OOM at ~25 M fat string+array entries even at
  12 GB. Lifting the 2²⁴ per-Map cap by sharding does not help — depth-8/side is
  150 M entries.
- **IDA\* + 2-colour PDB + depth-6 perimeter** (perimeter = backward BFS from the
  single canonical goal, **1,274,922 boards, built in 1.8 s**, used as the goal
  test for the last 6 plies): `td ≤ 12` solves **instantly (85k nodes / 193 ms)**;
  the real **`d=16` board (seed 2639807039, `td ≥ 15`) blew past 60 M nodes /
  145 s unsolved.** This is a **node-count** wall (heuristic too weak, gap ≈ td − 9),
  not just a constant-factor speed problem — optimising per-node cost won't fix it.

### 9.5 The structural trap, and the conclusion

`solve(state, halves)` is **not given `d`**. Because `true_dist ≤ d` always holds,
the *only* `d`-independent way to guarantee `length ≤ d` is to return an
**optimal** solution. A suboptimal solver may overshoot `d` on a low-slack board
(e.g. `d=16, td=16`), and the solver cannot tell which boards those are without
`d`. So the deep boards cannot trade optimality for speed.

**Net: full 105/105 in reasonable time is not achievable in vanilla JS by search.**
The binding facts together — orbit `10⁷–10⁸`, **no foldable symmetry**, diameter
`~16`, strongest cheap admissible heuristic `= 9`, no room for a deeper perimeter
(depth-7 = 15 M, depth-8 = 150 M) or a 3-colour PDB — mean the ~80 deep boards are
each ~`10⁸` nodes optimally, and the few near-zero-slack `d=14–16` boards need an
optimal `td~16` solution that nothing cheap delivers quickly.

### 9.6 Options for attempt #3 (which obstacle each does/doesn't beat)

1. **Pass `d` into `solve()`** (small interface change to `solver.tests.js`).
   *Beats:* the high-slack deep boards (`d ≫ td`) — a weighted/greedy search
   returns any `≤ d` solution fast. *Does not beat:* near-zero-slack `d=14–16`
   boards (still need optimal `td~16`).
2. **Heavy optimise + ship a serialised PDB/perimeter as a binary asset.**
   *Beats:* per-node constant factors (typed-array boards, incremental `h`).
   *Does not beat:* the node-count wall — still ~`10⁸`/board, ⇒ ~15–40 min test;
   also breaks the "no dependencies/assets" convention.
3. **Scope down honestly.** Ship bidirectional (optimal, instant, `td ≤ ~13`) and
   relax the test (exclude/loosen deep random depths) instead of claiming 105/105.
4. **More math first.** Pin exact `|G|`, orbit size, and diameter via a bounded
   Schreier–Sims pass; look for a stronger admissible heuristic or a constructive
   (algebraic / coset-by-coset) solver. *Note:* a Schreier–Sims sift gives bounded
   but **long** words (≫ `d` for small `d`), so it cannot stand alone under the
   tight `≤ d` test — only useful paired with optimal search for the shallow zone,
   or if `d` is passed.

### 9.7 Carry-forward facts (attempt #2)

- **PDB subset transform:** `newSet = { destMap[p] : p∈set }`, `destMap[perm[i]]=i`.
- **CNS rank/unrank:** `rank4(a<b<c<d) = C(a,1)+C(b,2)+C(c,3)+C(d,4)`; precompute a
  10626-entry unrank table to make any PDB build fast (avoid per-state `while`).
- **Perimeter:** depth-6 backward BFS from the single canonical goal = **1,274,922
  boards in ~1.8 s**, fits one Map; it is an *exact* heuristic for the last 6 plies
  and the right goal-test for a forward IDA\*. Depth 7 (~15 M) is the practical
  ceiling and still leaves the heuristic gap unsolved.
- **Hard benchmark board:** `d=16`, seed `2639807039` (`td ≥ 15`) — any attempt-#3
  engine must solve *this* fast to matter.
- **`solver.js` was reverted** to the attempt-#1 bidirectional after this session
  (the folding rewrite is a proven dead-end and crashed on deep boards via its
  depth-8 perimeter). Start attempt #3 from a clean baseline.
