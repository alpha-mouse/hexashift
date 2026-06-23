"use strict";

/* ---- Difficulty ---- */
const DIFF_KEY='hx-difficulty';
const DIFF_OPTIONS=[1,2,3,4,5,8,13,21];
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

/* ---- 4. Rendering ---- */
const boardG=document.getElementById('boardG');
const polys=[];
tris.forEach(triangle=>{
  const polygon=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  polygon.setAttribute('points', triangle.verts.map(vertex=>vertex.join(',')).join(' '));
  polygon.setAttribute('class','tri');
  boardG.appendChild(polygon); polys[triangle.id]=polygon;
});
const VTX=[[1,SQRT3],[2,0],[1,-SQRT3],[-1,-SQRT3],[-2,0],[-1,SQRT3]];
VTX.forEach(vertex=>{
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1',0); line.setAttribute('y1',0); line.setAttribute('x2',vertex[0]); line.setAttribute('y2',vertex[1]);
  line.setAttribute('class','frame'); boardG.appendChild(line);
});
const hex=document.createElementNS('http://www.w3.org/2000/svg','polygon');
hex.setAttribute('points', VTX.map(vertex=>vertex.join(',')).join(' '));
hex.setAttribute('class','frame outer'); boardG.appendChild(hex);

function refresh(){
  tris.forEach(triangle=>polys[triangle.id].setAttribute('fill', COLORS[state[triangle.id]]));
  document.getElementById('movesN').textContent=moves;
}
function highlight(triangleIds){
  const highlightedSet=new Set(triangleIds);
  tris.forEach(triangle=>polys[triangle.id].classList.toggle('dim', !highlightedSet.has(triangle.id)));
}
function clearHighlight(){ tris.forEach(triangle=>polys[triangle.id].classList.remove('dim')); }
function flash(triangleIds){
  busy=true;
  triangleIds.forEach(id=>polys[id].classList.add('moved'));
  setTimeout(()=>{ triangleIds.forEach(id=>polys[id].classList.remove('moved')); busy=false; },190);
}

