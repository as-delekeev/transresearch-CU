"use strict";
/* ============================================================
 *  app.js — логика приложения «Учёт заявок 2-й волны»
 *  Часть 1: утилиты, модель, хранилище, состояние, правила,
 *           чипы, модалка/тост, навигация, дашборд.
 *  Конфигурация: config.js (должен быть загружен до этого файла).
 * ============================================================ */

/* ---------- УТИЛИТЫ ---------- */
function esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function today(){ return new Date().toISOString().slice(0,10); }
function nowIso(){ return new Date().toISOString(); }
function fmtNum(n){ if(n==null||isNaN(n)) return ''; return Number(n).toLocaleString('ru-RU'); }
function fmtMoney(n){ if(n==null||isNaN(n)) return '—'; return Number(n).toLocaleString('ru-RU')+' ₽'; }
function fmtDate(d){ if(!d) return '—'; var p=String(d).split('-'); return p.length===3 ? p[2]+'.'+p[1]+'.'+p[0] : d; }
function fmtDateTime(iso){ if(!iso) return '—'; var d=String(iso); return fmtDate(d.slice(0,10))+(d.length>10?' '+d.slice(11,16):''); }
function daysUntil(isoDate){ if(!isoDate) return null; var t=Date.parse(isoDate+'T00:00:00'); var n=new Date(); var cur=new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime(); return Math.round((t-cur)/86400000); }
function slug(s){ return String(s||'').toLowerCase().trim(); }
function num(v){ if(v===null||v===undefined||v==='') return null; var n=Number(v); return isNaN(n)?null:n; }
function debounce(fn,ms){ var t; return function(){ var a=arguments,c=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(c,a); },ms); }; }
function short(s,n){ s=String(s||''); return s.length>n? s.slice(0,n-1)+'…' : s; }
function stLabel(id){ var s=CONFIG.statuses.find(function(x){return x.id===id;}); return s? s.label : (id||'—'); }
function rlLabel(id){ var r=CONFIG.relevance.find(function(x){return x.id===id;}); return r? r.label : (id||'—'); }
function corpPri(corp){ var c=CONFIG.corporations.find(function(x){return x.name===corp;}); return c? c.priority : 'normal'; }
function stOrder(id){ var s=CONFIG.statuses.find(function(x){return x.id===id;}); return s? s.order : 99; }
function rlOrder(id){ var r=CONFIG.relevance.find(function(x){return x.id===id;}); return r? r.order : 99; }
function parseTrl(v){ if(v==null||v==='') return null; var m=String(v).match(/TRL\s*(\d+)/i); if(m) return Number(m[1]); return num(v); }
function srcOf(f){ return (f&&f.src)? f.src : 'b'; }
function srcTag(f){ var s=srcOf(f); return ' <span class="src '+(s==='b'?'b':'m')+'">'+(s==='b'?'Битрикс':'Вручную')+'</span>'; }

/* ---------- МОДЕЛЬ ДАННЫХ ---------- */
function emptyProject(){
  return {
    id:null,
    name:{v:'',src:'b'}, annotation:{v:'',src:'b'},
    leaderName:{v:'',src:'b'}, leaderEmail:{v:'',src:'b'}, leaderPhone:{v:'',src:'b'},
    org:{v:'',src:'b'}, team:{v:'',src:'b'},
    formDir:{v:'',src:'b'}, mapDir:{v:'',src:'m'}, corp:{v:'',src:'m'}, request:{v:'',src:'m'},
    trlCur:{v:null,src:'b'}, trlTarget:{v:null,src:'b'},
    budget:{v:null,src:'b'}, fot:{v:null,src:'b'}, overhead:{v:null,src:'b'}, termMonths:{v:null,src:'b'},
    submittedDate:{v:'',src:'b'}, createdAt:{v:'',src:'b'}, industry:{v:'',src:'b'},
    result1:{v:'',src:'b'}, resultDate1:{v:'',src:'b'}, resultTarget1:{v:'',src:'b'},
    result2:{v:'',src:'b'}, resultDate2:{v:'',src:'b'}, resultTarget2:{v:'',src:'b'},
    result3:{v:'',src:'b'}, resultDate3:{v:'',src:'b'}, resultTarget3:{v:'',src:'b'},
    result4:{v:'',src:'b'}, resultDate4:{v:'',src:'b'}, resultTarget4:{v:'',src:'b'},
    teamFio1:{v:'',src:'b'}, teamPos1:{v:'',src:'b'}, teamRole1:{v:'',src:'b'}, teamTasks1:{v:'',src:'b'},
    teamFio2:{v:'',src:'b'}, teamPos2:{v:'',src:'b'}, teamRole2:{v:'',src:'b'}, teamTasks2:{v:'',src:'b'},
    teamFio3:{v:'',src:'b'}, teamPos3:{v:'',src:'b'}, teamRole3:{v:'',src:'b'}, teamTasks3:{v:'',src:'b'},
    teamFio4:{v:'',src:'b'}, teamPos4:{v:'',src:'b'}, teamRole4:{v:'',src:'b'}, teamTasks4:{v:'',src:'b'},
    contrFio1:{v:'',src:'b'}, contrOrg1:{v:'',src:'b'}, contrRole1:{v:'',src:'b'}, contrTasks1:{v:'',src:'b'},
    contrFio2:{v:'',src:'b'}, contrOrg2:{v:'',src:'b'}, contrRole2:{v:'',src:'b'}, contrTasks2:{v:'',src:'b'},
    contrFio3:{v:'',src:'b'}, contrOrg3:{v:'',src:'b'}, contrRole3:{v:'',src:'b'}, contrTasks3:{v:'',src:'b'},
    contrFio4:{v:'',src:'b'}, contrOrg4:{v:'',src:'b'}, contrRole4:{v:'',src:'b'}, contrTasks4:{v:'',src:'b'},
    materials:{reg:false,app:false,form:false,present:false},
    wave1:{partic:false, score:'', decision:'', linkStatus:'none'},
    relevance:{v:'none',src:'m'}, expertScore:{v:'',src:'m'}, rationale:{v:'',src:'m'},
    status:{v:'',src:'b'}, nextStep:{v:'',src:'m'}, responsible:{v:'',src:'m'}, nextDue:{v:'',src:'m'},
    slot:{v:'',src:'m'},
    comments:[], contacts:[], history:[], extra:{},
    created:'', updated:'', demo:false
  };
}
function sanitize(p){
  var np=Object.assign(emptyProject(), p||{});
  np.extra=np.extra||{}; np.comments=np.comments||[]; np.contacts=np.contacts||[]; np.history=np.history||[];
  np.wave1=Object.assign({partic:false,score:'',decision:'',linkStatus:'none'}, np.wave1||{});
  np.materials=Object.assign({reg:false,app:false,form:false,present:false}, np.materials||{});
  return np;
}
function isEmptyReg(p){ return CONFIG.regOnlyFields.every(function(f){ return slug(p[f]&&p[f].v)===''; }); }
function nameOf(p){ return (p.name&&p.name.v)||'(без названия)'; }
function findProj(id){ return store.projects.find(function(x){ return String(x.id)===String(id); }); }
function pushHistory(p, field, was, is, author){
  p.history=p.history||[];
  p.history.unshift({date:nowIso(), field:field, from:String(was==null?'':was), to:String(is==null?'':is), author:author||''});
  if(p.history.length>500) p.history.length=500;
}

/* ---------- ХРАНИЛИЩЕ (IndexedDB + fallback localStorage) ---------- */
var DB = { db:null, ready:false, dbName:'transresearch_wave2', store:'projects' };
var LS_KEY='transresearch_wave2_data_v1';
var UI_KEY='transresearch_wave2_ui_v1';
function openDB(){
  return new Promise(function(resolve){
    var req;
    try{ req=indexedDB.open(DB.dbName,1); } catch(e){ DB.ready=false; resolve(false); return; }
    req.onupgradeneeded=function(ev){ var d=ev.target.result; if(!d.objectStoreNames.contains(DB.store)) d.createObjectStore(DB.store,{keyPath:'id'}); };
    req.onsuccess=function(ev){ DB.db=ev.target.result; DB.ready=true; resolve(true); };
    req.onerror=function(){ DB.ready=false; resolve(false); };
  });
}
function lsLoad(){ try{ var raw=localStorage.getItem(LS_KEY); return raw? JSON.parse(raw):null; }catch(e){ return null; } }
function lsSave(projects){ try{ localStorage.setItem(LS_KEY, JSON.stringify(projects)); return true; }catch(e){ return false; } }
function dbAll(){
  return new Promise(function(resolve){
    if(!DB.ready){ resolve(lsLoad()||[]); return; }
    var r=DB.db.transaction(DB.store,'readonly').objectStore(DB.store).getAll();
    r.onsuccess=function(){ resolve(r.result||[]); };
    r.onerror=function(){ resolve(lsLoad()||[]); };
  });
}
function dbPut(proj){
  return new Promise(function(resolve){
    if(!DB.ready){ var a=lsLoad()||[]; var i=a.findIndex(function(p){return String(p.id)===String(proj.id);}); if(i>=0)a[i]=proj; else a.push(proj); lsSave(a); resolve(true); return; }
    var t=DB.db.transaction(DB.store,'readwrite').objectStore(DB.store);
    t.put(proj); t.oncomplete=function(){ resolve(true); }; t.onerror=function(){ resolve(false); };
  });
}
function dbDelete(id){
  return new Promise(function(resolve){
    if(!DB.ready){ var a=lsLoad()||[]; lsSave(a.filter(function(p){return String(p.id)!==String(id);})); resolve(true); return; }
    var t=DB.db.transaction(DB.store,'readwrite').objectStore(DB.store);
    t.delete(id); t.oncomplete=function(){ resolve(true); }; t.onerror=function(){ resolve(false); };
  });
}
function dbClear(){
  return new Promise(function(resolve){
    if(!DB.ready){ localStorage.removeItem(LS_KEY); resolve(true); return; }
    var t=DB.db.transaction(DB.store,'readwrite').objectStore(DB.store);
    t.clear(); t.oncomplete=function(){ resolve(true); }; t.onerror=function(){ resolve(false); };
  });
}

/* ---------- СОСТОЯНИЕ ПРИЛОЖЕНИЯ ---------- */
var store = { projects: [] };
var App = {
  screen:'dashboard', arg:null,
  sel:new Set(),
  card:{ id:null, tab:'overview', zone:'appl' },
  trash:[],
  saveTimer:null,
  ui:null,
  wave1:[]
};
function loadUi(){
  var def={ search:'', filters:{}, sort:{key:'id',dir:1}, cols:LIST_COLS.map(function(c){return c.key;}), theme:'std' };
  try{
    var raw=localStorage.getItem(UI_KEY);
    if(!raw) return def;
    var u=JSON.parse(raw);
    return {
      search:u.search||'',
      filters:u.filters||{},
      sort:(u.sort&&u.sort.key)? u.sort : def.sort,
      cols:(Array.isArray(u.cols)&&u.cols.length)? u.cols : def.cols,
      theme:u.theme||'std'
    };
  }catch(e){ return def; }
}
function persistUi(){ try{ localStorage.setItem(UI_KEY, JSON.stringify(App.ui)); }catch(e){} }

/* ---------- РАСЧЁТЫ И ПРАВИЛА ---------- */
function deriveStatus(p){
  var hasProjectData =
    num(p.trlTarget&&p.trlTarget.v)!=null ||
    num(p.budget&&p.budget.v)!=null ||
    (p.result1&&p.result1.v&&String(p.result1.v).trim()) ||
    (p.teamFio1&&p.teamFio1.v&&String(p.teamFio1.v).trim());
  return hasProjectData ? 'applied' : 'reg';
}
function statusOf(p){
  var v=p.status&&p.status.v;
  if(v && srcOf(p.status)==='m') return v;
  return deriveStatus(p);
}
function calcDerived(p){
  var b=num(p.budget&&p.budget.v), f=num(p.fot&&p.fot.v), o=num(p.overhead&&p.overhead.v);
  return {
    fotShare: (b>0&&f!=null)? f/b : null,
    overheadOnFot: (f>0&&o!=null)? o/f : null,
    overheadOnBudget: (b>0&&o!=null)? o/b : null
  };
}
function checkRules(p){
  var w=[], R=CONFIG.rules;
  var b=num(p.budget&&p.budget.v), f=num(p.fot&&p.fot.v), o=num(p.overhead&&p.overhead.v);
  var t=num(p.termMonths&&p.termMonths.v), tt=num(p.trlTarget&&p.trlTarget.v);
  if(b!=null && b>R.budgetMax) w.push({type:'budget', title:'Бюджет превышает лимит программы', body:'Бюджет '+fmtMoney(b)+' › лимит '+fmtMoney(R.budgetMax)+'. Разница '+fmtMoney(b-R.budgetMax)+'.', level:'danger'});
  if(t!=null && t>R.termMonthsMax) w.push({type:'term', title:'Срок превышает '+R.termMonthsMax+' мес.', body:'Срок '+t+' мес. › '+R.termMonthsMax+' мес.', level:'warn'});
  if(b>0 && f!=null && f/b>R.fotShareMax) w.push({type:'fot', title:'ФОТ превышает 60 % бюджета', body:'ФОТ '+fmtMoney(f)+' = '+fmtNum((f/b*100).toFixed(1))+' % бюджета › 60 %. Допустимый max ФОТ '+fmtMoney(Math.floor(b*R.fotShareMax))+'.', level:'warn'});
  if(f>0 && o!=null && o/f>R.overheadFotShareMax) w.push({type:'overhead', title:'Накладные превышают 10 % от ФОТ', body:'Накладные '+fmtMoney(o)+' = '+fmtNum((o/f*100).toFixed(1))+' % от ФОТ '+fmtMoney(f)+' › 10 %. Допустимый max '+fmtMoney(Math.floor(f*R.overheadFotShareMax))+'.', level:'warn'});
  if(tt!=null && (tt<R.trlTargetMin || tt>R.trlTargetMax)) w.push({type:'trl', title:'TRL вне диапазона 2–3', body:'Целевой TRL = '+tt+' (ожидается '+R.trlTargetMin+'–'+R.trlTargetMax+').', level:'warn'});
  if(p.nextDue&&p.nextDue.v && !(statusOf(p)==='ok'||statusOf(p)==='no'||statusOf(p)==='withdrawn')){
    var dd=daysUntil(p.nextDue.v);
    if(dd!=null && dd<0) w.push({type:'overdue', title:'Следующий шаг просрочен', body:'Срок шага '+fmtDate(p.nextDue.v)+' ('+Math.abs(dd)+' дн. назад).', level:'danger'});
  }
  return w;
}
function needsManual(p){
  var fd=slug(p.formDir&&p.formDir.v);
  if(!fd) return true;
  var hit=CONFIG.genFormToMap.find(function(x){return slug(x.form)===fd;});
  var hay=(fd+' '+slug(p.name&&p.name.v)+' '+slug(p.annotation&&p.annotation.v)).toLowerCase();
  for(var i=0;i<CONFIG.needsManualHint.length;i++) if(hay.indexOf(CONFIG.needsManualHint[i])>=0) return true;
  return !hit;
}
function manualReason(p){
  var fd=slug(p.formDir&&p.formDir.v);
  if(!fd) return 'Направление в анкете не указано';
  var hay=(fd+' '+slug(p.name&&p.name.v)+' '+slug(p.annotation&&p.annotation.v)).toLowerCase();
  var n=CONFIG.needsManualHint.find(function(h){return hay.indexOf(h)>=0;});
  if(n) return 'Направление по карте неочевидно («'+(p.formDir&&p.formDir.v||'')+'»)';
  return 'Нет соответствия в таблице соответствий';
}
function proposeWave1(proj, wave1projects){
  var out=[], em=slug(proj.leaderEmail&&proj.leaderEmail.v), nm=slug(proj.name&&proj.name.v);
  if(!em && !nm) return out;
  (wave1projects||[]).forEach(function(w){
    var score=0;
    if(em && em===slug(w.leaderEmail)) score+=60;
    if(nm){ var wn=slug(w.name); if(wn && (wn.indexOf(nm)>=0 || nm.indexOf(wn)>=0)) score+=40; }
    if(score>0) out.push({id:w.id, name:w.name, score:score, wave1:w});
  });
  out.sort(function(a,b){return b.score-a.score;});
  return out.slice(0,3);
}

