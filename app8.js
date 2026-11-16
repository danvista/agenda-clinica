/* Agenda Clínica — parte 8: modo celular */
"use strict";
const MQ=window.matchMedia('(max-width:760px)');
const isMobile=()=>MQ.matches;
ui.mview='lista';try{const v=localStorage.getItem('agenda-mview');if(v==='lista'||v==='grade')ui.mview=v;}catch(e){}
const PAGE_NOMES={agenda:'Agenda',pacientes:'Pacientes',procedimentos:'Serviços e procedimentos',profissionais:'Profissionais',usuarios:'Usuários',configuracoes:'Configurações'};

/* ---------- Barra superior, barra de abas e botão + ---------- */
(function montarMobile(){
  const ic=r=>{const s=$(`#nav a[data-r="${r}"] svg`);return s?s.outerHTML:''};
  const top=document.createElement('header');top.id='mtop';
  top.innerHTML=`<div class="brand-logo">A</div><div class="mt-t"><b id="mt-clin">Agenda</b><span id="mt-page"></span></div>`;
  $('#app main').prepend(top);
  const nav=document.createElement('nav');nav.id='mnav';
  nav.innerHTML=`<a href="#agenda" data-mr="agenda">${ic('agenda')}<span>Agenda</span></a>
    <a href="#pacientes" data-mr="pacientes">${ic('pacientes')}<span>Pacientes</span></a>
    <a href="#procedimentos" data-mr="procedimentos">${ic('procedimentos')}<span>Serviços</span></a>
    <button type="button" data-mr="mais" id="m-mais"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg><span>Mais</span><i class="m-badge" hidden></i></button>`;
  $('#app').appendChild(nav);
  const fab=document.createElement('button');fab.id='mfab';fab.type='button';fab.setAttribute('aria-label','Novo');fab.textContent='+';
  fab.onclick=()=>{if(!READY)return;if(route()==='pacientes')openPac(null);else openAg(null,{date:ui.date});};
  $('#app').appendChild(fab);
  $('#m-mais').onclick=abrirMais;
})();

function abrirMais(){
  if(!READY)return;
  const r=route(),pend=isAdmin()?S.perfis.filter(u=>!u.ativo).length:0;
  const it=(h,t,ic,extra='')=>`<a href="#${h}" data-close class="m-li ${r===h?'on':''}">${ic}<span>${t}</span>${extra}</a>`;
  const ico=n=>{const s=$(`#nav a[data-r="${n}"] svg`);return s?s.outerHTML:''};
  const ov=openModal(`<div class="m-sheet-h"><div><b>${esc(ME.nome||ME.email)}</b><div class="muted" style="font-size:13px">${ME.papel==='admin'?'Administrador':'Equipe'} · ${esc(ME.email)}</div></div><button class="x" data-close aria-label="Fechar">×</button></div>
    <div class="m-list">
      ${it('profissionais','Profissionais',ico('profissionais'))}
      ${isAdmin()?it('usuarios','Usuários',ico('usuarios'),pend?`<span class="pill badge-pend">${pend} aguardando</span>`:''):''}
      ${isAdmin()?it('configuracoes','Configurações e backup',ico('configuracoes')):''}
      <button type="button" class="m-li" id="mm-senha"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3"/></svg><span>Alterar minha senha</span></button>
      <button type="button" class="m-li danger" id="mm-sair"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg><span>Sair</span></button>
    </div>`,'sheet');
  $('#mm-senha',ov).onclick=()=>{ov._close();$('#u-senha').click()};
  $('#mm-sair',ov).onclick=()=>{ov._close();$('#u-sair').click()};
}

function mChrome(){
  if(!READY)return;
  const r=route();
  $('#mt-clin').textContent=CONF.nome;
  $('#mt-page').textContent=PAGE_NOMES[r]||'';
  const tab=['agenda','pacientes','procedimentos'].includes(r)?r:'mais';
  $$('#mnav [data-mr]').forEach(a=>a.classList.toggle('on',a.dataset.mr===tab));
  const pend=isAdmin()?S.perfis.filter(u=>!u.ativo).length:0;
  $('#mnav .m-badge').hidden=!pend;
  $('#mfab').hidden=!(r==='agenda'||r==='pacientes');
}