/* ---- 5. Controls: drag-arrows outside the hex ---- */
const SVGNS='http://www.w3.org/2000/svg';
const controls=document.getElementById('controls');
const SIDES=[30,90,150,210,270,330].map(d=>{const a=d*Math.PI/180; return [Math.cos(a),Math.sin(a)];});
const ARROW_RADIUS=1.78, ARROW_SEP=0.50;
let initialSolution=null, userMoves=[], hintStack=null;
const arrowByMove=new Map();
HALVES.forEach(half=>{
  const axisAngleRad=half.theta*Math.PI/180;
  [1,-1].forEach(dir=>{
    const unitDirX=dir*Math.cos(axisAngleRad), unitDirY=dir*Math.sin(axisAngleRad);
    let headTriangleId=half.aff[0], maxProjection=-Infinity;
    half.aff.forEach(id=>{ const projection=tris[id].cx*unitDirX+tris[id].cy*unitDirY; if(projection>maxProjection){maxProjection=projection;headTriangleId=id;} });
    const headAngleRad=Math.atan2(tris[headTriangleId].cy,tris[headTriangleId].cx);
    let nearestSide=SIDES[0], bestAngleDiff=Infinity;
    SIDES.forEach(side=>{ const diff=Math.abs(((Math.atan2(side[1],side[0])-headAngleRad+3*Math.PI)%(2*Math.PI))-Math.PI); if(diff<bestAngleDiff){bestAngleDiff=diff;nearestSide=side;} });
    const sideNormalX=nearestSide[0], sideNormalY=nearestSide[1];
    const normalProjection=unitDirX*sideNormalX+unitDirY*sideNormalY;
    let tangentX=unitDirX-normalProjection*sideNormalX, tangentY=unitDirY-normalProjection*sideNormalY;
    const tangentLength=Math.hypot(tangentX,tangentY)||1; tangentX/=tangentLength; tangentY/=tangentLength;
    const centerX=sideNormalX*ARROW_RADIUS+ARROW_SEP*tangentX, centerY=sideNormalY*ARROW_RADIUS+ARROW_SEP*tangentY;
    const screenX=centerX, screenY=-centerY;
    const arrowAngleDeg=Math.atan2(-unitDirY,unitDirX)*180/Math.PI;
    const arrowGroup=document.createElementNS(SVGNS,'g'); arrowGroup.setAttribute('class','ctrl');
    arrowGroup.setAttribute('transform',`translate(${screenX.toFixed(3)},${screenY.toFixed(3)}) rotate(${arrowAngleDeg.toFixed(2)})`);
    const hitCircle=document.createElementNS(SVGNS,'circle');
    hitCircle.setAttribute('cx','0.26'); hitCircle.setAttribute('cy','0'); hitCircle.setAttribute('r','0.30');
    const arrowPath=document.createElementNS(SVGNS,'path');
    arrowPath.setAttribute('d','M0 -.02 L.34 -.02 L.34 -.085 L.52 0 L.34 .085 L.34 .02 L0 .02 Z');
    const titleElem=document.createElementNS(SVGNS,'title');
    const screenDirX=unitDirX, screenDirY=-unitDirY;
    const arrowDir=Math.abs(screenDirX)>=Math.abs(screenDirY) ? (screenDirX>0?'right':'left') : (screenDirY>0?'down':'up');
    titleElem.textContent=`Drag ${half.label.toLowerCase()} half ${arrowDir}`;
    arrowGroup.appendChild(hitCircle); arrowGroup.appendChild(arrowPath); arrowGroup.appendChild(titleElem);
    arrowByMove.set(HALVES.indexOf(half)+','+dir, arrowGroup);
    const indicatorsEl=document.getElementById('indicators');
    const indGroup=document.createElementNS(SVGNS,'g');
    indGroup.style.opacity='0';
    indGroup.style.pointerEvents='none';
    half.rows.forEach(row=>{
      row.forEach((srcId,k)=>{
        const isWrap=k+dir<0||k+dir>=row.length;
        let triAngleDeg;
        if(isWrap){
          const tri=tris[srcId];
          const c=Math.cos(-half.theta*Math.PI/180), s=Math.sin(-half.theta*Math.PI/180);
          const edges=[[0,1],[1,2],[2,0]].map(([i,j])=>({i,j,rmx:(tri.verts[i][0]+tri.verts[j][0])/2*c-(tri.verts[i][1]+tri.verts[j][1])/2*s}));
          const {i,j}=edges.reduce((b,e)=>dir>0?e.rmx>b.rmx?e:b:e.rmx<b.rmx?e:b);
          const ex=tri.verts[j][0]-tri.verts[i][0], ey=tri.verts[j][1]-tri.verts[i][1];
          const tx=(tri.verts[i][0]+tri.verts[j][0])/2-tri.cx, ty=(tri.verts[i][1]+tri.verts[j][1])/2-tri.cy;
          const sg=ey*tx-ex*ty>0?1:-1;
          triAngleDeg=Math.atan2(ex*sg,ey*sg)*180/Math.PI;
        }
        else{ const dstId=row[k+dir]; const dx=tris[dstId].cx-tris[srcId].cx, dy=tris[dstId].cy-tris[srcId].cy; triAngleDeg=Math.atan2(-dy,dx)*180/Math.PI; }
        const triG=document.createElementNS(SVGNS,'g');
        triG.setAttribute('transform',`translate(${tris[srcId].cx.toFixed(3)},${(-tris[srcId].cy).toFixed(3)}) rotate(${triAngleDeg.toFixed(2)}) scale(0.38)`);
        const p=document.createElementNS(SVGNS,'path');
        p.setAttribute('d','M-.26 -.02 L.08 -.02 L.08 -.085 L.26 0 L.08 .085 L.08 .02 L-.26 .02 Z');
        p.setAttribute('class','ind-arrow');
        triG.appendChild(p); indGroup.appendChild(triG);
      });
    });
    indicatorsEl.appendChild(indGroup);
    let indAnim=null, lastPointerType='mouse';
    function showHover(){
      if(indAnim){ indAnim.cancel(); indAnim=null; }
      indGroup.style.opacity='0.45';
      highlight(half.aff);
    }
    function clearHover(){
      if(indAnim){ indAnim.cancel(); indAnim=null; }
      indGroup.style.opacity='0';
      clearHighlight();
    }
    arrowGroup.addEventListener('pointerenter',e=>{ lastPointerType=e.pointerType; showHover(); });
    arrowGroup.addEventListener('pointerleave',clearHover);
    arrowGroup.addEventListener('pointercancel',clearHover);
    arrowGroup.addEventListener('click',()=>{
      // Touch fires no lingering hover state, so end feedback at 0 and clear the dim.
      const isMouse=lastPointerType==='mouse', endOpacity=isMouse?0.45:0;
      if(indAnim) indAnim.cancel();
      indGroup.style.opacity='1';
      indAnim=indGroup.animate([{opacity:1},{opacity:endOpacity}],{duration:400,easing:'ease-out',fill:'forwards'});
      indAnim.onfinish=()=>{ indAnim.cancel(); indGroup.style.opacity=String(endOpacity); indAnim=null; };
      doMove(half,dir);
      if(isMouse) highlight(half.aff); else clearHighlight();
    });
    controls.appendChild(arrowGroup);
  });
});

