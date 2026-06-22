"use strict";

function runTests(){
  const snap={state:state.slice(), moves, history:history.slice(), seed};
  const results=[];
  const ok=(name,cond)=>results.push({name,pass:!!cond});
  const eqArr=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);

  let t1=true;
  for(let h=0;h<HALVES.length;h++){
    const before=state.slice();
    applyHalf(HALVES[h],1); applyHalf(HALVES[h],-1);
    if(!eqArr(state,before)) t1=false;
  }
  ok('move ∘ inverse = identity (all 6 halves)', t1);

  state=solvedBoard();
  const r=mulberry32(0xC0FFEE), seq=[];
  for(let i=0;i<40;i++){ const hi=(r()*HALVES.length)|0, d=r()<0.5?1:-1; seq.push([hi,d]); applyHalf(HALVES[hi],d); }
  for(let i=seq.length-1;i>=0;i--) applyHalf(HALVES[seq[i][0]], -seq[i][1]);
  ok('scramble + reversed inverse = solved', isSolved());

  state=solvedBoard();
  ok('solved board: isSolved()', isSolved());
  ok('solved board: solvedCount()===6', solvedCount()===6);
  state[0]=(state[0]+1)%6;
  ok('one triangle off: not solved', !isSolved());
  ok('one triangle off: solvedCount()===5', solvedCount()===5);

  let t4=true;
  const samples=[solvedBoard(),
                 new Array(24).fill(0), new Array(24).fill(5),
                 Array.from({length:24},(_,i)=>i%6)];
  const r2=mulberry32(0x5EED5);
  for(let k=0;k<8;k++) samples.push(Array.from({length:24},()=>(r2()*6)|0));
  for(const b of samples){ const c=encodeBoard(b); const d=decodeBoard(c);
    if(!d||!eqArr(d,b)||c.length!==FP_LEN) t4=false; }
  ok('fingerprint encode/decode round-trips', t4);
  ok('bad fingerprints -> null', decodeBoard('')===null && decodeBoard('!!!!!!!!!!!')===null
       && decodeBoard('zzz')===null && decodeBoard('zzzzzzzzzzzz')===null && decodeBoard(null)===null);

  state=snap.state; moves=snap.moves; history=snap.history; seed=snap.seed; refresh();

  const passed=results.filter(x=>x.pass).length;
  results.forEach(x=>console.log(`${x.pass?'PASS':'FAIL'}  ${x.name}`));
  console.log(`[hexashift] ${passed}/${results.length} tests passed`);
  return {passed, total:results.length, ok:passed===results.length, results};
}

window.__hx={
  tris, AXES, HALVES,
  state:()=>state, moves:()=>moves, history:()=>history, seed:()=>seed,
  isSolved, solvedCount, solvedBoard,
  scramble, doMove, doMoveByIndex, setState, undo, redo,
  mulberry32, test:runTests,
  getTheme, setTheme,
  getDifficulty, setDifficulty,
  scrambleMoves:()=>lastScrambleMoves, DIFF_OPTIONS:DIFF_OPTIONS.slice(),
  encodeBoard, decodeBoard,
  initialBoard:()=>initialBoard.slice(),
  fingerprint:()=>encodeBoard(initialBoard),
  newGame, loadFingerprint
};

if(/(?:^|[?&])test(?:$|[&=])/.test(location.search)) runTests();
