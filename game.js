"use strict";
const SQRT3 = Math.sqrt(3), HALF_SQRT3 = SQRT3/2;
const COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6'];
const NUM_SECTORS = 6;
const NUM_TRIANGLES = 24;

/* ---- 1. Build the 24 triangles (flat-top hexagon, side 2) ---- */
const ROW_Y_COORDS = [SQRT3, SQRT3/2, 0, -SQRT3/2, -SQRT3];
const ROW_X_COORDS = [[-1,0,1],[-1.5,-0.5,0.5,1.5],[-2,-1,0,1,2],[-1.5,-0.5,0.5,1.5],[-1,0,1]];
const tris = [];
for(let rowIndex=0;rowIndex<4;rowIndex++){
  const upperY=ROW_Y_COORDS[rowIndex], lowerY=ROW_Y_COORDS[rowIndex+1];
  const upperXs=ROW_X_COORDS[rowIndex], lowerXs=ROW_X_COORDS[rowIndex+1];
  for(let i=0;i<lowerXs.length-1;i++){
    const leftX=lowerXs[i], rightX=lowerXs[i+1];
    tris.push({verts:[[leftX,lowerY],[rightX,lowerY],[(leftX+rightX)/2,upperY]]});
  }
  for(let i=0;i<upperXs.length-1;i++){
    const leftX=upperXs[i], rightX=upperXs[i+1];
    tris.push({verts:[[leftX,upperY],[rightX,upperY],[(leftX+rightX)/2,lowerY]]});
  }
}
tris.forEach((triangle,id)=>{
  triangle.id=id;
  triangle.cx=(triangle.verts[0][0]+triangle.verts[1][0]+triangle.verts[2][0])/3;
  triangle.cy=(triangle.verts[0][1]+triangle.verts[1][1]+triangle.verts[2][1])/3;
  const angleFromCenter=(Math.atan2(triangle.cy,triangle.cx)*180/Math.PI+360)%360;
  triangle.sector=Math.floor(angleFromCenter/60);
});

/* ---- 2. Rows / halves for each of the 3 axes (0, 60, 120 degrees) ---- */
const rotatePoint=(x,y,deg)=>{const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [x*c-y*s, x*s+y*c];};
function buildAxis(axisAngleDeg){
  const rotatedTriangles=tris.map(triangle=>{
    const rotatedVerts=triangle.verts.map(([x,y])=>rotatePoint(x,y,-axisAngleDeg));
    const uniqueYValues=[...new Set(rotatedVerts.map(point=>Math.round(point[1]*1e4)/1e4))];
    const rowBand=Math.round((uniqueYValues[0]+uniqueYValues[1])/2*1e4)/1e4;
    const rotatedCentroidX=(rotatedVerts[0][0]+rotatedVerts[1][0]+rotatedVerts[2][0])/3;
    return {id:triangle.id, band:rowBand, rcx:rotatedCentroidX};
  });
  const trianglesByBand={};
  rotatedTriangles.forEach(rec=>{(trianglesByBand[rec.band]=trianglesByBand[rec.band]||[]).push(rec);});
  const bandKeys=Object.keys(trianglesByBand).map(Number).sort((a,b)=>b-a);
  return bandKeys.map(bandKey=>trianglesByBand[bandKey].sort((a,b)=>a.rcx-b.rcx).map(rec=>rec.id));
}
const AXES=[0,60,120].map(buildAxis);

/* label strings are i18n keys (ui.js renders them via t('half.'+label)), not display text. */
const DIRS=[[90,'Top'],[270,'Bottom'],[30,'Upper-right'],[150,'Upper-left'],[210,'Lower-left'],[330,'Lower-right']];
function labelFromAngle(deg){
  deg=(deg+360)%360; let bestLabel='',bestDiff=1e9;
  for(const [angleDeg,dirName] of DIRS){const diff=Math.abs(((deg-angleDeg+540)%360)-180); if(diff<bestDiff){bestDiff=diff;bestLabel=dirName;}}
  return bestLabel;
}
const HALVES=[];
AXES.forEach((rows,axisIndex)=>{
  [[0,1],[2,3]].forEach(([firstRowIndex,secondRowIndex])=>{
    const halfRows=[rows[firstRowIndex],rows[secondRowIndex]];
    const affectedTriangleIds=[...halfRows[0],...halfRows[1]];
    const centroidX=affectedTriangleIds.reduce((sum,id)=>sum+tris[id].cx,0)/affectedTriangleIds.length;
    const centroidY=affectedTriangleIds.reduce((sum,id)=>sum+tris[id].cy,0)/affectedTriangleIds.length;
    HALVES.push({axis:axisIndex, theta:[0,60,120][axisIndex], rows:halfRows, aff:affectedTriangleIds,
                 label:labelFromAngle(Math.atan2(centroidY,centroidX)*180/Math.PI)});
  });
});