/* ---- 6. Win + buttons ---- */
function win(){
  document.getElementById('winMsg').textContent=`You sorted the hexagon in ${moves} moves.`;
  document.getElementById('win').classList.add('show');
}

function updateHintStack(halfIndex,dir){
  if(!hintStack) return;
  const front=hintStack[0];
  if(front&&front.halfIndex===halfIndex&&front.dir===dir) hintStack.shift();
  else hintStack.unshift({halfIndex,dir:-dir});
}
function updateHintAvailability(){
  const btn=document.getElementById('hintBtn');
  if(!btn) return;
  let hasPath=false;
  if(!isSolved()){
    if(hintStack&&hintStack.length) hasPath=true;
    else{ const sol=solve(state,HALVES,5); hasPath=!!(sol&&sol.length); }
  }
  btn.disabled=!hasPath;
}
function doMove(half,dir){
  if(busy) return;
  applyHalf(half,dir);
  history.push([half,dir]); redoStack.length=0; moves++;
  userMoves.push({half,dir,halfIndex:HALVES.indexOf(half)});
  updateHintStack(HALVES.indexOf(half),dir);
  refresh();
  flash(half.aff);
  if(isSolved()){ moves>0 && win(); }
  updateHintAvailability();
}
function undo(){
  if(busy||!history.length) return;
  const [half,dir]=history.pop();
  redoStack.push([half,dir]);
  userMoves.pop();
  applyHalf(half,-dir); moves=Math.max(0,moves-1);
  updateHintStack(HALVES.indexOf(half),-dir);
  refresh(); flash(half.aff);
  updateHintAvailability();
}
function hint(){
  if(busy||isSolved()) return;
  if(hintStack&&hintStack.length){
    blinkArrow(hintStack[0].halfIndex,hintStack[0].dir);
    return;
  }
  const sol=solve(state,HALVES,5);
  if(sol&&sol.length) blinkArrow(sol[0].halfIndex,sol[0].dir);
}
function blinkArrow(halfIndex,dir){
  const g=arrowByMove.get(halfIndex+','+dir);
  if(!g) return;
  g.classList.remove('hint-blink');
  void g.getBoundingClientRect();
  g.classList.add('hint-blink');
  g.addEventListener('animationend',()=>g.classList.remove('hint-blink'),{once:true});
}

document.getElementById('newBtn').onclick=()=>{ document.getElementById('win').classList.remove('show'); newGame(); };
document.getElementById('winBtn').onclick=()=>{ document.getElementById('win').classList.remove('show'); newGame(); };
document.getElementById('undoBtn').onclick=undo;
document.getElementById('hintBtn').onclick=hint;
document.getElementById('copyBtn').onclick=copyShareLink;

/* ---- Theme control ---- */
const THEME_KEY='hx-theme';
const themeBtns={ light:document.getElementById('themeLight'),
                  system:document.getElementById('themeSystem'),
                  dark:document.getElementById('themeDark') };
function getTheme(){
  try{ const storedTheme=localStorage.getItem(THEME_KEY); if(storedTheme==='light'||storedTheme==='dark'||storedTheme==='system') return storedTheme; }catch(e){}
  return 'system';
}
function applyTheme(mode){
  if(mode==='light'||mode==='dark') document.documentElement.setAttribute('data-theme',mode);
  else document.documentElement.removeAttribute('data-theme');
  for(const themeName in themeBtns) themeBtns[themeName].setAttribute('aria-pressed', String(themeName===mode));
}
function setTheme(mode){
  try{ localStorage.setItem(THEME_KEY,mode); }catch(e){}
  applyTheme(mode);
}
themeBtns.light.onclick =()=>setTheme('light');
themeBtns.system.onclick=()=>setTheme('system');
themeBtns.dark.onclick  =()=>setTheme('dark');
applyTheme(getTheme());