/* ---------- ЧИПЫ И ПЛАШКИ ---------- */
function statusChip(id){
  var map={reg:'st-reg',applied:'st-app',formfilled:'st-form',check:'st-check',expert:'st-expert',invited:'st-invite',presented:'st-presented',ok:'st-ok',no:'st-no',withdrawn:'st-withdrawn'};
  return '<span class="chip '+(map[id]||'st-reg')+'">'+esc(stLabel(id))+'</span>';
}
function relChip(id){
  var map={very:'rl-very',high:'rl-high',mid:'rl-mid',low:'rl-low',none:'rl-none'};
  return '<span class="chip '+(map[id]||'rl-none')+'">'+esc(rlLabel(id||'none'))+'</span>';
}
function prioChip(corp){
  var pr=corpPri(corp);
  if(pr==='high') return ' <span class="chip prior-up">▲ высокий приоритет</span>';
  if(pr==='interest') return ' <span class="chip prior-up">◆ интерес ЦУ</span>';
  return '';
}
function wave1Chip(p){
  if(!p.wave1||!p.wave1.partic) return '';
  if(p.wave1.linkStatus==='confirmed') return ' <span class="chip st-expert">1-я волна ✓</span>';
  return ' <span class="hz-tag">1-я волна · Гипотеза</span>';
}
function renderManualTag(p){
  if(!needsManual(p)) return '';
  return ' <span class="chip warn-chip" title="'+esc(manualReason(p))+'">⚠ Ручное сопоставление</span>';
}
function renderWarnings(p){
  return checkRules(p).map(function(x){
    return '<div class="alert '+(x.level||'')+'"><div><p class="a-t">'+esc(x.title)+'</p><div class="a-b">'+esc(x.body)+'</div></div></div>';
  }).join('');
}
function trlColor(t){ if(t==null) return ''; if(t<=3) return '#3a7a2c'; if(t<=5) return '#7fa32c'; if(t<=7) return '#d97b2c'; return '#b23a3a'; }
function trlLabel(t){ if(t==null) return ''; return t+(t<=3?' · в норме':t<=5?' · допустимо':t<=7?' · высокий':' · вне диапазона'); }
function trlChip(v){
  var t=num(v);
  if(t==null) return '<span class="chip">TRL — (нет данных)</span>';
  return '<span class="chip" style="background:'+trlColor(t)+';color:#fff;border-color:'+trlColor(t)+'">TRL '+esc(v)+'</span>';
}
function orgChip(org){
  if(!org) return '';
  var m=String(org).toUpperCase().match(/ООО|АО|ИП|ПАО/);
  return m? ' <span class="chip org-bad">'+m[0]+'</span>' : '';
}
function segColor(st){
  var m={reg:'#c9c2b8',applied:'#8fb3d9',formfilled:'#9ab0d9',check:'#e0b85c',expert:'#b58cd6',invited:'#8fc98f',presented:'#7fc5c0',ok:'#6B8E4E',no:'#B23A3A',withdrawn:'#b7ae9f'};
  return m[st]||'#c9c2b8';
}
function statusDeadlineBadge(p){
  if(deriveStatus(p)!=='reg') return '';
  var dd=daysUntil(CONFIG.app.deadlineSubmit);
  return '<span class="chip warn-chip">Подача до '+fmtDate(CONFIG.app.deadlineSubmit)+(dd!=null?(dd>=0?' · осталось '+dd+' дн.':' · просрочено'):'')+'</span>';
}
function metaItem(k,v){ return '<div class="meta-item"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>'; }

/* ---------- МОДАЛКА, ТОСТ, ПОПОВЕР ---------- */
var modalRoot, modalBox, toastEl, popEl=null;
function openModal(html){
  modalBox.innerHTML='<button class="modal-close" data-act="modal-close" title="Закрыть (Esc)">×</button>'+html;
  modalRoot.classList.add('open');
}
function closeModal(){ modalRoot.classList.remove('open'); }
function toast(msg,type,action){
  toastEl.className='toast show '+(type||'');
  toastEl.innerHTML=esc(msg)+(action?' <button class="t-act" data-act="'+esc(action.act)+'" data-id="'+esc(action.id||'')+'">'+esc(action.label)+'</button>':'');
  clearTimeout(toastEl._tm);
  toastEl._tm=setTimeout(function(){ toastEl.className='toast'; }, action?6000:2600);
}
function closePopover(){ if(popEl){ popEl.remove(); popEl=null; } }
function openPopover(anchor, html){
  closePopover();
  popEl=document.createElement('div');
  popEl.className='popover';
  popEl.innerHTML=html;
  document.body.appendChild(popEl);
  var r=anchor.getBoundingClientRect();
  popEl.style.left=Math.max(8,Math.min(r.left, window.innerWidth-380))+'px';
  popEl.style.top=(r.bottom+4)+'px';
}

/* ---------- НАВИГАЦИЯ ---------- */
var NAV_ITEMS=[
  {id:'dashboard', label:'Дашборд',          ico:'▤'},
  {id:'list',      label:'Список заявок',    ico:'☰'},
  {id:'map',       label:'Карта направлений',ico:'⬡'},
  {id:'present',   label:'Презентации',      ico:'◷'},
  {id:'import',    label:'Импорт / экспорт', ico:'⇅'},
  {id:'refs',      label:'Справочники',      ico:'☰'}
];
function buildNav(){
  var nav=document.getElementById('sidenav')||document.getElementById('topnav');
  if(!nav) return;
  nav.innerHTML=NAV_ITEMS.map(function(n){
    return '<button data-act="nav" data-screen="'+n.id+'"><span class="ico">'+n.ico+'</span><span class="lbl">'+n.label+'</span></button>';
  }).join('');
}
function crumbsText(id){
  var n=NAV_ITEMS.find(function(x){return x.id===id;});
  return n? n.label : '';
}
function go(screen, arg){
  App.screen=screen; App.arg=arg||null;
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  var el=document.getElementById('screen-'+screen);
  if(el) el.classList.add('active');
  var navRoot=document.getElementById('sidenav')||document.getElementById('topnav');
  if(navRoot) navRoot.querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b.dataset.screen===screen); });
  var cr=document.getElementById('crumbs');
  if(cr) cr.textContent=(screen==='card'?'Список заявок · Карточка проекта':crumbsText(screen));
  closePopover();
  if(screen==='dashboard') renderDashboard();
  else if(screen==='list') renderList(arg);
  else if(screen==='card') renderCard(arg);
  else if(screen==='map') renderMap();
  else if(screen==='present') renderPresent();
  else if(screen==='import') renderImport();
  else if(screen==='refs') renderRefs();
  window.scrollTo(0,0);
}
function renderCurrent(){ go(App.screen, App.arg); }
function screenEl(id){ return document.getElementById('screen-'+id); }

/* ---------- ДАШБОРД ---------- */
function statCard(n, lab, fk, fv, hint){
  return '<div class="stat" data-act="go-list"'+(fk?' data-fk="'+esc(fk)+'" data-fv="'+esc(fv||'1')+'"':'')+'><div class="num">'+n+'</div><div class="lab">'+lab+'</div>'+(hint?'<div class="hint">'+hint+'</div>':'')+'</div>';
}
function renderDashboard(){
  var ps=store.projects, el=screenEl('dashboard');
  var demo=ps.some(function(p){return p.demo;});
  var dd=daysUntil(CONFIG.app.deadlineSubmit);

  var dirCount={}, corpCount={}, stCount={}, relCount={}, trlCount={};
  ps.forEach(function(p){
    var d=(p.formDir&&p.formDir.v)||'(не указано)';
    dirCount[d]=(dirCount[d]||0)+1;
    var c=deriveCorp(p)||'(не указано)';
    corpCount[c]=(corpCount[c]||0)+1;
    var s=statusOf(p); stCount[s]=(stCount[s]||0)+1;
    var r=(p.relevance&&p.relevance.v)||'none'; relCount[r]=(relCount[r]||0)+1;
    var t=num(p.trlTarget&&p.trlTarget.v); if(t!=null) trlCount[t]=(trlCount[t]||0)+1;
  });
  var dirArr=Object.keys(dirCount).sort(function(a,b){return dirCount[b]-dirCount[a];});
  var maxD=Math.max.apply(null,dirArr.map(function(d){return dirCount[d];}).concat([1]));
  var corpArr=Object.keys(corpCount).sort(function(a,b){return corpCount[b]-corpCount[a]||a.localeCompare(b,'ru');});
  var maxC=Math.max.apply(null,corpArr.map(function(c){return corpCount[c];}).concat([1]));
  var maxSt=Math.max.apply(null,CONFIG.statuses.map(function(s){return stCount[s.id]||0;}).concat([1]));

  var wave1n=0, noRel=0, violIds={};
  ps.forEach(function(p){
    if(p.wave1&&p.wave1.partic) wave1n++;
    if(!(p.relevance&&p.relevance.v&&p.relevance.v!=='none')) noRel++;
    checkRules(p).forEach(function(){ violIds[p.id]=1; });
  });
  var violCount=Object.keys(violIds).length;

  var dayCount={};
  ps.forEach(function(p){
    var d=p.createdAt&&p.createdAt.v; if(!d) return;
    var day=null, m=String(d).match(/(\d{4})-(\d{2})-(\d{2})/), m2=String(d).match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if(m) day=m[1]+'-'+m[2]+'-'+m[3]; else if(m2) day=m2[3]+'-'+m2[2]+'-'+m2[1];
    if(day) dayCount[day]=(dayCount[day]||0)+1;
  });
  var dayArr=Object.keys(dayCount).sort();
  var maxDay=Math.max.apply(null,Object.values(dayCount).concat([1]));

  var attention={}, attArr=[];
  ps.forEach(function(p){
    var w=checkRules(p);
    if(w.some(function(x){return x.level==='danger';}) && !attention[p.id]){ attention[p.id]=1; attArr.push({p:p,kind:'Критичное нарушение / просроченный шаг'}); }
  });
  ps.forEach(function(p){
    var st=statusOf(p);
    if((st==='reg'||st==='applied'||st==='formfilled') && !(p.relevance&&p.relevance.v&&p.relevance.v!=='none') && !attention[p.id]){ attention[p.id]=1; attArr.push({p:p,kind:'Нет оценки релевантности'}); }
  });

  el.innerHTML=
    '<div class="page-head"><div><h1>Дашборд</h1>'+
    '<div class="sub">2-я волна Программы трансляционных исследований · '+(demo?'содержит ДЕМО-данные · ':'')+'подача до <b>'+fmtDate(CONFIG.app.deadlineSubmit)+'</b></div></div>'+
    '<div class="no-print" style="display:flex;gap:8px">'+
      '<button class="btn" data-act="nav" data-screen="list">☰ Список заявок</button>'+
      '<button class="btn" data-act="export-xlsx" data-scope="all">Экспорт XLSX</button>'+
      '<button class="btn primary" data-act="nav" data-screen="import">⇅ Импорт CSV</button>'+
    '</div></div>'+
    '<div class="grid g-stats">'+
      statCard(ps.length,'Всего заявок','','','регистрации + поданные анкеты')+
      statCard(ps.filter(function(p){return deriveStatus(p)==='reg';}).length,'Регистраций','','','без заполненной анкеты')+
      statCard(ps.filter(function(p){return deriveStatus(p)==='applied';}).length,'Поданных заявок')+
      statCard(dd!=null&&dd>=0?dd:0,'Дней до конца приёма ('+fmtDate(CONFIG.app.deadlineSubmit)+')')+
      statCard(violCount,'Не соответствуют формальным требованиям','viol','1')+
      statCard(noRel,'Без оценки релевантности','norel','1')+
      statCard(wave1n,'Участников 1-й волны','wave1','1','гипотезы и подтверждённые')+
    '</div>'+
    '<div class="dash-grid">'+
      '<div class="card"><h3>Направления отбора</h3>'+
        (dirArr.length? dirArr.map(function(d){ return '<div class="bar-row" data-act="go-list" data-fk="dir" data-fv="'+esc(d)+'"><span class="bar-lab" title="'+esc(d)+'">'+esc(d)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+Math.round(dirCount[d]/maxD*100)+'%"></div></div><span class="bar-val">'+dirCount[d]+'</span></div>'; }).join('') : '<div class="empty">Нет данных</div>')+
      '</div>'+
      '<div class="card"><h3>Заявки по корпорациям</h3>'+
        (corpArr.length? corpArr.map(function(c){ return '<div class="bar-row" data-act="go-list" data-fk="corp" data-fv="'+esc(c)+'"><span class="bar-lab" title="'+esc(c)+'">'+esc(c)+prioChip(c)+'</span><div class="bar-track"><div class="bar-fill'+(corpPri(c)==='high'?' low':'')+'" style="width:'+Math.round(corpCount[c]/maxC*100)+'%"></div></div><span class="bar-val">'+corpCount[c]+'</span></div>'; }).join('') : '<div class="empty">Нет данных</div>')+
      '</div>'+
      '<div class="card full"><h3>Воронка статусов</h3>'+
        CONFIG.statuses.map(function(s){ var n=stCount[s.id]||0; return '<div class="funnel-row" data-act="go-list" data-fk="status" data-fv="'+s.id+'"><span class="funnel-name">'+esc(s.label)+'</span><div class="funnel-bar"><div class="funnel-seg" style="width:'+Math.round(n/maxSt*100)+'%;background:'+segColor(s.id)+'"></div></div><span class="funnel-num">'+n+'</span></div>'; }).join('')+
      '</div>'+
      '<div class="card full"><h3>Требует внимания</h3>'+
        (attArr.length? attArr.slice(0,12).map(function(a){ return '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--border);padding:6px 0"><span style="flex:1"><b class="row-link" data-act="go-card" data-id="'+esc(String(a.p.id))+'">'+esc(nameOf(a.p))+'</b> <span class="muted">· '+esc(a.kind)+'</span></span>'+statusChip(statusOf(a.p))+'</div>'; }).join('') : '<div class="empty">Всё в порядке</div>')+
      '</div>'+
      '<div class="card"><h3>Релевантность</h3>'+
        CONFIG.relevance.map(function(r){ var n=relCount[r.id]||0; return '<div class="bar-row" data-act="go-list" data-fk="relevance" data-fv="'+r.id+'"><span class="bar-lab">'+esc(r.label)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+(ps.length?Math.round(n/ps.length*100):0)+'%"></div></div><span class="bar-val">'+n+'</span></div>'; }).join('')+
      '</div>'+
      '<div class="card"><h3>TRL</h3>'+
        (Object.keys(trlCount).length? Object.keys(trlCount).sort().map(function(t){ return '<div class="bar-row" style="cursor:default"><span class="bar-lab" style="color:'+trlColor(Number(t))+'">TRL '+t+'</span><div class="bar-track"><div class="bar-fill" style="width:'+(ps.length?Math.round(trlCount[t]/ps.length*100):0)+'%;background:'+trlColor(Number(t))+'"></div></div><span class="bar-val">'+trlCount[t]+'</span></div>'; }).join('') : '<div class="empty">Нет данных</div>')+
      '</div>'+
      '<div class="card full"><h3>Динамика подачи заявок (по дате создания)</h3>'+
        (dayArr.length? '<div class="chart-days">'+dayArr.map(function(d){ return '<div class="col"><div class="b" style="height:'+Math.max(3,Math.round(dayCount[d]/maxDay*100))+'%" title="'+fmtDate(d)+': '+dayCount[d]+'"></div><div class="x">'+d.slice(8)+'.'+d.slice(5,7)+'</div></div>'; }).join('')+'</div>' : '<div class="empty">Нет данных — добавьте столбец «Дата создания» в выгрузку Битрикс</div>')+
      '</div>'+
    '</div>';
}

/* ============================================================
 *  app.js — Часть 2: список заявок (поиск, фильтры, сортировка,
 *  массовая смена статуса)
 * ============================================================ */
