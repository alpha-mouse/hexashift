"use strict";
const SQRT3 = Math.sqrt(3), H = SQRT3/2;
const COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6'];

/* ---- 1. Build the 24 triangles (flat-top hexagon, side 2) ---- */
const Ly = [SQRT3, SQRT3/2, 0, -SQRT3/2, -SQRT3];
const P  = [[-1,0,1],[-1.5,-0.5,0.5,1.5],[-2,-1,0,1,2],[-1.5,-0.5,0.5,1.5],[-1,0,1]];
const tris = [];
for(let r=0;r<4;r++){
  const upperY=Ly[r], lowerY=Ly[r+1], up=P[r], low=P[r+1];
  for(let i=0;i<low.length-1;i++){
    const x0=low[i],x1=low[i+1];
    tris.push({verts:[[x0,lowerY],[x1,lowerY],[(x0+x1)/2,upperY]]});
  }
  for(let i=0;i<up.length-1;i++){
    const x0=up[i],x1=up[i+1];
    tris.push({verts:[[x0,upperY],[x1,upperY],[(x0+x1)/2,lowerY]]});
  }
}
tris.forEach((t,id)=>{
  t.id=id;
  t.cx=(t.verts[0][0]+t.verts[1][0]+t.verts[2][0])/3;
  t.cy=(t.verts[0][1]+t.verts[1][1]+t.verts[2][1])/3;
  const ang=(Math.atan2(t.cy,t.cx)*180/Math.PI+360)%360;
  t.sector=Math.floor(ang/60);
});

/* ---- 2. Rows / halves for each of the 3 axes (0, 60, 120 degrees) ---- */
const rot=(x,y,deg)=>{const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [x*c-y*s, x*s+y*c];};
function buildAxis(theta){
  const recs=tris.map(t=>{
    const rv=t.verts.map(([x,y])=>rot(x,y,-theta));
    const ys=[...new Set(rv.map(p=>Math.round(p[1]*1e4)/1e4))];
    const band=Math.round((ys[0]+ys[1])/2*1e4)/1e4;
    const rcx=(rv[0][0]+rv[1][0]+rv[2][0])/3;
    return {id:t.id, band, rcx};
  });
  const byBand={};
  recs.forEach(r=>{(byBand[r.band]=byBand[r.band]||[]).push(r);});
  const keys=Object.keys(byBand).map(Number).sort((a,b)=>b-a);
  return keys.map(k=>byBand[k].sort((a,b)=>a.rcx-b.rcx).map(r=>r.id));
}
const AXES=[0,60,120].map(buildAxis);

const DIRS=[[90,'Top'],[270,'Bottom'],[30,'Upper-right'],[150,'Upper-left'],[210,'Lower-left'],[330,'Lower-right']];
function labelFromAngle(deg){
  deg=(deg+360)%360; let best='',bd=1e9;
  for(const [a,n] of DIRS){const d=Math.abs(((deg-a+540)%360)-180); if(d<bd){bd=d;best=n;}}
  return best;
}
const HALVES=[];
AXES.forEach((rows,ai)=>{
  [[0,1],[2,3]].forEach(([p,q])=>{
    const rws=[rows[p],rows[q]], aff=[...rws[0],...rws[1]];
    const mx=aff.reduce((s,id)=>s+tris[id].cx,0)/aff.length;
    const my=aff.reduce((s,id)=>s+tris[id].cy,0)/aff.length;
    HALVES.push({axis:ai, theta:[0,60,120][ai], rows:rws, aff,
                 label:labelFromAngle(Math.atan2(my,mx)*180/Math.PI)});
  });
});

/* ---- 3. Game state ---- */
let state=new Array(24).fill(0);
let moves=0, history=[], redoStack=[], busy=false;

