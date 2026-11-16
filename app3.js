/* Agenda Clínica — parte 3 de 7 */
"use strict";
/* ---------- Agenda ---------- */
function weekDays(s){const c=cfg(),st=weekStart(s),out=[];for(let i=0;i<7;i++){const d=addDays(st,i);const keep=d===s||d===todayISO()||agList().some(a=>a.data===d&&!INATIVOS.includes(a.status));if(i===5&&!c.sabado&&!keep)continue;if(i===6&&!c.domingo&&!keep)continue;out.push(d);}return out}
function agendaCols(){
  const t=todayISO(),profs=activeProfs();
  if(ui.view==='dia'){
    let ps=profs.filter(p=>ui.prof==='all'||p.id===ui.prof);
    if(ui.prof!=='all'&&!ps.length){const p=profById(ui.prof);if(p)ps=[p];}
    const cols=ps.map(p=>({date:ui.date,prof:p.id,title:esc(p.nome),sub:esc(p.especialidade||''),color:p.cor,today:ui.date===t}));
    if(ui.prof==='all'){
      const ids=new Set(ps.map(p=>p.id));
      const orphan=agList().some(a=>a.data===ui.date&&!ids.has(a.profissionalId));
      if(!cols.length||orphan)cols.push({date:ui.date,prof:'__none',title:cols.length?'Sem profissional':'Agenda',sub:cols.length?'':'Cadastre profissionais para separar colunas',today:ui.date===t,orphanIds:ids});
    }
    return cols;
  }
  return weekDays(ui.date).map(d=>{const dt=parseISO(d);return{date:d,prof:ui.prof==='all'?null:ui.prof,title:`${DOWS[dt.getDay()]}<span class="gh-num">${dt.getDate()}</span>`,sub:'',today:d===t,dayLink:true}});
}
function colAgs(col){
  return agList().filter(a=>{
    if(a.data!==col.date)return false;
    if(col.prof===null)return true;
    if(col.prof==='__none')return !col.orphanIds.has(a.profissionalId);
    return a.profissionalId===col.prof;
  });
}
function layoutEvs(evs){
  evs=evs.map(a=>({a,s:toMin(a.hora),e:toMin(a.hora)+(+a.duracao||30)})).sort((x,y)=>x.s-y.s||y.e-x.e);
  let cluster=[],end=-1;const flush=()=>{const lanes=[];cluster.forEach(o=>{let i=lanes.findIndex(le=>le<=o.s);if(i<0){i=lanes.length;lanes.push(0)}lanes[i]=o.e;o.l=i});cluster.forEach(o=>o.n=lanes.length);cluster=[]};
  evs.forEach(o=>{if(cluster.length&&o.s>=end){flush();end=-1}cluster.push(o);end=Math.max(end,o.e)});
  if(cluster.length)flush();
  return evs;
}
function evHtml(o,c,showProf){
  const a=o.a,st=STATUS[a.status]||STATUS.agendado;
  const top=Math.max(0,(o.s-c.inicio*60)*PPM),h=Math.max(20,(o.e-o.s)*PPM-2);
  const p=pacById(a.pacienteId),pr=profById(a.profissionalId);
  const sv=(a.servicos||[]).map(x=>(svcById(x.id)||x).nome).join(', ');
  const first=a.servicos&&a.servicos[0]&&svcById(a.servicos[0].id);
  const bar=(first&&first.cor)||(pr&&pr.cor)||'#0e9f8e';
  const extra=[showProf&&pr?pr.nome:'',sv].filter(Boolean).join(' · ');
  return `<div class="ev ${esc(a.status)}" data-act="ag-open" data-id="${esc(a.id)}" title="${esc(a.hora+' '+(p?p.nome:'')+(sv?' — '+sv:''))}" style="top:${top}px;height:${h}px;left:calc(${o.l*100/o.n}% + 2px);width:calc(${100/o.n}% - 4px);--c:${st.c};background:${st.bg};--bar:${esc(bar)}">
    <div class="ev-t"><span>${esc(a.hora)}–${toHM(o.e)}</span><span class="ev-st">${st.l}</span></div>
    <div class="ev-p">${esc(p?p.nome:'Paciente removido')}</div>${extra?`<div class="ev-s">${esc(extra)}</div>`:''}</div>`;
}
function vAgenda(){
  const c=cfg(),cols=agendaCols(),start=c.inicio*60,end=Math.max(c.fim*60,start+60),H=(end-start)*PPM;
  let label;
  if(ui.view==='dia')label=fmtLong(ui.date);
  else{const w=weekDays(ui.date),a=parseISO(w[0]),b=parseISO(w[w.length-1]);label=a.getMonth()===b.getMonth()?`${a.getDate()} – ${b.getDate()} de ${MES[b.getMonth()]} de ${b.getFullYear()}`:`${a.getDate()} de ${MES[a.getMonth()]} – ${b.getDate()} de ${MES[b.getMonth()]} de ${b.getFullYear()}`;}
  const profs=activeProfs();
  const showProf=ui.view==='semana'&&ui.prof==='all'&&profs.length>1;
  let times='';for(let m=start;m<end;m+=60)times+=`<div style="top:${(m-start)*PPM}px">${toHM(m)}</div>`;
  const now=new Date(),nowM=now.getHours()*60+now.getMinutes(),t=todayISO();
  const colsHtml=cols.map(col=>{
    const evs=layoutEvs(colAgs(col)).map(o=>evHtml(o,c,showProf)).join('');
    const nl=col.date===t&&nowM>=start&&nowM<=end?`<div class="nowline" style="top:${(nowM-start)*PPM}px"></div>`:'';
    return `<div class="col ${col.today?'today':''}" data-date="${col.date}" data-prof="${esc(col.prof||'')}" style="height:${H}px;--slot:${c.intervalo*PPM}px;--hour:${60*PPM}px"><div class="ghost"></div>${evs}${nl}</div>`;
  }).join('');
  const heads=cols.map(col=>`<div class="gh ${col.today&&ui.view==='semana'?'today':''} ${col.dayLink?'daylink':''}" ${col.dayLink?`data-act="ag-goday" data-date="${col.date}"`:''}><div class="gh-t">${col.title}</div>${col.sub?`<div class="gh-s">${col.sub}</div>`:''}${col.color?`<div class="bar" style="background:${esc(col.color)}"></div>`:''}</div>`).join('');
  return `<div class="ag-layout"><div class="ag-main">
    <div class="ag-top">
      <div class="ag-nav"><button class="btn" data-act="ag-today">Hoje</button><button class="icon-btn" data-act="ag-prev" aria-label="Anterior">‹</button><button class="icon-btn" data-act="ag-next" aria-label="Próximo">›</button><h2>${label}</h2></div>
      <div class="ag-tools">
        <div class="tabs"><button class="${ui.view==='dia'?'on':''}" data-act="ag-view" data-v="dia">Dia</button><button class="${ui.view==='semana'?'on':''}" data-act="ag-view" data-v="semana">Semana</button></div>
        <select class="input" id="ag-prof"><option value="all">Todos os profissionais</option>${profs.map(p=>`<option value="${esc(p.id)}" ${ui.prof===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select>
        <button class="btn primary" data-act="ag-new">+ Agendar</button>
      </div>
    </div>
    <div class="grid-wrap" id="grid-wrap"><div class="grid" style="--cols:${cols.length}">
      <div class="gh corner"></div>${heads}
      <div class="times" style="height:${H}px;position:sticky;left:0">${times}</div>${colsHtml}
    </div></div>
  </div>
  <aside class="ag-side">${miniCal()}${resumo()}</aside></div>`;
}
function miniCal(){
  const base=ui.cal||ui.date.slice(0,7)+'-01',d0=parseISO(base),y=d0.getFullYear(),m=d0.getMonth();
  const first=new Date(y,m,1),startOff=(first.getDay()+6)%7,gridStart=new Date(y,m,1-startOff);
  const has=new Set(agList().filter(a=>!INATIVOS.includes(a.status)&&(ui.prof==='all'||a.profissionalId===ui.prof)).map(a=>a.data));
  const t=todayISO();let cells='';
  for(let i=0;i<42;i++){const d=new Date(gridStart);d.setDate(gridStart.getDate()+i);const s=toISO(d);
    cells+=`<button data-act="cal-pick" data-date="${s}" class="${d.getMonth()!==m?'out':''} ${s===t?'td':''} ${s===ui.date?'sel':''} ${has.has(s)?'has':''}">${d.getDate()}</button>`;}
  return `<div class="card mini"><div class="mini-h"><button data-act="cal-prev" aria-label="Mês anterior">‹</button><b>${MES[m]} ${y}</b><button data-act="cal-next" aria-label="Próximo mês">›</button></div>
    <div class="mini-g">${['S','T','Q','Q','S','S','D'].map(w=>`<div class="w">${w}</div>`).join('')}${cells}</div></div>`;
}
function resumo(){
  const ags=agList().filter(a=>a.data===ui.date&&(ui.prof==='all'||a.profissionalId===ui.prof)).sort(sortAg);
  const cnt={};ags.forEach(a=>cnt[a.status]=(cnt[a.status]||0)+1);
  const total=ags.filter(a=>!INATIVOS.includes(a.status)).reduce((s,a)=>s+(+a.valor||0),0);
  const d=parseISO(ui.date);
  return `<div class="card box"><h3>${ui.date===todayISO()?'Hoje':DOWS[d.getDay()]+', '+fmtBR(ui.date).slice(0,5)}</h3>
    ${Object.keys(STATUS).map(k=>`<div class="st-row"><span><i class="dot" style="background:${STATUS[k].c}"></i>${STATUS[k].l}</span><b>${cnt[k]||0}</b></div>`).join('')}
    <div class="st-row" style="border-top:1px solid var(--line);margin-top:6px;padding-top:8px"><span>Previsto</span><b>${money(total)}</b></div></div>
  <div class="card box"><h3>Pacientes do dia</h3>${ags.length?`<div class="day-list">${ags.map(a=>{const p=pacById(a.pacienteId),st=STATUS[a.status]||STATUS.agendado;return `<div class="day-item" data-act="ag-open" data-id="${esc(a.id)}"><div class="h">${esc(a.hora)}</div><div class="n"><div><b>${esc(p?p.nome:'—')}</b></div><div style="color:${st.c};font-size:12px">${st.l}</div></div></div>`}).join('')}</div>`:'<div class="muted" style="font-size:13px">Nenhum agendamento.</div>'}</div>`;
}
function afterAgenda(prevTop,prevLeft){
  const gw=$('#grid-wrap');if(!gw)return;
  if(prevTop!=null&&ui.scrollInit){gw.scrollTop=prevTop;gw.scrollLeft=prevLeft;}
  else{const c=cfg(),h=new Date().getHours(),target=Math.max(c.inicio,Math.min(h-1,c.fim-1));gw.scrollTop=(target-c.inicio)*60*PPM;ui.scrollInit=true;}
  const sel=$('#ag-prof');if(sel)sel.onchange=()=>{ui.prof=sel.value;render()};
  $$('.col',gw).forEach(col=>{
    const g=$('.ghost',col),c=cfg();
    col.addEventListener('mousemove',e=>{
      if(e.target.closest('.ev')){g.style.display='none';return}
      const m=slotAt(col,e.clientY);g.style.display='block';g.style.top=(m-c.inicio*60)*PPM+'px';g.style.height=Math.max(18,c.intervalo*PPM-2)+'px';g.textContent='+ '+toHM(m);
    });
    col.addEventListener('mouseleave',()=>g.style.display='none');
    col.addEventListener('click',e=>{
      if(e.target.closest('.ev'))return;
      const m=slotAt(col,e.clientY);
      const p=col.dataset.prof;
      openAg(null,{date:col.dataset.date,hora:toHM(m),prof:p&&p!=='__none'?p:(ui.prof!=='all'?ui.prof:'')});
    });
  });
}
function slotAt(col,clientY){const c=cfg(),r=col.getBoundingClientRect(),y=clientY-r.top;let m=c.inicio*60+Math.floor(y/PPM/c.intervalo)*c.intervalo;return Math.min(Math.max(m,c.inicio*60),c.fim*60-c.intervalo)}
function nextSlot(){const c=cfg(),n=new Date();let m=Math.ceil((n.getHours()*60+n.getMinutes())/c.intervalo)*c.intervalo;if(m<c.inicio*60||m>=c.fim*60)m=c.inicio*60;return toHM(m)}
