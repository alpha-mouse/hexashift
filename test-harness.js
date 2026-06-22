"use strict";

function runTests(){
  const savedSnapshot={state:state.slice(), moves, history:history.slice(), seed};
  const results=[];
  const assertTest=(name,condition)=>results.push({name,pass:!!condition});
  const arraysEqual=(arrayA,arrayB)=>arrayA.length===arrayB.length&&arrayA.every((value,index)=>value===arrayB[index]);

  let moveInverseOk=true;
  for(let halfIndex=0;halfIndex<HALVES.length;halfIndex++){
    const stateBefore=state.slice();
    applyHalf(HALVES[halfIndex],1); applyHalf(HALVES[halfIndex],-1);
    if(!arraysEqual(state,stateBefore)) moveInverseOk=false;
  }
  assertTest('move ∘ inverse = identity (all 6 halves)', moveInverseOk);

  state=solvedBoard();
  const testRng=mulberry32(0xC0FFEE), moveSequence=[];
  for(let i=0;i<40;i++){ const halfIndex=(testRng()*HALVES.length)|0, direction=testRng()<0.5?1:-1; moveSequence.push([halfIndex,direction]); applyHalf(HALVES[halfIndex],direction); }
  for(let i=moveSequence.length-1;i>=0;i--) applyHalf(HALVES[moveSequence[i][0]], -moveSequence[i][1]);
  assertTest('scramble + reversed inverse = solved', isSolved());

  state=solvedBoard();
  assertTest('solved board: isSolved()', isSolved());
  assertTest('solved board: solvedCount()===6', solvedCount()===6);
  state[0]=(state[0]+1)%6;
  assertTest('one triangle off: not solved', !isSolved());
  assertTest('one triangle off: solvedCount()===5', solvedCount()===5);

  let encodingOk=true;
  const testBoards=[solvedBoard(),
                 new Array(24).fill(0), new Array(24).fill(5),
                 Array.from({length:24},(_,index)=>index%6)];
  const boardRng=mulberry32(0x5EED5);
  for(let k=0;k<8;k++) testBoards.push(Array.from({length:24},()=>(boardRng()*6)|0));
  for(const testBoard of testBoards){ const encoded=encodeBoard(testBoard); const decoded=decodeBoard(encoded);
    if(!decoded||!arraysEqual(decoded,testBoard)||encoded.length!==FP_LEN) encodingOk=false; }
  assertTest('fingerprint encode/decode round-trips', encodingOk);
  assertTest('bad fingerprints -> null', decodeBoard('')===null && decodeBoard('!!!!!!!!!!!')===null
       && decodeBoard('zzz')===null && decodeBoard('zzzzzzzzzzzz')===null && decodeBoard(null)===null);

  state=savedSnapshot.state; moves=savedSnapshot.moves; history=savedSnapshot.history; seed=savedSnapshot.seed; refresh();

  const passedCount=results.filter(result=>result.pass).length;
  results.forEach(result=>console.log(`${result.pass?'PASS':'FAIL'}  ${result.name}`));
  console.log(`[hexashift] ${passedCount}/${results.length} tests passed`);
  return {passed:passedCount, total:results.length, ok:passedCount===results.length, results};
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