var LIST_COLS=[
  {key:'leaderName',label:'Руководитель'},
  {key:'org',label:'Организация'},
  {key:'dir',label:'Направление'},
  {key:'corp',label:'Корпорация'},
  {key:'status',label:'Статус'},
  {key:'relevance',label:'Релевантность'},
  {key:'budget',label:'Бюджет'},
  {key:'wave1',label:'1-я волна'},
  {key:'viol',label:'Нарушения'},
  {key:'manual',label:'Ручн. сопост.'}
];
var FILTER_MENU={
  dir:{label:'Направление', options:function(){ return CONFIG.directions.slice().sort(function(a,b){return a.localeCompare(b,'ru');}); }},
  corp:{label:'Корпорация', options:function(){ return CONFIG.corporations.map(function(c){return c.name;}); }},
  status:{label:'Статус', options:function(){ return CONFIG.statuses.map(function(s){return s.id;}); }, text:function(v){return stLabel(v);}},
  relevance:{label:'Релевантность', options:function(){ return CONFIG.relevance.map(function(r){return r.id;}); }, text:function(v){return rlLabel(v);}}
};
function applyFilters(ps){
  var f=App.ui.filters, s=App.ui.search.toLowerCase();
  return ps.filter(function(p){
    if(s){
      var hay=(nameOf(p)+' '+slug(p.annotation&&p.annotation.v)+' '+slug(p.leaderName&&p.leaderName.v)+' '+slug(p.org&&p.org.v)).toLowerCase();
      if(hay.indexOf(s)<0) return false;
    }
    if(f.dir){ var d=(p.formDir&&p.formDir.v)||(p.mapDir&&p.mapDir.v)||'(не указано)'; if(d!==f.dir) return false; }
    if(f.corp){ if(deriveCorp(p)!==f.corp) return false; }
    if(f.status){ if(statusOf(p)!==f.status) return false; }
    if(f.relevance){ if(!(p.relevance&&p.relevance.v===f.relevance)) return false; }
    if(f.manual){ if(!needsManual(p)) return false; }
    if(f.viol){ if(!checkRules(p).length) return false; }
    if(f.regOnly){ if(!isEmptyReg(p)) return false; }
    if(f.wave1){ if(!(p.wave1&&p.wave1.partic)) return false; }
    if(f.norel){ if(p.relevance&&p.relevance.v&&p.relevance.v!=='none') return false; }
    if(f.material){ if(!(p.materials&&p.materials[f.material])) return false; }
    return true;
  });
}
function cellVal(p,key){
  switch(key){
    case 'id': return p.id||'';
    case 'name': return nameOf(p);
    case 'leaderName': return (p.leaderName&&p.leaderName.v)||'';
    case 'org': return (p.org&&p.org.v)||'';
    case 'dir': return (p.formDir&&p.formDir.v)||(p.mapDir&&p.mapDir.v)||'';
    case 'corp': return deriveCorp(p);
    case 'status': return statusOf(p);
    case 'relevance': return (p.relevance&&p.relevance.v)||'none';
    case 'budget': return num(p.budget&&p.budget.v);
    case 'wave1': return (p.wave1&&p.wave1.partic)?(p.wave1.linkStatus==='confirmed'?'Подтверждена':'Гипотеза'):'';
    case 'viol': return checkRules(p).length;
    case 'manual': return needsManual(p)?'Да':'';
    default: return '';
  }
}
function cellSortVal(p,key){
  if(key==='status') return stOrder(statusOf(p));
  if(key==='relevance') return rlOrder(p.relevance&&p.relevance.v);
  if(key==='budget'){ var n=num(p.budget&&p.budget.v); return n==null?-1:n; }
  if(key==='viol') return checkRules(p).length;
  return cellVal(p,key);
}
function sortTh(label,key,extraStyle){
  var on=App.ui.sort.key===key;
  return '<th data-act="sort" data-key="'+key+'" class="th-sort '+(on?(App.ui.sort.dir>0?'asc':'desc'):'')+'"'+(extraStyle?' style="'+extraStyle+'"':'')+'>'+label+'</th>';
}
function renderList(arg){
  if(arg){
    if(arg.reset){ App.ui.filters={}; App.ui.search=''; }
    else App.ui.filters=Object.assign({},arg);
  }
  persistUi();
  var f=App.ui.filters, visible=App.ui.cols;
  function pill(key){
    var def=FILTER_MENU[key], cur=f[key];
    var lab=def.label+(cur?': <span class="val">'+esc(short(def.text?def.text(cur):cur,22))+'</span>':'')+' ▾';
    return '<button class="pill '+(cur?'on':'')+'" data-act="filter-pill" data-key="'+key+'">'+lab+'</button>';
  }
  function togglePill(key,label){
    return '<button class="pill '+(f[key]?'on':'')+'" data-act="filter-toggle" data-key="'+key+'">'+label+'</button>';
  }
  screenEl('list').innerHTML=
    '<div class="page-head"><div><h1>Список заявок</h1><div class="sub" id="listCount"></div></div>'+
    '<div class="no-print" style="display:flex;gap:8px">'+
      '<button class="btn sm" data-act="export-xlsx" data-scope="filter">Экспорт XLSX (фильтр)</button>'+
    '</div></div>'+
    '<div class="searchbox">'+
      '<input id="lSearch" placeholder="Поиск по названию, аннотации, руководителю, организации…  (клавиша «/»)" value="'+esc(App.ui.search)+'">'+
      '<button class="btn" data-act="filter-reset">Сбросить фильтры</button>'+
    '</div>'+
    '<div class="pill-filters">'+
      pill('dir')+pill('corp')+pill('status')+pill('relevance')+
      togglePill('viol','Нарушения')+togglePill('manual','Ручное сопост.')+togglePill('regOnly','Только регистрация')+togglePill('wave1','1-я волна')+togglePill('norel','Без оценки')+
    '</div>'+
    '<div class="colbar">'+
      '<span class="muted">Колонки:</span>'+
      LIST_COLS.map(function(c){ return '<label><input type="checkbox" data-col="'+c.key+'" '+(visible.indexOf(c.key)>=0?'checked':'')+'> '+c.label+'</label>'; }).join('')+
      '<button class="btn sm primary" data-act="bulk-open" id="bulkBtn">Изменить статус</button>'+
    '</div>'+
    '<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
      '<th style="width:26px"><input type="checkbox" data-selall id="selAllBox"></th>'+
      sortTh('ID','id')+
      sortTh('Название','name','min-width:220px')+
      (visible.indexOf('leaderName')>=0? sortTh('Руководитель','leaderName'):'')+
      (visible.indexOf('org')>=0? sortTh('Организация','org'):'')+
      (visible.indexOf('dir')>=0? sortTh('Направление','dir'):'')+
      (visible.indexOf('corp')>=0? sortTh('Корпорация','corp'):'')+
      (visible.indexOf('status')>=0? sortTh('Статус','status'):'')+
      (visible.indexOf('relevance')>=0? sortTh('Релевантность','relevance'):'')+
      (visible.indexOf('budget')>=0? sortTh('Бюджет','budget'):'')+
      (visible.indexOf('wave1')>=0? '<th>1-я волна</th>':'')+
      (visible.indexOf('viol')>=0? sortTh('Нарушения','viol'):'')+
      (visible.indexOf('manual')>=0? '<th>Ручн.</th>':'')+
    '</tr></thead><tbody id="listBody"></tbody></table></div>'+
    '<div id="listEmpty"></div>';
  updateListResults();
}
function updateListResults(){
  var ps=applyFilters(store.projects).slice();
  var visible=App.ui.cols;
  ps.sort(function(a,b){
    var ka=cellSortVal(a,App.ui.sort.key), kb=cellSortVal(b,App.ui.sort.key);
    if(typeof ka==='number'&&typeof kb==='number') return (ka-kb)*App.ui.sort.dir;
    return String(ka||'').localeCompare(String(kb||''),'ru')*App.ui.sort.dir;
  });
  var cnt=document.getElementById('listCount');
  if(cnt) cnt.innerHTML='Найдено: <b>'+ps.length+'</b> из '+store.projects.length;
  var body=document.getElementById('listBody');
  if(body) body.innerHTML=ps.map(function(p){
    return '<tr>'+
      '<td><input type="checkbox" data-sel value="'+esc(String(p.id))+'" '+(App.sel.has(String(p.id))?'checked':'')+'></td>'+
      '<td class="muted">'+esc(p.id||'')+'</td>'+
      '<td><span class="row-link" data-act="go-card" data-id="'+esc(String(p.id))+'">'+esc(nameOf(p))+'</span>'+(p.demo?' <span class="hz-tag">ДЕМО</span>':'')+renderManualTag(p)+wave1Chip(p)+'</td>'+
      (visible.indexOf('leaderName')>=0?'<td>'+esc(p.leaderName&&p.leaderName.v)+'</td>':'')+
      (visible.indexOf('org')>=0?'<td>'+esc(p.org&&p.org.v)+orgChip(p.org&&p.org.v)+'</td>':'')+
      (visible.indexOf('dir')>=0?'<td>'+esc((p.formDir&&p.formDir.v)||(p.mapDir&&p.mapDir.v)||'')+'</td>':'')+
      (visible.indexOf('corp')>=0?'<td>'+esc(deriveCorp(p))+prioChip(deriveCorp(p))+'</td>':'')+
      (visible.indexOf('status')>=0?'<td>'+statusChip(statusOf(p))+'</td>':'')+
      (visible.indexOf('relevance')>=0?'<td>'+relChip(p.relevance&&p.relevance.v)+'</td>':'')+
      (visible.indexOf('budget')>=0?'<td style="text-align:right">'+(num(p.budget&&p.budget.v)!=null?fmtNum(p.budget.v):'—')+'</td>':'')+
      (visible.indexOf('wave1')>=0?'<td>'+esc(cellVal(p,'wave1'))+'</td>':'')+
      (visible.indexOf('viol')>=0?'<td>'+(checkRules(p).length?'<span class="chip warn-chip">'+checkRules(p).length+' ⚠</span>':'')+'</td>':'')+
      (visible.indexOf('manual')>=0?'<td>'+(needsManual(p)?'⚠':'')+'</td>':'')+
    '</tr>';
  }).join('');
  var empty=document.getElementById('listEmpty');
  if(empty) empty.innerHTML=ps.length?'':'<div class="empty">Нет данных — импортируйте CSV или добавьте демо-данные.</div>';
  var bulk=document.getElementById('bulkBtn');
  if(bulk){ bulk.disabled=!App.sel.size; bulk.textContent='Изменить статус ('+App.sel.size+')'; }
  var selAllBox=document.getElementById('selAllBox');
  if(selAllBox) selAllBox.checked=ps.length>0 && ps.every(function(p){ return App.sel.has(String(p.id)); });
}
function toggleCol(k){ var i=App.ui.cols.indexOf(k); if(i>=0) App.ui.cols.splice(i,1); else App.ui.cols.push(k); persistUi(); renderList(); }
function selAll(on){
  if(on) applyFilters(store.projects).forEach(function(p){ App.sel.add(String(p.id)); });
  else App.sel.clear();
  updateListResults();
}
function selRow(id,on){ if(on) App.sel.add(String(id)); else App.sel.delete(String(id)); updateListResults(); }
function openBulkModal(){
  if(!App.sel.size){ toast('Сначала выберите заявки галочками','err'); return; }
  openModal('<h2>Изменить статус ('+App.sel.size+' заявок)</h2>'+
    '<div class="sub">Новый статус будет записан как ручное изменение и попадёт в историю каждой заявки.</div>'+
    '<select id="bulkStatusSel" style="width:100%;margin:12px 0">'+CONFIG.statuses.map(function(s){ return '<option value="'+s.id+'">'+esc(s.label)+'</option>'; }).join('')+'</select>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" data-act="modal-close">Отмена</button><button class="btn primary" data-act="bulk-apply">Применить</button></div>');
}
function bulkApply(stid){
  var found=CONFIG.statuses.find(function(s){return s.id===stid;});
  if(!found) return;
  closeModal();
  var ids=Array.from(App.sel), done=0;
  ids.forEach(function(id){
    var p=findProj(id); if(!p) return;
    var old=statusOf(p);
    if(old===stid) return;
    p.status={v:stid,src:'m'}; p.updated=nowIso();
    pushHistory(p,'status',old,stid);
    dbPut(p); done++;
  });
  App.sel.clear();
  toast('Статус обновлён у '+done+' заявок','ok');
  renderCurrent();
}

/* ============================================================
 *  app.js — Часть 3: карточка проекта (вкладки, редактирование,
 *  контакты, заметки, история)
 * ============================================================ */