function mulberry32(a){
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15, 1|a);
    t=t+Math.imul(t^t>>>7, 61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
let seed=0, rng=Math.random;

function solvedBoard(){
  const b=new Array(24);
  for(let s=0;s<6;s++) tris.filter(t=>t.sector===s).forEach(t=>b[t.id]=s);
  return b;
}

function rotateColors(ids,dir){
  const n=ids.length, vals=ids.map(i=>state[i]);
  ids.forEach((id,k)=>{ state[id]=vals[(k-dir+n)%n]; });
}
function applyHalf(half,dir){ half.rows.forEach(row=>rotateColors(row,dir)); }

function isSolved(){
  for(let s=0;s<6;s++){
    const ids=tris.filter(t=>t.sector===s);
    if(ids.some(t=>state[t.id]!==state[ids[0].id])) return false;
  }
  return true;
}
function solvedCount(){
  let c=0;
  for(let s=0;s<6;s++){
    const ids=tris.filter(t=>t.sector===s);
    if(ids.every(t=>state[t.id]===state[ids[0].id])) c++;
  }
  return c;
}

const DIFF_KEY='hx-difficulty';
const DIFF_OPTIONS=[1,2,3,5,8,35];
const DIFF_DEFAULT=3;
function getDifficulty(){
  try{ const v=parseInt(localStorage.getItem(DIFF_KEY),10);
       if(DIFF_OPTIONS.includes(v)) return v; }catch(e){}
  return DIFF_DEFAULT;
}
function setDifficulty(n){
  n=parseInt(n,10);
  if(!DIFF_OPTIONS.includes(n)) n=DIFF_DEFAULT;
  try{ localStorage.setItem(DIFF_KEY,String(n)); }catch(e){}
  return n;
}
let lastScrambleMoves=0;

function scramble(s,n){
  const depth=(n===undefined)?getDifficulty():n;
  seed=(s===undefined)?((Math.random()*2**32)>>>0):(s>>>0);
  rng=mulberry32(seed);
  console.log('[hexashift] scramble seed:',seed,'moves:',depth);
  do{
    state=solvedBoard();
    let prev=-1;
    for(let i=0;i<depth;i++){
      let hi;
      do{ hi=(rng()*HALVES.length)|0; } while(depth>1 && hi===prev);
      applyHalf(HALVES[hi], rng()<0.5?1:-1);
      prev=hi;
    }
  } while(isSolved());
  lastScrambleMoves=depth;
  moves=0; history=[]; redoStack=[];
}

/* ---- Fingerprint encode/decode ---- */
const FP_PARAM='g';
const FP_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const FP_LEN=11;
const FP_INDEX=(()=>{ const m={}; for(let i=0;i<FP_ALPHABET.length;i++) m[FP_ALPHABET[i]]=i; return m; })();

function isBoard(arr){
  return Array.isArray(arr)&&arr.length===24&&arr.every(v=>Number.isInteger(v)&&v>=0&&v<=5);
}
function encodeBoard(board){
  if(!isBoard(board)) throw new Error('encodeBoard needs a length-24 array of 0..5');
  let n=0n;
  for(let i=0;i<24;i++) n=n*6n+BigInt(board[i]);
  let out='';
  for(let i=0;i<FP_LEN;i++){ out=FP_ALPHABET[Number(n&63n)]+out; n>>=6n; }
  return out;
}
function decodeBoard(code){
  if(typeof code!=='string') return null;
  if(code.length!==FP_LEN) return null;
  let n=0n;
  for(const ch of code){
    const v=FP_INDEX[ch];
    if(v===undefined) return null;
    n=(n<<6n)|BigInt(v);
  }
  const board=new Array(24);
  for(let i=23;i>=0;i--){ board[i]=Number(n%6n); n/=6n; }
  if(n!==0n) return null;
  return isBoard(board)?board:null;
}

function setState(arr){
  if(!Array.isArray(arr)||arr.length!==24||arr.some(v=>!Number.isInteger(v)||v<0||v>5))
    throw new Error('setState needs a length-24 array of color indices 0..5');
  state=arr.slice(); moves=0; history=[]; redoStack=[]; refresh();
}
function doMoveByIndex(i,dir){ doMove(HALVES[i], dir); }
