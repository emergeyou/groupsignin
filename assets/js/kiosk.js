(function(){
'use strict';

/* 0a. boot guard: config.js must have loaded before this script (both are
   classic scripts at the end of <body>, so document order guarantees it).
   If the assets folder is missing or index.html was opened alone, say so
   plainly instead of failing silently. */
if(!(typeof window!=='undefined' && window.EMERGE_CONFIG)){
  try{
    var d=document.createElement('div');
    d.setAttribute('style','position:fixed;inset:0;z-index:999;background:#0F130F;color:#F4EEE1;display:grid;place-items:center;font:16px/1.6 Georgia,serif;text-align:center;padding:2rem');
    d.innerHTML='<div><b style="font-family:sans-serif;font-weight:900;font-size:20px;letter-spacing:.04em">ASSETS NOT FOUND</b><br><br>This page loads its configuration, styles and logo from the<br><b>assets/</b> folder next to index.html. Keep the folder<br>structure intact &mdash; or use the single-file edition.</div>';
    document.body.appendChild(d);
  }catch(e){}
  return;
}
/* ============================================================
   0. small helpers
   ============================================================ */
const $ = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> Array.prototype.slice.call((r||document).querySelectorAll(s));
const LSKEY = 'gs_kiosk_v1';
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const pad = n => String(n).padStart(2,'0');
const isoOf = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseISO = s => { const p=String(s).split('-').map(Number); return new Date(p[0],(p[1]||1)-1,p[2]||1); };
const addDays = (d,n)=>{ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()+n); return x; };
const sundayOf = d => addDays(d, -d.getDay());
const todayISO = ()=> isoOf(new Date());
const sundayISO = ()=> isoOf(sundayOf(new Date()));
const isSunday = s => parseISO(s).getDay()===0;
const fmtDateLong = s => parseISO(s).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
const fmtDateShort = d => MON[d.getMonth()]+' '+d.getDate();
const fmtTime = ts => new Date(ts).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
const fmtTime12 = ts => { const d=new Date(ts); let h=d.getHours(); const m=pad(d.getMinutes()); const ap=h>=12?'PM':'AM'; h=h%12||12; return h+':'+m+' '+ap; };
const escXml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uid = ()=> Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const normKey = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const digits = s => String(s||'').replace(/[^0-9]/g,'');

function shortName(full){
  const p = String(full||'').trim().split(/\s+/).filter(Boolean);
  if(!p.length) return '';
  if(p.length===1) return p[0];
  return p[0]+' '+p[p.length-1][0].toUpperCase()+'.';
}
function titleCase(s){
  return String(s||'').trim().replace(/\s+/g,' ').replace(/(^|[\s'\-])([a-z])/g,(m,a,b)=>a+b.toUpperCase());
}

/* ============================================================
   1. seed content — groups mirror the client's reference sheet
   ============================================================ */
const CFG = (typeof window!=='undefined' && window.EMERGE_CONFIG) ? window.EMERGE_CONFIG : {};

const DEFAULT_GROUPS = CFG.groups || [

  ['ACCENTURE','Work Readiness - Accenture (Hours)','Work Readiness','WR'],
  ['EMP READY IN PERS','Work Readiness - In Person (Hours)','In Person Work Readiness','WR'],
  ['MONEY ESS','Work Readiness - Money Essentials (Hours)','Financial Wellness','WR'],
  ['WORK ESS','Work Readiness - Work Essentials (Hours)','Work Readiness','WR'],
  ['BUILD','Youth Group - BUILD / Mastering the Self (Hours)','Young Men Groups','YG'],
  ['REEL TALK','Youth Group - Reel Talk (Hours)','Movie and activity nights','YG'],
  ['COMM SVC','Youth Group - Community Service (Hours)','Community Service Work','YG'],
  ['SEL','Youth Group - SEL (Hours)','Trauma, Mental Health Groups','YG'],
  ['SISTER CIRCLE','Youth Group - Sister Circle (Hours)','Youth Girls Group','YG'],
  ['PRIDE & CROWN','Youth Group - Pride and Crown (Hours)','Youth Coed Group','YG'],
  ['RPI','Restorative Practice Groups','2nd Chance Group','OT'],
  ['FELLOWSHIP','Fellowship for Black Women Healers','Sunday Group - Young Women','FBWH'],
  ['OTHER','Youth Group - Other (Hours)','Youth Growth Groups','YG']
];
const TYPE_LABELS = CFG.groupTypes || { YG:'Youth group', WR:'Work readiness', OT:'Other', FBWH:'Fellowship', IND:'Individual' };

const REASONS = CFG.requestReasons || ['Personal','Case management','Something else'];
/* ---- configuration (assets/js/config.js is the source of truth) ---- */
const DEFAULT_ORG = CFG.org || 'EMERGE YOU Programs';
const DEFAULT_KIOSK_ID = CFG.kioskId || 'Front desk';
const DEFAULT_PIN = CFG.coachPin || '1234';
const DEFAULT_LOGO = CFG.defaultLogo || 'assets/img/emerge-you-logo.png';
const DEFAULT_ICON = CFG.defaultIcon || 'assets/img/emerge-you-icon.png';
const ENROLL_FORM_URL = CFG.enrollFormUrl || 'https://form.jotform.com/241715534439156';const ENROLL_QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaQAAAGkCAIAAADxLsZiAAAGrUlEQVR42u3du83cQAxGUa+hAhy4/wod/B3IqeBoDND0R+qcAnb1vBgFxHzu+/4GsN13lwAQOwCxAxA7ALEDEDsAsQMQOwCxA8QOQOwAxA5A7ADEDkDsAMQOQOwAxA4QOwCxAxA7ALEDEDsAsQMQOwCxAxA7QOwAxA5A7ADEDkDsAMQOQOwAxA7gT1fnn/34+eO1F/rr19e4Y+68X1XXJ+0ZOzkv74WVHYDYAYgdgNgBYgcgdgBiByB2AGIHIHYAYgdw7Eo7IDOkPf91cp0774U5XO+FlR2A2AGIHYDYAWIHIHYAYgcgdgBiByB2AGIHcOCaeNBbZxJPzqtqH9LOGduq80p7xiYe88T3wsoOQOwAxA4QOwCxAxA7ALEDEDsAsQMQOwCxA3i4XIJZOmdaq46nan62StqeuVjZAYgdgNgBiB0gdgBiByB2AGIHIHYAYgcgdgDHzMYO07lvbNUMaecerJ175lbdL6zsAMQOQOwAxA4QOwCxAxA7ALEDEDsAsQMQO4BjI2dj3zxvuHWf1s5Z3a3M4VrZAYgdIHYAYgcgdgBiByB2AGIHIHYAYgeIHcALxM3Gds5sTtQ5Z+p3en7He2FlByB2AGIHIHaA2AGIHYDYAYgdgNgBiB2A2AEca52Nta9lznXunOs8MXEfW++FlR2A2AGIHYDYAYgdgNgBiB0gdgBiByB2AGIH0O5z33fbn3Xu15mmc//QtL1K3VPnbmUHIHYAYgcgdgBiB4gdgNgBiB2A2AGIHYDYARS53nzyafN9VTOSVfOzb57nTbunW/cC7jweKzvAZyyA2AGIHYDYAYgdgNgBiB2A2AFiByB2ACu07hubpnOOsnO2ceJ5pV3Dqudn4v2ysgMQOwCxAxA7ALEDEDsAsQMQO0DsAMQOQOwAgq2djd06b9g5jzlxL9e0e9Epbf46bQ7Xyg7wGQsgdgBiByB2AGIHIHYAYgcgdoDYAYgdwAojZ2PT5vImHs+JrXvdVpm4B2vns2FlByB2AGIHIHYAYgeInUsAiB2A2AGIHYDYAYgdwD/QOhtrhnTW76Sde6eJs7pV92vr+25lB/iMBRA7ALEDEDsAsQMQOwCxAxA7QOwAxA5ghbjZ2Cpb51WrZgm3zn52Pj+d13nr8VjZAYgdgNgBiB0gdgBiByB2AGIHIHYAYgcgdgB/6er8s617jE6cn50421jl5Bpu3eu2c8Y27fpY2QE+YwHEDkDsAMQOQOwAxA5A7ADEDhA7ALEDWCFu39i02b20/VW3zhe7zrOeZ/vGAogdgNgBiB2A2AGIHYDYAWIHIHYAYgcgdgD/ydrZ2DSdM4lp/zXxnqbN6laZuMexlR2A2AGIHSB2AGIHIHYAYgcgdgBiByB2AGIH8HBNPOiJc6ZVx/Pm+9V5DdNmSCc+P2nHY2UH+IwFEDsAsQMQOwCxAxA7ALEDEDtA7ADEDmCFa+uJdc5IVknbq3TrDPLWPWE7352J+wVb2QE+YwHEDkDsAMQOQOwAxA5A7ADEDhA7ALEDWOF688l37vvZOSeYNpP45rnXtHPvnFNOey+s7ACfsQBiByB2AGIHIHYAYgcgdgBiB4gdgNgBrPC579tVCJG2T2vajO3E+/XmfYernlUrOwCxAxA7QOwAxA5A7ADEDkDsAMQOQOwAxA7goXXf2Imze1VOZgCrZlon7oebNhec9l6kzSlPnJu2sgN8xgKIHYDYAYgdgNgBiB2A2AGIHSB2AGIHsMKVdkATZ+6qZi07Z1o770XaLGra/GznM995T9PeZSs7wGcsgNgBiB2A2AGIHYDYAYgdgNgBYgcgdgArXBMPeuvcYtW5T9xjtHO+uPOYJ+6VnDbrbWUHIHYAYgeIHYDYAYgdgNgBiB2A2AGIHYDYATxcLsEsVTObaXvCTtwveOJ5TZzVtbIDEDsAsQPEDkDsAMQOQOwAxA5A7ADEDkDsAB7Mxg6Ttr9q2nmd2DpfnCZtLtjKDvAZCyB2AGIHIHYAYgcgdgBiByB2gNgBiB3ACiNnY9+8x+jWfVo7Z1E778XJ73SeV9UxT5zntbIDfMYCiB2A2AGIHYDYAYgdgNgBiB0gdgBiB7BC3Gzs1j00J5572rxq2vXpnJ/tnIlOu+9WdgBiByB2gNgBiB2A2AGIHYDYAYgdgNgBiB3Aw+e+b1cBsLIDEDsAsQMQOwCxAxA7ALEDEDtA7ADEDkDsAMQOQOwAxA5A7ADEDkDsALEDEDsAsQMQOwCxAxA7ALEDEDsAsQPEDkDsAMQOQOwAxA5A7ADEDkDsAMQOeJ/fcPYtx5SSRfAAAAAASUVORK5CYII=';
const URGENCY = CFG.urgency || { now:{ label:'Need someone now', short:'Urgent' }, soon:{ label:'When a coach is free', short:'Routine' } };
const MAIL_MODES = CFG.mailModes || {};


/* ============================================================
   2. state
   ============================================================ */
let S = null;
let session = null;   // {pid,name,groupRef,date,ts,newPerson}

function defaultState(){
  return {
    version: 1,
    settings: {
      org: DEFAULT_ORG,
      kioskId: DEFAULT_KIOSK_ID,
      pin: DEFAULT_PIN,
      pinIsDefault: true,
      resetSeconds: 10,
      unattendedSeconds: 60,
      idleSeconds: 15,
      showFullNames: false,
      allowNew: true,
      logo: DEFAULT_LOGO, logoName: 'emerge-you-logo.png',
      logoSize: 'md', logoPlate: false, logoShowName: false,
      weekStart: sundayISO()
    },
    groups: DEFAULT_GROUPS.map(g=>({ref:g[0],full:g[1],desc:g[2],type:g[3]})),
    people: [],
    records: [],
    requests: [],
    coaches: defaultCoaches(),
    mail: { mode:'off', url:'', cc:'', lastTest:'' },
    rosterMeta: null
  };
}
function defaultCoaches(){
  return [
    { id:'c1', name:'Site Director', email:'director@example.org', role:'Site lead', notify:true, active:true, placeholder:true },
    { id:'c2', name:'Lead Group Coach', email:'coach@example.org', role:'On the floor', notify:true, active:true, placeholder:true },
    { id:'c3', name:'Case Manager', email:'casemanager@example.org', role:'Case management', notify:true, active:true, placeholder:true }
  ];
}
const coachesArePlaceholders = ()=> !S.coaches.some(c=>c.email && !c.placeholder);
const alertCoaches = ()=> S.coaches.filter(c=>c.active!==false && c.notify!==false && c.email);
function loadState(){
  let raw = null;
  try { raw = localStorage.getItem(LSKEY); } catch(e){ raw = null; }
  if(raw){
    try { S = JSON.parse(raw); } catch(e){ S = defaultState(); }
  } else { S = defaultState(); }
  if(!S.settings) S.settings = defaultState().settings;
  if(!Array.isArray(S.groups) || !S.groups.length) S.groups = defaultState().groups;
  if(!Array.isArray(S.people)) S.people = [];
  if(!Array.isArray(S.records)) S.records = [];
  if(!Array.isArray(S.requests)) S.requests = [];
  if(!Array.isArray(S.coaches) || !S.coaches.length) S.coaches = defaultCoaches();
  if(!S.mail) S.mail = { mode:'off', url:'', cc:'', lastTest:'' };
  if(!S.settings.unattendedSeconds) S.settings.unattendedSeconds = 60;
  if(S.settings.logo===undefined){
    S.settings.logo = DEFAULT_LOGO; S.settings.logoName = 'emerge-you-logo.png';
    S.settings.logoSize = 'md'; S.settings.logoPlate = false; S.settings.logoShowName = false;
  }
}
function save(){
  try { localStorage.setItem(LSKEY, JSON.stringify(S)); }
  catch(e){ toast('This browser is blocking local storage — nothing is being saved.','bad'); }
}
const findPerson = id => S.people.find(p=>p.id===id);
const personByName = n => S.people.find(p=>normKey(p.name)===normKey(n));
function shortFor(p, all){
  let s = shortName(p.name);
  const clash = (all||S.people).filter(o=>o.id!==p.id && shortName(o.name).toLowerCase()===s.toLowerCase());
  if(clash.length) s += ' ('+String.fromCharCode(65+Math.min(25,clash.findIndex(o=>o.id>p.id)<0?0:0))+')';
  return s;
}
function dupShortCount(p){
  const s = shortName(p.name).toLowerCase();
  return S.people.filter(o=>o.id!==p.id && shortName(o.name).toLowerCase()===s).length;
}
const groupByRef = ref => S.groups.find(g=>g.ref===ref);
const groupFull = ref => { const g=groupByRef(ref); return g? g.full : ref; };

function addRecord(o){
  const key = normKey(o.name)+'|'+o.groupRef+'|'+o.date;
  const existing = S.records.find(r=>normKey(r.name)+'|'+r.groupRef+'|'+r.date===key);
  if(existing){
    if(o.ts > (existing.ts||0)){ existing.ts=o.ts; existing.time=fmtTime12(o.ts); }
    return {rec:existing, repeat:true};
  }
  const rec = {
    id: uid(), pid:o.pid||null, name:o.name, groupRef:o.groupRef,
    groupFull: groupFull(o.groupRef), groupType: (groupByRef(o.groupRef)||{}).type||'',
    date:o.date, ts:o.ts||Date.now(), time: fmtTime12(o.ts||Date.now()),
    source:o.source||'kiosk', kioskId:S.settings.kioskId||'', onRoster:o.onRoster!==false
  };
  S.records.push(rec);
  return {rec:rec, repeat:false};
}
const recordsOn = date => S.records.filter(r=>r.date===date);
const weekRecordsFor = (name, weekStartISO)=> S.records.filter(r=>normKey(r.name)===normKey(name) && r.date>=weekStartISO && r.date<isoOf(addDays(parseISO(weekStartISO),7)));

/* weeks of a 3-week block */
function blockWeeks(startISO){
  const s = parseISO(startISO);
  return [0,1,2].map(i=>{
    const st = addDays(s, i*7);
    return { n:i+1, start:st, startISO:isoOf(st), days:[0,1,2,3,4,5,6].map(j=>addDays(st,j)) };
  });
}
const inBlock = (date, startISO, weeks=3)=>{
  const a=parseISO(startISO), b=addDays(a, weeks*7-1);
  const d=parseISO(date);
  return d>=a && d<=b;
};

/* ============================================================
   3. toast
   ============================================================ */
function toast(msg, kind){
  const t = document.createElement('div');
  t.className = 'toast'+(kind==='bad'?' bad':'');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(()=>{ t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(()=>t.remove(),320); }, 3600);
}

/* ============================================================
   4. spreadsheet engine — written from scratch so the file
      needs no CDN and works offline on the kiosk tablet
   ============================================================ */
const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
+'<numFmts count="1"><numFmt numFmtId="164" formatCode="mm/dd/yyyy"/></numFmts>'
+'<fonts count="5">'
+'<font><sz val="11"/><color rgb="FF1A1A1A"/><name val="Calibri"/></font>'
+'<font><b/><sz val="11"/><color rgb="FF101310"/><name val="Calibri"/></font>'
+'<font><b/><sz val="14"/><color rgb="FF101310"/><name val="Calibri"/></font>'
+'<font><i/><sz val="10"/><color rgb="FF6E6A5A"/><name val="Calibri"/></font>'
+'<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
+'</fonts>'
+'<fills count="5">'
+'<fill><patternFill patternType="none"/></fill>'
+'<fill><patternFill patternType="gray125"/></fill>'
+'<fill><patternFill patternType="solid"><fgColor rgb="FFE8DFCC"/><bgColor indexed="64"/></patternFill></fill>'
+'<fill><patternFill patternType="solid"><fgColor rgb="FF101310"/><bgColor indexed="64"/></patternFill></fill>'
+'<fill><patternFill patternType="solid"><fgColor rgb="FFE3F3E8"/><bgColor indexed="64"/></patternFill></fill>'
+'</fills>'
+'<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
+'<border><left style="thin"><color rgb="FFB9AF97"/></left><right style="thin"><color rgb="FFB9AF97"/></right>'
+'<top style="thin"><color rgb="FFB9AF97"/></top><bottom style="thin"><color rgb="FFB9AF97"/></bottom><diagonal/></border></borders>'
+'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
+'<cellXfs count="10">'
+'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
+'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
+'<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
+'<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>'
+'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'
+'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>'
+'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
+'<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
+'<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
+'<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>'
+'</cellXfs>'
+'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
+'</styleSheet>';

function colName(n){ let s=''; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=(n-m-1)/26; } return s; }
function excelSerial(dateISO){
  const d = parseISO(dateISO);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())/86400000 + 25569;
}
function b64ToBytes(b64){
  const bin = atob(String(b64).replace(/\s+/g,''));
  const u = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i);
  return u;
}
const EMU_PER_PX = 9525;
function fitLogo(logo, maxW, maxH){
  const w = Number(logo.w)||300, h = Number(logo.h)||80;
  const sc = Math.min(1, maxW/w, maxH/h);
  return { w: Math.max(1, Math.round(w*sc)), h: Math.max(1, Math.round(h*sc)) };
}
function drawingXml(n, col, row, cx, cy, name){
  const P = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return P
  +'<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" '
  +'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
  +'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
  +'<xdr:oneCellAnchor>'
  +'<xdr:from><xdr:col>'+col+'</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>'+row+'</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
  +'<xdr:ext cx="'+cx+'" cy="'+cy+'"/>'
  +'<xdr:pic>'
  +'<xdr:nvPicPr><xdr:cNvPr id="'+(n+1)+'" name="'+escXml(name||'Program logo')+'" descr="'+escXml(name||'Program logo')+'"/>'
  +'<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'
  +'<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
  +'<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm>'
  +'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>'
  +'</xdr:pic>'
  +'<xdr:clientData/>'
  +'</xdr:oneCellAnchor>'
  +'</xdr:wsDr>';
}
function sheetXml(rows, opt){
  opt = opt || {};
  const o = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    +'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'];
  let maxC = 1;
  rows.forEach(r=>{ if(r && r.length>maxC) maxC=r.length; });
  o.push('<dimension ref="A1:'+colName(maxC)+Math.max(1,rows.length)+'"/>');
  o.push('<sheetViews><sheetView workbookViewId="0">'+(opt.freeze
    ? '<pane ySplit="'+opt.freeze+'" topLeftCell="A'+(opt.freeze+1)+'" activePane="bottomLeft" state="frozen"/>'
    : '')+'</sheetView></sheetViews>');
  o.push('<sheetFormatPr defaultRowHeight="15"/>');
  if(opt.cols && opt.cols.length){
    o.push('<cols>');
    opt.cols.forEach((w,i)=>{ o.push('<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>'); });
    o.push('</cols>');
  }
  o.push('<sheetData>');
  rows.forEach((row,ri)=>{
    const rn = ri+1;
    const rh = opt.rowHeights && opt.rowHeights[rn];
    if((!row || !row.length) && !rh) return;
    const cells = [];
    row.forEach((cv,ci)=>{
      if(cv===null || cv===undefined || cv==='') return;
      const ref = colName(ci+1)+rn;
      const cellObj = (typeof cv==='object' && cv!==null && !(cv instanceof Date)) ? cv : {v:cv};
      let t = cellObj.t, v = cellObj.v;
      let s = (cellObj.s===undefined) ? 0 : cellObj.s;
      if(t===undefined){
        if(typeof v==='number') t='n';
        else if(v instanceof Date){ t='d'; }
        else t='s';
      }
      if(t==='d'){ v = excelSerial(v); t='n'; if(cellObj.s===undefined) s=3; }
      const attrs = ' r="'+ref+'"'+(s?' s="'+s+'"':'');
      if(t==='f'){
        cells.push('<c'+attrs+'><f>'+escXml(cellObj.f)+'</f>'
          +((cellObj.v===undefined||cellObj.v===null)?'':'<v>'+Number(cellObj.v)+'</v>')+'</c>');
        return;
      }
      if(t==='n'){ cells.push('<c'+attrs+'><v>'+Number(v||0)+'</v></c>'); return; }
      cells.push('<c'+attrs+' t="inlineStr"><is><t xml:space="preserve">'+escXml(v)+'</t></is></c>');
    });
    if(cells.length || rh) o.push('<row r="'+rn+'"'+(rh? ' ht="'+rh+'" customHeight="1"':'')+'>'+cells.join('')+'</row>');
  });
  o.push('</sheetData>');
  if(opt.merges && opt.merges.length){
    o.push('<mergeCells count="'+opt.merges.length+'">'
      +opt.merges.map(m=>'<mergeCell ref="'+m+'"/>').join('')+'</mergeCells>');
  }
  if(opt.widthsNote) o.push('<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>');
  if(opt.drawingRid) o.push('<drawing r:id="'+opt.drawingRid+'"/>');
  o.push('</worksheet>');
  return o.join('');
}
function crc32(buf){
  let crc = 0xFFFFFFFF;
  for(let i=0;i<buf.length;i++){
    crc ^= buf[i];
    for(let k=0;k<8;k++) crc = (crc>>>1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (crc ^ 0xFFFFFFFF)>>>0;
}
function zipStore(files){
  const parts = [], central = [];
  let offset = 0;
  files.forEach(f=>{
    const data = (typeof f.data==='string') ? new TextEncoder().encode(f.data) : f.data;
    const nameBytes = new TextEncoder().encode(f.name);
    const crc = crc32(data);
    const lh = new Uint8Array(30+nameBytes.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0,0x04034b50,true); dv.setUint16(4,20,true); dv.setUint16(6,0x0800,true);
    dv.setUint16(8,0,true); dv.setUint16(10,0,true); dv.setUint16(12,0x21,true);
    dv.setUint32(14,crc,true); dv.setUint32(18,data.length,true); dv.setUint32(22,data.length,true);
    dv.setUint16(26,nameBytes.length,true); dv.setUint16(28,0,true);
    lh.set(nameBytes,30);
    parts.push(lh, data);
    const cd = new Uint8Array(46+nameBytes.length);
    const d2 = new DataView(cd.buffer);
    d2.setUint32(0,0x02014b50,true); d2.setUint16(4,20,true); d2.setUint16(6,20,true);
    d2.setUint16(8,0x0800,true); d2.setUint16(10,0,true); d2.setUint16(12,0,true); d2.setUint16(14,0x21,true);
    d2.setUint32(16,crc,true); d2.setUint32(20,data.length,true); d2.setUint32(24,data.length,true);
    d2.setUint16(28,nameBytes.length,true); d2.setUint16(30,0,true); d2.setUint16(32,0,true);
    d2.setUint16(34,0,true); d2.setUint16(36,0,true); d2.setUint32(38,0,true); d2.setUint32(42,offset,true);
    cd.set(nameBytes,46);
    central.push(cd);
    offset += lh.length + data.length;
  });
  const cdSize = central.reduce((a,b)=>a+b.length,0);
  const eocd = new Uint8Array(22);
  const d3 = new DataView(eocd.buffer);
  d3.setUint32(0,0x06054b50,true); d3.setUint16(4,0,true); d3.setUint16(6,0,true);
  d3.setUint16(8,files.length,true); d3.setUint16(10,files.length,true);
  d3.setUint32(12,cdSize,true); d3.setUint32(16,offset,true); d3.setUint16(20,0,true);
  const all = parts.concat(central); all.push(eocd);
  const total = all.reduce((a,b)=>a+b.length,0);
  const out = new Uint8Array(total);
  let p = 0; all.forEach(b=>{ out.set(b,p); p += b.length; });
  return out;
}
function safeSheetName(name, i){
  let s = String(name||('Sheet'+(i+1))).replace(/[\[\]\*\/\\\?:]/g,' ').trim().slice(0,31);
  return s || ('Sheet'+(i+1));
}
function buildXlsx(sheets){
  const P = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files = [];
  const logoSheets = [];
  sheets.forEach((s,i)=>{
    const o = s.opts || {};
    if(o.logo && o.logo.b64) logoSheets.push({ sheetIndex:i, logo:o.logo,
      col:(o.logoCol===undefined ? 9 : o.logoCol), row:(o.logoRow===undefined ? 0 : o.logoRow),
      maxW:(o.logoMaxW||220), maxH:(o.logoMaxH||52) });
  });
  let ct = P+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    +'<Default Extension="xml" ContentType="application/xml"/>'
    +'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    +'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
  if(logoSheets.length) ct += '<Default Extension="png" ContentType="image/png"/>';
  sheets.forEach((s,i)=>{ ct += '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; });
  logoSheets.forEach((ls,k)=>{ ct += '<Override PartName="/xl/drawings/drawing'+(k+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'; });
  ct += '</Types>';
  files.push({name:'[Content_Types].xml', data:ct});
  files.push({name:'_rels/.rels', data:P+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'});
  let wb = P+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    +'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
  let rels = P+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  const used = {};
  sheets.forEach((s,i)=>{
    let nm = safeSheetName(s.name,i);
    while(used[nm.toLowerCase()]) nm = nm.slice(0,28)+' '+(i+1);
    used[nm.toLowerCase()] = 1;
    wb += '<sheet name="'+escXml(nm)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>';
    rels += '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>';
  });
  wb += '</sheets><calcPr calcId="171027" fullCalcOnLoad="1"/></workbook>';
  rels += '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  files.push({name:'xl/workbook.xml', data:wb});
  files.push({name:'xl/_rels/workbook.xml.rels', data:rels});
  files.push({name:'xl/styles.xml', data:STYLES_XML});
  sheets.forEach((s,i)=>{
    const k = logoSheets.findIndex(ls=>ls.sheetIndex===i);
    const opts = Object.assign({}, s.opts||{});
    if(k>=0) opts.drawingRid = 'rId1';
    files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml', data:sheetXml(s.rows, opts)});
    if(k>=0){
      files.push({name:'xl/worksheets/_rels/sheet'+(i+1)+'.xml.rels',
        data:P+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing'+(k+1)+'.xml"/>'
        +'</Relationships>'});
    }
  });
  logoSheets.forEach((ls,k)=>{
    const n = k+1;
    const fit = fitLogo(ls.logo, ls.maxW, ls.maxH);
    const cx = Math.round(fit.w*EMU_PER_PX), cy = Math.round(fit.h*EMU_PER_PX);
    files.push({name:'xl/drawings/drawing'+n+'.xml',
      data:drawingXml(n, ls.col, ls.row, cx, cy, (S.settings.org||'Program')+' logo')});
    files.push({name:'xl/drawings/_rels/drawing'+n+'.xml.rels',
      data:P+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image'+n+'.png"/>'
      +'</Relationships>'});
    files.push({name:'xl/media/image'+n+'.png', data:b64ToBytes(ls.logo.b64)});
  });
  return zipStore(files);
}
function downloadBlob(data, filename, mime){
  const blob = (data instanceof Uint8Array) ? new Blob([data],{type:mime||'application/octet-stream'}) : new Blob([data],{type:mime||'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 2000);
}

/* ---- reading a workbook the coach uploads ---- */
async function inflateRawBytes(bytes){
  if(typeof DecompressionStream === 'undefined')
    throw new Error('This browser cannot read compressed .xlsx files — save the list as CSV instead.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function readZip(u8){
  let eocd = -1;
  const min = Math.max(0, u8.length-66000);
  for(let i=u8.length-22;i>=min;i--){
    if(u8[i]===0x50 && u8[i+1]===0x4b && u8[i+2]===0x05 && u8[i+3]===0x06){ eocd=i; break; }
  }
  if(eocd<0) throw new Error('That file is not an .xlsx workbook.');
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const count = dv.getUint16(eocd+10,true), cdOff = dv.getUint32(eocd+16,true);
  const out = {};
  const dec = new TextDecoder();
  let p = cdOff;
  for(let i=0;i<count;i++){
    if(dv.getUint32(p,true) !== 0x02014b50) break;
    const method = dv.getUint16(p+10,true);
    const csize = dv.getUint32(p+20,true);
    const nlen = dv.getUint16(p+28,true), elen = dv.getUint16(p+30,true), clen = dv.getUint16(p+32,true);
    const lho = dv.getUint32(p+42,true);
    const name = dec.decode(u8.subarray(p+46,p+46+nlen));
    const lnlen = dv.getUint16(lho+26,true), lelen = dv.getUint16(lho+28,true);
    const start = lho+30+lnlen+lelen;
    const raw = u8.subarray(start, start+csize);
    if(/\/(sharedStrings|workbook|worksheets\/[^\/]+)\.xml$/.test(name) || /^xl\/.+\.[a-z]+$/.test(name)){
      out[name] = (method===0) ? raw : await inflateRawBytes(raw);
    }
    p += 46+nlen+elen+clen;
  }
  return out;
}
const colIndexOf = letters => { let n=0; for(const ch of letters) n = n*26 + (ch.charCodeAt(0)-64); return n-1; };
function xmlText(node){ return node ? node.textContent : ''; }
function parseSheetXml(xmlStr, shared){
  const doc = new DOMParser().parseFromString(xmlStr,'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error('That sheet could not be read.');
  const rows = [];
  const rowEls = doc.getElementsByTagName('row');
  for(let i=0;i<rowEls.length;i++){
    const r = rowEls[i];
    const rIdx = parseInt(r.getAttribute('r')||String(rows.length+1),10)-1;
    const arr = rows[rIdx] || (rows[rIdx]=[]);
    const cs = r.getElementsByTagName('c');
    for(let j=0;j<cs.length;j++){
      const c = cs[j];
      const ref = c.getAttribute('r')||'';
      const ci = ref ? colIndexOf(ref.replace(/[0-9]/g,'')) : arr.length;
      const t = c.getAttribute('t');
      let v = '';
      if(t==='inlineStr'){ v = xmlText(c.getElementsByTagName('is')[0]); }
      else {
        v = xmlText(c.getElementsByTagName('v')[0]);
        if(t==='s'){ v = shared[parseInt(v,10)] || ''; }
      }
      arr[ci] = String(v).replace(/\s+/g,' ').trim();
    }
  }
  return rows.map(r=> r ? r.map(x=> x===undefined?'':x) : []);
}
async function readXlsxFile(file){
  const u8 = new Uint8Array(await file.arrayBuffer());
  const zip = await readZip(u8);
  const dec = new TextDecoder();
  let shared = [];
  if(zip['xl/sharedStrings.xml']){
    const doc = new DOMParser().parseFromString(dec.decode(zip['xl/sharedStrings.xml']),'application/xml');
    const sis = doc.getElementsByTagName('si');
    for(let i=0;i<sis.length;i++) shared.push(sis[i].textContent.replace(/\s+/g,' ').trim());
  }
  let sheetPath = null;
  const names = Object.keys(zip).filter(n=>/^xl\/worksheets\/.*\.xml$/.test(n)).sort();
  if(zip['xl/workbook.xml'] && names.length){
    const wdoc = new DOMParser().parseFromString(dec.decode(zip['xl/workbook.xml']),'application/xml');
    const sheetEls = wdoc.getElementsByTagName('sheet');
    if(zip['xl/_rels/workbook.xml.rels']){
      const rdoc = new DOMParser().parseFromString(dec.decode(zip['xl/_rels/workbook.xml.rels']),'application/xml');
      const rels = {};
      const rs = rdoc.getElementsByTagName('Relationship');
      for(let i=0;i<rs.length;i++) rels[rs[i].getAttribute('Id')] = rs[i].getAttribute('Target');
      for(let i=0;i<sheetEls.length;i++){
        const rid = sheetEls[i].getAttribute('r:id') || sheetEls[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
        const tgt = rels[rid];
        if(tgt){
          const p = 'xl/'+String(tgt).replace(/^\/?xl\//,'').replace(/^\//,'');
          if(zip[p]){ sheetPath = p; break; }
        }
      }
    }
  }
  const grid = parseSheetXml(dec.decode(zip[sheetPath||names[0]]), shared);
  return {grid:grid, sheetCount:names.length};
}
function parseTable(text){
  const rows = []; let row = [], cur = '', q = false;
  for(let i=0;i<text.length;i++){
    const ch = text[i];
    if(q){
      if(ch==='"'){ if(text[i+1]==='"'){ cur+='"'; i++; } else q=false; }
      else cur += ch;
    } else if(ch==='"'){ q = true; }
    else if(ch===',' || ch==='\t'){ row.push(cur); cur=''; }
    else if(ch==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
    else if(ch!=='\r'){ cur += ch; }
  }
  row.push(cur); rows.push(row);
  return rows.map(r=>r.map(s=>String(s).trim())).filter(r=>r.some(c=>c!==''));
}
function cleanName(v){
  let s = String(v||'').replace(/\s+/g,' ').trim();
  s = s.replace(/^\d+[\s\.\-_)]*/,'').replace(/^["'\-–—•\*]+/,'').trim();
  if(!s) return '';
  if(s.length>60) return '';
  if(/^(name|full name|participant|participant\(s\) name|first name|last name|youth|student|member|group ref|group label|total|date)$/i.test(s)) return '';
  if(/@|\d{3}[\-\.\s]?\d{3}/.test(s)) return '';
  if(!/[A-Za-z]{2}/.test(s)) return '';
  if(/\d{3,}/.test(s)) return '';
  return titleCase(s);
}
function extractUpload(rows){
  const res = { names:[], groups:[], note:'' };
  if(!rows || !rows.length) return res;
  let headerRow = -1, nameCol = -1, firstCol = -1, lastCol = -1;
  let gLabel = -1, gFull = -1, gDesc = -1, gType = -1;
  const head = (r)=> (rows[r]||[]).map(x=>String(x||'').trim().toLowerCase());
  for(let r=0; r<Math.min(rows.length,8); r++){
    const row = head(r);
    const gl = row.findIndex(c=>/^group\s*(label|ref|code)$/.test(c));
    if(gl>=0){
      headerRow = r; gLabel = gl;
      row.forEach((c,i)=>{
        if(/^(group\s*-?\s*full\s*name|full name)$/.test(c)) gFull=i;
        else if(/^(group\s*description|description)$/.test(c)) gDesc=i;
        else if(/^(group\s*type|type)$/.test(c)) gType=i;
      });
      break;
    }
    const nm = row.findIndex(c=>/^(participant\(s\) name|participant name|participant|full name|youth name|student name|member name|name)$/.test(c));
    if(nm>=0){
      headerRow = r; nameCol = nm;
      firstCol = row.findIndex(c=>/^first name$/.test(c));
      lastCol = row.findIndex(c=>/^last name$/.test(c));
      if(firstCol>=0 && lastCol>=0) nameCol = firstCol;
      break;
    }
  }
  const body = rows.slice(headerRow+1);
  if(gLabel>=0){
    body.forEach(r=>{
      const ref = cleanName(r[gLabel]);
      if(!ref) return;
      res.groups.push({ ref: ref.toUpperCase(), full: (gFull>=0? String(r[gFull]||'').trim():'') || ref,
        desc: gDesc>=0? String(r[gDesc]||'').trim():'', type: (gType>=0? String(r[gType]||'').trim().toUpperCase().slice(0,6):'YG') });
    });
  }
  const pushName = v => { const n = cleanName(v); if(!n) return; if(!res.names.some(x=>normKey(x)===normKey(n))) res.names.push(n); };
  if(nameCol>=0){
    body.forEach(r=>{
      if(firstCol>=0 && lastCol>=0){
        if(!r[firstCol] && !r[lastCol]) return;
        pushName((r[firstCol]||'')+' '+(r[lastCol]||''));
      } else pushName(r[nameCol]);
    });
    res.note = 'Used the "'+(headerRow>=0 ? (rows[headerRow][nameCol]||'name') : 'name')+'" column.';
  } else if(gLabel<0){
    let bestCol = 0, bestScore = -1;
    const width = Math.max.apply(null, body.map(r=>r.length).concat([0]));
    for(let c=0;c<width;c++){
      let score = 0;
      body.forEach(r=>{
        const v = String(r[c]||'').trim();
        if(v && cleanName(v)) score++;
      });
      if(score>bestScore){ bestScore=score; bestCol=c; }
    }
    body.forEach(r=>pushName(r[bestCol]));
    res.note = bestScore>0 ? 'No header row found — used the fullest column of names.' : '';
  }
  if(res.groups.length && !res.names.length) res.note = 'Read '+res.groups.length+' group definitions.';
  return res;
}
function csvCell(v){
  const s = String(v===undefined||v===null?'':v);
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function makeCsv(rows){ return '\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'); }

/* ============================================================
   5. the kiosk
   ============================================================ */
const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let step = 'name', matches = [], selIdx = -1, idleTimer = null, cdRaf = null, typeFilter = 'ALL', pins = '';
let reqDraft = { reasons:[], urgency:'soon', note:'', coachId:'' };
const freshDraft = ()=>({ reasons:[], urgency:'soon', note:'', coachId:'' });

const STEP_IDS = {
  name:'#stepName', group:'#stepGroup', coachask:'#stepCoachAsk',
  enroll:'#stepEnroll', phone:'#stepPhone', qr:'#stepQr', card:'#stepCard'
};
function setStep(s){
  step = s;
  Object.keys(STEP_IDS).forEach(k=>{
    const el = $(STEP_IDS[k]);
    if(el) el.classList.toggle('hidden', s!==k);
  });
  armIdleReset();
}
function clockTick(){
  const d = new Date();
  $('#clockTime').textContent = d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  $('#clockDate').textContent = fmtDateLong(todayISO()).toUpperCase();
}
function applyKioskSettings(){
  const st = S.settings;
  $('#orgNameOut').textContent = st.org || 'Youth Program';
  $('#railOrg').textContent = st.org || 'Youth Program';
  $('#kioskId').textContent = (st.kioskId||'KIOSK').toUpperCase();
  $('#kioskFoot').textContent = (st.org||'')+' · sign-in records stay on this device until a coach exports them';
  applyLogo();
}
function matchPeople(q){
  const k = normKey(q);
  if(k.length<2) return [];
  const list = S.people.filter(p=>p.active!==false && normKey(p.name).indexOf(k)>=0);
  list.sort((a,b)=>{
    const as = normKey(a.name).indexOf(k)===0 ? 0 : 1;
    const bs = normKey(b.name).indexOf(k)===0 ? 0 : 1;
    if(as!==bs) return as-bs;
    return a.name.localeCompare(b.name);
  });
  return list.slice(0,8);
}
function renderSug(){
  const q = $('#nameInput').value;
  const box = $('#sugList');
  box.innerHTML = '';
  selIdx = -1;
  const k = normKey(q);
  const status = $('#nameStatus');
  if(k.length<2){
    matches = [];
    $('#newNote').classList.add('hidden');
    status.textContent = q.length ? 'Keep typing — at least two letters to see matches.' : '';
    return;
  }
  matches = matchPeople(q);
  matches.forEach((p,i)=>{
    const dup = dupShortCount(p);
    const label = S.settings.showFullNames ? p.name : shortName(p.name);
    const b = document.createElement('button');
    b.type='button'; b.className='sug'; b.id='sug'+i;
    b.setAttribute('role','option');
    b.innerHTML = '<span>'+escHtml(label)+'</span>'+(dup?'<span class="tagnew">'+(dup+1)+' match</span>':'');
    b.addEventListener('click',()=>choosePerson(p));
    box.appendChild(b);
  });
  status.textContent = matches.length
    ? matches.length+' name'+(matches.length>1?'s':'')+' found. Use the arrow keys, then Enter.'
    : 'No name matched.';
  const canAdd = S.settings.allowNew && k.length>=3 && !matches.length;
  $('#newNote').classList.toggle('hidden', !canAdd);
}
function highlightSug(){
  $$('.sug').forEach((el,i)=>{ el.setAttribute('aria-selected', i===selIdx ? 'true':'false'); });
  const cur = $('#sug'+selIdx);
  if(cur) $('#nameInput').setAttribute('aria-activedescendant', cur.id);
  else $('#nameInput').removeAttribute('aria-activedescendant');
}
function resetIdleTimer(){
  clearTimeout(idleTimer);
  if(step!=='name') return;
  idleTimer = setTimeout(()=>{
    if(step==='name' && $('#nameInput').value){
      $('#nameInput').value = '';
      renderSug();
      $('#nameHint').textContent = 'Cleared for privacy — start typing again';
      setTimeout(()=>{ $('#nameHint').textContent = 'Keyboard: ↑ ↓ to choose · Enter to continue'; }, 4000);
    }
  }, Math.max(5, Number(S.settings.idleSeconds)||15)*1000);
}
function choosePerson(p){
  session = { pid:p.id, name:p.name, onRoster:true };
  showGroups();
}
function addNewPerson(){
  const typed = titleCase($('#nameInput').value);
  if(normKey(typed).length<3) return;
  const existing = personByName(typed);
  const p = existing || { id:uid(), name:typed, active:true, onRoster:false, added:Date.now(), addedBy:'kiosk' };
  if(!existing){ S.people.push(p); save(); }
  session = { pid:p.id, name:p.name, onRoster:!!existing };
  if(existing){ toast('Found you on the roster.'); showGroups(); return; }
  toast('Added '+p.name+' — a coach will confirm your name later.');
  goEnroll();
}
function showGroups(){
  $('#greetName').textContent = 'Hi, '+(session.name.split(/\s+/)[0])+'.';
  renderAskState();
  renderGroupPicker();
  setStep('group');
  $('#nameInput').value = '';
  renderSug();
}
function renderAskState(){
  const on = !!(session && session.requestedAt);
  $('#askOn').classList.toggle('hidden', !on);
  if(on){
    $('#askOnText').textContent = 'Coach requested at '+fmtTime12(session.requestedAt)
      + (session.requestUrgency==='now' ? ' — marked urgent' : '');
  }
  $('#successCoach').classList.toggle('hidden', !on);
  if(on) $('#successCoachText').textContent = 'A coach was told you want to see them at '+fmtTime12(session.requestedAt)+'.';
}
function renderGroupPicker(){
  const types = ['ALL'].concat(Array.from(new Set(S.groups.map(g=>g.type||'OT'))));
  const tabs = $('#typeTabs');
  tabs.innerHTML = '';
  types.forEach(t=>{
    const b = document.createElement('button');
    b.type='button'; b.className='tab';
    b.setAttribute('aria-pressed', typeFilter===t ? 'true':'false');
    b.textContent = t==='ALL' ? 'All groups' : (TYPE_LABELS[t]||t);
    b.addEventListener('click',()=>{ typeFilter=t; renderGroupPicker(); });
    tabs.appendChild(b);
  });
  const grid = $('#groupGrid');
  grid.innerHTML = '';
  S.groups.filter(g=> typeFilter==='ALL' || (g.type||'OT')===typeFilter).forEach(g=>{
    const b = document.createElement('button');
    b.type='button'; b.className='grp';
    b.innerHTML = '<span><span class="gl">'+escHtml(g.ref)+'</span>'
      +'<span class="gf">'+escHtml(g.full)+'</span></span>'
      +'<span class="gtype">'+escHtml(g.type||'')+'</span>';
    b.addEventListener('click',()=>pickGroup(g));
    grid.appendChild(b);
  });
}
function pickGroup(g){
  session.groupRef = g.ref;
  session.groupName = g.full;
  goCoachAsk();
}
function showCard(){
  renderCard();
  setStep('card');
  const card = $('#punchCard');
  card.classList.remove('entering'); void card.offsetWidth; card.classList.add('entering');
}
/* step 3 — the coach question, asked after a group is picked */
function goCoachAsk(){
  const g = groupByRef(session.groupRef) || { ref:session.groupRef, full:session.groupName||'' };
  $('#askGroupLine').textContent = 'You picked '+(g.ref||'a group')+(g.full ? ' — '+g.full : '')+'.';
  renderAskState();
  setStep('coachask');
}
/* new participant path */
function goEnroll(){
  $('#enrollHello').textContent = 'Hi, '+(session.name.split(/\s+/)[0])+' — you\'re new here.';
  setStep('enroll');
}
function enrollYes(){ setStep('phone'); }
function enrollNo(){ openReq({ ctx:'enroll', backStep:'enroll', punch:false }); }
function phoneYes(){ setStep('qr'); }
function phoneNo(){
  openReq({ ctx:'phone', backStep:'phone', punch:false,
    prefillReasons:['Case management'],
    prefillNote:'Interested in enrolling but has no working phone — needs help completing the form.' });
}
function qrDone(){ showGroups(); }
function renderCardHoles(animateToday){
  const ws = sundayISO();
  const days = [0,1,2,3,4,5,6].map(j=>isoOf(addDays(parseISO(ws),j)));
  const mine = new Set(S.records.filter(r=>normKey(r.name)===normKey(session.name) && r.date>=ws && r.date<=isoOf(addDays(parseISO(ws),6))).map(r=>r.date));
  const box = $('#cardHoles');
  box.innerHTML = '';
  days.forEach(d=>{
    const h = document.createElement('span');
    h.className = 'hole'+(mine.has(d)?' on':'');
    h.title = DOW[parseISO(d).getDay()]+' '+fmtDateShort(parseISO(d));
    if(animateToday && d===todayISO()){ h.style.transition='background .3s .35s, box-shadow .3s .35s'; }
    box.appendChild(h);
  });
  $('#cardHolesLbl').textContent = 'Week of '+fmtDateShort(parseISO(ws));
}
function renderCard(){
  const g = groupByRef(session.groupRef) || {ref:session.groupRef, full:session.groupName||session.groupRef};
  const today = todayISO();
  $('#cardName').textContent = session.name.toUpperCase();
  $('#cardGroup').textContent = g.ref+' — '+g.full;
  $('#cardDate').textContent = fmtDateLong(today);
  $('#cardTime').textContent = fmtTime12(Date.now());
  $('#cardNo').textContent = 'NO. '+String(recordsOn(today).length+1).padStart(6,'0');
  $('#punchHint').textContent = 'Punch in to record it';
  $('#successPanel').classList.remove('on');
  $('#punchCard').classList.remove('stamped');
  $('#punchBtn').classList.remove('hidden');
  $('#cardBack').classList.remove('hidden');
  $('#cardEyebrow').textContent = 'Confirm your sign-in';
  if(!session.groupName && !g.full) $('#cardGroup').textContent = g.ref;
  renderCardHoles(false);
}
function punchIn(){
  const ts = Date.now();
  const res = addRecord({
    pid:session.pid, name:session.name, groupRef:session.groupRef,
    date:todayISO(), ts:ts, source:'kiosk', onRoster:session.onRoster
  });
  save();
  const card = $('#punchCard');
  card.classList.remove('stamped'); void card.offsetWidth; card.classList.add('stamped');
  renderCardHoles(true);
  $('#cardEyebrow').textContent = 'You are checked in';
  $('#punchHint').textContent = 'Recorded — thank you';
  $('#punchBtn').classList.add('hidden');
  $('#cardBack').classList.add('hidden');
  $('#successPanel').classList.add('on');
  const g = groupByRef(session.groupRef) || {full:session.groupName||session.groupRef};
  const sameDay = recordsOn(todayISO()).filter(r=>normKey(r.name)===normKey(session.name));
  $('#successLine').textContent = res.repeat
    ? 'You were already on today’s list for '+g.ref+' — I kept your time at '+fmtTime12(ts)+'.'
    : 'You’re on the list for '+g.ref+'. A coach can see it — nobody else at this screen can.';
  $('#successRepeat').textContent = sameDay.length>1
    ? 'Signed in for '+sameDay.length+' groups today. If you’re joining another one, add it when the screen resets.'
    : 'Need another group today? The screen resets in a moment — sign in again for it.';
  startCountdown();
  updateCounts();
  if(!$('#view-records').classList.contains('hidden')) renderRecords();
}
/* ---- unattended reset: any screen that waits on a youth resets itself ---- */
const IDLE_STEPS = ['group','coachask','enroll','phone','qr'];
let idleResetTimer = null, idleTick = null, idleDeadline = 0;
function idleSeconds(){ return Math.min(600, Math.max(15, Number(S.settings.unattendedSeconds)||60)); }
function idleArmed(){ return IDLE_STEPS.indexOf(step) >= 0; }
function armIdleReset(){
  clearTimeout(idleResetTimer); clearInterval(idleTick);
  const note = $('#idleNote');
  if(!idleArmed()){ if(note) note.classList.add('hidden'); return; }
  const secs = idleSeconds();
  idleDeadline = Date.now() + secs*1000;
  idleResetTimer = setTimeout(()=>{
    if(!idleArmed()) return;
    resetKiosk();
  }, secs*1000);
  if(note) note.classList.remove('hidden');
  const tick = ()=>{
    if(!idleArmed()){ clearInterval(idleTick); return; }
    const left = Math.max(0, Math.ceil((idleDeadline-Date.now())/1000));
    if(note) note.textContent = 'Unattended screen returns to the start in '+left+'s';
  };
  tick();
  idleTick = setInterval(tick, 500);
}

const cdTimers = {};
function runCountdown(key, seconds, labelEl, barEl, onDone){
  cancelAnimationFrame(cdTimers[key]);
  const total = Math.max(3, Number(seconds)||10)*1000, t0 = Date.now();
  const loop = ()=>{
    const left = Math.max(0, total-(Date.now()-t0));
    if(labelEl) labelEl.textContent = 'Returning to start in '+Math.ceil(left/1000)+'s';
    if(barEl) barEl.style.transform = 'scaleX('+(left/total)+')';
    if(left<=0){ cdTimers[key] = null; onDone(); return; }
    cdTimers[key] = requestAnimationFrame(loop);
  };
  cdTimers[key] = requestAnimationFrame(loop);
}
function startCountdown(){
  runCountdown('card', S.settings.resetSeconds, $('#cdLabel'), $('#cdBar'), resetKiosk);
}
function resetKiosk(){
  cancelAnimationFrame(cdTimers.card);
  cancelAnimationFrame(cdTimers.req);
  clearTimeout(idleResetTimer);
  clearInterval(idleTick);
  clearTimeout(idleTimer);
  closeReq();
  reqDraft = freshDraft();
  reqCtx = { ctx:'ask', backStep:'coachask', punch:true };
  $('#successCoach').classList.add('hidden');
  $('#askOn').classList.add('hidden');
  session = null;
  $('#nameInput').value = '';
  $('#newNote').classList.add('hidden');
  renderSug();
  setStep('name');
  $('#successPanel').classList.remove('on');
  $('#punchCard').classList.remove('stamped');
  $('#punchBtn').classList.remove('hidden');
  $('#cardBack').classList.remove('hidden');
  setMode('kiosk');
  applyKioskSettings();
  setTimeout(()=>{ try{ $('#nameInput').focus(); }catch(e){} }, 60);
}
function setMode(m){
  document.body.dataset.mode = m;
  if(m==='kiosk'){ $('#coach').classList.add('hidden'); $('#kiosk').classList.remove('hidden'); }
  else { $('#kiosk').classList.add('hidden'); $('#coach').classList.remove('hidden'); }
}

/* ---- coach request (kiosk) ---- */
function renderReasonChips(){
  const box = $('#reasonChips');
  box.innerHTML = '';
  REASONS.forEach(r=>{
    const b = document.createElement('button');
    b.type='button'; b.className='chip'; b.textContent = r;
    b.setAttribute('aria-pressed', reqDraft.reasons.indexOf(r)>=0 ? 'true':'false');
    b.addEventListener('click',()=>{
      const i = reqDraft.reasons.indexOf(r);
      if(i>=0) reqDraft.reasons.splice(i,1); else reqDraft.reasons.push(r);
      b.setAttribute('aria-pressed', reqDraft.reasons.indexOf(r)>=0 ? 'true':'false');
    });
    box.appendChild(b);
  });
  $$('#urgPick button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.urg===reqDraft.urgency ? 'true':'false'));
  $('#reqNote').value = reqDraft.note || '';
  const sel = $('#reqWho');
  sel.innerHTML = '<option value="">Any available coach</option>'
    + S.coaches.filter(c=>c.active!==false).map(c=>'<option value="'+escHtml(c.id)+'">'+escHtml(c.name)+(c.role?' — '+escHtml(c.role):'')+'</option>').join('');
  sel.value = reqDraft.coachId || '';
  $('#reqForm').style.display = 'block';
  $('#reqSent').classList.remove('on');
}
let reqCtx = { ctx:'ask', backStep:'coachask', punch:true };
function openReq(opts){
  opts = opts || {};
  if(!session || !session.name){ toast('Enter your name first, then you can ask for a coach.','bad'); return; }
  reqCtx = {
    ctx: opts.ctx || 'ask',
    backStep: opts.backStep || (step==='card' ? 'card' : 'coachask'),
    punch: opts.punch !== false
  };
  if(opts.prefillReasons || opts.prefillNote){
    reqDraft = freshDraft();
    if(opts.prefillReasons) reqDraft.reasons = opts.prefillReasons.slice();
    if(opts.prefillNote) reqDraft.note = opts.prefillNote;
  } else if(!reqDraft.reasons.length && !reqDraft.note){
    reqDraft = freshDraft();
  }
  renderReasonChips();
  $('#reqOverlay').classList.add('on');
}
function closeReq(){
  cancelAnimationFrame(cdTimers.req);
  $('#reqOverlay').classList.remove('on');
}
function reqCancelFlow(){
  closeReq();
  const b = reqCtx.backStep;
  if(b==='card') showCard();
  else if(b==='enroll') goEnroll();
  else if(b==='phone') setStep('phone');
  else goCoachAsk();
}
function finishRequest(){
  cancelAnimationFrame(cdTimers.req);
  closeReq();
  if(reqCtx.punch && session && session.groupRef) showCard();
  else resetKiosk();
}
function mailSubject(req){
  return 'Coach request — '+req.name+' ('+URGENCY[req.urgency].short+') — '+(S.settings.org||'Youth program');
}
function mailBody(req){
  const lines = [];
  lines.push('A young person has asked to see a coach at the sign-in kiosk.');
  lines.push('');
  lines.push('Name: '+req.name);
  lines.push('When: '+fmtDateLong(req.date)+' at '+req.time);
  lines.push('How soon: '+URGENCY[req.urgency].label);
  lines.push('What they said: '+(req.reasons.length? req.reasons.join(', ') : 'Not specified'));
  if(req.note) lines.push('Their note: '+req.note);
  lines.push('Group that day: '+(req.groupRef ? req.groupRef+' — '+groupFull(req.groupRef) : 'No group sign-in (request only)'));
  lines.push('Requested coach: '+(req.requestedCoachName || 'Any available coach'));
  lines.push('');
  lines.push('Program: '+(S.settings.org||'')+' · Kiosk: '+(S.settings.kioskId||'')+' · Ref '+req.id.slice(-6).toUpperCase());
  lines.push('This request also appears on the coach console and in the weekly export (Coach Requests sheet) for case management.');
  return lines.join('\n');
}
function dispatchMail(req){
  const mail = S.mail || { mode:'off' };
  const to = alertCoaches().map(c=>c.email);
  req.notifiedTo = to;
  if(mail.mode!=='webhook' || !mail.url){
    return { status:'queued', note: mail.mode==='off'
      ? 'Recorded on this device only — no mail relay is set up yet, so no email was sent.'
      : 'No relay address saved — the request was recorded but not emailed.' };
  }
  const payload = {
    to: to, cc: mail.cc||'', subject: mailSubject(req), body: mailBody(req),
    request: { id:req.id, name:req.name, date:req.date, time:req.time, urgency:req.urgency,
      reasons:req.reasons, note:req.note, groupRef:req.groupRef, requestedCoach:req.requestedCoachName,
      kiosk:S.settings.kioskId||'', program:S.settings.org||'' }
  };
  const body = JSON.stringify(payload);
  try {
    fetch(mail.url, { method:'POST', mode:'cors', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body: body })
      .then(r=>{
        if(r && r.ok) req.delivery = { status:'sent', note:'Relay accepted the mail at '+fmtTime12(Date.now()), to:to };
        else req.delivery = { status:'sent', note:'Relay answered with status '+(r? r.status:'?')+' at '+fmtTime12(Date.now()), to:to };
        save(); showRequestDelivery(req);
      })
      .catch(()=>{
        try{
          fetch(mail.url, { method:'POST', mode:'no-cors', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body: body });
          req.delivery = { status:'sent', note:'Dispatched to the relay at '+fmtTime12(Date.now())+' (not confirmed by the browser)', to:to };
        }catch(e2){
          req.delivery = { status:'failed', note:'The relay could not be reached: '+String(e2.message||e2), to:to };
        }
        save(); showRequestDelivery(req);
      });
  } catch(e){
    req.delivery = { status:'failed', note:'The relay could not be reached: '+String(e.message||e), to:to };
  }
  return { status:'sending', note:'Sending to the mail relay…' };
}
function showRequestDelivery(req){
  if(!$('#reqOverlay').classList.contains('on')) { updateCounts(); return; }
  const b = req.delivery || {};
  const sent = b.status==='sent';
  $('#reqSentStatus').textContent = sent
    ? 'Coaches on alert were emailed'+(req.notifiedTo.length? '.' : ' — add coach emails in Coach alerts.')
    : (b.note || '');
  $('#reqSentStatus').style.color = sent ? 'var(--go)' : 'var(--dim)';
  updateCounts();
}
function submitRequest(){
  if(!session){ closeReq(); toast('Enter your name first.','bad'); return; }
  reqDraft.note = $('#reqNote').value.trim().slice(0,500);
  reqDraft.coachId = $('#reqWho').value;
  const who = S.coaches.find(c=>c.id===reqDraft.coachId);
  const ts = Date.now();
  const req = {
    id: uid(), pid: session.pid||null, name: session.name, date: todayISO(), ts: ts, time: fmtTime12(ts),
    reasons: reqDraft.reasons.slice(), urgency: reqDraft.urgency, note: reqDraft.note,
    groupRef: session.groupRef||'', requestedCoachId: reqDraft.coachId||'',
    requestedCoachName: who ? who.name : '', status:'open',
    notifiedTo: [], delivery:{ status:'pending', note:'' }, ackBy:'', ackAt:0, source:'kiosk'
  };
  S.requests.push(req);
  save();
  session.requestedAt = ts;
  session.requestUrgency = req.urgency;
  dispatchMail(req);
  save();
  const b = req.delivery||{};
  $('#reqSentWhere').textContent = req.urgency==='now'
    ? 'Someone will come find you now.'
    : 'A coach will come find you when they are free.';
  $('#reqSentStatus').textContent = b.status==='sent'
    ? 'Coaches on alert have been emailed.'
    : (b.status==='sending' ? 'Notifying the coach team…' : (b.note||''));
  $('#reqSentStatus').style.color = b.status==='sent' ? 'var(--go)' : 'var(--dim)';
  $('#reqSentRef').textContent = 'Ref '+req.id.slice(-6).toUpperCase()+' · '+req.time
    + (req.reasons.length? ' · '+req.reasons.join(', ') : '')
    + ' · '+URGENCY[req.urgency].label;
  $('#reqForm').style.display='none';
  $('#reqSent').classList.add('on');
  $('#reqDone').textContent = (reqCtx.punch && session.groupRef) ? 'Done — go to my sign-in' : 'Done';
  runCountdown('req', Math.max(6, Number(S.settings.resetSeconds)||10)+4, $('#reqCdLabel'), $('#reqCdBar'), finishRequest);
  renderAskState();
  updateCounts();
  toast('Coach request sent — '+(alertCoaches().length? alertCoaches().length+' coach'+(alertCoaches().length>1?'es':'')+' notified.' : 'add coach emails in Coach alerts.'));
}

/* ---- PIN gate ---- */
function buildKeypad(){
  const kp = $('#keypad');
  kp.innerHTML = '';
  const add = (label,val,cls,fn)=>{
    const b = document.createElement('button');
    b.type='button'; b.className='key'+(cls?' '+cls:''); b.textContent = label;
    b.addEventListener('click',fn);
    kp.appendChild(b);
  };
  ['1','2','3','4','5','6','7','8','9'].forEach(d=>add(d,d,'',()=>pinDigit(d)));
  add('Clear','clear','',()=>{ pins=''; renderPin(); });
  add('0','0','',()=>pinDigit('0'));
  add('⌫','back','',()=>{ pins=pins.slice(0,-1); renderPin(); });
  add('Cancel','cancel','wide',closePin);
}
let pinFails = 0, pinLockUntil = 0;
function renderPin(){
  $$('#pinDisplay i').forEach((el,i)=>{ el.textContent = i<pins.length ? '•' : ''; el.classList.toggle('filled', i<pins.length); });
}
function openPin(){
  if(Date.now()<pinLockUntil){ $('#pinMsg').textContent='Locked — wait '+Math.ceil((pinLockUntil-Date.now())/1000)+'s'; }
  pins = ''; renderPin();
  $('#pinMsg').textContent = pinFails ? 'Wrong PIN — try again' : '';
  $('#pinOverlay').classList.add('on');
}
function closePin(){ $('#pinOverlay').classList.remove('on'); pins=''; renderPin(); }
function pinDigit(d){
  if(Date.now()<pinLockUntil) return;
  if(pins.length>=4) return;
  pins += String(d);
  renderPin();
  if(pins.length===4) setTimeout(checkPin,140);
}
function checkPin(){
  if(String(pins)===String(S.settings.pin)){
    pinFails = 0; closePin(); openCoach();
  } else {
    pinFails++; pins=''; renderPin();
    if(pinFails>=5){
      pinLockUntil = Date.now()+30000;
      $('#pinMsg').textContent = 'Too many tries — locked for 30 seconds';
      setTimeout(()=>{ pinFails=0; if($('#pinOverlay').classList.contains('on')) $('#pinMsg').textContent=''; }, 30500);
    } else {
      $('#pinMsg').textContent = 'Wrong PIN — '+pinFails+' failed attempt'+(pinFails>1?'s':'')+'. Default is 1234.';
    }
  }
}
function openCoach(){
  setMode('coach');
  renderAll();
  window.scrollTo(0,0);
}

/* ============================================================
   6. coach console
   ============================================================ */
let viewNow = 'roster';
function showView(v){
  viewNow = v;
  $$('.view').forEach(el=>el.classList.toggle('hidden', el.id!=='view-'+v));
  $$('.navbtn').forEach(b=>{ if(b.dataset.view===v) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  if(v==='records') renderRecords();
  if(v==='requests') renderRequests();
  if(v==='alerts') renderAlerts();
  if(v==='export') renderExport();
  if(v==='roster') renderRoster();
  if(v==='groups') renderGroups();
  if(v==='settings') renderSettings();
}
function updateCounts(){
  $('#ctRoster').textContent = S.people.length;
  $('#ctGroups').textContent = S.groups.length;
  const today = recordsOn(todayISO()).length;
  const ct = $('#ctRecords');
  ct.textContent = today;
  ct.classList.toggle('alert', today>0);
  $('#stTotal').textContent = S.people.length;
  $('#stToday').textContent = today;
  const news = S.people.filter(p=>p.onRoster===false).length;
  $('#stNew').textContent = news;
  const openReq = S.requests.filter(r=>r.status!=='acknowledged').length;
  const ctr = $('#ctRequests');
  ctr.textContent = openReq;
  ctr.classList.toggle('alert', openReq>0);
  $('#ctAlerts').textContent = alertCoaches().length;
  const last = S.records.length ? Math.max.apply(null, S.records.map(r=>r.ts||0)) : 0;
  const alerts = alertCoaches().length;
  $('#railFoot').textContent = 'KIOSK · '+(S.settings.kioskId||'—')+'\n'
    +S.records.length+' sign-ins · '+S.requests.length+' requests\n'
    +(openReq? openReq+' request'+(openReq>1?'s':'')+' waiting\n' : '')
    +alerts+' coach'+(alerts===1?'':'es')+' on alert · '+((MAIL_MODES[(S.mail&&S.mail.mode)||'off']||{}).label||'')
    +'\n'+(last? 'last sign-in '+fmtTime12(last) : 'no sign-ins yet');
  $('#railFoot').style.whiteSpace = 'pre-line';
}
function renderAll(){
  applyKioskSettings(); updateCounts(); renderRoster(); renderGroups(); renderRecords(); renderRequests(); renderAlerts(); renderExport(); renderSettings(); showView(viewNow);
}

/* ---- roster ---- */
function addNames(list, source){
  let added = 0, skipped = 0;
  list.forEach(n=>{
    const name = cleanName(n) || '';
    if(!name){ skipped++; return; }
    if(personByName(name)){ skipped++; return; }
    S.people.push({ id:uid(), name:name, active:true, onRoster:true, added:Date.now(), addedBy:source||'coach' });
    added++;
  });
  save(); renderRoster(); updateCounts();
  return {added:added, skipped:skipped};
}
function renderRoster(){
  const q = normKey($('#rosterSearch').value||'');
  const body = $('#rosterBody');
  const list = S.people.slice().sort((a,b)=>a.name.localeCompare(b.name)).filter(p=>!q || normKey(p.name).indexOf(q)>=0);
  body.innerHTML = list.map(p=>{
    const count = S.records.filter(r=>r.pid===p.id || normKey(r.name)===normKey(p.name)).length;
    return '<tr data-id="'+p.id+'">'
      +'<td class="nm">'+escHtml(p.name)+' '+(p.onRoster===false?'<span class="badge new">review</span>':'')+'</td>'
      +'<td class="mini">'+escHtml(shortName(p.name))+'</td>'
      +'<td class="num">'+count+'</td>'
      +'<td class="row tight">'
        +(p.onRoster===false?'<button class="btn-c ghost" data-act="ok" data-id="'+p.id+'" type="button" style="padding:.28rem .5rem">Confirm</button>':'')
        +'<button class="btn-c ghost" data-act="rename" data-id="'+p.id+'" type="button" style="padding:.28rem .5rem">Rename</button>'
        +'<button class="btn-c danger" data-act="del" data-id="'+p.id+'" type="button" style="padding:.28rem .5rem">Remove</button>'
      +'</td></tr>';
  }).join('');
  $('#rosterEmpty').classList.toggle('hidden', !!list.length);
  const meta = $('#rosterMeta');
  meta.textContent = S.people.length
    ? S.people.length+' names on the kiosk roster'
      + (S.rosterMeta ? ' — last upload '+S.rosterMeta.when+' ('+S.rosterMeta.name+')' : '')
      + (S.people.filter(p=>p.active===false).length ? ' · '+S.people.filter(p=>p.active===false).length+' inactive.' : '')
    : 'No roster uploaded yet. Paste names on the left or drop a file — the kiosk stays empty until a real list is loaded.';
  $('#dataNote').textContent = S.people.length+' participants · '+S.groups.length+' groups · '+S.records.length+' sign-in records stored in this browser.';
}
function mergeDuplicates(){
  const byKey = new Map();
  let removed = 0;
  S.people.forEach(p=>{
    const k = normKey(p.name);
    if(!byKey.has(k)) byKey.set(k,p);
    else {
      const keep = byKey.get(k);
      if(p.onRoster===false && keep.onRoster!==false) keep.onRoster = false;
      S.records.forEach(r=>{ if(r.pid===p.id) r.pid = keep.id; });
      p._drop = true; removed++;
    }
  });
  if(removed){ S.people = S.people.filter(p=>!p._drop); save(); toast('Merged '+removed+' duplicate name'+(removed>1?'s':'')+'.'); }
  else toast('No duplicates found.');
  renderRoster(); updateCounts();
}
function handleRosterFile(file){
  const isXlsx = /\.xlsx$|\.xlsm$/i.test(file.name);
  const read = isXlsx
    ? readXlsxFile(file).then(r=>({grid:r.grid}))
    : file.text().then(t=>parseTable(t));
  read.then(res=>{
    const grid = res.grid || res;
    const found = extractUpload(grid);
    if(!found.names.length && !found.groups.length) throw new Error('No names found in that file.');
    let msg = [];
    if(found.groups.length){
      S.groups = found.groups.map(g=>({ref:g.ref, full:g.full, desc:g.desc, type:g.type||'YG'}));
      save(); renderGroups();
      msg.push('replaced the group list with '+found.groups.length+' definitions');
    }
    if(found.names.length){
      const r = addNames(found.names, 'upload');
      S.rosterMeta = { name:file.name, when:new Date().toLocaleString(), count:found.names.length };
      save();
      msg.push('added '+r.added+' name'+(r.added===1?'':'s')+(r.skipped? ' ('+r.skipped+' skipped as duplicates)':''));
    }
    toast('Read '+file.name+' — '+msg.join(', ')+(found.note? ' '+found.note:''));
  }).catch(err=>{
    toast(String(err.message||err), 'bad');
  });
  $('#rosterUploadNote').textContent = 'Reading '+file.name+'…';
  setTimeout(()=>{ $('#rosterUploadNote').textContent=''; }, 3000);
}

/* ---- groups ---- */
function renderGroups(){
  const body = $('#groupsBody');
  body.innerHTML = S.groups.map((g,i)=>
    '<tr data-i="'+i+'">'
    +'<td><input class="f g-ref" value="'+escHtml(g.ref)+'"></td>'
    +'<td><input class="f g-full" value="'+escHtml(g.full)+'"></td>'
    +'<td><input class="f g-desc" value="'+escHtml(g.desc||'')+'"></td>'
    +'<td style="max-width:120px"><input class="f g-type" value="'+escHtml(g.type||'')+'"></td>'
    +'<td><button class="btn-c danger" data-del="'+i+'" type="button" style="padding:.3rem .55rem">Del</button></td>'
    +'</tr>').join('');
  body.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{
    S.groups.splice(Number(b.dataset.del),1); save(); renderGroups(); updateCounts();
  }));
}
function saveGroups(){
  const rows = $$('#groupsBody tr');
  const next = [];
  rows.forEach(tr=>{
    const ref = tr.querySelector('.g-ref').value.trim().toUpperCase();
    if(!ref) return;
    next.push({ ref:ref, full:tr.querySelector('.g-full').value.trim() || ref,
      desc:tr.querySelector('.g-desc').value.trim(), type:tr.querySelector('.g-type').value.trim().toUpperCase().slice(0,6) || 'YG' });
  });
  S.groups = next; save(); renderGroups(); updateCounts(); toast('Saved '+next.length+' groups.');
}

/* ---- records ---- */
function renderRecords(){
  const gsel = $('#recGroup');
  const keep = gsel.value;
  gsel.innerHTML = '<option value="">All groups</option>'+S.groups.map(g=>'<option value="'+escHtml(g.ref)+'">'+escHtml(g.ref)+' — '+escHtml(g.full)+'</option>').join('');
  gsel.value = keep;
  const msel = $('#manGroup');
  msel.innerHTML = S.groups.map(g=>'<option value="'+escHtml(g.ref)+'">'+escHtml(g.ref)+' — '+escHtml(g.full)+'</option>').join('');

  const from = $('#recFrom').value, to = $('#recTo').value;
  const g = $('#recGroup').value, q = $('#recSearch').value;
  if(!$('#manDate').value) $('#manDate').value = todayISO();

  let list = S.records.slice();
  if(from) list = list.filter(r=>r.date>=from);
  if(to) list = list.filter(r=>r.date<=to);
  if(g) list = list.filter(r=>r.groupRef===g);
  if(q) list = list.filter(r=>normKey(r.name).indexOf(normKey(q))>=0);
  list.sort((a,b)=> b.date.localeCompare(a.date) || (b.ts||0)-(a.ts||0));

  const days = new Set(list.map(r=>r.date)).size;
  const people = new Set(list.map(r=>normKey(r.name))).size;
  $('#recSummary').textContent = list.length+' sign-in rows · '+people+' participant'+(people===1?'':'s')+' · '+days+' day'+(days===1?'':'s')
    + (from||to ? ' (filtered)' : ' (all dates).');

  $('#recBody').innerHTML = list.slice(0,500).map(r=>
    '<tr><td class="mini">'+r.date+' <span style="color:#9A9583">'+DOW[parseISO(r.date).getDay()]+'</span></td>'
    +'<td class="mini">'+escHtml(r.time||'')+'</td>'
    +'<td class="nm">'+escHtml(r.name)+'</td>'
    +'<td class="mini">'+escHtml(r.groupRef)+'</td>'
    +'<td style="font-size:.8rem">'+escHtml(r.groupFull||groupFull(r.groupRef))+'</td>'
    +'<td><span class="badge'+(r.source==='kiosk'?' punch':'')+'">'+escHtml(r.source||'kiosk')+'</span>'
      +(r.onRoster===false?' <span class="badge new">new</span>':'')+'</td>'
    +'<td><button class="btn-c danger" data-recdel="'+r.id+'" type="button" style="padding:.26rem .5rem">Del</button></td></tr>').join('');
  $('#recBody').querySelectorAll('[data-recdel]').forEach(b=>b.addEventListener('click',()=>{
    S.records = S.records.filter(r=>r.id!==b.dataset.recdel);
    save(); renderRecords(); updateCounts(); toast('Row deleted.');
  }));
  const dl = $('#manNameList');
  dl.innerHTML = S.people.map(p=>'<option value="'+escHtml(p.name)+'">').join('');
  $('#manName').value;
}
function addManualRecord(){
  const name = cleanName($('#manName').value) || titleCase($('#manName').value);
  const ref = $('#manGroup').value;
  const date = $('#manDate').value || todayISO();
  if(!name){ toast('Type or pick a name first.','bad'); return; }
  if(!ref){ toast('Add a group first.','bad'); return; }
  const p = personByName(name);
  const ts = Date.now();
  const res = addRecord({ pid:p?p.id:null, name:name, groupRef:ref, date:date, ts:ts, source:'coach', onRoster:!!p });
  if(!p){ S.people.push({ id:uid(), name:name, active:true, onRoster:false, added:Date.now(), addedBy:'coach' }); }
  save(); renderRecords(); renderRoster(); updateCounts();
  toast(res.repeat ? 'Updated that sign-in.' : 'Added '+name+' — '+ref+' on '+date+'.');
  $('#manName').value = '';
}

/* ---- coach requests ---- */
function renderRequests(){
  const from = $('#reqFrom').value, to = $('#reqTo').value;
  const status = $('#reqStatus').value, urg = $('#reqUrgency').value, q = $('#reqSearchF').value;
  let list = S.requests.slice();
  if(from) list = list.filter(r=>r.date>=from);
  if(to) list = list.filter(r=>r.date<=to);
  if(status) list = list.filter(r=> (status==='open' ? r.status!=='acknowledged' : r.status===status));
  if(urg) list = list.filter(r=>r.urgency===urg);
  if(q) list = list.filter(r=>normKey(r.name).indexOf(normKey(q))>=0 || (r.note||'').toLowerCase().indexOf(q.toLowerCase())>=0);
  list.sort((a,b)=> b.date.localeCompare(a.date) || (b.ts||0)-(a.ts||0));

  $('#rsTotal').textContent = list.length;
  $('#rsOpen').textContent = list.filter(r=>r.status!=='acknowledged').length;
  $('#rsUrgent').textContent = list.filter(r=>r.urgency==='now' && r.status!=='acknowledged').length;
  $('#reqSummary').textContent = list.length
    ? list.length+' request'+(list.length===1?'':'s')+' in view · '
      +list.filter(r=>r.status!=='acknowledged').length+' still waiting · '
      +list.filter(r=>r.urgency==='now').length+' marked urgent'
    : 'No coach requests match this filter.';

  $('#reqBody').innerHTML = list.map(r=>{
    const dl = (r.delivery&&r.delivery.status)||'pending';
    const dlBadge = dl==='sent' ? 'done' : (dl==='failed' ? 'open' : '');
    return '<tr>'
    +'<td class="when mini">'+r.date+'<br><span style="color:#9A9583">'+DOW[parseISO(r.date).getDay()]+'</span></td>'
    +'<td class="when mini">'+escHtml(r.time||'')+'</td>'
    +'<td class="nm">'+escHtml(r.name)+'</td>'
    +'<td><span class="badge'+(r.urgency==='now'?' now':'')+'">'+escHtml(URGENCY[r.urgency]?URGENCY[r.urgency].short:r.urgency)+'</span></td>'
    +'<td style="font-size:.82rem">'+escHtml((r.reasons||[]).join(', ')||'—')+'</td>'
    +'<td><span class="req-note">'+escHtml(r.note||'—')+'</span></td>'
    +'<td class="mini">'+escHtml(r.groupRef||'no group')+'</td>'
    +'<td><span class="badge '+(r.status==='acknowledged'?'done':'open')+'">'+(r.status==='acknowledged'?'Acknowledged':'Waiting')+'</span>'
      +(r.ackBy?'<br><span class="mini">'+escHtml(r.ackBy)+'</span>':'')+'</td>'
    +'<td><span class="badge '+dlBadge+'">'+escHtml(dl)+'</span>'
      +'<br><span class="mini">'+escHtml((r.notifiedTo||[]).length? (r.notifiedTo.length+' sent'):'none')+'</span></td>'
    +'<td class="row tight">'
      +(r.status==='acknowledged'
        ? '<button class="btn-c ghost" data-reqopen="'+r.id+'" type="button" style="padding:.26rem .5rem">Reopen</button>'
        : '<button class="btn-c accent" data-reqack="'+r.id+'" type="button" style="padding:.26rem .5rem">Seen it</button>')
      +'<button class="btn-c danger" data-reqdel="'+r.id+'" type="button" style="padding:.26rem .5rem">Del</button>'
    +'</td></tr>';
  }).join('');

  $('#reqBody').querySelectorAll('[data-reqack]').forEach(b=>b.addEventListener('click',()=>ackRequest(b.dataset.reqack)));
  $('#reqBody').querySelectorAll('[data-reqopen]').forEach(b=>b.addEventListener('click',()=>{
    const r = S.requests.find(x=>x.id===b.dataset.reqopen);
    if(r){ r.status='open'; r.ackBy=''; r.ackAt=0; save(); renderRequests(); updateCounts(); toast('Request reopened.'); }
  }));
  $('#reqBody').querySelectorAll('[data-reqdel]').forEach(b=>b.addEventListener('click',()=>{
    const r = S.requests.find(x=>x.id===b.dataset.reqdel);
    if(!r) return;
    if(!confirm('Delete the coach request from '+r.name+' on '+r.date+'? Use this only for mistakes — the export is how case management tracks it.')) return;
    S.requests = S.requests.filter(x=>x.id!==r.id);
    save(); renderRequests(); updateCounts(); toast('Request deleted.');
  }));
}
function ackRequest(id){
  const r = S.requests.find(x=>x.id===id);
  if(!r) return;
  const who = prompt('Who saw '+r.name+'? (name shown in the export)', (alertCoaches()[0]||{}).name || 'Coach');
  if(who===null) return;
  r.status = 'acknowledged'; r.ackBy = titleCase(who) || 'Coach'; r.ackAt = Date.now();
  save(); renderRequests(); updateCounts();
  toast('Marked acknowledged by '+r.ackBy+'.');
}

/* ---- coach alerts ---- */
function renderAlerts(){
  const body = $('#coachBody');
  body.innerHTML = S.coaches.map((c,i)=>
    '<tr data-i="'+i+'">'
    +'<td><input class="f c-name" value="'+escHtml(c.name)+'"></td>'
    +'<td><input class="f c-email" value="'+escHtml(c.email||'')+'" placeholder="coach@example.org"></td>'
    +'<td style="max-width:130px"><input class="f c-role" value="'+escHtml(c.role||'')+'"></td>'
    +'<td><select class="f c-notify"><option value="yes"'+(c.notify!==false?' selected':'')+'>Yes</option>'
      +'<option value="no"'+(c.notify===false?' selected':'')+'>No</option></select></td>'
    +'<td><button class="btn-c danger" data-cdel="'+i+'" type="button" style="padding:.3rem .55rem">Del</button></td>'
    +'</tr>').join('');
  body.querySelectorAll('[data-cdel]').forEach(b=>b.addEventListener('click',()=>{
    S.coaches.splice(Number(b.dataset.cdel),1); save(); renderAlerts(); updateCounts();
  }));
  $('#coachCount').textContent = alertCoaches().length+' of '+S.coaches.length+' coach'+(S.coaches.length===1?'':'es')+' receive alerts'
    + (S.mail && S.mail.mode==='webhook' && S.mail.url ? '.' : ' — but no relay is set up yet, so nothing is emailed.');
  $('#coachPlaceholderWarn').classList.toggle('hidden', !coachesArePlaceholders());

  const sel = $('#setMailMode');
  if(!sel.options.length){
    sel.innerHTML = Object.keys(MAIL_MODES).map(k=>'<option value="'+k+'">'+escHtml(MAIL_MODES[k].label)+'</option>').join('');
  }
  const mode = (S.mail&&S.mail.mode)||'off';
  sel.value = mode;
  $('#mailModeNote').textContent = (MAIL_MODES[mode]||{}).note || '';
  $('#setMailUrl').value = (S.mail&&S.mail.url)||'';
  $('#setMailCc').value = (S.mail&&S.mail.cc)||'';
  $('#mailRelayFields').classList.toggle('hidden', mode!=='webhook');
  const ready = mode==='webhook' && S.mail.url;
  $('#mailState').innerHTML = '<span class="relay-state '+(ready?'ok':'off')+'">'
    + (ready ? 'Relay configured' : 'No relay — requests are recorded only') + '</span>'
    + (S.mail && S.mail.lastTest ? ' · last test '+escHtml(S.mail.lastTest) : '');
}
function saveCoachList(){
  const rows = $$('#coachBody tr');
  const next = [];
  rows.forEach((tr,i)=>{
    const name = tr.querySelector('.c-name').value.trim();
    const email = tr.querySelector('.c-email').value.trim();
    if(!name && !email) return;
    const prev = S.coaches[i] || {};
    next.push({ id: prev.id || uid(), name: name||'Coach', email: email, role: tr.querySelector('.c-role').value.trim(),
      notify: tr.querySelector('.c-notify').value!=='no', active:true,
      placeholder: prev.placeholder && email===prev.email });
  });
  S.coaches = next; save(); renderAlerts(); renderRequests(); updateCounts();
  toast('Saved '+next.length+' coach'+(next.length===1?'':'es')+' — '+alertCoaches().length+' on alert.');
}
function saveMailSettings(){
  S.mail = S.mail || {};
  S.mail.mode = $('#setMailMode').value;
  S.mail.url = $('#setMailUrl').value.trim();
  S.mail.cc = $('#setMailCc').value.trim();
  if(S.mail.mode==='webhook' && !S.mail.url){ toast('Paste your relay URL, or choose a different delivery method.','bad'); return; }
  save(); renderAlerts(); updateCounts();
  toast(S.mail.mode==='webhook' ? 'Mail relay saved — requests will email in the background.' : 'Delivery saved.');
}
function testMail(){
  const to = alertCoaches().map(c=>c.email);
  if(!to.length){ toast('Add at least one coach with an email and "On alert" set to Yes.','bad'); return; }
  const fake = { id:'test'+uid(), name:'Test request', date:todayISO(), time:fmtTime12(Date.now()), urgency:'soon',
    reasons:['Relay test'], note:'Sent from the coach console to verify the mail relay.', groupRef:'', requestedCoachName:'' };
  const mode = (S.mail&&S.mail.mode)||'off';
  if(mode!=='webhook' || !S.mail.url){
    toast('No relay configured — nothing to test. Requests still record locally and export normally.','bad');
    return;
  }
  fetch(S.mail.url, { method:'POST', mode:'cors', headers:{'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify({ to:to, cc:(S.mail.cc||''), subject:'[TEST] '+mailSubject(fake), body:mailBody(fake),
      request:{ id:'test', name:'Relay test', date:todayISO(), urgency:'soon', reasons:['Relay test'] } }) })
    .then(r=>{ S.mail.lastTest = fmtTime12(Date.now())+' — relay answered '+(r?r.status:'?'); save(); renderAlerts();
      toast(r && r.ok ? 'Test alert accepted by the relay — check the coach inboxes.' : 'Relay answered with status '+(r?r.status:'?')+' — check the deployment access setting.','bad'===('')); })
    .catch(()=>{
      try{
        fetch(S.mail.url, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'},
          body: JSON.stringify({ to:to, cc:(S.mail.cc||''), subject:'[TEST] '+mailSubject(fake), body:mailBody(fake) }) });
        S.mail.lastTest = fmtTime12(Date.now())+' — dispatched (unconfirmed)'; save(); renderAlerts();
        toast('Test alert dispatched — check the coach inboxes to confirm.');
      }catch(e){
        S.mail.lastTest = fmtTime12(Date.now())+' — failed'; save(); renderAlerts();
        toast('The relay could not be reached: '+String(e.message||e),'bad');
      }
    });
}

/* ---- export ---- */
function trackerData(weekStartISO, scope){
  const weeks = blockWeeks(weekStartISO);
  const recs = S.records.filter(r=> scope==='all' ? true : inBlock(r.date, weekStartISO, 3));
  const map = new Map();
  recs.forEach(r=>{
    const key = normKey(r.name)+'|'+r.groupRef;
    if(!map.has(key)) map.set(key,{ name:r.name, ref:r.groupRef, days:new Set(), first:r.ts });
    map.get(key).days.add(r.date);
  });
  const list = Array.from(map.values()).sort((a,b)=> a.name.localeCompare(b.name) || a.ref.localeCompare(b.ref));
  return { weeks:weeks, list:list, recs:recs };
}
function trackerRows(weekStartISO, scope, logo){
  const d = trackerData(weekStartISO, scope);
  const rows = [];
  const span = 2+21+3;
  const blank = n => new Array(n).fill('');
  // logo band (row 1) — the uploaded logo is anchored here, above the title
  rows.push(blank(span));
  // title
  let r0 = blank(span); r0[0] = {v:'WEEKLY GROUP ATTENDANCE TRACKER', s:2};
  rows.push(r0);
  // week start + note
  let r1 = blank(span);
  r1[0] = {v:'Week Start:', s:6};
  r1[2] = {v:weekStartISO, t:'d', s:3};
  r1[4] = {v:'Sunday of the first set of 3 weeks. Change this date, or any day date in row 5, directly on the sheet if needed.', s:7};
  rows.push(r1);
  let r2 = blank(span);
  r2[0] = {v:'ATTENDANCE ENTRY — one row per participant per group. A 1 means they attended that day. If someone attends two groups on the same day, they appear on two rows.', s:7};
  rows.push(r2);
  // week band
  let r3 = blank(span);
  r3[2] = {v:'WEEK '+d.weeks[0].n+' — GROUP HOURS', s:8};
  r3[10] = {v:'WEEK '+d.weeks[1].n+' — GROUP HOURS', s:8};
  r3[18] = {v:'WEEK '+d.weeks[2].n+' — GROUP HOURS', s:8};
  rows.push(r3);
  // dates row
  let r4 = blank(span);
  r4[0] = {v:'Reporting window', s:7};
  d.weeks.forEach((w,wi)=>{
    const base = 2 + wi*8;
    w.days.forEach((day,di)=>{ r4[base+di] = {v:isoOf(day), t:'d', s:3}; });
    r4[base+7] = {v:'Week Total', s:8};
  });
  rows.push(r4);
  // header
  let r5 = blank(span);
  r5[0] = {v:'PARTICIPANT(S) NAME', s:1};
  r5[1] = {v:'GROUP REF', s:1};
  d.weeks.forEach((w,wi)=>{
    const base = 2 + wi*8;
    for(let di=0; di<7; di++) r5[base+di] = {v:DOW[di], s:1};
    r5[base+7] = {v:'Week Total', s:1};
  });
  rows.push(r5);
  // data
  d.list.forEach(item=>{
    const row = blank(span);
    row[0] = {v:item.name, s:4};
    row[1] = {v:item.ref, s:5};
    d.weeks.forEach((w,wi)=>{
      const base = 2 + wi*8;
      let hits = 0;
      w.days.forEach((day,di)=>{
        const on = item.days.has(isoOf(day));
        if(on) hits++;
        row[base+di] = on ? {v:1, s:9} : {v:'', s:5};
      });
      const rn = rows.length+1;
      row[base+7] = {v:hits, s:5, t:'f', f:'COUNTIF('+colName(base+1)+rn+':'+colName(base+7)+rn+',1)'};
    });
    rows.push(row);
  });
  if(!d.list.length){
    let r = blank(span);
    r[0] = {v:'No sign-ins recorded in this window yet.', s:7};
    rows.push(r);
  }
  const widths = [30,20,12,12,12,12,12,12,12,11,12,12,12,12,12,12,12,11,12,12,12,12,12,12,12,11];
  const merges = ['A2:'+colName(span)+'2','A4:'+colName(span)+'4','C5:I5','K5:Q5','S5:Y5'];
  const lg = logo;
  return {rows:rows, opts:{cols:widths, merges:merges, freeze:7, widthNote:true, rowHeights:{1:48},
    logo:lg, logoCol:0, logoRow:0, logoMaxW:200, logoMaxH:42}, data:d};
}
function reqPlain(weekStartISO, scope){
  const recs = S.requests.filter(r=> scope==='all' ? true : inBlock(r.date, weekStartISO, 3))
    .slice().sort((a,b)=> a.date.localeCompare(b.date) || (a.ts||0)-(b.ts||0));
  const rows = [['Date','Day','Time','Name','On Roster','Urgency','Reasons','Note','Group That Day',
    'Requested Coach','Status','Acknowledged By','Acknowledged At','Notified To','Email Delivery']];
  recs.forEach(r=>{
    const p = personByName(r.name);
    rows.push([
      r.date, DOW[parseISO(r.date).getDay()], r.time||'', r.name,
      (p && p.onRoster===false) ? 'No' : 'Yes',
      (URGENCY[r.urgency]||{}).label || r.urgency,
      (r.reasons||[]).join('; '), r.note||'',
      r.groupRef ? r.groupRef+' — '+groupFull(r.groupRef) : 'No group (request only)',
      r.requestedCoachName || 'Any available coach',
      r.status==='acknowledged' ? 'Acknowledged' : 'Open',
      r.ackBy||'', r.ackAt ? new Date(r.ackAt).toLocaleString() : '',
      (r.notifiedTo||[]).join('; '),
      (r.delivery && r.delivery.status) || 'pending'
    ]);
  });
  return { rows:rows, recs:recs };
}
function coachRequestRows(weekStartISO, scope){
  const p = reqPlain(weekStartISO, scope);
  return p.rows.map((row,i)=> row.map(cell=> i===0 ? {v:cell, s:1} : {v:cell, s:4}));
}
function importRows(weekStartISO, scope){
  const d = trackerData(weekStartISO, scope);
  const header = ['Participant Name','Group Ref','Group Full Name','Group Type','Date','Day','Week #','Week Start','Time','Source','On Roster Upload','Kiosk',
    'Record Type','Request Reasons','Request Urgency','Request Note','Request Status','Notified To','Acknowledged By','Acknowledged At'];
  const rows = [header.map(h=>({v:h, s:1}))];
  const weekNum = date => Math.floor(Math.round((parseISO(date)-parseISO(weekStartISO))/86400000)/7)+1;
  const combined = [];
  d.recs.forEach(r=>{
    const g = groupByRef(r.groupRef) || {};
    combined.push({ sort:[r.date, r.ts||0], cells:[
      {v:r.name, s:4}, {v:r.groupRef, s:5}, {v:r.groupFull||g.full||r.groupRef, s:4}, {v:r.groupType||g.type||'', s:5},
      {v:r.date, t:'d', s:3}, {v:DOW[parseISO(r.date).getDay()], s:5}, {v:weekNum(r.date), s:5},
      {v:weekStartISO, t:'d', s:3}, {v:r.time||fmtTime12(r.ts||Date.now()), s:5}, {v:r.source||'kiosk', s:5},
      {v:r.onRoster===false?'No':'Yes', s:5}, {v:r.kioskId||'', s:5},
      {v:'Group sign-in', s:9}, {v:'', s:4}, {v:'', s:5}, {v:'', s:4}, {v:'', s:5}, {v:'', s:4}, {v:'', s:5}, {v:'', s:4}
    ]});
  });
  reqPlain(weekStartISO, scope).recs.forEach(r=>{
    const g = r.groupRef ? (groupByRef(r.groupRef)||{}) : {};
    combined.push({ sort:[r.date, r.ts||0], cells:[
      {v:r.name, s:4}, {v:r.groupRef||'', s:5}, {v:r.groupRef ? groupFull(r.groupRef) : '', s:4}, {v:r.groupRef ? (g.type||'') : '', s:5},
      {v:r.date, t:'d', s:3}, {v:DOW[parseISO(r.date).getDay()], s:5}, {v:weekNum(r.date), s:5},
      {v:weekStartISO, t:'d', s:3}, {v:r.time||'', s:5}, {v:'kiosk', s:5},
      {v:'Yes', s:5}, {v:S.settings.kioskId||'', s:5},
      {v:'Coach request', s:9}, {v:(r.reasons||[]).join('; '), s:4},
      {v:(URGENCY[r.urgency]||{}).label||r.urgency, s:5}, {v:r.note||'', s:4},
      {v:r.status==='acknowledged'?'Acknowledged':'Open', s:5}, {v:(r.notifiedTo||[]).join('; '), s:4},
      {v:r.ackBy||'', s:5}, {v:r.ackAt ? new Date(r.ackAt).toLocaleString() : '', s:4}
    ]});
  });
  combined.sort((a,b)=> a.sort[0].localeCompare(b.sort[0]) || a.sort[1]-b.sort[1]);
  combined.forEach(c=>rows.push(c.cells));
  if(!combined.length) rows.push([{v:'No sign-ins or coach requests in this window.', s:7}]);
  return rows;
}
const flatCell = c => {
  if(c===null || c===undefined || c==='') return '';
  if(typeof c==='object'){ if(c.t==='d') return c.v; return (c.v===undefined||c.v===null) ? '' : c.v; }
  return c;
};
function csvAllRows(ws, scope){ return importRows(ws, scope).map(row=> row.map(flatCell)); }
function csvReqRows(ws, scope){ return reqPlain(ws, scope).rows; }
function groupRefRows(){
  const head = ['Group Label','Group - Full Name','Group Description','Group Type'].map(h=>({v:h, s:1}));
  return [head].concat(S.groups.map(g=>[{v:g.ref,s:4},{v:g.full,s:4},{v:g.desc||'',s:4},{v:g.type||'',s:5}]));
}
function rosterSheetRows(weekStartISO, scope){
  const d = trackerData(weekStartISO, scope);
  const head = ['Participant Name','Short Form','On Roster','Sign-ins in Window','Sign-ins All Time','Last Seen','Groups in Window'].map(h=>({v:h, s:1}));
  const rows = [head];
  S.people.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(p=>{
    const mine = S.records.filter(r=>normKey(r.name)===normKey(p.name));
    const win = d.recs.filter(r=>normKey(r.name)===normKey(p.name));
    const last = mine.length ? mine.map(r=>r.date).sort().pop() : '';
    const groups = Array.from(new Set(win.map(r=>r.groupRef))).join(', ');
    rows.push([{v:p.name, s:4},{v:shortName(p.name), s:5},{v:p.onRoster===false?'No':'Yes', s:5},
      {v:win.length, s:5},{v:mine.length, s:5},{v:last, t:'d', s:3},{v:groups, s:4}]);
  });
  return rows;
}
function summaryRows(weekStartISO, scope){
  const d = trackerData(weekStartISO, scope);
  const rq = reqPlain(weekStartISO, scope);
  const end = isoOf(addDays(parseISO(weekStartISO),20));
  const rows = [];
  rows.push([]);  // logo band
  rows.push([{v:'EXPORT SUMMARY', s:2}]);
  rows.push([{v:'Program', s:6},{v:S.settings.org||'', s:4}]);
  rows.push([{v:'Kiosk', s:6},{v:S.settings.kioskId||'', s:4}]);
  rows.push([{v:'Exported', s:6},{v:new Date().toLocaleString(), s:4}]);
  rows.push([{v:'Week start', s:6},{v:weekStartISO, t:'d', s:3}]);
  rows.push([{v:'Window end', s:6},{v:end, t:'d', s:3}]);
  rows.push([{v:'Records in this export', s:6},{v:d.recs.length, s:5}]);
  rows.push([{v:'Participants listed', s:6},{v:d.list.length, s:5}]);
  rows.push([{v:'Roster size', s:6},{v:S.people.length, s:5}]);
  rows.push([]);
  rows.push([{v:'GROUP', s:1},{v:'SIGN-INS', s:1},{v:'UNIQUE YOUTH', s:1},{v:'DAYS ACTIVE', s:1},
    {v:'COACH REQUESTS', s:1},{v:'REQUESTS OPEN', s:1},{v:'YOUTH REQUESTING', s:1}]);
  S.groups.forEach(g=>{
    const rs = d.recs.filter(r=>r.groupRef===g.ref);
    const qs = rq.recs.filter(r=>r.groupRef===g.ref);
    rows.push([{v:g.ref, s:4},{v:rs.length, s:5},
      {v:new Set(rs.map(r=>normKey(r.name))).size, s:5},
      {v:new Set(rs.map(r=>r.date)).size, s:5},
      {v:qs.length, s:5},
      {v:qs.filter(r=>r.status!=='acknowledged').length, s:5},
      {v:new Set(qs.map(r=>normKey(r.name))).size, s:5}]);
  });
  const noGroup = rq.recs.filter(r=>!r.groupRef);
  rows.push([{v:'(request only — no group that day)', s:4},{v:0, s:5},{v:0, s:5},{v:0, s:5},
    {v:noGroup.length, s:5},{v:noGroup.filter(r=>r.status!=='acknowledged').length, s:5},
    {v:new Set(noGroup.map(r=>normKey(r.name))).size, s:5}]);
  const totReq = rq.recs.length;
  rows.push([{v:'TOTAL', s:1},{v:d.recs.length, s:5},
    {v:new Set(d.recs.map(r=>normKey(r.name))).size, s:5},
    {v:new Set(d.recs.map(r=>r.date)).size, s:5},
    {v:totReq, s:5},
    {v:rq.recs.filter(r=>r.status!=='acknowledged').length, s:5},
    {v:new Set(rq.recs.map(r=>normKey(r.name))).size, s:5}]);
  const named = rq.recs.filter(r=>r.requestedCoachId).length;
  rows.push([]);
  rows.push([{v:'COACH REQUESTS (case management view)', s:2}]);
  rows.push([{v:'Requests in this export', s:6},{v:rq.recs.length, s:5}]);
  rows.push([{v:'Still waiting to be seen', s:6},{v:rq.recs.filter(r=>r.status!=='acknowledged').length, s:5}]);
  rows.push([{v:'Marked urgent', s:6},{v:rq.recs.filter(r=>r.urgency==='now').length, s:5}]);
  rows.push([{v:'Requested a particular coach', s:6},{v:named, s:5}]);
  rows.push([{v:'Email delivery', s:6},{v:(MAIL_MODES[(S.mail&&S.mail.mode)||'off']||{}).label||'Console + export only', s:4}]);
  rows.push([]);
  rows.push([{v:'COACH', s:1},{v:'EMAIL', s:1},{v:'ON ALERT', s:1},{v:'NAMED REQUESTS', s:1},{v:'STILL OPEN', s:1}]);
  S.coaches.forEach(c=>{
    const mine = rq.recs.filter(r=>r.requestedCoachId===c.id);
    rows.push([{v:c.name + (c.placeholder?' (placeholder)':''), s:4},
      {v:c.email||'', s:4},
      {v:(c.active!==false && c.notify!==false)?'Yes':'No', s:5},
      {v:mine.length, s:5},
      {v:mine.filter(r=>r.status!=='acknowledged').length, s:5}]);
  });
  rows.push([]);
  rows.push([{v:'NOTE — dates auto-filled from the week start when this file was built.', s:7}]);
  rows.push([{v:'You can change any date on the Group Activities sheet; totals are formulas and recalculate for the marked days.', s:7}]);
  return rows;
}
function buildWorkbook(weekStartISO, scope, logo){
  const t = trackerRows(weekStartISO, scope, logo);
  return buildXlsx([
    { name:'Group Activities', rows:t.rows, opts:t.opts },
    { name:'Database Import', rows:importRows(weekStartISO, scope), opts:{cols:[26,16,42,14,13,8,8,13,11,10,14,14,14,30,15,34,15,26,18,20], freeze:1, merges:[]} },
    { name:'Coach Requests', rows:coachRequestRows(weekStartISO, scope), opts:{cols:[13,8,11,24,11,20,34,40,34,22,15,18,20,26,14], freeze:1, merges:[]} },
    { name:'Group Definitions Reference', rows:groupRefRows(), opts:{cols:[25,58,45,14], freeze:1} },
    { name:'Roster', rows:rosterSheetRows(weekStartISO, scope), opts:{cols:[26,18,11,18,18,13,34], freeze:1} },
    { name:'Settings & Summary', rows:summaryRows(weekStartISO, scope),
      opts:{cols:[32,11,13,12,16,14,16], rowHeights:{1:46}, logo:logo, logoCol:0, logoRow:0, logoMaxW:180, logoMaxH:40} }
  ]);
}
function csvRows(weekStartISO, scope){
  const d = trackerData(weekStartISO, scope);
  const head = ['Participant Name','Group Ref','Group Full Name','Group Type','Date','Day','Week #','Week Start','Time','Source','On Roster Upload','Kiosk'];
  const rows = [head];
  d.recs.slice().sort((a,b)=> a.date.localeCompare(b.date) || a.name.localeCompare(b.name)).forEach(r=>{
    const g = groupByRef(r.groupRef) || {};
    rows.push([r.name, r.groupRef, r.groupFull||g.full||'', r.groupType||g.type||'', r.date,
      DOW[parseISO(r.date).getDay()], Math.floor(Math.round((parseISO(r.date)-parseISO(weekStartISO))/86400000)/7)+1,
      weekStartISO, r.time||'', r.source||'kiosk', r.onRoster===false?'No':'Yes', r.kioskId||'']);
  });
  return rows;
}
function renderExport(){
  const ws = $('#exWeekStart').value || S.settings.weekStart || sundayISO();
  $('#exWeekStart').value = ws;
  const scope = $('#exScope').value;
  const d = trackerData(ws, scope);
  const end = isoOf(addDays(parseISO(ws),20));
  $('#exWindow').textContent = 'Window: '+fmtDateLong(ws)+' → '+fmtDateLong(end)
    +' · '+d.recs.length+' sign-in rows · '+d.list.length+' participant/group rows.'
    + (isSunday(ws) ? '' : '  ⚠ That date is not a Sunday — the tracker will still export, but the week blocks will be offset.');
  const rc = reqPlain(ws, scope).recs.length;
  $('#exWindow').textContent += ' · '+rc+' coach request'+(rc===1?'':'s')+' in the window ('
    + S.requests.filter(r=>r.status!=='acknowledged').length+' waiting on this device).';
  const t = trackerRows(ws, scope);
  const headRow = t.rows[5], dateRow = t.rows[4];
  let html = '<table><thead>';
  html += '<tr><th colspan="2" rowspan="2">Participant / Group</th>'
    + d.weeks.map(w=>'<th class="wk" colspan="8">WEEK '+w.n+' · '+fmtDateShort(w.start)+' – '+fmtDateShort(addDays(w.start,6))+'</th>').join('')
    + '</tr><tr>' + d.weeks.map(()=> DOW.map(dd=>'<th>'+dd+'</th>').join('')+'<th>TOT</th>').join('') + '</tr>';
  html += '</thead><tbody>';
  html += '<tr><td class="pn">— dates auto-filled —</td><td></td>'
    + d.weeks.map(w=> w.days.map(day=>'<td>'+fmtDateShort(day)+'</td>').join('')+'<td></td>').join('') + '</tr>';
  t.data.list.slice(0,40).forEach(item=>{
    html += '<tr><td class="pn">'+escHtml(item.name)+'</td><td>'+escHtml(item.ref)+'</td>';
    d.weeks.forEach(w=>{
      let hits = 0;
      w.days.forEach(day=>{
        const on = item.days.has(isoOf(day));
        if(on) hits++;
        html += on ? '<td class="hit">1</td>' : '<td class="miss">·</td>';
      });
      html += '<td class="hit" style="background:#E8DFCC;color:#101310">'+hits+'</td>';
    });
    html += '</tr>';
  });
  if(!t.data.list.length) html += '<tr><td class="pn" colspan="26" style="color:#8A8574">No sign-ins in this window yet. Run the kiosk or add rows by hand.</td></tr>';
  html += '</tbody></table>';
  if(t.data.list.length>40) html += '<p class="hint" style="padding:.6rem .8rem">Showing the first 40 rows — the download contains all '+t.data.list.length+'.</p>';
  $('#weekPreview').innerHTML = html;
  const dlName = (S.settings.kioskId ? String(S.settings.kioskId).replace(/[^A-Za-z0-9]+/g,'-')+'_' : '')
    + 'Group-Attendance_'+ws+'_to_'+end;
  $('#dlXlsx').dataset.name = dlName+'.xlsx';
  $('#dlCsv').dataset.name = dlName+'.csv';
  $('#dlReqCsv').dataset.name = dlName+'_coach-requests.csv';
  $('#previewNote').textContent = 'Sheet 1 mirrors your Weekly Group Attendance Tracker for the window above. A 1 marks attendance, week totals are formulas you can edit on the sheet, and the Database Import sheet carries one row per sign-in.';
}
function backupJson(){
  const payload = { app:'group-signin-kiosk', version:1, exportedAt:new Date().toISOString(), state:S };
  downloadBlob(JSON.stringify(payload,null,2), 'kiosk-backup_'+S.settings.kioskId.replace(/[^A-Za-z0-9]+/g,'-')+'_'+todayISO()+'.json', 'application/json');
}
function mergeBackup(file){
  file.text().then(txt=>{
    let j = null;
    try { j = JSON.parse(txt); } catch(e){ throw new Error('That file is not a kiosk backup.'); }
    const st = j.state || j;
    if(!st || !st.records) throw new Error('That backup has no records.');
    let gAdd=0,pAdd=0,rAdd=0;
    (st.groups||[]).forEach(g=>{ if(!groupByRef(g.ref)){ S.groups.push(g); gAdd++; } });
    (st.people||[]).forEach(p=>{ if(!personByName(p.name)){ S.people.push({id:uid(),name:p.name,active:true,onRoster:p.onRoster!==false,added:Date.now(),addedBy:'merge'}); pAdd++; } });
    (st.records||[]).forEach(r=>{
      const key = normKey(r.name)+'|'+r.groupRef+'|'+r.date;
      if(!S.records.some(x=>normKey(x.name)+'|'+x.groupRef+'|'+x.date===key)){
        S.records.push({ id:uid(), pid:null, name:r.name, groupRef:r.groupRef, groupFull:r.groupFull||groupFull(r.groupRef),
          groupType:r.groupType||'', date:r.date, ts:r.ts||Date.now(), time:r.time||fmtTime12(r.ts||Date.now()),
          source:'merge', kioskId:r.kioskId||'' });
        rAdd++;
      }
    });
    save(); renderAll();
    toast('Merged backup: +'+rAdd+' records, +'+pAdd+' names, +'+gAdd+' groups.');
  }).catch(err=>toast(String(err.message||err),'bad'));
}

/* ---- logo ---- */
const LOGO_SIZES = { sm:'34px', md:'46px', lg:'62px' };
function bytesToB64(buf){
  const u = new Uint8Array(buf); let s = '';
  for(let i=0;i<u.length;i+=8192) s += String.fromCharCode.apply(null, u.subarray(i,i+8192));
  return btoa(s);
}
/* resolves the workbook logo: an uploaded logo uses its stored print PNG,
   the default EMERGE YOU logo is fetched from the asset file */
function getWorkbookLogo(){
  const st = S.settings || {};
  if(st.logo && st.logo.indexOf('data:image')===0){
    if(!st.logoPrint) return Promise.resolve(null);
    const m = /^data:image\/png;base64,(.+)$/i.exec(st.logoPrint);
    return Promise.resolve(m ? { b64:m[1], w:Number(st.logoPrintW)||300, h:Number(st.logoPrintH)||80 } : null);
  }
  return fetch(DEFAULT_LOGO).then(r=>{ if(!r.ok) throw new Error('logo fetch '+r.status); return r.arrayBuffer(); })
    .then(buf=>{
      return new Promise((resolve,reject)=>{
        const url = URL.createObjectURL(new Blob([buf]));
        const im = new Image();
        im.onload = ()=>{ resolve({ b64:bytesToB64(buf), w:im.naturalWidth||720, h:im.naturalHeight||324 }); URL.revokeObjectURL(url); };
        im.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('logo image unreadable')); };
        im.src = url;
      });
    })
    .catch(()=>null);
}
/* rasterise any logo (SVG included) to a PNG for the workbook and for printing */
function rasterizeLogo(dataUri, maxEdge){
  return new Promise((resolve,reject)=>{
    const im = new Image();
    im.onload = ()=>{
      try{
        let w = im.naturalWidth||0, h = im.naturalHeight||0;
        if(!w || !h){ w = 600; h = 200; }
        const sc = Math.min(1, (maxEdge||480)/Math.max(w,h));
        const cw = Math.max(1, Math.round(w*sc)), ch = Math.max(1, Math.round(h*sc));
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        const ctx = c.getContext('2d');
        ctx.drawImage(im, 0, 0, cw, ch);
        resolve({ dataUrl:c.toDataURL('image/png'), w:cw, h:ch });
      }catch(err){ reject(err); }
    };
    im.onerror = ()=>reject(new Error('The logo could not be converted for the workbook.'));
    im.src = dataUri;
  });
}
/* if a logo was uploaded before this feature existed, build its print copy once */
function backfillLogoPrint(){
  const st = S.settings;
  if(!st || !st.logo || st.logoPrint) return;
  rasterizeLogo(st.logo, 480).then(p=>{
    st.logoPrint = p.dataUrl; st.logoPrintW = p.w; st.logoPrintH = p.h; save();
  }).catch(()=>{ /* leave it: the workbook simply exports without the logo */ });
}
function logoState(){
  const st = S.settings;
  return { data: st.logo || '', size: st.logoSize || 'md', plate: st.logoPlate===true, showName: st.logoShowName!==false };
}
function paintLogoSlot(slot, img, svg, st){
  if(!slot) return;
  slot.style.setProperty('--logo-h', LOGO_SIZES[st.size] || LOGO_SIZES.md);
  const src = st.data || DEFAULT_LOGO;          // '' = the shipped EMERGE YOU logo file
  if(img){
    if(img.getAttribute('src')!==src) img.src = src;
    img.classList.remove('hidden');
    img.onerror = ()=>{                          // logo file missing -> fall back to the built-in mark
      img.classList.add('hidden');
      if(svg) svg.classList.remove('hidden');
    };
  }
  if(svg) svg.classList.toggle('hidden', true);
  slot.classList.add('has-img');
  slot.classList.toggle('plate', st.plate);
  return true;
}
function applyLogo(){
  const st = logoState();
  const has = paintLogoSlot($('#logoSlot'), $('#logoImg'), $('#logoSvg'), st);
  if($('#brandText')) $('#brandText').classList.toggle('hidden', has && !st.showName);
}
function renderLogoPreview(){
  const st = logoState();
  const has = paintLogoSlot($('#logoPreviewSlot'), $('#logoPreviewImg'), $('#logoPreviewSlot svg'), st);
  if($('#logoPreviewName')){
    $('#logoPreviewName').textContent = S.settings.org || 'Youth Program';
    $('#logoPreviewName').classList.toggle('hidden', has && !st.showName);
  }
  $('#logoFixture').textContent = has
    ? (S.settings.logoName ? S.settings.logoName+' · ' : '')+'shown on the kiosk header'
    : 'Default mark — no logo uploaded yet';
  ['setLogoSize','setLogoPlate','setLogoName'].forEach(id=>{ const el=$('#'+id); if(el) el.disabled = !has; });
  $('#setLogoSize').value = st.size;
  $('#setLogoPlate').value = st.plate ? 'yes' : 'no';
  $('#setLogoName').value = st.showName ? 'yes' : 'no';
}
function readLogoFile(file){
  const isSvg = /svg/i.test(file.type||'') || /\.svg$/i.test(file.name||'');
  if(!/^image\//.test(file.type||'') && !isSvg) return Promise.reject(new Error('That is not an image file.'));
  if(file.size > 6*1024*1024) return Promise.reject(new Error('That file is over 6 MB — export a smaller logo.'));
  if(isSvg){
    return file.text().then(txt=>{
      if(txt.length > 400000) throw new Error('That SVG is very large — export a simplified version.');
      const b64 = btoa(unescape(encodeURIComponent(txt)));
      return 'data:image/svg+xml;base64,'+b64;
    });
  }
  return new Promise((resolve,reject)=>{
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = ()=>{
      try{
        const max = 360;
        let w = im.naturalWidth || 0, h = im.naturalHeight || 0;
        if(!w || !h) throw new Error('That image has no readable dimensions.');
        const sc = Math.min(1, max/Math.max(w,h));
        w = Math.max(1, Math.round(w*sc)); h = Math.max(1, Math.round(h*sc));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(url);
        let out = c.toDataURL('image/webp', 0.92);
        if(out.indexOf('data:image/webp')!==0) out = c.toDataURL('image/png');
        // a PNG copy at print size, for the exported workbook
        let print = null;
        try{
          const pw = Math.min(1, 480/Math.max(w,h));
          const cx = Math.max(1, Math.round(w*pw)), cy = Math.max(1, Math.round(h*pw));
          const pc = document.createElement('canvas'); pc.width = cx; pc.height = cy;
          pc.getContext('2d').drawImage(im, 0, 0, cx, cy);
          print = { dataUrl: pc.toDataURL('image/png'), w: cx, h: cy };
        }catch(e){ print = null; }
        resolve({ display: out, print: print });
      }catch(err){ URL.revokeObjectURL(url); reject(err); }
    };
    im.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('That image could not be opened.')); };
    im.src = url;
  });
}
function setLogo(data, name, print){
  if(data && data.length > 1400000){
    toast('That logo is too large to store on this device — use a smaller file.','bad');
    return;
  }
  const st = S.settings;
  const prev = { logo:st.logo, name:st.logoName, print:st.logoPrint, pw:st.logoPrintW, ph:st.logoPrintH };
  st.logo = data || '';
  st.logoName = data ? (name || 'logo') : '';
  st.logoPrint = (data && print) ? print.dataUrl : '';
  st.logoPrintW = (data && print) ? print.w : 0;
  st.logoPrintH = (data && print) ? print.h : 0;
  try { save(); }
  catch(err){
    st.logo = prev.logo; st.logoName = prev.name;
    st.logoPrint = prev.print; st.logoPrintW = prev.pw; st.logoPrintH = prev.ph;
    toast('Not enough storage left for that logo — export your records first.','bad');
    applyLogo(); renderLogoPreview(); return;
  }
  if(!data){ st.logoSize = 'md'; st.logoPlate = false; st.logoShowName = true; save(); }
  applyLogo(); renderLogoPreview();
  toast(data
    ? 'Logo set — live on the kiosk header and on the exported workbook.'
    : 'Back to the default mark.');
}
function useDefaultLogo(){
  rasterizeLogo(DEFAULT_LOGO, 480).then(p=>setLogo(DEFAULT_LOGO, 'emerge-you-logo.png', p))
    .catch(()=>setLogo(DEFAULT_LOGO, 'emerge-you-logo.png', null));
}
function handleLogoFile(file){
  readLogoFile(file).then(res=>{
    const display = (typeof res==='string') ? res : res.display;
    const print = (typeof res==='string') ? null : res.print;
    if(print) return setLogo(display, file.name, print);
    return rasterizeLogo(display, 480).then(p=>setLogo(display, file.name, p))
      .catch(()=>setLogo(display, file.name, null));
  }).catch(err=>toast(String(err.message||err), 'bad'));
}
function renderSettings(){
  const st = S.settings;
  $('#setOrg').value = st.org||'';
  $('#setKioskId').value = st.kioskId||'';
  $('#setReset').value = st.resetSeconds||7;
  $('#setIdle').value = st.idleSeconds||15;
  $('#setUnattended').value = st.unattendedSeconds||60;
  $('#setFullNames').value = st.showFullNames ? 'yes':'no';
  $('#setAllowNew').value = st.allowNew===false ? 'no':'yes';
  $('#pinState').textContent = st.pinIsDefault
    ? 'The PIN is still the default 1234. Change it before this device sits at a front desk.'
    : 'A custom PIN is set. Reset it here if you lose it.';
  const rows = S.records.length;
  $('#dataNote').textContent = S.people.length+' participants · '+S.groups.length+' groups · '+rows+' sign-in records stored in this browser only.';
  renderLogoPreview();
}
function saveSettings(){
  const st = S.settings;
  st.org = $('#setOrg').value.trim() || 'Youth Program';
  st.kioskId = $('#setKioskId').value.trim();
  st.resetSeconds = Math.min(30, Math.max(3, Number($('#setReset').value)||7));
  st.idleSeconds = Math.min(120, Math.max(5, Number($('#setIdle').value)||15));
  st.unattendedSeconds = Math.min(600, Math.max(15, Number($('#setUnattended').value)||60));
  st.showFullNames = $('#setFullNames').value==='yes';
  st.allowNew = $('#setAllowNew').value!=='no';
  save(); applyKioskSettings(); updateCounts(); armIdleReset(); toast('Kiosk settings saved.');
}
function savePin(){
  const a = digits($('#setPinNew').value), b = digits($('#setPinConfirm').value);
  if(a.length!==4){ toast('The PIN must be exactly 4 digits.','bad'); return; }
  if(a!==b){ toast('Those two PINs do not match.','bad'); return; }
  S.settings.pin = a; S.settings.pinIsDefault = (a==='1234');
  save(); renderSettings();
  $('#setPinNew').value=''; $('#setPinConfirm').value='';
  toast('Coach PIN updated.');
}

/* ============================================================
   7. wiring
   ============================================================ */
function wire(){
  // clock + kiosk input
  $('#nameInput').addEventListener('input', ()=>{ renderSug(); resetIdleTimer(); });
  $('#nameInput').addEventListener('keydown', e=>{
    if(e.key==='ArrowDown' || e.key==='ArrowUp'){
      e.preventDefault();
      if(!matches.length) return;
      selIdx = e.key==='ArrowDown' ? Math.min(matches.length-1, selIdx+1) : Math.max(0, selIdx-1);
      highlightSug(); return;
    }
    if(e.key==='Enter'){
      e.preventDefault();
      if(matches.length){ choosePerson(matches[selIdx>=0?selIdx:0]); }
      else if(S.settings.allowNew && normKey($('#nameInput').value).length>=3){ addNewPerson(); }
      return;
    }
    if(e.key==='Escape'){ $('#nameInput').value=''; renderSug(); }
  });
  $('#addNewBtn').addEventListener('click', addNewPerson);
  $('#backToName').addEventListener('click', ()=>resetKiosk());
  $('#cardBack').addEventListener('click', ()=>{ showGroups(); });
  $('#punchBtn').addEventListener('click', punchIn);
  $('#doneNow').addEventListener('click', ()=>resetKiosk());
  $('#staffBtn').addEventListener('click', openPin);
  $('#pinCancel').addEventListener('click', closePin);
  buildKeypad();

  document.addEventListener('keydown', e=>{
    if($('#pinOverlay').classList.contains('on')){
      if(/^[0-9]$/.test(e.key)){ e.preventDefault(); pinDigit(e.key); }
      else if(e.key==='Backspace'){ e.preventDefault(); pins=pins.slice(0,-1); renderPin(); }
      else if(e.key==='Escape'){ closePin(); }
      return;
    }
    if($('#reqOverlay').classList.contains('on') && e.key==='Escape'){ closeReq(); return; }
    if(document.body.dataset.mode==='kiosk' && step==='name' && e.key.length===1 && document.activeElement!==$('#nameInput')){
      $('#nameInput').focus();
    }
  });
  // any interaction restarts the unattended countdown
  ['pointerdown','touchstart','keydown'].forEach(ev=>document.addEventListener(ev, ()=>{
    if(document.body.dataset.mode==='kiosk' && idleArmed()) armIdleReset();
  }, true));

  // keep the kiosk focused
  setInterval(()=>{
    if(document.body.dataset.mode==='kiosk' && !$('#pinOverlay').classList.contains('on')
      && !$('#reqOverlay').classList.contains('on')
      && document.activeElement!==$('#nameInput') && step==='name') $('#nameInput').focus();
  }, 4000);

  // nav
  $$('.navbtn').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  $('#railKioskBtn').addEventListener('click', ()=>{ setMode('kiosk'); resetKiosk(); });

  // roster
  $('#addPasted').addEventListener('click', ()=>{
    const raw = $('#pasteNames').value;
    if(!raw.trim()){ toast('Paste some names first.','bad'); return; }
    const list = parseTable(raw.replace(/\r/g,''));
    const flat = [];
    list.forEach(r=> r.forEach(c=>{ if(c!=='') flat.push(c); }));
    const r = addNames(flat, 'paste');
    toast('Added '+r.added+' name'+(r.added===1?'':'s')+(r.skipped? ', skipped '+r.skipped:'')+'.');
    $('#pasteNames').value = '';
  });
  $('#clearPaste').addEventListener('click', ()=>{ $('#pasteNames').value=''; });
  $('#rosterFileBtn').addEventListener('click', ()=>$('#rosterFile').click());
  $('#rosterFile').addEventListener('change', e=>{ if(e.target.files[0]) handleRosterFile(e.target.files[0]); });
  const drop = $('#rosterDrop');
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e=>{ const f=e.dataTransfer.files[0]; if(f) handleRosterFile(f); });
  $('#rosterSearch').addEventListener('input', renderRoster);
  $('#mergeDupes').addEventListener('click', mergeDuplicates);
  $('#rosterBody').addEventListener('click', e=>{
    const b = e.target.closest('button[data-act]');
    if(!b) return;
    const p = findPerson(b.dataset.id);
    if(!p) return;
    if(b.dataset.act==='del'){
      if(!confirm('Remove '+p.name+' from the kiosk roster? Their sign-in records stay.')) return;
      S.people = S.people.filter(x=>x.id!==p.id); save(); renderRoster(); updateCounts();
    } else if(b.dataset.act==='ok'){
      p.onRoster = true; save(); renderRoster(); updateCounts(); toast(p.name+' confirmed on the roster.');
    } else if(b.dataset.act==='rename'){
      const nn = prompt('Correct name:', p.name);
      if(nn && nn.trim()){ p.name = titleCase(nn); p.onRoster = true; save(); renderRoster(); updateCounts(); }
    }
  });

  // groups
  $('#addGroup').addEventListener('click', ()=>{
    S.groups.push({ref:'NEW GROUP', full:'New group — rename me', desc:'', type:'YG'});
    save(); renderGroups(); updateCounts();
  });
  $('#saveGroups').addEventListener('click', saveGroups);
  $('#resetGroups').addEventListener('click', ()=>{
    if(!confirm('Restore the 13 default groups from the reference sheet? Your current list is replaced.')) return;
    S.groups = DEFAULT_GROUPS.map(g=>({ref:g[0],full:g[1],desc:g[2],type:g[3]}));
    save(); renderGroups(); updateCounts(); toast('Default group list restored.');
  });

  // records
  ['recFrom','recTo','recGroup','recSearch'].forEach(id=>{
    $('#'+id).addEventListener('input', renderRecords);
    $('#'+id).addEventListener('change', renderRecords);
  });
  $('#recThisWeek').addEventListener('click', ()=>{
    $('#recFrom').value = sundayISO();
    $('#recTo').value = isoOf(addDays(parseISO(sundayISO()),6));
    renderRecords();
  });
  $('#recAll').addEventListener('click', ()=>{
    $('#recFrom').value=''; $('#recTo').value=''; $('#recGroup').value=''; $('#recSearch').value='';
    renderRecords();
  });
  $('#manAdd').addEventListener('click', addManualRecord);

  // export
  $('#exWeekStart').addEventListener('change', renderExport);
  $('#exScope').addEventListener('change', renderExport);
  $('#exPrev3').addEventListener('click', ()=>{ $('#exWeekStart').value = isoOf(addDays(parseISO($('#exWeekStart').value||sundayISO()),-21)); renderExport(); });
  $('#exNext3').addEventListener('click', ()=>{ $('#exWeekStart').value = isoOf(addDays(parseISO($('#exWeekStart').value||sundayISO()),21)); renderExport(); });
  $('#exThisWeek').addEventListener('click', ()=>{ $('#exWeekStart').value = sundayISO(); renderExport(); });
  $('#dlXlsx').addEventListener('click', ()=>{
    const ws = $('#exWeekStart').value, scope = $('#exScope').value;
    getWorkbookLogo().then(logo=>{
      const bytes = buildWorkbook(ws, scope, logo);
      downloadBlob(bytes, $('#dlXlsx').dataset.name || 'Group-Attendance.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      S.settings.weekStart = ws; save();
      toast(logo ? 'Workbook downloaded — branded, dates editable on the sheet.'
                 : 'Workbook downloaded (no logo image could be loaded on this device).');
    }).catch(err=>toast('Could not build the workbook: '+(err.message||err),'bad'));
  });
  $('#dlCsv').addEventListener('click', ()=>{
    const ws = $('#exWeekStart').value, scope = $('#exScope').value;
    downloadBlob(makeCsv(csvAllRows(ws,scope)), $('#dlCsv').dataset.name || 'Group-Attendance.csv', 'text/csv');
    toast('Import rows downloaded as CSV — sign-ins and coach requests.');
  });
  $('#dlReqCsv').addEventListener('click', ()=>{
    const ws = $('#exWeekStart').value, scope = $('#exScope').value;
    downloadBlob(makeCsv(csvReqRows(ws,scope)), $('#dlReqCsv').dataset.name || 'Coach-Requests.csv', 'text/csv');
    toast('Coach requests downloaded for case management.');
  });
  $('#dlJson').addEventListener('click', backupJson);
  $('#importJsonBtn').addEventListener('click', ()=>$('#importJsonFile').click());
  $('#importJsonFile').addEventListener('change', e=>{ if(e.target.files[0]) mergeBackup(e.target.files[0]); e.target.value=''; });

  // settings
  $('#logoFileBtn').addEventListener('click', ()=>$('#logoFile').click());
  $('#logoFile').addEventListener('change', e=>{ if(e.target.files[0]) handleLogoFile(e.target.files[0]); e.target.value=''; });
  const ldrop = $('#logoDrop');
  ['dragenter','dragover'].forEach(ev=>ldrop.addEventListener(ev, e=>{ e.preventDefault(); ldrop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev=>ldrop.addEventListener(ev, e=>{ e.preventDefault(); ldrop.classList.remove('over'); }));
  ldrop.addEventListener('drop', e=>{ const f=e.dataTransfer.files[0]; if(f) handleLogoFile(f); });
  $('#logoRemoveBtn').addEventListener('click', ()=>{
    if(S.settings.logo===DEFAULT_LOGO){ toast('The Emerge You logo is already in use.'); return; }
    useDefaultLogo();
  });
  $('#setLogoSize').addEventListener('change', e=>{ S.settings.logoSize = e.target.value; save(); applyLogo(); renderLogoPreview(); });
  $('#setLogoPlate').addEventListener('change', e=>{ S.settings.logoPlate = e.target.value==='yes'; save(); applyLogo(); renderLogoPreview(); });
  $('#setLogoName').addEventListener('change', e=>{ S.settings.logoShowName = e.target.value!=='no'; save(); applyLogo(); renderLogoPreview(); });
  // flow: coach question + new participant
  $('#coachYes').addEventListener('click', ()=>openReq({ ctx:'ask', backStep:'coachask', punch:true }));
  $('#coachNo').addEventListener('click', showCard);
  $('#enrollYes').addEventListener('click', enrollYes);
  $('#enrollNo').addEventListener('click', enrollNo);
  $('#phoneYes').addEventListener('click', phoneYes);
  $('#phoneNo').addEventListener('click', phoneNo);
  $('#qrDone').addEventListener('click', qrDone);
  $$('[data-restart]').forEach(b=>b.addEventListener('click', resetKiosk));
  // coach request (kiosk side)
  $('#askCoachCard').addEventListener('click', ()=>openReq({ ctx:'card', backStep:'card', punch:true }));
  $('#reqCancel').addEventListener('click', reqCancelFlow);
  $('#reqDone').addEventListener('click', finishRequest);
  $('#reqSend').addEventListener('click', submitRequest);
  $$('#urgPick button').forEach(b=>b.addEventListener('click',()=>{
    reqDraft.urgency = b.dataset.urg;
    $$('#urgPick button').forEach(x=>x.setAttribute('aria-pressed', x===b ? 'true':'false'));
  }));
  // coach requests (console)
  ['reqFrom','reqTo','reqStatus','reqUrgency','reqSearchF'].forEach(id=>{
    $('#'+id).addEventListener('input', renderRequests);
    $('#'+id).addEventListener('change', renderRequests);
  });
  $('#reqResetF').addEventListener('click',()=>{
    $('#reqFrom').value=''; $('#reqTo').value=''; $('#reqSearchF').value='';
    $('#reqStatus').value='open'; $('#reqUrgency').value=''; renderRequests();
  });
  $('#reqAckAll').addEventListener('click',()=>{
    const open = S.requests.filter(r=>r.status!=='acknowledged');
    if(!open.length){ toast('Nothing is waiting.'); return; }
    const who = prompt('Who saw these '+open.length+' requests?', (alertCoaches()[0]||{}).name || 'Coach');
    if(who===null) return;
    open.forEach(r=>{ r.status='acknowledged'; r.ackBy=titleCase(who)||'Coach'; r.ackAt=Date.now(); });
    save(); renderRequests(); updateCounts(); toast('Acknowledged '+open.length+' request'+(open.length>1?'s':'')+'.');
  });
  // coach alerts
  $('#addCoach').addEventListener('click',()=>{
    S.coaches.push({ id:uid(), name:'New coach', email:'', role:'', notify:true, active:true, placeholder:false });
    save(); renderAlerts(); updateCounts();
  });
  $('#saveCoaches').addEventListener('click', saveCoachList);
  $('#saveMail').addEventListener('click', saveMailSettings);
  $('#testMail').addEventListener('click', testMail);
  $('#setMailMode').addEventListener('change',()=>{
    const m = $('#setMailMode').value;
    $('#mailRelayFields').classList.toggle('hidden', m!=='webhook');
    $('#mailModeNote').textContent = (MAIL_MODES[m]||{}).note || '';
  });
  $('#copySnippet').addEventListener('click',()=>{
    const t = $('#relaySnippet').textContent;
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(()=>toast('Relay script copied — paste it into a new Apps Script project.'))
        .catch(()=>toast('Copy failed — select the code and copy it manually.','bad'));
    } else toast('Select the code and copy it manually.');
  });
  $('#saveSettings').addEventListener('click', saveSettings);
  $('#savePin').addEventListener('click', savePin);
  $('#clearRecords').addEventListener('click', ()=>{
    if(!confirm('Delete all '+S.records.length+' sign-in records? Export first — this cannot be undone.')) return;
    S.records = []; save(); renderAll(); toast('All sign-in records deleted.');
  });
  $('#factoryReset').addEventListener('click', ()=>{
    if(!confirm('Reset everything — roster, groups, records and settings? This cannot be undone.')) return;
    try { localStorage.removeItem(LSKEY); } catch(e){}
    S = defaultState(); save(); renderAll(); resetKiosk();
    toast('Kiosk reset to defaults.');
  });
}

/* ============================================================
   8. boot
   ============================================================ */
function init(){
  loadState();
  if(!S.settings.weekStart) S.settings.weekStart = sundayISO();
  $('#qrImg').src = ENROLL_QR;
  $('#qrUrl').textContent = ENROLL_FORM_URL;
  clockTick(); setInterval(clockTick, 15000);
  applyKioskSettings();
  $('#exWeekStart').value = S.settings.weekStart;
  wire();
  renderAll();
  setMode('kiosk');
  setStep('name');
  try { $('#nameInput').focus(); } catch(e){}
}
init();
})();