var CARD_TABS=[
  {zone:'appl', id:'overview',   label:'Обзор'},
  {zone:'appl', id:'contacts',   label:'Контакты'},
  {zone:'appl', id:'notes',      label:'Заметки'},
  {zone:'appl', id:'history',    label:'История'},
  {zone:'form', id:'form',       label:'Анкета'},
  {zone:'form', id:'budget',     label:'Бюджет и правила'},
  {zone:'form', id:'assessment', label:'Оценка'},
  {zone:'form', id:'wave1',      label:'1-я волна'}
];
function chipsHtml(p){
  return statusChip(statusOf(p))+' '+statusDeadlineBadge(p)+' '+relChip(p.relevance&&p.relevance.v)+
    (p.corp&&p.corp.v?' <span class="chip">'+esc(p.corp.v)+'</span>':'')+renderManualTag(p)+wave1Chip(p);
}
function renderCard(arg){
  var id=arg, wantZone=null;
  if(arg && typeof arg==='object'){ id=arg.id; wantZone=arg.zone||null; }
  var p=findProj(id);
  if(!p){ screenEl('card').innerHTML='<div class="empty">Заявка не найдена. <button class="btn" data-act="nav" data-screen="list">К списку</button></div>'; return; }
  App.card.id=p.id;
  if(wantZone){ App.card.zone=wantZone; App.card.tab=(wantZone==='form'?'form':'overview'); }
  else if(!CARD_TABS.some(function(t){return t.id===App.card.tab && t.zone===App.card.zone;})){ App.card.zone='appl'; App.card.tab='overview'; }
  renderCardBody();
}
function renderCardBody(){
  var p=findProj(App.card.id); if(!p) return;
  var cur=CARD_TABS.find(function(t){return t.id===App.card.tab;})||CARD_TABS[0];
  App.card.zone=cur.zone;
  var tabs=CARD_TABS.filter(function(t){return t.zone===App.card.zone;});
  var anketNotFilled=(deriveStatus(p)==='reg');
  screenEl('card').innerHTML=
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap" class="no-print">'+
      '<button class="btn sm ghost" data-act="nav" data-screen="list">← Список заявок</button>'+
      (App.card.zone==='appl'? '<button class="btn sm primary" data-act="card-zone" data-zone="form">Анкета проекта →</button>':'')+
    '</div>'+
    '<div class="card-head" style="margin-top:10px"><div>'+
      '<div class="muted" style="font-size:12px;letter-spacing:.2px">Заявка ID <b>'+esc(p.id||'—')+'</b>'+(p.demo?' <span class="hz-tag">ДЕМО</span>':'')+'</div>'+
      '<h1 class="card-title">'+esc(nameOf(p))+'</h1>'+
      '<div class="org-big">'+esc(p.org&&p.org.v||'Организация не указана')+orgChip(p.org&&p.org.v)+'</div>'+
      '<div style="margin-top:8px" id="cardChips">'+chipsHtml(p)+'</div>'+
    '</div>'+
    '<div class="no-print" style="display:flex;gap:6px">'+
      '<button class="btn" data-act="print">🖨 Печать</button>'+
      '<button class="btn" data-act="export-pdf" data-id="'+esc(String(p.id))+'" title="PDF анкеты без ФИО, почты и телефона — для внешних экспертов">⬇ Анкета (PDF, без ПД)</button>'+
      '<button class="btn danger" data-act="proj-del" data-id="'+esc(String(p.id))+'">Удалить</button>'+
    '</div></div>'+
    '<div class="zone-switch">'+
      '<button class="'+(App.card.zone==='appl'?'on':'')+'" data-act="card-zone" data-zone="appl">Заявка</button>'+
      '<button class="'+(App.card.zone==='form'?'on':'')+'" data-act="card-zone" data-zone="form">Анкета проекта</button>'+
    '</div>'+
    (App.card.zone==='form'&&anketNotFilled? '<div class="alert info"><p class="a-t">Анкета проекта ещё не подана</p><div class="a-b">Сейчас заявка на стадии регистрации. Данные проекта (направление, TRL, бюджет, команда) будут дополнены после подачи анкеты проекта.</div></div>':'')+
    '<div id="cardWarnings">'+renderWarnings(p)+'</div>'+
    '<div class="tabs" style="margin-top:14px">'+
      tabs.map(function(t){ return '<button class="'+(App.card.tab===t.id?'active':'')+'" data-act="card-tab" data-tab="'+t.id+'">'+t.label+'</button>'; }).join('')+
    '</div>'+
    '<div id="cardPane"></div>';
  var pane=document.getElementById('cardPane');
  if(App.card.tab==='overview') renderTabOverview(p,pane);
  else if(App.card.tab==='form') renderTabForm(p,pane);
  else if(App.card.tab==='budget') renderTabBudget(p,pane);
  else if(App.card.tab==='assessment') renderTabAssessment(p,pane);
  else if(App.card.tab==='wave1') renderTabWave1(p,pane);
  else if(App.card.tab==='contacts') renderTabContacts(p,pane);
  else if(App.card.tab==='notes') renderTabNotes(p,pane);
  else if(App.card.tab==='history') renderTabHistory(p,pane);
}
function renderResultsTable(p){
  var rows=[], i;
  for(i=1;i<=4;i++){
    var r=p['result'+i]&&p['result'+i].v, d=p['resultDate'+i]&&p['resultDate'+i].v, t=p['resultTarget'+i]&&p['resultTarget'+i].v;
    if(r||d||t) rows.push([r||'—',d||'—',t||'—']);
  }
  if(!rows.length) return '';
  return '<h3>Ожидаемые результаты</h3><table class="tbl" style="min-width:0"><thead><tr><th>Ожидаемый результат</th><th>Дата</th><th>Целевые характеристики</th></tr></thead><tbody>'+
    rows.map(function(r){ return '<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td>'+esc(r[2])+'</td></tr>'; }).join('')+'</tbody></table>';
}
function renderPeopleTable(p, prefix, title, cols){
  var rows=[], i, posKey=(prefix==='team'?'Pos':'Org');
  for(i=1;i<=4;i++){
    var a=p[prefix+'Fio'+i]&&p[prefix+'Fio'+i].v, b=p[prefix+posKey+i]&&p[prefix+posKey+i].v,
        c=p[prefix+'Role'+i]&&p[prefix+'Role'+i].v, d=p[prefix+'Tasks'+i]&&p[prefix+'Tasks'+i].v;
    if(a||b||c||d) rows.push([a||'—',b||'—',c||'—',d||'—']);
  }
  if(!rows.length) return '';
  return '<h3>'+title+'</h3><table class="tbl" style="min-width:0"><thead><tr>'+cols.map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead><tbody>'+
    rows.map(function(r){ return '<tr>'+r.map(function(x){return '<td>'+esc(x)+'</td>';}).join('')+'</tr>'; }).join('')+'</tbody></table>';
}
function renderMaterials(p){
  var m=p.materials||{};
  return [['reg','Регистрация'],['app','Заявка'],['form','Анкета'],['present','Презентация']].map(function(it){
    var v=!!m[it[0]];
    return '<span class="chip '+(v?'bd-success':'')+'" style="margin-right:6px">'+(v?'✓':'○')+' '+it[1]+'</span>';
  }).join('');
}
function renderTabOverview(p,pane){
  pane.innerHTML=
    '<div class="meta-grid">'+
      metaItem('Организация','<b>'+esc(p.org&&p.org.v||'—')+'</b>'+orgChip(p.org&&p.org.v))+
      metaItem('Статус',statusChip(statusOf(p)))+
      metaItem('Руководитель',esc(p.leaderName&&p.leaderName.v||'—'))+
      metaItem('Email',esc(p.leaderEmail&&p.leaderEmail.v||'—'))+
      metaItem('Телефон',esc(p.leaderPhone&&p.leaderPhone.v||'—'))+
      metaItem('Дата создания',p.createdAt&&p.createdAt.v?esc(p.createdAt.v):'—')+
      metaItem('Индустрия',p.industry&&p.industry.v?esc(p.industry.v):'—')+
      metaItem('Дата подачи анкеты',p.submittedDate&&p.submittedDate.v?esc(p.submittedDate.v):'—')+
      metaItem('Следующий шаг',esc(p.nextStep&&p.nextStep.v||'—'))+
      metaItem('Ответственный',esc(p.responsible&&p.responsible.v||'—'))+
      metaItem('Срок следующего шага',fmtDate(p.nextDue&&p.nextDue.v))+
      metaItem('Направление (анкета)',esc(p.formDir&&p.formDir.v||'—'))+
      metaItem('Корпорация',esc(deriveCorp(p)||'—')+prioChip(deriveCorp(p)))+
      metaItem('TRL',trlChip(p.trlTarget&&p.trlTarget.v))+
      metaItem('Бюджет',fmtMoney(p.budget&&p.budget.v))+
      metaItem('ФОТ',fmtMoney(p.fot&&p.fot.v))+
      metaItem('Накладные',fmtMoney(p.overhead&&p.overhead.v))+
      metaItem('Срок (мес.)',p.termMonths&&p.termMonths.v!=null?esc(p.termMonths.v):'—')+
    '</div>'+
    '<h3>Аннотация</h3><div class="card" style="white-space:pre-wrap">'+esc(p.annotation&&p.annotation.v||'Нет данных')+'</div>'+
    renderResultsTable(p)+
    renderPeopleTable(p,'team','Команда проекта',['ФИО','Должность','Роль в проекте','Основные задачи'])+
    renderPeopleTable(p,'contr','Подрядчики',['ФИО','Организация','Роль в проекте','Основные задачи'])+
    '<h3>Материалы</h3><div class="card">'+renderMaterials(p)+'</div>';
}
function renderTabForm(p,pane){
  var rows=[
    ['name','Название проекта','text'],
    ['annotation','Аннотация','textarea'],
    ['leaderName','Руководитель (ФИО)','text'],
    ['leaderEmail','Email руководителя','text'],
    ['leaderPhone','Телефон руководителя','text'],
    ['org','Организация','text'],
    ['team','Команда','textarea'],
    ['formDir','Направление в анкете (Битрикс)','text']
  ];
  pane.innerHTML=
    '<div class="alert info"><p class="a-t">Анкета проекта</p><div class="a-b">Поля «Битрикс» при повторном импорте CSV перезаписываются выгрузкой; «Вручную» — сохраняются. Текущий статус: <b>'+esc(stLabel(statusOf(p)))+'</b>.</div></div>'+
    '<table class="kv">'+
      rows.map(function(r){
        var v=p[r[0]]&&p[r[0]].v||'';
        return '<tr><td>'+r[1]+'</td><td>'+(r[2]==='textarea'
          ? '<textarea style="width:100%" data-f="'+r[0]+'">'+esc(v)+'</textarea>'
          : '<input style="width:100%" value="'+esc(v)+'" data-f="'+r[0]+'">')+srcTag(p[r[0]])+'</td></tr>';
      }).join('')+
      '<tr><td>TRL</td><td>'+trlChip(p.trlTarget&&p.trlTarget.v)+' <span class="muted">· изменяется во вкладке «Бюджет и правила»</span></td></tr>'+
      '<tr><td>Дата подачи анкеты</td><td>'+(p.submittedDate&&p.submittedDate.v?esc(p.submittedDate.v):'<span class="muted">нет данных</span>')+' <span class="src b">Битрикс</span></td></tr>'+
    '</table>'+
    '<h3>Прочие поля анкеты (нераспознанные столбцы из CSV)</h3>'+
    (Object.keys(p.extra||{}).length
      ? '<table class="kv">'+Object.keys(p.extra).map(function(k){ return '<tr><td>'+esc(k)+'</td><td>'+esc(p.extra[k].v||'')+' <span class="src b">Битрикс</span></td></tr>'; }).join('')+'</table>'
      : '<div class="empty" style="padding:20px">Нет данных</div>');
}
function renderTabBudget(p,pane){
  var fields=[['budget','Бюджет, ₽'],['fot','ФОТ, ₽'],['overhead','Накладные, ₽'],['termMonths','Срок, мес.'],['trlCur','TRL текущий'],['trlTarget','TRL']];
  var d=calcDerived(p);
  pane.innerHTML=
    renderWarnings(p)+
    '<table class="kv">'+
      fields.map(function(r){
        var v=p[r[0]]&&p[r[0]].v!=null?p[r[0]].v:'';
        var extra=(r[0]==='trlTarget'&&num(v)!=null)?' <span class="chip" style="background:'+trlColor(num(v))+';color:#fff;border-color:'+trlColor(num(v))+'">'+esc(trlLabel(num(v)))+'</span>':'';
        return '<tr><td>'+r[1]+'</td><td><input type="number" style="width:220px" value="'+esc(v)+'" data-f="'+r[0]+'">'+extra+srcTag(p[r[0]])+'</td></tr>';
      }).join('')+
      '<tr><td>Доля ФОТ от бюджета</td><td id="derivedFot">'+(d.fotShare!=null?fmtNum((d.fotShare*100).toFixed(1))+' %':'—')+' <span class="muted">(лимит ≤ 60 %)</span></td></tr>'+
      '<tr><td>Накладные от ФОТ</td><td id="derivedOverFot">'+(d.overheadOnFot!=null?fmtNum((d.overheadOnFot*100).toFixed(1))+' %':'—')+' <span class="muted">(лимит ≤ 10 % от ФОТ, НЕ от бюджета)</span></td></tr>'+
      '<tr><td>Накладные от бюджета</td><td id="derivedOverBudget">'+(d.overheadOnBudget!=null?fmtNum((d.overheadOnBudget*100).toFixed(1))+' %':'—')+' <span class="muted">(справочно)</span></td></tr>'+
    '</table>'+
    '<h3>Правила программы</h3><div class="card" style="font-size:13px">'+
      '<p><b>Бюджет ≤ 5 000 000 ₽</b>; срок ≤ 12 месяцев; ФОТ ≤ 60 % бюджета; накладные ≤ 10 % от ФОТ; целевой TRL 2–3; подача до 14.12.2026; презентации 01–12.02.2027.</p>'+
      '<p class="muted">Нарушение — предупреждение (жёлтая плашка с расчётом), не блокировка.</p></div>';
}
function renderTabAssessment(p,pane){
  pane.innerHTML=
    '<table class="kv">'+
      '<tr><td>Релевантность</td><td><select data-f="relevance" style="min-width:220px">'+
        CONFIG.relevance.map(function(r){ return '<option value="'+r.id+'" '+(p.relevance&&p.relevance.v===r.id?'selected':'')+'>'+esc(r.label)+'</option>'; }).join('')+
      '</select>'+srcTag(p.relevance)+'</td></tr>'+
      '<tr><td>Оценка экспертов</td><td><input style="width:220px" value="'+esc(p.expertScore&&p.expertScore.v||'')+'" data-f="expertScore">'+srcTag(p.expertScore)+'</td></tr>'+
      '<tr><td>Обоснование</td><td><textarea style="width:100%;min-height:90px" data-f="rationale">'+esc(p.rationale&&p.rationale.v||'')+'</textarea></td></tr>'+
      '<tr><td>Статус</td><td><select data-f="status" style="min-width:220px" title="Ручной выбор закрепляет статус; автоматика: TRL/результат/бюджет заполнены → «Заявка подана», иначе «Регистрация»">'+
        CONFIG.statuses.map(function(s){ return '<option value="'+s.id+'" '+(statusOf(p)===s.id?'selected':'')+'>'+esc(s.label)+(s.id==='reg'||s.id==='applied'?' (авто)':'')+'</option>'; }).join('')+
      '</select> <span class="muted">авто: заполнены данные проекта → «Заявка подана»</span></td></tr>'+
      '<tr><td>Следующий шаг</td><td><textarea style="width:100%" data-f="nextStep">'+esc(p.nextStep&&p.nextStep.v||'')+'</textarea></td></tr>'+
      '<tr><td>Ответственный</td><td><input style="width:280px" value="'+esc(p.responsible&&p.responsible.v||'')+'" data-f="responsible"></td></tr>'+
      '<tr><td>Срок следующего шага</td><td><input type="date" value="'+esc(p.nextDue&&p.nextDue.v||'')+'" data-f="nextDue"></td></tr>'+
      '<tr><td>Слот презентации</td><td><input type="date" min="'+CONFIG.app.presentationsWindow[0]+'" max="'+CONFIG.app.presentationsWindow[1]+'" value="'+esc(p.slot&&p.slot.v||'')+'" data-f="slot"></td></tr>'+
    '</table>'+
    '<h3>Материалы (да/нет)</h3><div class="card">'+
      [['reg','Регистрация'],['app','Заявка'],['form','Анкета'],['present','Презентация']].map(function(it){
        return '<label style="margin-right:16px"><input type="checkbox" data-m="'+it[0]+'" '+((p.materials&&p.materials[it[0]])?'checked':'')+'> '+it[1]+'</label>';
      }).join('')+
    '</div>';
}
function renderTabWave1(p,pane){
  var props=(p.wave1&&p.wave1.partic)? proposeWave1(p, App.wave1):[];
  pane.innerHTML=
    '<div class="alert info"><p class="a-t">Связь с 1-й волной</p><div class="a-b">Система предлагает совпадения по email руководителя и похожему названию — это <b>гипотеза</b>. Действует только после подтверждения менеджером. Без балла экспертов — «Не устроила программу».</div></div>'+
    '<div class="card">'+
      '<label style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" data-w1p '+(p.wave1&&p.wave1.partic?'checked':'')+'> <b>Участвовал в 1-й волне</b></label>'+
      (p.wave1&&p.wave1.partic?
        '<table class="kv">'+
          '<tr><td>Балл экспертов</td><td><input value="'+esc(p.wave1.score||'')+'" data-w1="score"></td></tr>'+
          '<tr><td>Решение</td><td><select data-w1="decision"><option value="">—</option>'+
            ['Поддержана','Отклонена','Отозвана','Не дошла до экспертов'].map(function(d){ return '<option '+(p.wave1.decision===d?'selected':'')+'>'+d+'</option>'; }).join('')+
          '</select></td></tr>'+
          '<tr><td>Статус связи</td><td><select data-w1="linkStatus">'+
            '<option value="none" '+(p.wave1.linkStatus==='none'?'selected':'')+'>— нет</option>'+
            '<option value="hypo" '+(p.wave1.linkStatus==='hypo'?'selected':'')+'>Гипотеза</option>'+
            '<option value="confirmed" '+(p.wave1.linkStatus==='confirmed'?'selected':'')+'>Подтверждена менеджером</option>'+
          '</select></td></tr>'+
        '</table>'
        :'<div class="muted">Связь не указана. Загрузите файл 1-й волны на экране «Импорт» — совпадения появятся автоматически.</div>')+
    '</div>'+
    (props.length? '<h3>Предложенные совпадения (гипотезы)</h3><div class="card">'+
      props.map(function(pr){
        return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid var(--border);padding:8px 0">'+
          '<div><span class="hz-tag">Гипотеза</span> <b>'+esc(pr.name)+'</b> <span class="muted">· '+esc(pr.wave1.leaderEmail||'без email')+' · совпадение '+(pr.score>60?'по email':'по названию')+'</span></div>'+
          '<div style="display:flex;gap:6px;flex:0 0 auto"><button class="btn sm success" data-act="w1-confirm" data-name="'+esc(pr.name)+'">Подтвердить</button><button class="btn sm" data-act="w1-reject" data-name="'+esc(pr.name)+'">Отклонить</button></div>'+
        '</div>';
      }).join('')+'</div>':'');
}
function renderTabContacts(p,pane){
  pane.innerHTML=
    '<h3>Журнал контактов</h3>'+
    '<div class="inline-form no-print">'+
      '<input id="ctDate" type="date" value="'+today()+'">'+
      '<select id="ctType"><option>звонок</option><option>письмо</option><option>встреча</option></select>'+
      '<input id="ctWho" placeholder="Кто (сторона контакта)" style="width:200px">'+
      '<input id="ctResult" placeholder="Итог" style="width:200px">'+
      '<input id="ctNext" placeholder="Следующий шаг" style="width:200px">'+
      '<button class="btn primary" data-act="contact-add">+ Добавить</button>'+
    '</div>'+
    (p.contacts&&p.contacts.length? '<table class="tbl" style="min-width:0"><tbody>'+p.contacts.map(function(c,i){
      return '<tr><td style="width:110px;white-space:nowrap">'+fmtDate(c.date)+'<br><span class="chip">'+esc(c.type)+'</span></td><td><b>'+esc(c.who||'')+'</b><div class="muted">'+esc(c.result||'')+'</div>'+(c.next?'<div class="muted">→ '+esc(c.next)+'</div>':'')+'</td><td style="width:60px"><button class="icon-btn" data-act="contact-del" data-i="'+i+'" title="Удалить">×</button></td></tr>';
    }).join('')+'</tbody></table>':'<div class="empty">Нет данных</div>');
}
function renderTabNotes(p,pane){
  pane.innerHTML=
    '<h3>Заметки</h3>'+
    '<div class="inline-form no-print"><input id="cmText" placeholder="Текст заметки" style="flex:1;min-width:240px"><button class="btn primary" data-act="comment-add">+ Добавить</button></div>'+
    (p.comments&&p.comments.length? p.comments.map(function(c,i){
      return '<div class="alert info" style="justify-content:space-between"><div><div class="a-b muted">'+fmtDateTime(c.date)+'</div><div>'+esc(c.text)+'</div></div><button class="icon-btn" data-act="comment-del" data-i="'+i+'" title="Удалить">×</button></div>';
    }).join('') : '<div class="empty">Заметок нет</div>');
}
function renderTabHistory(p,pane){
  pane.innerHTML=
    '<h3>История изменений</h3>'+
    (p.history&&p.history.length? '<div class="tbl-wrap"><table class="tbl small-tbl" style="min-width:0"><thead><tr><th>Дата</th><th>Поле</th><th>Было</th><th>Стало</th></tr></thead><tbody>'+
      p.history.map(function(h){ return '<tr><td style="white-space:nowrap">'+fmtDateTime(h.date)+'</td><td>'+esc(h.field)+'</td><td>'+esc(short(h.from,60))+'</td><td>'+esc(short(h.to,60))+'</td></tr>'; }).join('')+
    '</tbody></table></div>':'<div class="empty">Пока нет записей — история ведётся автоматически при редактировании и импорте.</div>');
}