/* ---- 3. Game state ---- */
let state=new Array(NUM_TRIANGLES).fill(0);
let moves=0, history=[], redoStack=[], busy=false;

function mulberry32(seedValue){
  return function(){
    seedValue|=0; seedValue=seedValue+0x6D2B79F5|0;
    let value=Math.imul(seedValue^seedValue>>>15, 1|seedValue);
    value=value+Math.imul(value^value>>>7, 61|value)^value;
    return ((value^value>>>14)>>>0)/4294967296;
  };
}
let seed=0, rng=Math.random;

function solvedBoard(){
  const board=new Array(NUM_TRIANGLES);
  for(let sectorIndex=0;sectorIndex<NUM_SECTORS;sectorIndex++)
    tris.filter(triangle=>triangle.sector===sectorIndex).forEach(triangle=>board[triangle.id]=sectorIndex);
  return board;
}

// Canonical key: colors are 0..5, so join('') is a unique 24-char string.
function keyOf(board) { return board.join(''); }

// Mirror of rotateColors/applyHalf, precomputed as position perms:
//   applying (halfIndex,dir) gives  out[p] = board[perm[p]].
// 12 generators = 6 halves x dir(+1,-1). Inverse of (h,dir) is (h,-dir).
function buildMoves(halves) {
  const moves = [];
  for (let hi = 0; hi < halves.length; hi++) {
    const half = halves[hi];
    for (const dir of [1, -1]) {
      const perm = new Array(NUM_TRIANGLES);
      for (let i = 0; i < NUM_TRIANGLES; i++) perm[i] = i;
      for (const row of half.rows) {
        const len = row.length;
        for (let i = 0; i < len; i++) perm[row[i]] = row[(i - dir + len) % len];
      }
      moves.push({ halfIndex: hi, dir, perm });
    }
  }
  return moves;
}

function applyPerm(board, perm) {
  const out = new Array(NUM_TRIANGLES);
  for (let i = 0; i < NUM_TRIANGLES; i++) out[i] = board[perm[i]];
  return out;
}

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
  const fwdMoves = [];
  let k = meetKey;
  while (fwd.get(k).parent !== null) {
    const n = fwd.get(k);
    fwdMoves.push({ halfIndex: n.half, dir: n.dir });
    k = n.parent;
  }
  fwdMoves.reverse();

  const backMoves = [];
  k = meetKey;
  while (back.get(k).parent !== null) {
    const n = back.get(k);
    backMoves.push({ halfIndex: n.half, dir: -n.dir });
    k = n.parent;
  }
  return fwdMoves.concat(backMoves);
}

// Bounded bidirectional BFS. Returns move list if solution <= maxSteps exists, else null.
function solve(state, halves, maxSteps) {
  if (maxSteps === undefined) maxSteps = 5;
  const moves = buildMoves(halves);
  const start = state.slice();
  const startKey = keyOf(start);

  const goal = solvedBoard();
  const goalKey = keyOf(goal);
  if (startKey === goalKey) return [];
  if (maxSteps < 1) return null;

  const fwd = new Map();
  const back = new Map();
  fwd.set(startKey, { half: -1, dir: 0, parent: null, dist: 0 });
  back.set(goalKey, { half: -1, dir: 0, parent: null, dist: 0 });
  let fwdFrontier = [start], backFrontier = [goal];
  let fwdDist = 0, backDist = 0;
  let bestTotal = Infinity, bestMeet = null;

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
    if (bestMeet !== null) return reconstruct(bestMeet, fwd, back);
  }

  return (bestMeet !== null && bestTotal <= maxSteps)
    ? reconstruct(bestMeet, fwd, back)
    : null;
}

/* ---- Solvability tracker — sticky "path to victory" state machine ----
 * Pure logic, no DOM. solveFn(state) returns an ordered move-list
 * [{halfIndex,dir},...] solving `state` ([] if already solved), or null when no
 * in-bound solution exists. At every transition we adopt a fresh bounded
 * solution when one exists; otherwise we maintain the held path by tracking the
 * applied move (front-match -> shift; walk-away -> prepend the inverse). Once
 * acquired, the path stays valid through any later move or undo. */
function advance(path, move) {
  if (path[0] && path[0].halfIndex === move.halfIndex && path[0].dir === move.dir) {
    return path.slice(1);
  }
  return [{ halfIndex: move.halfIndex, dir: -move.dir }, ...path];
}
function createSolvabilityTracker(solveFn) {
  let path = null;
  return {
    reset(state) { path = solveFn(state); },
    record(appliedMove, state) {
      const fresh = solveFn(state);
      if (fresh != null) { path = fresh; }
      else if (path && path.length) { path = advance(path, appliedMove); }
    },
    hasPath() { return !!(path && path.length); },
    next() { return (path && path.length) ? path[0] : null; },
    snapshot() {
      if (path == null) return path;
      return path.map(m => ({ halfIndex: m.halfIndex, dir: m.dir }));
    },
  };
}

