/* Agenda Clínica — parte 4 de 7 */
"use strict";
/* ---------- Modal de agendamento ---------- */
function openAg(id,preset={}){
  const ex=id?AG.get(id):null;
  if(id&&!ex){toast('Agendamento não encontrado.');return}
  const c=cfg();
  const a=ex?JSON.parse(JSON.stringify(ex)):{data:preset.date||ui.date,hora:preset.hora||nextSlot(),duracao:c.intervalo,profissionalId:preset.prof!==undefined&&preset.prof!==''?preset.prof:(ui.prof!=='all'?ui.prof:((activeProfs()[0]||{}).id||'')),pacienteId:preset.pacienteId||'',servicos:[],status:'agendado',obs:''};
  if(!a.servicos)a.servicos=[];
  let durTouched=!!ex,quick=false,busca='',forcar=false;
  const profs=activeProfs();
  const extraProf=a.profissionalId&&!profs.find(p=>p.id===a.profissionalId)&&profById(a.profissionalId);
  const prOpts=`<option value="">— Sem profissional —</option>`+profs.concat(extraProf?[extraProf]:[]).map(p=>`<option value="${esc(p.id)}" ${p.id===a.profissionalId?'selected':''}>${esc(p.nome)}</option>`).join('');
  const ov=openModal(`${mHead(ex?'Editar agendamento':'Novo agendamento')}
  <div class="m-b"><div class="fg">
    <div class="full"><label class="f">Paciente *</label><div id="pk"></div></div>
    <div><label class="f">Profissional</label><select class="input" id="ag-pr">${prOpts}</select></div>
    <div><label class="f">Data *</label><input type="date" class="input" id="ag-dt" value="${esc(a.data)}"></div>
    <div><label class="f">Horário *</label><input type="time" class="input" id="ag-hr" value="${esc(a.hora)}" step="300"></div>
    <div><label class="f">Duração (min)</label><input type="number" class="input" id="ag-du" min="5" step="5" value="${+a.duracao||c.intervalo}"></div>
    <div class="full"><label class="f">Serviços e procedimentos</label>
      ${S.servicos.length>8?`<input class="input" id="ag-sq" placeholder="Filtrar procedimentos…" style="margin-bottom:8px">`:''}
      <div class="chips" id="ag-chips"></div>
      <div class="sumline" id="ag-sum"></div></div>
    <div class="full"><label class="f">Status</label><div class="status-sel" id="ag-st">${Object.keys(STATUS).map(k=>`<button type="button" data-s="${k}" style="--c:${STATUS[k].c}" class="${a.status===k?'on':''}">${STATUS[k].l}</button>`).join('')}</div></div>
    <div class="full"><label class="f">Observações</label><textarea class="input" id="ag-ob" placeholder="Anotações sobre o atendimento">${esc(a.obs||'')}</textarea></div>
  </div><div id="ag-warn"></div><div class="err" id="ag-err"></div></div>
  <div class="m-f">${ex?'<button class="btn danger" id="ag-del">Excluir</button>':''}<span id="ag-wa"></span><span class="sp"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ag-save">Salvar</button></div>`);
  const pk=$('#pk',ov);
  function renderPk(){
    const p=pacById(a.pacienteId);
    if(p){pk.innerHTML=`<div class="pk-sel"><div><b>${esc(p.nome)}</b><span class="muted" style="font-size:13px">${esc([p.telefone,idade(p.nascimento)].filter(Boolean).join(' · '))}</span></div><button class="btn sm" id="pk-ch" type="button">Trocar</button></div>`;
      $('#pk-ch',pk).onclick=()=>{a.pacienteId='';busca='';renderPk();updWa();$('#pk-q',pk).focus()};return}
    pk.innerHTML=`<input class="input" id="pk-q" placeholder="Buscar paciente por nome, telefone ou CPF" autocomplete="off" value="${esc(busca)}"><div class="pk-res" id="pk-res"></div><div id="pk-quick"></div>`;
    const inp=$('#pk-q',pk);inp.oninput=()=>{busca=inp.value;quick=false;renderRes()};renderRes();
  }
  function renderRes(){
    const res=$('#pk-res',pk),qq=norm(busca),qd=busca.replace(/\D/g,'');
    if(quick){res.innerHTML='';return renderQuick()}
    $('#pk-quick',pk).innerHTML='';
    if(!qq){res.innerHTML='';return}
    const list=S.pacientes.filter(p=>norm(p.nome).includes(qq)||(qd&&(String(p.telefone||'').replace(/\D/g,'').includes(qd)||String(p.cpf||'').replace(/\D/g,'').includes(qd)))).sort(byName).slice(0,8);
    res.innerHTML=list.map(p=>`<div class="pk-it" data-id="${esc(p.id)}"><b>${esc(p.nome)}</b> <span class="muted" style="font-size:12.5px">${esc(p.telefone||'')}</span></div>`).join('')+`<div class="pk-it new" data-new="1">+ Cadastrar novo paciente “${esc(busca)}”</div>`;
    $$('.pk-it',res).forEach(it=>it.onclick=()=>{if(it.dataset.new){quick=true;renderRes()}else{a.pacienteId=it.dataset.id;renderPk();updWa()}});
  }
  function renderQuick(){
    const box=$('#pk-quick',pk);
    box.innerHTML=`<div class="pk-quick"><div class="fg"><div><label class="f">Nome *</label><input class="input" id="qk-n" value="${esc(busca)}"></div><div><label class="f">Telefone / WhatsApp</label><input class="input" id="qk-t" placeholder="(11) 99999-9999"></div></div><div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end"><button class="btn sm" type="button" id="qk-c">Cancelar</button><button class="btn sm primary" type="button" id="qk-s">Adicionar paciente</button></div></div>`;
    $('#qk-t',box).focus();
    $('#qk-c',box).onclick=()=>{quick=false;renderRes()};
    $('#qk-s',box).onclick=async()=>{const n=$('#qk-n',box).value.trim();if(!n){$('#qk-n',box).focus();return}
      try{const p=await busy($('#qk-s',box),()=>saveRow('pacientes',{nome:n,telefone:$('#qk-t',box).value.trim()}));a.pacienteId=p.id;quick=false;renderPk();updWa();toast('Paciente cadastrado')}catch(e){}};
  }
  const chips=$('#ag-chips',ov),sq=$('#ag-sq',ov);
  function renderChips(){
    const f=norm(sq?sq.value:'');
    const sel=new Set(a.servicos.map(x=>x.id));
    const list=S.servicos.filter(s=>s.ativo!==false||sel.has(s.id)).sort(byName).filter(s=>sel.has(s.id)||!f||norm(s.nome).includes(f)||norm(s.categoria).includes(f));
    a.servicos.filter(x=>!svcById(x.id)).forEach(x=>list.unshift(x));
    chips.innerHTML=list.length?list.map(s=>`<button type="button" class="chip ${sel.has(s.id)?'on':''}" data-id="${esc(s.id)}"><i class="dot" style="background:${esc(s.cor||'#94a3b8')}"></i>${esc(s.nome)}</button>`).join(''):`<span class="muted" style="font-size:13px">Nenhum serviço cadastrado.${isAdmin()?' <a href="#procedimentos" data-close>Cadastrar serviços e procedimentos</a>':' Peça ao administrador para cadastrar.'}</span>`;
    $$('.chip',chips).forEach(b=>b.onclick=()=>{
      const i=a.servicos.findIndex(x=>x.id===b.dataset.id);
      if(i>=0)a.servicos.splice(i,1);else{const s=svcById(b.dataset.id);if(s)a.servicos.push({id:s.id,nome:s.nome,valor:+s.valor||0,duracao:+s.duracao||0})}
      if(!durTouched){const tot=a.servicos.reduce((t,x)=>t+(+x.duracao||0),0);$('#ag-du',ov).value=tot||c.intervalo}
      renderChips();checkConf();
    });
    const tot=a.servicos.reduce((t,x)=>t+(+x.valor||0),0),dur=a.servicos.reduce((t,x)=>t+(+x.duracao||0),0);
    $('#ag-sum',ov).innerHTML=a.servicos.length?`<span>${a.servicos.length} selecionado(s) · ${dur} min</span><span>Total <b>${money(tot)}</b></span>`:'';
  }
  if(sq)sq.oninput=renderChips;
  $('#ag-du',ov).oninput=()=>{durTouched=true;checkConf()};
  ['#ag-dt','#ag-hr','#ag-pr'].forEach(s=>$(s,ov).addEventListener('change',()=>{ensureMonths([monthOf($('#ag-dt',ov).value||ui.date)]).then(checkConf);checkConf()}));
  $$('#ag-st button',ov).forEach(b=>b.onclick=()=>{$$('#ag-st button',ov).forEach(x=>x.classList.remove('on'));b.classList.add('on');a.status=b.dataset.s});
  const conflitos=(list,pr,dt,s,e)=>list.filter(x=>x.id!==a.id&&x.data===dt&&x.profissionalId===pr&&!INATIVOS.includes(x.status)&&toMin(x.hora)<e&&toMin(x.hora)+(+x.duracao||0)>s);
  function showWarn(conf,extra){
    const w=$('#ag-warn',ov),dt=$('#ag-dt',ov).value,s=toMin($('#ag-hr',ov).value),e=s+(+$('#ag-du',ov).value||0);
    const msgs=[];
    if(conf.length)msgs.push('Este horário conflita com: '+conf.map(x=>`${x.hora} ${esc((pacById(x.pacienteId)||{}).nome||'')}`).join(', '));
    if(dt&&(s<c.inicio*60||e>c.fim*60))msgs.push('Fora do horário de funcionamento da agenda ('+toHM(c.inicio*60)+'–'+toHM(c.fim*60)+').');
    w.innerHTML=msgs.length?`<div class="warnbox">⚠ ${msgs.join('<br>')}${extra||''}</div>`:'';
  }
  function checkConf(){
    const pr=$('#ag-pr',ov).value,dt=$('#ag-dt',ov).value,s=toMin($('#ag-hr',ov).value),e=s+(+$('#ag-du',ov).value||0);
    forcar=false;showWarn(pr&&dt?conflitos(agList(),pr,dt,s,e):[]);
  }
  function updWa(){const p=pacById(a.pacienteId),l=p&&ex?waLink(p,Object.assign({},a,{data:$('#ag-dt',ov).value,hora:$('#ag-hr',ov).value,profissionalId:$('#ag-pr',ov).value})):'';$('#ag-wa',ov).innerHTML=l?`<a class="btn" href="${esc(l)}" target="_blank" rel="noopener" style="text-decoration:none">Confirmar por WhatsApp</a>`:''}
  renderPk();renderChips();checkConf();updWa();
  if(!a.pacienteId)setTimeout(()=>{const i=$('#pk-q',ov);if(i)i.focus()},40);
  $('#ag-save',ov).onclick=async()=>{
    const err=$('#ag-err',ov),btn=$('#ag-save',ov);err.textContent='';
    if(!a.pacienteId){err.textContent='Selecione ou cadastre o paciente.';return}
    a.data=$('#ag-dt',ov).value;a.hora=$('#ag-hr',ov).value;
    if(!a.data||!a.hora){err.textContent='Informe data e horário.';return}
    a.duracao=Math.max(5,parseInt($('#ag-du',ov).value)||c.intervalo);
    a.profissionalId=$('#ag-pr',ov).value;a.obs=$('#ag-ob',ov).value.trim();
    a.valor=a.servicos.reduce((t,x)=>t+(+x.valor||0),0);
    btn.disabled=true;
    try{
      if(a.profissionalId&&!forcar&&!INATIVOS.includes(a.status)){
        const rows=await q(sb.from('agendamentos').select('*').eq('profissional_id',a.profissionalId).eq('data',a.data));
        const s=toMin(a.hora),conf=conflitos(rows.map(agFrom),a.profissionalId,a.data,s,s+a.duracao);
        if(conf.length){
          forcar=true;
          showWarn(conf,'<div style="margin-top:6px">Clique em <b>Salvar mesmo assim</b> para manter os dois horários.</div>');
          btn.textContent='Salvar mesmo assim';btn.disabled=false;return;
        }
      }
      const saved=await saveRow('agendamentos',a);
      ov._close();toast(ex?'Agendamento atualizado':'Agendamento criado');
      if(route()==='agenda'&&!ex&&saved.data!==ui.date&&!(ui.view==='semana'&&weekDays(ui.date).includes(saved.data))){ui.date=saved.data;render()}
    }catch(e){err.textContent=errMsg(e);btn.disabled=false}
  };
  const del=$('#ag-del',ov);
  if(del)del.onclick=async()=>{if(await confirmDlg('Excluir este agendamento? Se o paciente apenas desmarcou, prefira marcar como <b>Cancelado</b> para manter o histórico.')){try{await deleteRow('agendamentos',a.id);ov._close();toast('Agendamento excluído')}catch(e){toast(errMsg(e))}}};
}