/* ---- Сохранение полей карточки ---- */
function saveField(field,val){
  var p=findProj(App.card.id); if(!p) return;
  var numeric=['budget','fot','overhead','termMonths','trlCur','trlTarget'];
  var old=p[field]?p[field].v:null;
  var nv=(numeric.indexOf(field)>=0)? num(val) : (typeof val==='string'? val.trim(): val);
  if(String(old==null?'':old)===String(nv==null?'':nv)) return;
  p[field]=p[field]||{v:'',src:'m'};
  p[field].v=nv; p[field].src='m';
  pushHistory(p, field, old, nv);
  p.updated=nowIso();
  saveProj(p);
  refreshCardTop(p);
}
function refreshCardTop(p){
  var w=document.getElementById('cardWarnings'); if(w) w.innerHTML=renderWarnings(p);
  var c=document.getElementById('cardChips'); if(c) c.innerHTML=chipsHtml(p);
  if(App.card.tab==='budget'){
    var d=calcDerived(p);
    var e1=document.getElementById('derivedFot'); if(e1) e1.innerHTML=(d.fotShare!=null?fmtNum((d.fotShare*100).toFixed(1))+' %':'—')+' <span class="muted">(лимит ≤ 60 %)</span>';
    var e2=document.getElementById('derivedOverFot'); if(e2) e2.innerHTML=(d.overheadOnFot!=null?fmtNum((d.overheadOnFot*100).toFixed(1))+' %':'—')+' <span class="muted">(лимит ≤ 10 % от ФОТ)</span>';
    var e3=document.getElementById('derivedOverBudget'); if(e3) e3.innerHTML=(d.overheadOnBudget!=null?fmtNum((d.overheadOnBudget*100).toFixed(1))+' %':'—')+' <span class="muted">(справочно)</span>';
  }
}
function saveMaterial(k,on){
  var p=findProj(App.card.id); if(!p) return;
  p.materials[k]=!!on; p.updated=nowIso();
  pushHistory(p,'Материал: '+k, on?'нет':'да', on?'да':'нет');
  saveProj(p);
}
function saveWave1Partic(on){
  var p=findProj(App.card.id); if(!p) return;
  p.wave1.partic=!!on;
  if(on){ if(p.wave1.linkStatus==='none') p.wave1.linkStatus='hypo'; }
  else { p.wave1.score=''; p.wave1.decision=''; }
  pushHistory(p,'1-я волна (участие)', !on, !!on);
  p.updated=nowIso(); saveProj(p); renderCardBody();
}
function saveWave1Field(k,v){
  var p=findProj(App.card.id); if(!p) return;
  var old=p.wave1[k]; p.wave1[k]=v;
  pushHistory(p,'1-я волна ('+k+')', old, v);
  p.updated=nowIso(); saveProj(p); refreshCardTop(p);
}
function linkWave1(projId, name, confirmLink){
  var p=findProj(projId); if(!p) return;
  p.wave1.partic=true;
  p.wave1.linkStatus=confirmLink?'confirmed':'none';
  pushHistory(p,'1-я волна — связь', '', (confirmLink?'подтверждена':'отклонена')+': '+name);
  p.updated=nowIso(); saveProj(p); renderCardBody();
  toast(confirmLink?'Связь подтверждена':'Гипотеза отклонена','ok');
}
function addContact(){
  var p=findProj(App.card.id); if(!p) return;
  p.contacts=p.contacts||[];
  p.contacts.push({
    date:document.getElementById('ctDate').value||today(),
    type:document.getElementById('ctType').value,
    who:document.getElementById('ctWho').value,
    result:document.getElementById('ctResult').value,
    next:document.getElementById('ctNext').value
  });
  pushHistory(p,'контакт','','добавлен');
  p.updated=nowIso(); saveProj(p); renderCardBody();
}
function delContact(i){
  var p=findProj(App.card.id); if(!p||!p.contacts) return;
  p.contacts.splice(i,1); p.updated=nowIso(); saveProj(p); renderCardBody();
}
function addComment(){
  var p=findProj(App.card.id); if(!p) return;
  var inp=document.getElementById('cmText');
  var text=(inp.value||'').trim(); if(!text){ toast('Введите текст заметки','err'); return; }
  p.comments=p.comments||[];
  p.comments.unshift({date:nowIso(), text:text});
  pushHistory(p,'заметка','','добавлена');
  p.updated=nowIso(); saveProj(p); renderCardBody();
}
function delComment(i){
  var p=findProj(App.card.id); if(!p||!p.comments) return;
  p.comments.splice(i,1); p.updated=nowIso(); saveProj(p); renderCardBody();
}
function saveProj(p){
  clearTimeout(App.saveTimer);
  App.saveTimer=setTimeout(function(){
    dbPut(p).then(function(){ toast('Сохранено ✓','ok'); });
  },250);
  syncDemoBadge();
}
function deleteProject(id){
  var p=findProj(id); if(!p) return;
  if(!window.confirm('Удалить заявку «'+nameOf(p)+'»?\nМожно будет отменить в течение 6 секунд после удаления.')) return;
  App.trash.push({proj:p, ts:Date.now()});
  store.projects=store.projects.filter(function(x){ return String(x.id)!==String(id); });
  App.sel.delete(String(id));
  dbDelete(id);
  if(String(App.card.id)===String(id)) go('list'); else renderCurrent();
  toast('Заявка удалена','ok',{label:'Отменить', act:'undo-restore', id:String(id)});
}
function undoRestore(id){
  var i=App.trash.findIndex(function(t){ return String(t.proj.id)===String(id); });
  if(i<0){ toast('Восстановить не удалось','err'); return; }
  var p=App.trash.splice(i,1)[0].proj;
  store.projects.push(p);
  dbPut(p);
  toast('Заявка восстановлена','ok');
  renderCurrent();
}

/* ============================================================
 *  app.js — Часть 4: карта направлений, презентации (слоты)
 * ============================================================ */
function renderMap(){
  var rows=CONFIG.directionMap.map(function(r){
    var count=store.projects.filter(function(p){ return (p.corp&&p.corp.v)===r.corp && ((p.request&&p.request.v===r.req)||(p.mapDir&&p.mapDir.v===r.dir)); }).length;
    return '<tr><td>'+esc(r.dir)+'</td><td>'+esc(r.corp)+prioChip(r.corp)+'</td><td>'+esc(r.req)+'</td>'+
      '<td style="text-align:center"><span class="chip" style="cursor:pointer" data-act="go-list" data-fk="corp" data-fv="'+esc(r.corp)+'" data-fk2="dir" data-fv2="'+esc(r.dir)+'">'+count+'</span></td></tr>';
  }).join('');
  screenEl('map').innerHTML=
    '<h1>Карта направлений</h1><div class="sub">Соответствие «направление отбора · корпорация · запрос» (редактируется в config.js).</div>'+
    '<div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr><th>Направление</th><th>Корпорация</th><th>Запрос</th><th>Заявок</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<h2>Соответствия «анкета → карта»</h2>'+
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>В анкете (Битрикс)</th><th>По карте</th></tr></thead><tbody>'+
      CONFIG.genFormToMap.map(function(r){ return '<tr><td>'+esc(r.form)+'</td><td>'+esc(r.map)+'</td></tr>'; }).join('')+
    '</tbody></table></div>';
}