/* ---- Difficulty selector ---- */
const difficultySel=document.getElementById('difficultySel');
if(difficultySel){
  DIFF_OPTIONS.forEach(n=>{
    const opt=document.createElement('option');
    opt.value=String(n); opt.textContent=`Off by ${n}`;
    difficultySel.appendChild(opt);
  });
  difficultySel.value=String(getDifficulty());
  difficultySel.onchange=()=>{
    setDifficulty(difficultySel.value);
    difficultySel.value=String(getDifficulty());
    document.getElementById('win').classList.remove('show');
    newGame();
  };
}

/* ---- Shareable fingerprint ---- */
let initialBoard=state.slice();
function shareUrl(code){
  const pageUrl=new URL(location.href);
  pageUrl.searchParams.set(FP_PARAM, code);
  return pageUrl.toString();
}
function updateShareUI(){
  const code=encodeBoard(initialBoard);
  const url=shareUrl(code);
  const shareLinkElem=document.getElementById('shareLink');
  if(shareLinkElem){ shareLinkElem.href=url; shareLinkElem.textContent=url; }
  const copyButton=document.getElementById('copyBtn');
  if(copyButton){ copyButton.classList.remove('copied'); copyButton.textContent='Copy link'; }
  try{ window.history.replaceState(null,'',url); }catch(e){}
}
function newGame(seedValue){
  const target=getDifficulty();
  let sol=null;
  if(seedValue===undefined && target<=5){
    for(let tries=0;tries<200;tries++){
      scramble(undefined,target);
      sol=solve(state,HALVES,target);
      if(sol&&sol.length===target) break;
    }
  } else {
    scramble(seedValue,target);
    sol=(target<=5)?solve(state,HALVES,target):null;
  }
  refresh();
  initialBoard=state.slice();
  initialSolution=sol;
  hintStack=sol?sol.map(m=>({halfIndex:m.halfIndex,dir:m.dir})):null;
  userMoves=[];
  updateShareUI();
  updateHintAvailability();
}
function loadFingerprint(encodedCode){
  const board=decodeBoard(encodedCode);
  if(!board) return false;
  setState(board);
  initialBoard=board.slice();
  hintStack=null;
  updateShareUI();
  updateHintAvailability();
  return true;
}
function copyShareLink(){
  const url=shareUrl(encodeBoard(initialBoard));
  const copyButton=document.getElementById('copyBtn');
  const markCopied=()=>{ if(copyButton){ copyButton.classList.add('copied'); copyButton.textContent='Copied!';
    setTimeout(()=>{ copyButton.classList.remove('copied'); copyButton.textContent='Copy link'; },1400); } };
  const copyFallback=()=>{
    try{
      const textArea=document.createElement('textarea');
      textArea.value=url; textArea.style.position='fixed'; textArea.style.opacity='0';
      document.body.appendChild(textArea); textArea.select(); document.execCommand('copy');
      document.body.removeChild(textArea); markCopied();
    }catch(e){}
  };
  if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(url).then(markCopied, copyFallback);
  else copyFallback();
}

/* ---- Help panel ---- */
const HELP_KEY='hx-help-seen';
const helpPanel=document.getElementById('helpPanel');
const helpToggle=document.getElementById('helpToggle');
function setHelpOpen(open){
  helpPanel.classList.toggle('open',open);
  helpToggle.setAttribute('aria-expanded',String(open));
}
helpToggle.addEventListener('click',()=>{
  const helpPanelShouldBeOpen=!helpPanel.classList.contains('open');
  setHelpOpen(helpPanelShouldBeOpen);
  try{ localStorage.setItem(HELP_KEY,'1'); }catch(e){}
});
const letsPlayBtn=document.getElementById('letsPlayBtn');
if(letsPlayBtn) letsPlayBtn.addEventListener('click',()=>setHelpOpen(false));
(function(){
  let seen=false;
  try{ seen=!!localStorage.getItem(HELP_KEY); }catch(e){}
  if(!seen) setHelpOpen(true);
})();

/* ---- Boot ---- */
(function boot(){
  let fingerprintCode=null;
  try{ fingerprintCode=new URL(location.href).searchParams.get(FP_PARAM); }catch(e){}
  if(fingerprintCode && loadFingerprint(fingerprintCode)) return;
  newGame();
})();