function rotateColors(ids,dir){
  const rowLength=ids.length, colorValues=ids.map(index=>state[index]);
  ids.forEach((id,index)=>{ state[id]=colorValues[(index-dir+rowLength)%rowLength]; });
}
function applyHalf(half,dir){ half.rows.forEach(row=>rotateColors(row,dir)); }

function isSolved(){
  for(let sectorIndex=0;sectorIndex<NUM_SECTORS;sectorIndex++){
    const sectorTriangles=tris.filter(triangle=>triangle.sector===sectorIndex);
    if(sectorTriangles.some(triangle=>state[triangle.id]!==state[sectorTriangles[0].id])) return false;
  }
  return true;
}
function solvedCount(){
  let count=0;
  for(let sectorIndex=0;sectorIndex<NUM_SECTORS;sectorIndex++){
    const sectorTriangles=tris.filter(triangle=>triangle.sector===sectorIndex);
    if(sectorTriangles.every(triangle=>state[triangle.id]===state[sectorTriangles[0].id])) count++;
  }
  return count;
}

function scramble(seedValue,moveCount){
  seed=(seedValue===undefined)?((Math.random()*2**32)>>>0):(seedValue>>>0);
  rng=mulberry32(seed);
  console.log('[hexashift] scramble seed:',seed,'moves:',moveCount);
  do{
    state=solvedBoard();
    let prevHalfIndex=-1;
    for(let i=0;i<moveCount;i++){
      let halfIndex;
      do{ halfIndex=(rng()*HALVES.length)|0; } while(moveCount>1 && halfIndex===prevHalfIndex);
      applyHalf(HALVES[halfIndex], rng()<0.5?1:-1);
      prevHalfIndex=halfIndex;
    }
  } while(isSolved());
  moves=0; history=[]; redoStack=[];
}

/* ---- Fingerprint encode/decode ---- */
const FP_PARAM='g';
const FP_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const FP_LEN=11;
const FP_INDEX=(()=>{ const map={}; for(let i=0;i<FP_ALPHABET.length;i++) map[FP_ALPHABET[i]]=i; return map; })();

function isBoard(colorArray){
  return Array.isArray(colorArray)&&colorArray.length===NUM_TRIANGLES&&colorArray.every(colorIndex=>Number.isInteger(colorIndex)&&colorIndex>=0&&colorIndex<=5);
}
function encodeBoard(board){
  if(!isBoard(board)) throw new Error('encodeBoard needs a length-24 array of 0..5');
  let encodedValue=0n;
  for(let i=0;i<NUM_TRIANGLES;i++) encodedValue=encodedValue*6n+BigInt(board[i]);
  let encodedString='';
  for(let i=0;i<FP_LEN;i++){ encodedString=FP_ALPHABET[Number(encodedValue&63n)]+encodedString; encodedValue>>=6n; }
  return encodedString;
}
function decodeBoard(encodedCode){
  if(typeof encodedCode!=='string') return null;
  if(encodedCode.length!==FP_LEN) return null;
  let encodedValue=0n;
  for(const character of encodedCode){
    const charIndex=FP_INDEX[character];
    if(charIndex===undefined) return null;
    encodedValue=(encodedValue<<6n)|BigInt(charIndex);
  }
  const board=new Array(NUM_TRIANGLES);
  for(let i=NUM_TRIANGLES-1;i>=0;i--){ board[i]=Number(encodedValue%6n); encodedValue/=6n; }
  if(encodedValue!==0n) return null;
  return isBoard(board)?board:null;
}

function setState(newBoard){
  if(!Array.isArray(newBoard)||newBoard.length!==NUM_TRIANGLES||newBoard.some(colorIndex=>!Number.isInteger(colorIndex)||colorIndex<0||colorIndex>5))
    throw new Error('setState needs a length-24 array of color indices 0..5');
  state=newBoard.slice(); moves=0; history=[]; redoStack=[]; refresh();
}
function doMoveByIndex(halfIndex,dir){ doMove(HALVES[halfIndex], dir); }

if (typeof module !== 'undefined') {
  module.exports = {
    HALVES, tris,
    scramble, applyHalf, isSolved, solvedBoard, solve,
    createSolvabilityTracker, advance,
    encodeBoard, decodeBoard, mulberry32,
    getState:    () => state.slice(),
    setRawState: s  => { state = s.slice(); moves = 0; history = []; redoStack = []; },
  };
}