function presentDays(){
  var days=[], d=new Date(CONFIG.app.presentationsWindow[0]+'T00:00:00'), end=new Date(CONFIG.app.presentationsWindow[1]+'T00:00:00');
  while(d<=end){ days.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
  return days;
}
function renderPresent(){
  var days=presentDays(), wd=['вс','пн','вт','ср','чт','пт','сб'];
  screenEl('present').innerHTML=
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">'+
      '<div><h1>Презентации</h1><div class="sub">Окно: '+fmtDate(CONFIG.app.presentationsWindow[0])+' – '+fmtDate(CONFIG.app.presentationsWindow[1])+' · дискретные слоты, до 1 проекта на день</div></div>'+
      '<div class="no-print" style="display:flex;gap:8px"><button class="btn" data-act="export-present">Выгрузка расписания (XLSX)</button>'+
      '<button class="btn primary" data-act="auto-slot">Автораспределение свободных</button></div>'+
    '</div>'+
    '<div class="alert info" style="margin-top:12px"><p class="a-t">Назначение слотов</p><div class="a-b">В выпадающем списке — проекты со статусом «Приглашена на презентацию» без слота. Назначение переносит проект из прежнего слота автоматически.</div></div>'+
    '<div class="slot-grid" style="margin-top:14px">'+
      days.map(function(dd){
        var proj=store.projects.find(function(p){ return (p.slot&&p.slot.v)===dd; });
        var avail=store.projects.filter(function(p){ return !(p.slot&&p.slot.v) && (statusOf(p)==='invited'||statusOf(p)==='presented'); });
        return '<div class="slot '+(proj?'':'empty')+'"><div class="d">'+fmtDate(dd)+'</div><div class="w">'+wd[new Date(dd+'T00:00:00').getDay()]+'</div>'+
          (proj
            ? '<div class="proj booked"><span class="row-link" data-act="go-card" data-id="'+esc(String(proj.id))+'">'+esc(nameOf(proj))+'</span> <button class="icon-btn no-print" data-act="slot-clear" data-day="'+dd+'" title="Снять">×</button></div>'
            : '<div class="proj"><select class="no-print" data-slot="'+dd+'"><option value="">— назначить —</option>'+
                avail.map(function(ap){ return '<option value="'+esc(String(ap.id))+'">'+esc(nameOf(ap))+'</option>'; }).join('')+
              '</select> <span class="muted" style="font-size:11px">свободно</span></div>')+
        '</div>';
      }).join('')+
    '</div>';
}
function assignSlot(day,id){
  if(!id) return;
  store.projects.forEach(function(o){
    if(String(o.id)===String(id)){
      pushHistory(o,'Слот презентации',(o.slot&&o.slot.v)||'',day);
      o.slot={v:day,src:'m'}; o.updated=nowIso(); dbPut(o);
    } else if(o.slot&&o.slot.v===day){
      pushHistory(o,'Слот презентации',day,'');
      o.slot={v:'',src:'m'}; o.updated=nowIso(); dbPut(o);
    }
  });
  toast('Слот назначен: '+fmtDate(day),'ok');
  renderPresent();
}
function clearSlot(day){
  var p=store.projects.find(function(x){ return (x.slot&&x.slot.v)===day; });
  if(!p) return;
  pushHistory(p,'Слот презентации',day,'');
  p.slot={v:'',src:'m'}; p.updated=nowIso();
  dbPut(p).then(function(){ toast('Слот освобождён','ok'); renderPresent(); });
}
function autoSlot(){
  var days=presentDays();
  var invited=store.projects.filter(function(p){ return statusOf(p)==='invited' && !(p.slot&&p.slot.v); });
  var i=0, n=0;
  invited.forEach(function(p){
    while(i<days.length && store.projects.some(function(o){ return (o.slot&&o.slot.v)===days[i]; })) i++;
    if(i<days.length){
      p.slot={v:days[i],src:'m'}; p.updated=nowIso();
      pushHistory(p,'Слот презентации','',days[i]);
      dbPut(p); n++;
    }
  });
  toast(n?('Назначено слотов: '+n):'Нет свободных слотов или проектов', n?'ok':'err');
  renderPresent();
}
function exportPresentXlsx(){
  var rows=store.projects.filter(function(p){ return p.slot&&p.slot.v; }).map(function(p){
    return {Дата:fmtDate(p.slot.v), ID:p.id, Название:nameOf(p), Руководитель:(p.leaderName&&p.leaderName.v)||'', Организация:(p.org&&p.org.v)||''};
  }).sort(function(a,b){ return a['Дата'].localeCompare(b['Дата'],'ru'); });
  buildXlsx('Расписание презентаций.xlsx','Расписание',rows);
}

/* ============================================================
 *  app.js — Часть 5: импорт/экспорт (CSV Битрикс, 1-я волна,
 *  JSON-резерв, XLSX, снимок, демо-данные)
 * ============================================================ */
var MAP_KEY='transresearch_map_v1';
var MAPPING_NOW=null;
function renderImport(){
  screenEl('import').innerHTML=
    '<h1>Импорт и экспорт</h1>'+
    '<div class="dash-grid">'+
      '<div class="card"><h3>Импорт CSV 2-й волны (Битрикс)</h3>'+
        '<div class="sub">Один CSV, одна строка = один проект. Кодировка и разделитель определяются автоматически. Повторный импорт обновляет данные анкеты; ручные поля не затираются.</div>'+
        '<div class="inline-form" style="margin-top:12px"><input type="file" id="csvFile" accept=".csv,text/csv"><button class="btn primary" data-act="load-csv">Прочитать и сопоставить</button></div>'+
        '<div id="csvParseResult"></div>'+
      '</div>'+
      '<div class="card"><h3>Импорт 1-й волны (CSV/XLSX)</h3>'+
        '<div class="sub">Баллы экспертов и решения. Без балла — «Не устроила программу». Данные используются для гипотез сопоставления.</div>'+
        '<div class="inline-form" style="margin-top:12px"><input type="file" id="wave1File" accept=".csv,.xlsx,.xls"><button class="btn" data-act="load-wave1">Загрузить файл 1-й волны</button></div>'+
        '<div id="wave1Result">'+(App.wave1.length?'<div class="card" style="margin-top:12px">Загружено записей 1-й волны: <b>'+App.wave1.length+'</b> <button class="btn sm" data-act="link-wave1-all">Сопоставить по всем заявкам</button></div>':'')+'</div>'+
      '</div>'+
      '<div class="card"><h3>Резервная копия (JSON)</h3><div class="sub">Полная выгрузка всех данных, включая ручные правки и файл 1-й волны. Восстановление перезаписывает текущую базу.</div>'+
        '<div class="inline-form" style="margin-top:12px"><button class="btn" data-act="export-json">⬇ Выгрузить JSON</button><input type="file" id="jsonFile" accept=".json"><button class="btn" data-act="restore-json">⬆ Восстановить</button></div>'+
      '</div>'+
      '<div class="card"><h3>Экспорт и снимок</h3><div class="sub">Снимок «только для чтения» — отдельный автономный HTML с данными внутри.</div>'+
        '<div class="inline-form" style="margin-top:12px"><button class="btn" data-act="export-xlsx" data-scope="all">Экспорт XLSX (все заявки)</button></div>'+
        '<div style="margin-top:10px"><label><input type="checkbox" id="hideContacts" checked> Скрыть контакты (ФИО, телефоны, email) в снимке</label></div>'+
        '<button class="btn success" style="margin-top:8px" data-act="export-snapshot">⬇ Создать «Снимок только для чтения» (HTML)</button>'+
      '</div>'+
      '<div class="card full"><h3>Демо-данные</h3><div class="sub">20 вымышленных заявок (пометка «ДЕМО») для ознакомления. Не являются реальными.</div>'+
        '<div class="inline-form" style="margin-top:12px"><button class="btn" data-act="demo-add">Загрузить демо-данные</button><button class="btn danger" data-act="demo-del">Удалить все демо-данные</button></div>'+
      '</div>'+
    '</div>';
}

/* ---- CSV разбор ---- */
function decodeBytes(buf){
  var bytes=new Uint8Array(buf), i=0, n=bytes.length, okUtf=true;
  while(i<n){
    var b=bytes[i];
    if(b<0x80){ i++; continue; }
    if((b>>5)===0x6 && i+1<n && (bytes[i+1]&0xC0)===0x80){ i+=2; continue; }
    if((b>>4)===0xE && i+2<n && (bytes[i+1]&0xC0)===0x80 && (bytes[i+2]&0xC0)===0x80){ i+=3; continue; }
    if((b>>3)===0x1E && i+3<n && (bytes[i+1]&0xC0)===0x80 && (bytes[i+2]&0xC0)===0x80 && (bytes[i+3]&0xC0)===0x80){ i+=4; continue; }
    okUtf=false; break;
  }
  if(okUtf) return {text:new TextDecoder('utf-8').decode(bytes), enc:'UTF-8'};
  return {text:new TextDecoder('windows-1251').decode(bytes), enc:'Windows-1251'};
}
function detectDelimiter(text){
  var firstLine=text.split(/\r?\n/)[0]||'';
  return (firstLine.match(/;/g)||[]).length > (firstLine.match(/,/g)||[]).length ? ';' : ',';
}
function parseCsv(text, delim){
  var rows=[], cur=[], field='', inQ=false, inRow=false;
  for(var i=0;i<text.length;i++){
    var c=text[i];
    if(inQ){
      if(c==='"'){ if(text[i+1]==='"'){ field+='"'; i++; } else inQ=false; }
      else field+=c;
    } else {
      if(c==='"'){ inQ=true; inRow=true; }
      else if(c===delim){ cur.push(field); field=''; inRow=true; }
      else if(c==='\n'||c==='\r'){
        if(c==='\r'&&text[i+1]==='\n') i++;
        cur.push(field); field=''; rows.push(cur); cur=[]; inRow=false;
      } else { field+=c; inRow=true; }
    }
  }
  if(field!==''||cur.length||inRow){ cur.push(field); rows.push(cur); }
  return rows.filter(function(r){ return r.some(function(x){ return x!==''; }); });
}
function normHead(h){
  var s=String(h==null?'':h).replace(/^﻿/,'').trim();
  if(s.charAt(0)==='"'&&s.charAt(s.length-1)==='"') s=s.slice(1,-1);
  return s.toLowerCase().replace(/ё/g,'е').replace(/[:]/g,' ').replace(/[\s_|.\-]+/g,' ').replace(/['"]/g,'').trim();
}
var BITRIX_HEAD_MAP={
  'id':'id',
  'ти волна':'wave',
  'ти направление отбора':'formDir',
  'ти название проекта':'name',
  'контакт название проекта':'name',
  'ти краткое резюме':'annotation',
  'ти название организации':'org',
  'контакт имя':'fio1','контакт фамилия':'fio2','контакт отчество':'fio3',
  'ти ресурсы и бюджет':'budgetText',
  'ти финансирование':'fundingText',
  'ти уровень готовности':'trlTarget',
  'ти дата подачи':'submittedDate','дата подачи':'submittedDate','дата подачи анкеты':'submittedDate','дата заявки':'submittedDate',
  'дата создания':'createdAt','индустрия':'industry',
  'ти ожидаемый результат 1':'result1','ти ожидаемый результат 2':'result2','ти ожидаемый результат 3':'result3','ти ожидаемый результат 4':'result4',
  'ти дата результата 1':'resultDate1','ти дата результата 2':'resultDate2','ти дата результата 3':'resultDate3','ти дата результата 4':'resultDate4',
  'ти целевые характеристики 1':'resultTarget1','ти целевые характеристики 2':'resultTarget2','ти целевые характеристики 3':'resultTarget3','ти целевые характеристики 4':'resultTarget4',
  'ти фио команда 1':'teamFio1','ти фио команда 2':'teamFio2','ти фио команда 3':'teamFio3','ти фио команда 4':'teamFio4',
  'ти должность команда 1':'teamPos1','ти должность команда 2':'teamPos2','ти должность команда 3':'teamPos3','ти должность команда 4':'teamPos4',
  'ти роль в проекте команда 1':'teamRole1','ти роль в проекте команда 2':'teamRole2','ти роль в проекте команда 3':'teamRole3','ти роль в проекте команда 4':'teamRole4',
  'ти основные задачи команда 1':'teamTasks1','ти основные задачи команда 2':'teamTasks2','ти основные задачи команда 3':'teamTasks3','ти основные задачи команда 4':'teamTasks4',
  'ти фио подряд 1':'contrFio1','ти фио подряд 2':'contrFio2','ти фио подряд 3':'contrFio3','ти фио подряд 4':'contrFio4',
  'ти название организации подряд 1':'contrOrg1','ти название организации подряд 2':'contrOrg2','ти название организации подряд 3':'contrOrg3','ти название организации подряд 4':'contrOrg4',
  'ти роль в проекте подряд 1':'contrRole1','ти роль в проекте подряд 2':'contrRole2','ти роль в проекте подряд 3':'contrRole3','ти роль в проекте подряд 4':'contrRole4',
  'ти основные задачи подряд 1':'contrTasks1','ти основные задачи подряд 2':'contrTasks2','ти основные задачи подряд 3':'contrTasks3','ти основные задачи подряд 4':'contrTasks4',
  'ти область применения':'application','ти коммерциализация':'commercialization','ти эффект от разработки':'effect',
  'ти предлагаемый подход':'approach','ти существующий уровень техники':'stateOfArt','ти возможности':'capabilities',
  'ти научный задел':'scientificBase','ти ссылка на анкету':'formLink'
};
var EMAIL_HEADS=['контакт рабочий e mail','контакт частный e mail','контакт e mail для рассылок','контакт другой e mail'];
var PHONE_HEADS=['контакт рабочий телефон','контакт мобильный телефон','контакт телефон для рассылок','контакт домашний телефон','контакт другой телефон'];
function isEmailHead(nh){ return EMAIL_HEADS.indexOf(nh)>=0; }
function isPhoneHead(nh){ return PHONE_HEADS.indexOf(nh)>=0; }
function isFioHead(nh){ return nh==='контакт имя'||nh==='контакт фамилия'||nh==='контакт отчество'; }
function guessColumn(head){
  var h=normHead(head);
  if(!h) return '';
  if(BITRIX_HEAD_MAP[h]!==undefined) return BITRIX_HEAD_MAP[h];
  if(isEmailHead(h)) return 'leaderEmail';
  if(isPhoneHead(h)) return 'leaderPhone';
  if(isFioHead(h)) return 'fioParts';
  var syn={
    id:['идентификатор','номер заявки','bitrix id','код','номер сделки'],
    name:['название','название проекта','проект','наименование','имя проекта','название заявки'],
    annotation:['аннотация','краткое описание','резюме','суть','описание проекта'],
    leaderEmail:['email','емайл','email руководителя','почта','e mail','эл почта'],
    leaderPhone:['телефон','телефон руководителя','контактный телефон','номер телефона'],
    org:['организация','компания','организация руководителя','университет','название организации','вуз','институт'],
    team:['команда','состав команды','участники','команда проекта'],
    formDir:['направление','направление отбора','тематика','направление исследования'],
    trlTarget:['trl целевой','целевой trl','планируемый trl','уровень готовности'],
    budget:['бюджет','бюджет проекта','смета','запрашиваемый бюджет'],
    fot:['фот','фонд оплаты труда','оплата труда'],
    overhead:['накладные','накладные расходы','оверхед','непрямые расходы'],
    termMonths:['срок','срок мес','длительность','продолжительность','месяцев']
  };
  for(var f in syn) if(syn[f].some(function(a){ return h===a || (a.length>4 && h.indexOf(a)>=0 && h.length<=a.length+12); })) return f;
  return '';
}
var KNOWN_FIELDS=['id','name','annotation','leaderName','leaderEmail','leaderPhone','org','team','formDir','trlCur','trlTarget','budget','fot','overhead','termMonths','wave','budgetText','fundingText','submittedDate','createdAt','industry',
  'result1','resultDate1','resultTarget1','result2','resultDate2','resultTarget2','result3','resultDate3','resultTarget3','result4','resultDate4','resultTarget4',
  'teamFio1','teamPos1','teamRole1','teamTasks1','teamFio2','teamPos2','teamRole2','teamTasks2','teamFio3','teamPos3','teamRole3','teamTasks3','teamFio4','teamPos4','teamRole4','teamTasks4',
  'contrFio1','contrOrg1','contrRole1','contrTasks1','contrFio2','contrOrg2','contrRole2','contrTasks2','contrFio3','contrOrg3','contrRole3','contrTasks3','contrFio4','contrOrg4','contrRole4','contrTasks4'];
var FIELD_LABELS={id:'ID (Битрикс)',name:'Название',annotation:'Аннотация',leaderName:'Руководитель (ФИО)',leaderEmail:'Email',leaderPhone:'Телефон',org:'Организация',team:'Команда',formDir:'Направление в анкете',trlCur:'TRL текущий',trlTarget:'TRL целевой',budget:'Бюджет',fot:'ФОТ',overhead:'Накладные',termMonths:'Срок (мес)',wave:'Волна',budgetText:'Бюджет (текст)',fundingText:'Финансирование (текст)',submittedDate:'Дата подачи анкеты',createdAt:'Дата создания',industry:'Индустрия',
  result1:'Ожидаемый результат 1',resultDate1:'Дата результата 1',resultTarget1:'Целевые характеристики 1',
  result2:'Ожидаемый результат 2',resultDate2:'Дата результата 2',resultTarget2:'Целевые характеристики 2',
  result3:'Ожидаемый результат 3',resultDate3:'Дата результата 3',resultTarget3:'Целевые характеристики 3',
  result4:'Ожидаемый результат 4',resultDate4:'Дата результата 4',resultTarget4:'Целевые характеристики 4',
  teamFio1:'ФИО команда 1',teamPos1:'Должность команда 1',teamRole1:'Роль команда 1',teamTasks1:'Задачи команда 1',
  teamFio2:'ФИО команда 2',teamPos2:'Должность команда 2',teamRole2:'Роль команда 2',teamTasks2:'Задачи команда 2',
  teamFio3:'ФИО команда 3',teamPos3:'Должность команда 3',teamRole3:'Роль команда 3',teamTasks3:'Задачи команда 3',
  teamFio4:'ФИО команда 4',teamPos4:'Должность команда 4',teamRole4:'Роль команда 4',teamTasks4:'Задачи команда 4',
  contrFio1:'ФИО подряд 1',contrOrg1:'Организация подряд 1',contrRole1:'Роль подряд 1',contrTasks1:'Задачи подряд 1',
  contrFio2:'ФИО подряд 2',contrOrg2:'Организация подряд 2',contrRole2:'Роль подряд 2',contrTasks2:'Задачи подряд 2',
  contrFio3:'ФИО подряд 3',contrOrg3:'Организация подряд 3',contrRole3:'Роль подряд 3',contrTasks3:'Задачи подряд 3',
  contrFio4:'ФИО подряд 4',contrOrg4:'Организация подряд 4',contrRole4:'Роль подряд 4',contrTasks4:'Задачи подряд 4'};
function loadMap(){ try{ return JSON.parse(localStorage.getItem(MAP_KEY))||{}; }catch(e){ return {}; } }

function loadCsvFile(){
  var f=document.getElementById('csvFile').files[0];
  if(!f){ toast('Выберите CSV-файл','err'); return; }
  var reader=new FileReader();
  reader.onload=function(ev){
    var dec=decodeBytes(ev.target.result);
    var text=dec.text;
    if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
    var delim=detectDelimiter(text);
    var rows=parseCsv(text,delim);
    if(!rows.length){ document.getElementById('csvParseResult').innerHTML='<div class="alert danger"><p class="a-t">Не удалось прочитать CSV</p></div>'; return; }
    MAPPING_NOW={
      orig:rows[0].map(function(h){ return String(h).trim(); }),
      headers:rows[0].map(function(h){ return normHead(h); }),
      data:rows.slice(1),
      enc:dec.enc,
      delim:delim
    };
    renderMappingEditor();
  };
  reader.readAsArrayBuffer(f);
}
function renderMappingEditor(){
  if(!MAPPING_NOW) return;
  var saved=loadMap();
  var headers=MAPPING_NOW.headers, orig=MAPPING_NOW.orig, samples=MAPPING_NOW.data.slice(0,3);
  var html='<div class="card" style="margin-top:12px"><b>Файл:</b> кодировка <span class="chip">'+esc(MAPPING_NOW.enc)+'</span> · разделитель <span class="chip">'+esc(MAPPING_NOW.delim)+'</span> · столбцов: '+headers.length+' · строк данных: '+MAPPING_NOW.data.length+'</div>'+
    '<div class="alert info" style="margin:10px 0"><b>Быстрый импорт:</b> столбцы «ТИ | …» и «Контакт: …» распознаны автоматически. Проверьте и нажмите «Импортировать». Столбцы без поля модели попадут в «Прочие поля анкеты».</div>';
  headers.forEach(function(h,i){
    var guess=(saved[h]!=null)? saved[h] : guessColumn(h);
    html+='<div class="map-row"><span class="cv" title="'+esc(orig[i])+'">'+esc(orig[i])+'</span><span class="sm">→</span>'+
      '<select data-map-i="'+i+'">'+
        '<option value="">(прочее поле / не использовать)</option>'+
        KNOWN_FIELDS.map(function(f){ return '<option value="'+f+'" '+(guess===f?'selected':'')+'>'+esc(FIELD_LABELS[f])+'</option>'; }).join('')+
      '</select>'+
      '<span class="muted" style="font-size:11px">'+esc(short(samples[0]?samples[0][i]||'':'',40))+'</span></div>';
  });
  html+='<div class="inline-form" style="margin-top:10px"><button class="btn primary" data-act="import-run">Импортировать с текущим сопоставлением</button><button class="btn" data-act="map-reset">Сбросить сохранённое сопоставление</button></div>'+
    '<div class="sample-cell">'+orig.map(function(h){return h;}).join(' | ')+'\n'+samples.map(function(s){return s.map(function(c){return String(c==null?'':c);}).join(' | ');}).join('\n')+'</div>';
  document.getElementById('csvParseResult').innerHTML=html;
}
function resetMap(){ try{ localStorage.removeItem(MAP_KEY); }catch(e){} toast('Сохранённое сопоставление сброшено','ok'); renderMappingEditor(); }
function collectAssignment(){
  var assignment={}, saved={};
  MAPPING_NOW.headers.forEach(function(h,i){
    var sel=document.querySelector('select[data-map-i="'+i+'"]');
    if(sel&&sel.value){ assignment[h]=sel.value; saved[h]=sel.value; }
  });
  try{ localStorage.setItem(MAP_KEY, JSON.stringify(saved)); }catch(e){}
  return assignment;
}
function doImport(){
  if(!MAPPING_NOW||!MAPPING_NOW.data) return;
  var t0=Date.now();
  var headers=MAPPING_NOW.headers, orig=MAPPING_NOW.orig, rows=MAPPING_NOW.data;
  var assignment=collectAssignment();
  var report={added:0,updated:0,unchanged:0,wave1:0,errors:[]};
  var waveIdx=-1;
  headers.forEach(function(h,i){ if(assignment[h]==='wave'||h==='ти волна') waveIdx=i; });
  function gatherFio(r){
    var im='',fa='',ot='';
    headers.forEach(function(h,i){
      var v=String(r[i]==null?'':r[i]).trim();
      if(h==='контакт имя') im=v; else if(h==='контакт фамилия') fa=v; else if(h==='контакт отчество') ot=v;
    });
    return [fa,im,ot].filter(Boolean).join(' ').trim();
  }
  function pick(r, pred){ var found=''; headers.forEach(function(h,i){ var v=String(r[i]==null?'':r[i]).trim(); if(!found&&v&&pred(h)) found=v; }); return found; }
  var wave1Map={};
  App.wave1.forEach(function(w){ wave1Map[String(w.id)]=true; });

  rows.forEach(function(r,idx){
    var rowNum=idx+2;
    var obj={};
    headers.forEach(function(h,i){
      var k=assignment[h];
      if(!k||k==='wave'||k==='fioParts'||k==='fio1'||k==='fio2'||k==='fio3') return;
      obj[k]=String(r[i]==null?'':r[i]).trim();
    });
    var id=obj.id||'';
    if(!id){ report.errors.push({row:rowNum,msg:'Нет ID'}); return; }
    var wv=0;
    if(waveIdx>=0){ var w=String(r[waveIdx]==null?'':r[waveIdx]).trim(); if(w==='2') wv=2; else if(w==='1') wv=1; }
    if(wv!==2){
      if(!wave1Map[String(id)]){
        App.wave1.push({id:String(id), name:obj.name||'', leaderEmail:pick(r,isEmailHead), score:'', decision:''});
        wave1Map[String(id)]=true;
      }
      report.wave1++;
      return;
    }
    var fio=gatherFio(r), email=pick(r,isEmailHead), phone=pick(r,function(h){ return isPhoneHead(h); });
    var existing=findProj(id);
    var numericFields=['budget','fot','overhead','termMonths','trlCur'];
    var special=['id','name','annotation','formDir','org','leaderName','leaderEmail','leaderPhone','wave','fioParts','fio1','fio2','fio3','trlTarget'];
    function valFor(k,i){
      var v=String(r[i]==null?'':r[i]).trim();
      if(k==='trlTarget') return parseTrl(v);
      if(numericFields.indexOf(k)>=0) return num(v);
      return v;
    }
    if(existing){
      var changed=false;
      function upsertB(field,val){
        if(field==='id') return;
        if(existing[field]&&existing[field].src==='m') return;
        if(String(existing[field]?existing[field].v:'')!==String(val==null?'':val)){ existing[field]={v:val,src:'b'}; changed=true; }
      }
      upsertB('name',obj.name||''); upsertB('annotation',obj.annotation||''); upsertB('formDir',obj.formDir||''); upsertB('org',obj.org||'');
      if(fio) upsertB('leaderName',fio);
      if(email) upsertB('leaderEmail',email);
      if(phone) upsertB('leaderPhone',phone);
      headers.forEach(function(h,i){
        var k=assignment[h]; if(!k||special.indexOf(k)>=0) return;
        upsertB(k, valFor(k,i));
      });
      if(obj.trlTarget!=null) upsertB('trlTarget', parseTrl(obj.trlTarget));
      var extra=Object.assign({},existing.extra||{});
      headers.forEach(function(h,i){
        if(!assignment[h]){ var vv=String(r[i]==null?'':r[i]).trim(); if(vv!=='') extra[orig[i]||h]={v:vv,src:'b'}; }
      });
      existing.extra=extra;
      if(changed){ existing.updated=nowIso(); pushHistory(existing,'импорт CSV','','обновлено из выгрузки'); dbPut(existing); report.updated++; }
      else report.unchanged++;
    } else {
      var np=emptyProject();
      np.id=String(id); np.created=nowIso(); np.updated=nowIso();
      np.name={v:obj.name||'',src:'b'}; np.annotation={v:obj.annotation||'',src:'b'};
      np.formDir={v:obj.formDir||'',src:'b'}; np.org={v:obj.org||'',src:'b'};
      np.leaderName={v:fio,src:'b'}; np.leaderEmail={v:email,src:'b'}; np.leaderPhone={v:phone,src:'b'};
      if(obj.trlTarget!=null) np.trlTarget={v:parseTrl(obj.trlTarget),src:'b'};
      headers.forEach(function(h,i){
        var k=assignment[h], vv=String(r[i]==null?'':r[i]).trim();
        if(!k){ if(vv!=='') np.extra[orig[i]||h]={v:vv,src:'b'}; }
        else if(special.indexOf(k)<0 && np[k]!==undefined){ np[k]={v:valFor(k,i),src:'b'}; }
      });
      pushHistory(np,'импорт CSV','','создано из выгрузки');
      store.projects.push(np);
      dbPut(np);
      report.added++;
    }
  });
  renderImportReport(report, Date.now()-t0);
  syncDemoBadge();
}
function renderImportReport(report,ms){
  document.getElementById('csvParseResult').innerHTML=
    '<div class="card" style="margin-top:14px"><h3>Отчёт импорта</h3>'+
    '<div class="report-grid">'+
      '<div><div class="n">'+report.added+'</div><div class="muted">Новых</div></div>'+
      '<div><div class="n">'+report.updated+'</div><div class="muted">Обновлено</div></div>'+
      '<div><div class="n">'+report.unchanged+'</div><div class="muted">Без изменений</div></div>'+
      '<div><div class="n">'+report.wave1+'</div><div class="muted">Строк 1-й волны</div></div>'+
      '<div><div class="n" style="color:'+(report.errors.length?'var(--danger)':'var(--success)')+'">'+report.errors.length+'</div><div class="muted">Ошибок</div></div>'+
    '</div>'+
    '<div class="muted">Время: '+ms.toFixed(0)+' мс · Данные сохранены, можно переходить в список заявок.</div>'+
    (report.errors.length? '<table class="errs" style="margin-top:8px"><thead><tr><th>Строка</th><th>Ошибка</th></tr></thead><tbody>'+report.errors.map(function(e){ return '<tr><td>'+(e.row||'')+'</td><td>'+esc(e.msg)+'</td></tr>'; }).join('')+'</tbody></table>':'')+
    '</div>';
}
/* ---- 1-я волна ---- */
function loadWave1File(){
  var f=document.getElementById('wave1File').files[0];
  if(!f){ toast('Выберите файл 1-й волны','err'); return; }
  if(/\.(xlsx|xls)$/i.test(f.name)){
    if(typeof XLSX==='undefined'){ toast('Библиотека XLSX не подключена','err'); return; }
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var wb=XLSX.read(new Uint8Array(ev.target.result),{type:'array'});
        var arr=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});
        App.wave1=parseWave1(arr);
        showWave1Result(f.name);
      }catch(e){ toast('Не удалось прочитать XLSX: '+e.message,'err'); }
    };
    reader.readAsArrayBuffer(f);
  } else {
    var r2=new FileReader();
    r2.onload=function(ev){
      var dec=decodeBytes(ev.target.result);
      var text=dec.text; if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
      App.wave1=parseWave1(parseCsv(text,detectDelimiter(text)));
      showWave1Result(f.name);
    };
    r2.readAsArrayBuffer(f);
  }
}
function parseWave1(arr){
  if(!arr||!arr.length) return [];
  var heads=arr[0].map(function(h){ return normHead(h); });
  var gi={id:-1,name:-1,email:-1,score:-1,decision:-1};
  heads.forEach(function(h,i){
    if(/^(id|идентификатор|номер|код)$/.test(h)) gi.id=i;
    else if(/^(название|проект|наименование|name)$/.test(h)) gi.name=i;
    else if(/email|почта|e mail/.test(h)) gi.email=i;
    else if(/^(балл|оценка|балл экспертов|score|экспертная оценка)$/.test(h)) gi.score=i;
    else if(/^(решение|итог|результат|decision)$/.test(h)) gi.decision=i;
  });
  function cell(r,i){ return (i>=0&&r[i]!=null)? String(r[i]).trim() : ''; }
  return arr.slice(1).map(function(r){
    return { id:cell(r,gi.id), name:cell(r,gi.name), leaderEmail:cell(r,gi.email), score:cell(r,gi.score), decision:cell(r,gi.decision) };
  }).filter(function(w){ return w.name||w.id||w.leaderEmail; });
}
function showWave1Result(name){
  document.getElementById('wave1Result').innerHTML='<div class="card" style="margin-top:12px"><b>1-я волна:</b> '+esc(name)+' · записей: <b>'+App.wave1.length+'</b> '+
    '<button class="btn sm" data-act="link-wave1-all">Сопоставить по всем заявкам</button></div>';
}
function tryLinkWave1(){
  var linked=0;
  store.projects.forEach(function(p){
    var cand=proposeWave1(p, App.wave1);
    if(cand.length && !(p.wave1&&p.wave1.linkStatus==='confirmed')){
      p.wave1=p.wave1||{partic:false,score:'',decision:'',linkStatus:'none'};
      p.wave1.partic=true; p.wave1.linkStatus='hypo';
      var c0=cand[0];
      if(c0.wave1.score && !p.wave1.score) p.wave1.score=c0.wave1.score;
      if(c0.wave1.decision && !p.wave1.decision) p.wave1.decision=c0.wave1.decision;
      pushHistory(p,'1-я волна (гипотеза)','',c0.name);
      p.updated=nowIso(); dbPut(p);
      linked++;
    }
  });
  toast('Предложено гипотез связей: '+linked,'ok');
}

