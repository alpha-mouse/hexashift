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

const DIFF_KEY='hx-difficulty';
const DIFF_OPTIONS=[1,2,3,5,8,35];
const DIFF_DEFAULT=2;
function getDifficulty(){
  try{ const stored=parseInt(localStorage.getItem(DIFF_KEY),10);
       if(DIFF_OPTIONS.includes(stored)) return stored; }catch(e){}
  return DIFF_DEFAULT;
}
function setDifficulty(value){
  value=parseInt(value,10);
  if(!DIFF_OPTIONS.includes(value)) value=DIFF_DEFAULT;
  try{ localStorage.setItem(DIFF_KEY,String(value)); }catch(e){}
  return value;
}
let lastScrambleMoves=0;

function scramble(seedValue,moveCount){
  const scrambleDepth=(moveCount===undefined)?getDifficulty():moveCount;
  seed=(seedValue===undefined)?((Math.random()*2**32)>>>0):(seedValue>>>0);
  rng=mulberry32(seed);
  console.log('[hexashift] scramble seed:',seed,'moves:',scrambleDepth);
  do{
    state=solvedBoard();
    let prevHalfIndex=-1;
    for(let i=0;i<scrambleDepth;i++){
      let halfIndex;
      do{ halfIndex=(rng()*HALVES.length)|0; } while(scrambleDepth>1 && halfIndex===prevHalfIndex);
      applyHalf(HALVES[halfIndex], rng()<0.5?1:-1);
      prevHalfIndex=halfIndex;
    }
  } while(isSolved());
  lastScrambleMoves=scrambleDepth;
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
