"use strict";

/* ---- 4. Rendering ---- */
const boardG=document.getElementById('boardG');
const polys=[];
tris.forEach(t=>{
  const p=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  p.setAttribute('points', t.verts.map(v=>v.join(',')).join(' '));
  p.setAttribute('class','tri');
  boardG.appendChild(p); polys[t.id]=p;
});
const VTX=[[1,SQRT3],[2,0],[1,-SQRT3],[-1,-SQRT3],[-2,0],[-1,SQRT3]];
VTX.forEach(v=>{
  const l=document.createElementNS('http://www.w3.org/2000/svg','line');
  l.setAttribute('x1',0); l.setAttribute('y1',0); l.setAttribute('x2',v[0]); l.setAttribute('y2',v[1]);
  l.setAttribute('class','frame'); boardG.appendChild(l);
});
const hex=document.createElementNS('http://www.w3.org/2000/svg','polygon');
hex.setAttribute('points', VTX.map(v=>v.join(',')).join(' '));
hex.setAttribute('class','frame outer'); boardG.appendChild(hex);

function refresh(){
  tris.forEach(t=>polys[t.id].setAttribute('fill', COLORS[state[t.id]]));
  document.getElementById('movesN').textContent=moves;
}
function highlight(ids){
  const set=new Set(ids);
  tris.forEach(t=>polys[t.id].classList.toggle('dim', !set.has(t.id)));
}
function clearHighlight(){ tris.forEach(t=>polys[t.id].classList.remove('dim')); }
function flash(ids){
  busy=true;
  ids.forEach(id=>polys[id].classList.add('moved'));
  setTimeout(()=>{ ids.forEach(id=>polys[id].classList.remove('moved')); busy=false; },190);
}

/* ---- 5. Controls: drag-arrows outside the hex ---- */
const SVGNS='http://www.w3.org/2000/svg';
const controls=document.getElementById('controls');
const SIDES=[30,90,150,210,270,330].map(d=>{const a=d*Math.PI/180; return [Math.cos(a),Math.sin(a)];});
const R=1.78, SEP=0.50;
HALVES.forEach(half=>{
  const th=half.theta*Math.PI/180;
  [1,-1].forEach(dir=>{
    const ux=dir*Math.cos(th), uy=dir*Math.sin(th);
    let head=half.aff[0], max=-Infinity;
    half.aff.forEach(id=>{ const p=tris[id].cx*ux+tris[id].cy*uy; if(p>max){max=p;head=id;} });
    const ha=Math.atan2(tris[head].cy,tris[head].cx);
    let side=SIDES[0], bd=Infinity;
    SIDES.forEach(s=>{ const d=Math.abs(((Math.atan2(s[1],s[0])-ha+3*Math.PI)%(2*Math.PI))-Math.PI); if(d<bd){bd=d;side=s;} });
    const nx=side[0], ny=side[1], un=ux*nx+uy*ny;
    let tx=ux-un*nx, ty=uy-un*ny, tl=Math.hypot(tx,ty)||1; tx/=tl; ty/=tl;
    const cxm=nx*R+SEP*tx, cym=ny*R+SEP*ty;
    const px=cxm, py=-cym;
    const ang=Math.atan2(-uy,ux)*180/Math.PI;
    const g=document.createElementNS(SVGNS,'g'); g.setAttribute('class','ctrl');
    g.setAttribute('transform',`translate(${px.toFixed(3)},${py.toFixed(3)}) rotate(${ang.toFixed(2)})`);
    const hit=document.createElementNS(SVGNS,'circle');
    hit.setAttribute('cx','0.26'); hit.setAttribute('cy','0'); hit.setAttribute('r','0.30');
    const path=document.createElementNS(SVGNS,'path');
    path.setAttribute('d','M0 -.02 L.34 -.02 L.34 -.085 L.52 0 L.34 .085 L.34 .02 L0 .02 Z');
    const t=document.createElementNS(SVGNS,'title');
    const sdx=ux, sdy=-uy;
    const arrowDir=Math.abs(sdx)>=Math.abs(sdy) ? (sdx>0?'right':'left') : (sdy>0?'down':'up');
    t.textContent=`Drag ${half.label.toLowerCase()} half ${arrowDir}`;
    g.appendChild(hit); g.appendChild(path); g.appendChild(t);
    g.addEventListener('mouseenter',()=>highlight(half.aff));
    g.addEventListener('mouseleave',clearHighlight);
    g.addEventListener('click',()=>{ doMove(half,dir); highlight(half.aff); });
    controls.appendChild(g);
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
  try{ const t=localStorage.getItem(THEME_KEY); if(t==='light'||t==='dark'||t==='system') return t; }catch(e){}
  return 'system';
}
function applyTheme(mode){
  if(mode==='light'||mode==='dark') document.documentElement.setAttribute('data-theme',mode);
  else document.documentElement.removeAttribute('data-theme');
  for(const k in themeBtns) themeBtns[k].setAttribute('aria-pressed', String(k===mode));
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
  const u=new URL(location.href);
  u.searchParams.set(FP_PARAM, code);
  return u.toString();
}
function updateShareUI(){
  const code=encodeBoard(initialBoard);
  const url=shareUrl(code);
  const a=document.getElementById('shareLink');
  if(a){ a.href=url; a.textContent=url; }
  const btn=document.getElementById('copyBtn');
  if(btn){ btn.classList.remove('copied'); btn.textContent='Copy link'; }
  try{ window.history.replaceState(null,'',url); }catch(e){}
}
function newGame(s){
  scramble(s);
  refresh();
  initialBoard=state.slice();
  updateShareUI();
}
function loadFingerprint(code){
  const board=decodeBoard(code);
  if(!board) return false;
  setState(board);
  initialBoard=board.slice();
  updateShareUI();
  return true;
}
function copyShareLink(){
  const url=shareUrl(encodeBoard(initialBoard));
  const btn=document.getElementById('copyBtn');
  const mark=()=>{ if(btn){ btn.classList.add('copied'); btn.textContent='Copied!';
    setTimeout(()=>{ btn.classList.remove('copied'); btn.textContent='Copy link'; },1400); } };
  const fallback=()=>{
    try{
      const ta=document.createElement('textarea');
      ta.value=url; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); mark();
    }catch(e){}
  };
  if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(url).then(mark, fallback);
  else fallback();
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
  const next=!helpPanel.classList.contains('open');
  setHelpOpen(next);
  try{ localStorage.setItem(HELP_KEY,'1'); }catch(e){}
});
(function(){
  let seen=false;
  try{ seen=!!localStorage.getItem(HELP_KEY); }catch(e){}
  if(!seen) setHelpOpen(true);
})();

/* ---- Boot ---- */
(function boot(){
  let code=null;
  try{ code=new URL(location.href).searchParams.get(FP_PARAM); }catch(e){}
  if(code && loadFingerprint(code)) return;
  newGame();
})();