/* ---- JSON / XLSX / снимок ---- */
function exportJson(){
  downloadBlob(JSON.stringify({version:1, exported:nowIso(), projects:store.projects, wave1:App.wave1},null,1),'резервная_копия_2-волна_'+today()+'.json','application/json');
}
function restoreJson(){
  var f=document.getElementById('jsonFile').files[0];
  if(!f){ toast('Выберите JSON-файл','err'); return; }
  var r=new FileReader();
  r.onload=function(ev){
    try{
      var data=JSON.parse(ev.target.result);
      var arr=Array.isArray(data)? data : (data.projects||[]);
      if(!Array.isArray(arr)) throw new Error('Некорректный формат');
      if(!window.confirm('Восстановить базу из файла ('+arr.length+' заявок)? Текущая база будет перезаписана.')) return;
      dbClear().then(function(){
        store.projects=arr.map(sanitize);
        if(data.wave1) App.wave1=data.wave1;
        Promise.all(store.projects.map(function(p){ return dbPut(p); })).then(function(){
          toast('Восстановлено заявок: '+arr.length,'ok');
          syncDemoBadge(); renderCurrent();
        });
      });
    }catch(e){ toast('Ошибка чтения JSON: '+e.message,'err'); }
  };
  r.readAsText(f);
}
function buildXlsx(filename,sheetName,rows){
  if(typeof XLSX==='undefined'){ toast('Библиотека XLSX не подключена','err'); return; }
  var ws=XLSX.utils.json_to_sheet(rows||[]);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,sheetName||'Данные');
  saveBlob(new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), filename||'export.xlsx');
}
function exportXlsx(onlyFilter){
  var rows=(onlyFilter? applyFilters(store.projects) : store.projects).map(projectToXlsxRow);
  buildXlsx('заявки_2-волна_'+today()+'.xlsx','Заявки',rows);
  toast('XLSX выгружен','ok');
}
function projectToXlsxRow(p){
  return {
    'ID (Битрикс)':p.id,'Название':nameOf(p),'Аннотация':(p.annotation&&p.annotation.v)||'',
    'Руководитель':(p.leaderName&&p.leaderName.v)||'','Email':(p.leaderEmail&&p.leaderEmail.v)||'','Телефон':(p.leaderPhone&&p.leaderPhone.v)||'',
    'Организация':(p.org&&p.org.v)||'','Команда':(p.team&&p.team.v)||'',
    'Направление (анкета)':(p.formDir&&p.formDir.v)||'','Направление (по карте)':(p.mapDir&&p.mapDir.v)||'',
    'Корпорация':deriveCorp(p),'Запрос':(p.request&&p.request.v)||'',
    'TRL текущий':(p.trlCur&&p.trlCur.v)||'','TRL':(p.trlTarget&&p.trlTarget.v)||'',
    'Бюджет':p.budget&&p.budget.v,'ФОТ':p.fot&&p.fot.v,'Накладные':p.overhead&&p.overhead.v,'Срок (мес)':p.termMonths&&p.termMonths.v,
    'Статус':stLabel(statusOf(p)),'Релевантность':rlLabel(p.relevance&&p.relevance.v),'Оценка экспертов':(p.expertScore&&p.expertScore.v)||'',
    'Следующий шаг':(p.nextStep&&p.nextStep.v)||'','Ответственный':(p.responsible&&p.responsible.v)||'',
    'Срок следующего шага':(p.nextDue&&p.nextDue.v)||'','Слот презентации':(p.slot&&p.slot.v)||'',
    '1-я волна (участие)':(p.wave1&&p.wave1.partic)?'да':'нет','1-я волна (балл)':(p.wave1&&p.wave1.score)||'','1-я волна (решение)':(p.wave1&&p.wave1.decision)||'',
    'ДЕМО':p.demo?'да':''
  };
}
function downloadBlob(content,filename,mime){ saveBlob(new Blob([content],{type:mime||'application/octet-stream'}),filename); }
function saveBlob(blob,filename){
  var url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); },100);
}
function exportSnapshot(){
  var hide=document.getElementById('hideContacts')? document.getElementById('hideContacts').checked : true;
  downloadBlob(buildSnapshotHtml(hide),'снимок_только_чтение_'+today()+'.html','text/html');
  toast('Снимок создан'+(hide?' (контакты скрыты)':''),'ok');
}
function buildSnapshotHtml(hideContacts){
  var rows=store.projects.map(function(p){
    var leader=hideContacts? '' : (p.leaderName&&p.leaderName.v)||'';
    return '<tr><td>'+esc(p.id||'')+'</td><td><b>'+esc(nameOf(p))+'</b></td><td>'+esc((p.formDir&&p.formDir.v)||'')+'</td><td>'+esc((p.corp&&p.corp.v)||'')+'</td><td>'+esc(leader)+'</td><td>'+esc(stLabel(statusOf(p)))+'</td><td>'+esc(rlLabel(p.relevance&&p.relevance.v))+'</td><td>'+fmtMoney(p.budget&&p.budget.v)+'</td></tr>';
  }).join('');
  return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Снимок — 2-я волна (только чтение)</title>'+
  '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;margin:24px;color:#3A2E28;background:#FAF6F0}table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #E8DED3;padding:6px 8px;text-align:left}th{background:#f0e7db}.note{background:#fff6e8;border:1px solid #D9963A;padding:10px 14px;border-radius:8px;margin-bottom:14px;color:#7a5310}h1{font-size:22px}</style></head><body>'+
  '<h1>Программа трансляционных исследований — 2-я волна</h1>'+
  '<div class="note"><b>Снимок только для чтения.</b> Данные не редактируются. '+(hideContacts?'Контакты скрыты. ':'')+'Сформирован '+fmtDate(today())+' · заявок: '+store.projects.length+'</div>'+
  '<table><thead><tr><th>ID</th><th>Название</th><th>Направление</th><th>Корпорация</th><th>Руководитель</th><th>Статус</th><th>Релевантность</th><th>Бюджет</th></tr></thead><tbody>'+rows+'</tbody></table>'+
  '</body></html>';
}
/* ---- Анкета в PDF без персональных данных (для внешних экспертов) ---- */
function exportProjectPdf(id){
  var p=findProj(id); if(!p){ toast('Заявка не найдена','err'); return; }
  var d=calcDerived(p);
  function row(k,v){ return '<tr><td class="k">'+k+'</td><td>'+v+'</td></tr>'; }
  function sec(t){ return '<h2>'+t+'</h2>'; }
  var results='', i;
  var rr=[];
  for(i=1;i<=4;i++){ var r=p['result'+i]&&p['result'+i].v, dt=p['resultDate'+i]&&p['resultDate'+i].v, tg=p['resultTarget'+i]&&p['resultTarget'+i].v; if(r||dt||tg) rr.push([r||'—',dt||'—',tg||'—']); }
  if(rr.length) results=sec('Ожидаемые результаты')+'<table><thead><tr><th>Результат</th><th>Дата</th><th>Целевые характеристики</th></tr></thead><tbody>'+rr.map(function(x){return '<tr><td>'+esc(x[0])+'</td><td>'+esc(x[1])+'</td><td>'+esc(x[2])+'</td></tr>';}).join('')+'</tbody></table>';
  var extra=Object.keys(p.extra||{});
  var extraHtml=extra.length? sec('Прочие поля анкеты')+'<table class="kv">'+extra.map(function(k){ return row(esc(k),esc(p.extra[k].v||'')); }).join('')+'</table>':'';
  var html='<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Анкета '+esc(nameOf(p))+'</title>'+
  '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;margin:28px;color:#1B2430;font-size:13px;line-height:1.5}'+
  'h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #E3E5EA;padding-bottom:4px}'+
  'table{border-collapse:collapse;width:100%}td,th{border:1px solid #D4D7DE;padding:5px 8px;text-align:left;vertical-align:top}th{background:#F1F2F5}'+
  '.k{color:#55606E;width:34%;background:#FAFBFC}.note{background:#F1F2F5;border-radius:6px;padding:8px 12px;color:#55606E;margin:10px 0 16px;font-size:12px}.an{white-space:pre-wrap}</style></head><body>'+
  '<h1>'+esc(nameOf(p))+'</h1>'+
  '<div class="note"><b>Анкета проекта — 2-я волна Программы трансляционных исследований ЦУ.</b> Документ для внешних экспертов: персональные данные (ФИО, почта, телефон) удалены. ID заявки: '+esc(p.id||'—')+' · сформировано '+fmtDate(today())+'</div>'+
  '<table class="kv">'+
    row('Направление отбора (анкета)',esc(p.formDir&&p.formDir.v||'—'))+
    row('Корпорация',esc(deriveCorp(p)||'—'))+
    row('Индустрия',esc(p.industry&&p.industry.v||'—'))+
    row('TRL (текущий / целевой)',esc(p.trlCur&&p.trlCur.v!=null?p.trlCur.v:'—')+' / '+esc(p.trlTarget&&p.trlTarget.v!=null?p.trlTarget.v:'—'))+
    row('Бюджет',fmtMoney(p.budget&&p.budget.v))+
    row('ФОТ',fmtMoney(p.fot&&p.fot.v))+
    row('Накладные',fmtMoney(p.overhead&&p.overhead.v))+
    row('Срок, мес.',esc(p.termMonths&&p.termMonths.v!=null?p.termMonths.v:'—'))+
    row('Доля ФОТ от бюджета',d.fotShare!=null?fmtNum((d.fotShare*100).toFixed(1))+' %':'—')+
  '</table>'+
  sec('Аннотация')+'<div class="an">'+esc(p.annotation&&p.annotation.v||'Нет данных')+'</div>'+
  results+extraHtml+
  '</body></html>';
  var w=window.open('','_blank');
  if(!w){ toast('Разрешите всплывающие окна для выгрузки PDF','err'); return; }
  w.document.write(html); w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); },300);
}