/* ---------- Agenda no celular ---------- */
const _vAgendaDesk=vAgenda,_afterAgendaDesk=afterAgenda,_renderDesk=render;
const diaCurto=s=>{const t=todayISO();if(s===t)return'Hoje';if(s===addDays(t,1))return'Amanhã';if(s===addDays(t,-1))return'Ontem';const d=parseISO(s);return DOWS[d.getDay()]+', '+d.getDate()+' '+MES[d.getMonth()].slice(0,3)};
const filtroProf=a=>ui.prof==='all'||a.profissionalId===ui.prof;

function mAgendaHead(){
  const profs=activeProfs(),t=todayISO(),st=weekStart(ui.date);
  const has=new Set(agList().filter(a=>!INATIVOS.includes(a.status)&&filtroProf(a)).map(a=>a.data));
  let dias='';
  for(let i=0;i<7;i++){const d=addDays(st,i),dt=parseISO(d);
    dias+=`<button type="button" data-act="cal-pick" data-date="${d}" class="${d===ui.date?'sel':''} ${d===t?'td':''} ${has.has(d)?'has':''}"><span>${DOWS[dt.getDay()]}</span><b>${dt.getDate()}</b></button>`;}
  return `<div class="m-ag">
    <div class="m-ag-h">
      <button class="icon-btn" data-act="m-dprev" aria-label="Dia anterior">‹</button>
      <div class="m-ag-title"><b>${diaCurto(ui.date)}</b><span>${fmtLong(ui.date)}</span></div>
      <button class="icon-btn" data-act="m-dnext" aria-label="Próximo dia">›</button>
    </div>
    <div class="m-week"><button type="button" class="m-wk" data-act="m-wprev" aria-label="Semana anterior">‹</button>${dias}<button type="button" class="m-wk" data-act="m-wnext" aria-label="Próxima semana">›</button></div>
    <div class="m-ag-tools">
      ${profs.length>1?`<select class="input" id="m-prof"><option value="all">Todos os profissionais</option>${profs.map(p=>`<option value="${esc(p.id)}" ${ui.prof===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select>`:'<span></span>'}
      ${ui.date!==t?'<button class="btn sm" data-act="ag-today">Hoje</button>':''}
      <div class="tabs"><button class="${ui.mview==='lista'?'on':''}" data-act="m-view" data-v="lista">Lista</button><button class="${ui.mview==='grade'?'on':''}" data-act="m-view" data-v="grade">Grade</button></div>
    </div></div>`;
}
function mLista(){
  const c=cfg(),t=todayISO();
  const ags=agList().filter(a=>a.data===ui.date&&filtroProf(a)).sort(sortAg);
  const ativos=ags.filter(a=>!INATIVOS.includes(a.status));
  const conf=ativos.filter(a=>a.status==='confirmado').length;
  // horários livres (só hoje em diante)
  let livres=[];
  if(ui.date>=t){
    let cur=c.inicio*60;const fim=c.fim*60;
    if(ui.date===t){const n=new Date(),nm=n.getHours()*60+n.getMinutes();cur=Math.max(cur,Math.ceil(nm/c.intervalo)*c.intervalo);}
    ativos.map(a=>[toMin(a.hora),toMin(a.hora)+(+a.duracao||30)]).sort((x,y)=>x[0]-y[0]).forEach(([s,e])=>{if(s-cur>=c.intervalo)livres.push([cur,s]);cur=Math.max(cur,e)});
    if(fim-cur>=c.intervalo)livres.push([cur,fim]);
  }
  const itens=ags.map(a=>({m:toMin(a.hora),a})).concat(livres.map(([s,e])=>({m:s,livre:[s,e]}))).sort((x,y)=>x.m-y.m||(x.livre?1:-1));
  const cards=itens.map(o=>{
    if(o.livre){const [s,e]=o.livre;return `<button type="button" class="m-free" data-act="m-slot" data-h="${toHM(s)}"><span>${toHM(s)} – ${toHM(e)}</span><b>Horário livre · agendar</b></button>`;}
    const a=o.a,st=STATUS[a.status]||STATUS.agendado,p=pacById(a.pacienteId),pr=profById(a.profissionalId);
    const sv=(a.servicos||[]).map(x=>(svcById(x.id)||x).nome).join(', ');
    const first=a.servicos&&a.servicos[0]&&svcById(a.servicos[0].id);
    const bar=(first&&first.cor)||(pr&&pr.cor)||'#0e9f8e';
    const wa=p&&!INATIVOS.includes(a.status)&&a.data>=t?waLink(p,a):'';
    const fimH=toHM(o.m+(+a.duracao||30));
    return `<div class="m-ev ${esc(a.status)}" data-act="ag-open" data-id="${esc(a.id)}" style="--bar:${esc(bar)}">
      <div class="m-ev-h"><b>${esc(a.hora)}</b><span>${fimH}</span></div>
      <div class="m-ev-b"><div class="m-ev-p">${esc(p?p.nome:'Paciente removido')}</div>
        ${sv||pr?`<div class="m-ev-s">${esc([sv,ui.prof==='all'&&pr?pr.nome:''].filter(Boolean).join(' · '))}</div>`:''}
        <span class="m-st" style="color:${st.c};background:${st.bg}">${st.l}</span></div>
      ${wa?`<a class="m-wa" data-act="m-wa" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="Confirmar pelo WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11.5 11.5 0 0 1-4.4-3.9c-.3-.5-1-1.5-1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2z"/></svg></a>`:''}
    </div>`;
  }).join('');
  const resumo=ags.length?`<div class="m-sum">${ativos.length} agendamento(s)${conf?` · ${conf} confirmado(s)`:''}</div>`:'';
  return `${resumo}<div class="m-list-ag" id="m-swipe">${cards||`<div class="empty"><h3>Nenhum agendamento</h3>${ui.date<t?'Este dia já passou.':'Fora do horário de atendimento.'}</div>`}</div>`;
}
vAgenda=function(){
  if(!isMobile())return _vAgendaDesk();
  if(ui.mview==='grade'){const v=ui.view;ui.view='dia';const h=_vAgendaDesk();ui.view=v;return mAgendaHead()+`<div class="m-grade">${h}</div>`;}
  return mAgendaHead()+mLista();
};
afterAgenda=function(top,left){
  if(isMobile()){
    const sel=$('#m-prof');if(sel)sel.onchange=()=>{ui.prof=sel.value;render()};
    const wk=$('.m-week .sel');if(wk)wk.scrollIntoView({block:'nearest',inline:'center'});
    const sw=$('#m-swipe');
    if(sw){let x0=null,y0=0;
      sw.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
      sw.addEventListener('touchend',e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
        if(Math.abs(dx)>70&&Math.abs(dy)<50){ui.date=addDays(ui.date,dx<0?1:-1);render();}},{passive:true});}
    if(ui.mview!=='grade')return;
    const v=ui.view;ui.view='dia';_afterAgendaDesk(top,left);ui.view=v;return;
  }
  _afterAgendaDesk(top,left);
};
render=function(){_renderDesk();mChrome();};

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el||el.closest('.overlay')||!READY)return;
  switch(el.dataset.act){
    case 'm-dprev':ui.date=addDays(ui.date,-1);ui.cal=null;render();break;
    case 'm-dnext':ui.date=addDays(ui.date,1);ui.cal=null;render();break;
    case 'm-wprev':ui.date=addDays(ui.date,-7);ui.cal=null;render();break;
    case 'm-wnext':ui.date=addDays(ui.date,7);ui.cal=null;render();break;
    case 'm-view':ui.mview=el.dataset.v;ui.scrollInit=false;try{localStorage.setItem('agenda-mview',ui.mview)}catch(x){}render();break;
    case 'm-slot':openAg(null,{date:ui.date,hora:el.dataset.h,prof:ui.prof!=='all'?ui.prof:undefined});break;
  }
});
let mqWas=isMobile();
MQ.addEventListener('change',()=>{if(isMobile()!==mqWas){mqWas=isMobile();ui.scrollInit=false;if(READY)render();}});
