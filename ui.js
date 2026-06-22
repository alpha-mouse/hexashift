"use strict";

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
    arrowGroup.addEventListener('mouseenter',()=>highlight(half.aff));
    arrowGroup.addEventListener('mouseleave',clearHighlight);
    arrowGroup.addEventListener('click',()=>{ doMove(half,dir); highlight(half.aff); });
    controls.appendChild(arrowGroup);
  });
});

/* ---- 6. Win + buttons ---- */
function win(){
  document.getElementById('winMsg').textContent=`You sorted the hexagon in ${moves} moves.`;
  document.getElementById('win').classList.add('show');
}

function doMove(half,dir){
  if(busy) return;
  applyHalf(half,dir);
  history.push([half,dir]); redoStack.length=0; moves++;
  refresh();
  flash(half.aff);
  if(isSolved()){ moves>0 && win(); }
}
function undo(){
  if(busy||!history.length) return;
  const [half,dir]=history.pop();
  redoStack.push([half,dir]);
  applyHalf(half,-dir); moves=Math.max(0,moves-1);
  refresh(); flash(half.aff);
}
function redo(){
  if(busy||!redoStack.length) return;
  const [half,dir]=redoStack.pop();
  history.push([half,dir]); moves++;
  applyHalf(half,dir);
  refresh(); flash(half.aff);
  if(isSolved()){ moves>0 && win(); }
}

document.getElementById('newBtn').onclick=()=>{ document.getElementById('win').classList.remove('show'); newGame(); };
document.getElementById('winBtn').onclick=()=>{ document.getElementById('win').classList.remove('show'); newGame(); };
document.getElementById('undoBtn').onclick=undo;
document.getElementById('redoBtn').onclick=redo;
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
  scramble(seedValue);
  refresh();
  initialBoard=state.slice();
  updateShareUI();
}
function loadFingerprint(encodedCode){
  const board=decodeBoard(encodedCode);
  if(!board) return false;
  setState(board);
  initialBoard=board.slice();
  updateShareUI();
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