/* ---- Демо-данные ---- */
function addDemoData(){
  var base=makeDemoProjects();
  var existing={}; store.projects.forEach(function(p){ existing[String(p.id)]=1; });
  var added=0;
  base.forEach(function(d){ if(!existing[String(d.id)]){ store.projects.push(d); dbPut(d); added++; } });
  toast('Добавлено демо-заявок: '+added,'ok');
  syncDemoBadge();
}
function removeDemoData(){
  if(!window.confirm('Удалить все демо-заявки?')) return;
  var demo=store.projects.filter(function(p){ return p.demo; });
  demo.forEach(function(p){ dbDelete(p.id); App.sel.delete(String(p.id)); });
  store.projects=store.projects.filter(function(p){ return !p.demo; });
  toast('Удалено демо-заявок: '+demo.length,'ok');
  syncDemoBadge(); renderCurrent();
}
function makeDemoProjects(){
  var demo=[
    ['1001','Прогноз термостойкости полипропиленовых компаундов','Прогноз базовых свойств полимеров','СИБУР',2500000,1500000,120000,12,3,'Анна Соколова'],
    ['1002','Цифровой двойник кристаллизации стали','Моделирование, в т.ч. новых материалов','ТМК',4200000,2900000,290000,12,2,'Дмитрий Кузнецов'],
    ['1003','AI-слой над MES для цеха прокатки','AI-слой над MES','НЛМК',1800000,900000,90000,9,2,'Ирина Волкова'],
    ['1004','Оптимизация высокооктанового компонента на НПЗ','Выход высокооктанового компонента на существующем оборудовании НПЗ','Газпром нефть',3900000,2400000,240000,12,2,'Павел Орлов'],
    ['1005','Машиночитаемые формулы из научных статей','Формулы и таблицы из статей, растровые формулы → машиночитаемый вид','СИБУР',2200000,1400000,140000,10,3,'Мария Лебедева'],
    ['1006','Расстановка товаров на полках ритейлера','Расстановка товаров на полках','X5',3100000,1900000,180000,11,2,'Сергей Иванов'],
    ['1007','Аппаратная альтернатива электронным чернилам','Аппаратная альтернатива электронным чернилам (ценники)','Лента',4600000,2900000,290000,12,2,'Ольга Морозова'],
    ['1008','Регистрация и извлечение алмазов','Регистрация и извлечение алмазов','АЛРОСА',2800000,1700000,160000,12,3,'Николай Фролов'],
    ['1009','Интеллектуальные образовательные системы для коллабораций','ЦУ смотрит для себя: технологии, команды для коллабораций, идеи','Нет партнёра',1900000,1100000,100000,10,2,'Елена Смирнова'],
    ['1010','Умная сегментация дефектов труб','Предиктивная и прескриптивная аналитика (трубное и сталеплавильное производство)','ТМК',3700000,2300000,230000,12,2,'Андрей Титов'],
    ['1011','Предсказание усадки в коксохимическом сырье','Новые продукты из коксохимического сырья','НЛМК',3600000,2400000,240000,12,2,'Вера Никитина'],
    ['1012','Оптимизация загрузки сталеплавильного оборудования','AI-слой над MES','НЛМК',3300000,2000000,200000,12,3,'Григорий Антонов'],
    ['1013','Нейросетевой поиск свойств полимеров','Прогноз базовых свойств полимеров','СИБУР',4100000,2500000,250000,12,2,'Татьяна Гусева'],
    ['1014','Моделирование газовой фазы реактора','Моделирование, в т.ч. новых материалов','ТМК',3500000,2200000,220000,10,3,'Игорь Белов'],
    ['1015','Предиктивное обслуживание конвейеров','Предиктивная и прескриптивная аналитика (трубное и сталеплавильное производство)','ТМК',2700000,1600000,160000,9,3,'Алексей Романов'],
    ['1016','Распознавание растровых схем в патентах','Формулы и таблицы из статей, растровые формулы → машиночитаемый вид','СИБУР',2300000,1400000,140000,11,2,'Ксения Захарова'],
    ['1017','Оптимизация выкладки в магазинах','Расстановка товаров на полках','Магнит',2900000,1800000,180000,8,2,'Юлия Полякова'],
    ['1018','Электронные ценники нового типа','Аппаратная альтернатива электронным чернилам (ценники)','Магнит',4800000,3000000,300000,12,2,'Максим Егоров'],
    ['1019','Извлечение алмазов из трубок','Регистрация и извлечение алмазов','АЛРОСА',2500000,1500000,150000,12,3,'Наталья Киселёва'],
    ['1020','Платформа коллабораций науки и индустрии','ЦУ смотрит для себя: технологии, команды для коллабораций, идеи','Нет партнёра',2100000,1200000,120000,12,2,'Виктор Данилов']
  ];
  var statusMap=['reg','applied','formfilled','check','expert','invited','presented'];
  var relMap=['none','none','mid','high','very','high','mid'];
  return demo.map(function(d,i){
    var p=emptyProject();
    p.id=d[0]; p.demo=true;
    p.name={v:d[1],src:'b'};
    p.annotation={v:'Аннотация по теме «'+d[1]+'». [ДЕМО]',src:'b'};
    p.leaderName={v:d[9],src:'b'};
    p.leaderEmail={v:slug(d[9].split(' ')[0])+'@example.org',src:'b'};
    p.leaderPhone={v:'+7 (900) 000-'+String(100+i),src:'b'};
    p.org={v:'Центральный университет',src:'b'};
    p.team={v:'Команда проекта [ДЕМО]',src:'b'};
    var hit=CONFIG.directionMap.find(function(m){ return m.req===d[2]; });
    p.formDir={v:hit?hit.dir:'',src:'b'};
    p.mapDir={v:hit?hit.dir:'',src:'m'};
    p.corp={v:d[3],src:'m'}; p.request={v:d[2],src:'m'};
    p.trlCur={v:1,src:'b'}; p.trlTarget={v:d[8],src:'b'};
    p.budget={v:d[4],src:'b'}; p.fot={v:d[5],src:'b'}; p.overhead={v:d[6],src:'b'}; p.termMonths={v:d[7],src:'b'};
    p.status={v:statusMap[i%statusMap.length],src:'m'};
    p.relevance={v:relMap[i%relMap.length],src:'m'};
    p.materials={reg:true,app:true,form:true,present:false};
    p.created=new Date(Date.UTC(2026,10,3+i%18)).toISOString();
    p.updated=nowIso();
    if(i===3){ p.budget={v:5300000,src:'b'}; p.fot={v:3400000,src:'b'}; p.overhead={v:1400000,src:'b'}; }
    if(i===7){ p.overhead={v:Number(p.fot.v)*0.15,src:'b'}; }
    if(i===15){ p.status={v:'reg',src:'m'}; p.materials={reg:true,app:false,form:false,present:false}; }
    return p;
  });
}

/* ============================================================
 *  app.js — Часть 6: справочники, обработчики событий,
 *  инициализация
 * ============================================================ */
function renderRefs(){
  screenEl('refs').innerHTML=
    '<h1>Справочники и настройки</h1>'+
    '<div class="sub">Справочники, правила и палитра задаются в файле <b>config.js</b> — там их можно менять без программиста.</div>'+
    '<div class="dash-grid" style="margin-top:16px">'+
      '<div class="card"><h3>Корпорации и приоритет</h3><table class="tbl" style="min-width:0"><tbody>'+
        CONFIG.corporations.map(function(c){ return '<tr><td>'+esc(c.name)+'</td><td>'+(c.priority==='high'?'<span class="chip prior-up">высокий</span>':c.priority==='interest'?'<span class="chip prior-up">интерес ЦУ</span>':'<span class="chip">обычный</span>')+'</td></tr>'; }).join('')+
      '</tbody></table></div>'+
      '<div class="card"><h3>Правила программы</h3><table class="kv">'+
        '<tr><td>Бюджет ≤</td><td>'+fmtMoney(CONFIG.rules.budgetMax)+'</td></tr>'+
        '<tr><td>Срок ≤</td><td>'+CONFIG.rules.termMonthsMax+' мес.</td></tr>'+
        '<tr><td>ФОТ (доля бюджета)</td><td>≤ '+Math.round(CONFIG.rules.fotShareMax*100)+' %</td></tr>'+
        '<tr><td>Накладные (от ФОТ)</td><td>≤ '+Math.round(CONFIG.rules.overheadFotShareMax*100)+' %</td></tr>'+
        '<tr><td>Целевой TRL</td><td>'+CONFIG.rules.trlTargetMin+'–'+CONFIG.rules.trlTargetMax+'</td></tr>'+
        '<tr><td>Подача до</td><td>'+fmtDate(CONFIG.app.deadlineSubmit)+'</td></tr>'+
        '<tr><td>Презентации</td><td>'+fmtDate(CONFIG.app.presentationsWindow[0])+'–'+fmtDate(CONFIG.app.presentationsWindow[1])+'</td></tr>'+
      '</table></div>'+
      '<div class="card full"><h3>Карта «направление · корпорация · запрос»</h3>'+
        '<table class="tbl" style="min-width:0"><thead><tr><th>Направление</th><th>Корпорация</th><th>Запрос</th></tr></thead><tbody>'+
        CONFIG.directionMap.map(function(r){ return '<tr><td>'+esc(r.dir)+'</td><td>'+esc(r.corp)+'</td><td>'+esc(r.req)+'</td></tr>'; }).join('')+
      '</tbody></table></div>'+
    '</div>';
}

/* ---- Глобальные обработчики (делегирование событий) ---- */
function onClick(e){
  var ts=e.target.closest('[data-theme-set]');
  if(ts){ setTheme(ts.dataset.themeSet); return; }
  var el=e.target.closest('[data-act]');
  if(!el){
    if(e.target&&e.target.id==='modalRoot') closeModal();
    if(popEl&&!popEl.contains(e.target)) closePopover();
    return;
  }
  var act=el.dataset.act;
  switch(act){
    case 'nav': go(el.dataset.screen); break;
    case 'go-list': {
      var f={};
      if(el.dataset.fk) f[el.dataset.fk]=el.dataset.fv||'1';
      if(el.dataset.fk2) f[el.dataset.fk2]=el.dataset.fv2;
      go('list', f);
      break;
    }
    case 'go-card': go('card',{id:el.dataset.id, zone:el.dataset.zone}); break;
    case 'card-zone': App.card.zone=el.dataset.zone; App.card.tab=(el.dataset.zone==='form'?'form':'overview'); renderCardBody(); break;
    case 'card-tab': App.card.tab=el.dataset.tab; renderCardBody(); break;
    case 'filter-pill': openFilterMenu(el, el.dataset.key); break;
    case 'filter-opt': {
      var k=el.dataset.key, v=el.dataset.val;
      if(v==='') delete App.ui.filters[k]; else App.ui.filters[k]=v;
      persistUi(); closePopover(); renderList();
      break;
    }
    case 'filter-toggle': {
      var k2=el.dataset.key;
      if(App.ui.filters[k2]) delete App.ui.filters[k2]; else App.ui.filters[k2]='1';
      persistUi(); renderList();
      break;
    }
    case 'filter-reset': App.ui.filters={}; App.ui.search=''; persistUi(); renderList(); break;
    case 'sort': {
      var k3=el.dataset.key;
      if(App.ui.sort.key===k3) App.ui.sort.dir*=-1; else App.ui.sort={key:k3,dir:1};
      persistUi(); renderList();
      break;
    }
    case 'bulk-open': openBulkModal(); break;
    case 'bulk-apply': { var sel=document.getElementById('bulkStatusSel'); if(sel) bulkApply(sel.value); break; }
    case 'modal-close': closeModal(); break;
    case 'export-xlsx': exportXlsx(el.dataset.scope==='filter'); break;
    case 'export-present': exportPresentXlsx(); break;
    case 'export-json': exportJson(); break;
    case 'restore-json': restoreJson(); break;
    case 'export-snapshot': exportSnapshot(); break;
    case 'load-csv': loadCsvFile(); break;
    case 'import-run': doImport(); break;
    case 'map-reset': resetMap(); break;
    case 'load-wave1': loadWave1File(); break;
    case 'link-wave1-all': tryLinkWave1(); break;
    case 'demo-add': addDemoData(); break;
    case 'demo-del': removeDemoData(); break;
    case 'proj-del': deleteProject(el.dataset.id); break;
    case 'undo-restore': undoRestore(el.dataset.id); break;
    case 'print': window.print(); break;
    case 'export-pdf': exportProjectPdf(el.dataset.id); break;
    case 'slot-clear': clearSlot(el.dataset.day); break;
    case 'auto-slot': autoSlot(); break;
    case 'contact-add': addContact(); break;
    case 'contact-del': delContact(Number(el.dataset.i)); break;
    case 'comment-add': addComment(); break;
    case 'comment-del': delComment(Number(el.dataset.i)); break;
    case 'w1-confirm': linkWave1(App.card.id, el.dataset.name, true); break;
    case 'w1-reject': linkWave1(App.card.id, el.dataset.name, false); break;
  }
}
function onChange(e){
  var t=e.target;
  if(t.matches('[data-f]')){ saveField(t.dataset.f, t.value); return; }
  if(t.matches('[data-m]')){ saveMaterial(t.dataset.m, t.checked); return; }
  if(t.matches('[data-w1p]')){ saveWave1Partic(t.checked); return; }
  if(t.matches('[data-w1]')){ saveWave1Field(t.dataset.w1, t.value); return; }
  if(t.matches('[data-col]')){ toggleCol(t.dataset.col); return; }
  if(t.matches('[data-selall]')){ selAll(t.checked); return; }
  if(t.matches('[data-sel]')){ selRow(t.value, t.checked); return; }
  if(t.matches('[data-slot]')){ assignSlot(t.dataset.slot, t.value); return; }
}
var searchDeb=debounce(function(){ updateListResults(); },120);
function onInput(e){
  if(e.target&&e.target.id==='lSearch'){ App.ui.search=e.target.value; persistUi(); searchDeb(); }
}
function openFilterMenu(anchor,key){
  var def=FILTER_MENU[key]; if(!def) return;
  var cur=App.ui.filters[key];
  var html='<div class="opt '+(cur?'':'on')+'" data-act="filter-opt" data-key="'+key+'" data-val=""><span>Все</span><span class="check">'+(cur?'':'✓')+'</span></div>';
  html+=def.options().map(function(o){
    var lab=def.text? def.text(o) : o;
    return '<div class="opt '+(cur===o?'on':'')+'" data-act="filter-opt" data-key="'+key+'" data-val="'+esc(o)+'"><span>'+esc(lab)+'</span><span class="check">'+(cur===o?'✓':'')+'</span></div>';
  }).join('');
  openPopover(anchor, html);
}
function onKeydown(e){
  if(e.key==='Escape'){ closePopover(); closeModal(); }
  if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'')){
    e.preventDefault();
    if(App.screen!=='list') go('list');
    setTimeout(function(){ var s=document.getElementById('lSearch'); if(s) s.focus(); },50);
  }
}

/* ---- Тема оформления ---- */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t==='cu'?'cu':'std');
  document.querySelectorAll('.theme-btn').forEach(function(b){ b.classList.toggle('on', b.dataset.themeSet===(t==='cu'?'cu':'std')); });
}
function setTheme(t){
  App.ui.theme=(t==='cu'?'cu':'std');
  persistUi();
  applyTheme(App.ui.theme);
}

/* ---- Инициализация ---- */
function syncDemoBadge(){
  var demo=store.projects.some(function(p){ return p.demo; });
  var b=document.getElementById('demoBadge');
  if(b) b.style.display=demo?'inline-flex':'none';
}
function boot(){
  modalRoot=document.getElementById('modalRoot');
  modalBox=document.getElementById('modalBox');
  toastEl=document.getElementById('toast');
  App.ui=loadUi();
  applyTheme(App.ui.theme);
  buildNav();
  document.getElementById('projBtn').addEventListener('click',function(){
    document.body.classList.toggle('projector');
    this.textContent=document.body.classList.contains('projector')?'🖥 Обычный':'🖥 Проектор';
  });
  document.addEventListener('click',onClick);
  document.addEventListener('change',onChange);
  document.addEventListener('input',onInput);
  document.addEventListener('keydown',onKeydown);
  openDB().then(function(){ return dbAll(); }).then(function(list){
    store.projects=(list||[]).filter(Boolean).map(sanitize);
    syncDemoBadge();
    go('dashboard');
  });
  window.Proj={go:go, store:store, App:App, CONFIG:CONFIG};
}
window.addEventListener('DOMContentLoaded', boot);
