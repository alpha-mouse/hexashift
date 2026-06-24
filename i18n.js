"use strict";

/* ---- i18n core ----
   Translation catalogs register themselves into window.HX_I18N (one per language,
   loaded as plain <script>s so this works from file:// with no build/fetch).
   A catalog value is a string, or a (params)=>string function so each language
   owns its own plural/word-order rules. */

window.HX_I18N = window.HX_I18N || {};   /* { en:{...}, xx:{...} } — keyed by base lang code */
const HX_LANG_DEFAULT='en';
const HX_LANG_KEY='hx-lang';
let HX_ACTIVE=null;
const HX_LANG_LISTENERS=[];

/* Explicit registry — all supported languages, whether their catalogs are loaded or not. */
const HX_SUPPORTED_LANGS={ be:'Беларуская', en:'English', es:'Español' };

function supportedLangs(){ return Object.keys(HX_SUPPORTED_LANGS); }

function loadLangScript(code){
  return new Promise((resolve,reject)=>{
    if(window.HX_I18N[code]){ resolve(); return; }
    const s=document.createElement('script');
    s.src=`i18n/${code}.js`;
    s.onload=resolve;
    s.onerror=reject;
    document.head.appendChild(s);
  });
}

function storedLang(){
  try{ const v=localStorage.getItem(HX_LANG_KEY); if(v && HX_SUPPORTED_LANGS[v]) return v; }catch(e){}
  return null;
}
/* First navigator.languages base code (es from es-MX) with a registered catalog, else English. */
function detectLang(){
  const stored=storedLang();
  if(stored) return stored;
  const navs=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||HX_LANG_DEFAULT];
  for(const tag of navs){
    if(!tag) continue;
    const base=String(tag).toLowerCase().split('-')[0];
    if(HX_SUPPORTED_LANGS[base]) return base;
  }
  return HX_LANG_DEFAULT;
}
function getLang(){ if(!HX_ACTIVE) HX_ACTIVE=detectLang(); return HX_ACTIVE; }

/* Look up active catalog, fall back to English, then to the key itself. */
function t(key,params){
  const cat=window.HX_I18N[getLang()];
  let val=(cat && key in cat) ? cat[key] : undefined;
  if(val===undefined){ const def=window.HX_I18N[HX_LANG_DEFAULT]; if(def && key in def) val=def[key]; }
  if(val===undefined) return key;
  return (typeof val==='function')?val(params||{}):val;
}

/* Apply catalog text to annotated DOM:
   data-i18n -> textContent, data-i18n-html -> innerHTML (trusted own markup),
   data-i18n-attr="attr:key;attr2:key2" -> setAttribute per pair. */
function applyTranslations(root){
  root=root||document;
  root.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent=t(el.getAttribute('data-i18n')); });
  root.querySelectorAll('[data-i18n-html]').forEach(el=>{ el.innerHTML=t(el.getAttribute('data-i18n-html')); });
  root.querySelectorAll('[data-i18n-attr]').forEach(el=>{
    el.getAttribute('data-i18n-attr').split(';').forEach(pair=>{
      const idx=pair.indexOf(':'); if(idx<0) return;
      const attr=pair.slice(0,idx).trim(), key=pair.slice(idx+1).trim();
      if(attr&&key) el.setAttribute(attr,t(key));
    });
  });
  document.documentElement.lang=getLang();
}

/* ui.js registers callbacks here to re-render JS-built text (arrow titles, options, …). */
function onLangChange(fn){ if(typeof fn==='function') HX_LANG_LISTENERS.push(fn); }

function setLang(code){
  if(!HX_SUPPORTED_LANGS[code]) return;
  if(window.HX_I18N[code]){
    HX_ACTIVE=code;
    try{ localStorage.setItem(HX_LANG_KEY,code); }catch(e){}
    applyTranslations(document);
    HX_LANG_LISTENERS.forEach(fn=>{ try{ fn(code); }catch(e){} });
    return;
  }
  /* Catalog not yet loaded — show hourglass, fetch, then apply. */
  const spinner=document.getElementById('langLoading');
  if(spinner) spinner.hidden=false;
  loadLangScript(code).then(()=>{
    HX_ACTIVE=code;
    try{ localStorage.setItem(HX_LANG_KEY,code); }catch(e){}
    applyTranslations(document);
    HX_LANG_LISTENERS.forEach(fn=>{ try{ fn(code); }catch(e){} });
  }).catch(()=>{}).finally(()=>{
    if(spinner) spinner.hidden=true;
  });
}
