/* Agenda Clínica — parte 5 de 7 */
"use strict";
/* ---------- Pacientes ---------- */
const searchIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
function vPacientes(){
  return `<div class="page-head"><div><h1>Pacientes</h1><div class="muted">${S.pacientes.length} cadastrado(s)</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><div class="search">${searchIcon}<input class="input" id="q-pac" placeholder="Buscar por nome, telefone ou CPF" value="${esc(ui.qPac)}"></div><button class="btn primary" data-act="pac-new">+ Novo paciente</button></div></div>
    <div class="card" id="pac-list">${pacTable()}</div>`;
}
function pacTable(){
  if(!S.pacientes.length)return `<div class="empty"><h3>Nenhum paciente cadastrado</h3>Cadastre pacientes aqui ou direto ao criar um agendamento.<div class="btns"><button class="btn primary" data-act="pac-new">+ Novo paciente</button></div></div>`;
  const q=norm(ui.qPac),qd=ui.qPac.replace(/\D/g,'');
  const list=S.pacientes.filter(p=>!q||norm(p.nome).includes(q)||norm(p.email).includes(q)||(qd&&(String(p.telefone||'').replace(/\D/g,'').includes(qd)||String(p.cpf||'').replace(/\D/g,'').includes(qd)))).sort(byName);
  if(!list.length)return `<div class="empty">Nenhum paciente encontrado para “${esc(ui.qPac)}”.</div>`;
  const shown=list.slice(0,300);
  return `<table class="tbl"><thead><tr><th>Nome</th><th>Telefone</th><th class="hide-sm">Idade</th><th class="hide-sm">Último atendimento</th><th>Próximo agendamento</th></tr></thead><tbody>${shown.map(p=>
    `<tr class="click" data-act="pac-open" data-id="${esc(p.id)}"><td><b>${esc(p.nome)}</b></td><td>${esc(p.telefone||'—')}</td><td class="hide-sm">${esc(idade(p.nascimento)||'—')}</td><td class="hide-sm">${p.ultimo?fmtBR(p.ultimo):'—'}</td><td>${p.proximo?`${fmtBR(p.proximo)} às ${esc(p.proximo.slice(11,16))}`:'—'}</td></tr>`).join('')}</tbody></table>${list.length>shown.length?`<div class="muted" style="padding:12px 14px;font-size:13px">Mostrando ${shown.length} de ${list.length}. Use a busca para encontrar outros.</div>`:''}`;
}
function openPac(id){
  const ex=id?pacById(id):null;
  const p=ex?Object.assign({},ex):{nome:'',telefone:'',email:'',nascimento:'',cpf:'',obs:''};
  const ov=openModal(`${mHead(ex?'Paciente':'Novo paciente')}
  <div class="m-b"><div class="fg">
    <div class="full"><label class="f">Nome completo *</label><input class="input" id="p-n" value="${esc(p.nome)}" autofocus></div>
    <div><label class="f">Telefone / WhatsApp</label><input class="input" id="p-t" value="${esc(p.telefone)}" placeholder="(11) 99999-9999"></div>
    <div><label class="f">E-mail</label><input class="input" id="p-e" type="email" value="${esc(p.email)}"></div>
    <div><label class="f">Data de nascimento</label><input class="input" id="p-b" type="date" value="${esc(p.nascimento)}"></div>
    <div><label class="f">CPF</label><input class="input" id="p-c" value="${esc(p.cpf)}" placeholder="000.000.000-00"></div>
    <div class="full"><label class="f">Observações</label><textarea class="input" id="p-o" placeholder="Alergias, convênio, preferências…">${esc(p.obs)}</textarea></div>
  </div>
  ${ex?`<div class="hist"><h4>Histórico de agendamentos</h4><div id="p-hist"><div class="muted" style="font-size:13px">Carregando…</div></div></div>`:''}
  <div class="err" id="p-err"></div></div>
  <div class="m-f">${ex?'<button class="btn danger" id="p-del">Excluir</button>':''}${ex&&waLink(p)?`<a class="btn" href="${esc(waLink(p))}" target="_blank" rel="noopener" style="text-decoration:none">WhatsApp</a>`:''}<span class="sp"></span>${ex?'<button class="btn" id="p-ag">Agendar</button>':''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="p-save">Salvar</button></div>`);
  let hist=[];
  if(ex)q(sb.from('agendamentos').select('*').eq('paciente_id',id).order('data',{ascending:false}).order('hora',{ascending:false}).limit(100)).then(rows=>{
    hist=rows.map(agFrom);rows.forEach(r=>{if(MONTHS.has(monthOf(r.data)))AG.set(r.id,agFrom(r))});
    const box=$('#p-hist',ov);if(!box)return;
    box.innerHTML=hist.length?hist.map(a=>{const st=STATUS[a.status]||STATUS.agendado,pr=profById(a.profissionalId);return `<div class="hist-it" data-ag="${esc(a.id)}" data-dt="${esc(a.data)}"><div><b>${fmtBR(a.data)} ${esc(a.hora)}</b> <span class="muted">${esc([pr&&pr.nome,(a.servicos||[]).map(s=>s.nome).join(', ')].filter(Boolean).join(' · '))}</span></div><span style="color:${st.c};font-weight:600;white-space:nowrap">${st.l}</span></div>`}).join(''):'<div class="muted" style="font-size:13px">Nenhum agendamento ainda.</div>';
    $$('.hist-it',box).forEach(h=>h.onclick=()=>{const a=hist.find(x=>x.id===h.dataset.ag);if(a&&!AG.has(a.id))AG.set(a.id,a);openAg(h.dataset.ag)});
  }).catch(e=>{const box=$('#p-hist',ov);if(box)box.textContent=errMsg(e)});
  const read=()=>({nome:$('#p-n',ov).value.trim(),telefone:$('#p-t',ov).value.trim(),email:$('#p-e',ov).value.trim(),nascimento:$('#p-b',ov).value,cpf:$('#p-c',ov).value.trim(),obs:$('#p-o',ov).value.trim()});
  $('#p-save',ov).onclick=async()=>{const v=read();if(!v.nome){$('#p-err',ov).textContent='Informe o nome do paciente.';return}
    try{await busy($('#p-save',ov),()=>saveRow('pacientes',Object.assign(p,v)));ov._close();toast('Paciente salvo')}catch(e){}};
  const ag=$('#p-ag',ov);if(ag)ag.onclick=()=>{ov._close();openAg(null,{pacienteId:p.id})};
  const del=$('#p-del',ov);if(del)del.onclick=async()=>{
    if(await confirmDlg(`Excluir o paciente <b>${esc(p.nome)}</b>?${hist.length?` Os ${hist.length} agendamento(s) dele também serão excluídos.`:''}`)){
      try{await deleteRow('pacientes',p.id);ov._close();toast('Paciente excluído')}catch(e){toast(errMsg(e))}}};
}

/* ---------- Serviços e procedimentos ---------- */
function vServicos(){
  return `<div class="page-head"><div><h1>Serviços e procedimentos</h1><div class="muted">${isAdmin()?'Usados para montar os agendamentos e calcular duração e valor':'Somente o administrador altera esta lista'}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <div class="tabs">${[['todos','Todos'],['procedimento','Procedimentos'],['servico','Serviços']].map(([k,l])=>`<button class="${ui.tipoSvc===k?'on':''}" data-act="svc-tipo" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="search">${searchIcon}<input class="input" id="q-svc" placeholder="Buscar" value="${esc(ui.qSvc)}" style="min-width:180px"></div>
      ${isAdmin()?'<button class="btn primary" data-act="svc-new">+ Novo</button>':''}</div></div>
    <div class="card" id="svc-list">${svcTable()}</div>`;
}
function svcTable(){
  if(!S.servicos.length)return `<div class="empty"><h3>Nenhum serviço ou procedimento cadastrado</h3>${isAdmin()?`Cadastre o que sua clínica oferece, com duração e valor.<div class="btns"><button class="btn" data-act="svc-seed">Usar uma lista básica odontológica</button><button class="btn primary" data-act="svc-new">+ Novo cadastro</button></div>`:'O administrador ainda não cadastrou os serviços.'}</div>`;
  const q=norm(ui.qSvc);
  const list=S.servicos.filter(s=>(ui.tipoSvc==='todos'||s.tipo===ui.tipoSvc)&&(!q||norm(s.nome).includes(q)||norm(s.categoria).includes(q))).sort((a,b)=>String(a.categoria||'').localeCompare(String(b.categoria||''))||byName(a,b));
  if(!list.length)return `<div class="empty">Nada encontrado.</div>`;
  return `<table class="tbl"><thead><tr><th>Nome</th><th>Tipo</th><th class="hide-sm">Categoria</th><th>Duração</th><th>Valor</th><th class="hide-sm">Situação</th></tr></thead><tbody>${list.map(s=>`<tr class="${isAdmin()?'click':''}" ${isAdmin()?`data-act="svc-open" data-id="${esc(s.id)}"`:''} style="${s.ativo===false?'opacity:.55':''}"><td><i class="dot" style="background:${esc(s.cor||'#94a3b8')};margin-right:8px"></i><b>${esc(s.nome)}</b></td><td>${s.tipo==='servico'?'Serviço':'Procedimento'}</td><td class="hide-sm">${esc(s.categoria||'—')}</td><td>${+s.duracao||0} min</td><td>${money(s.valor)}</td><td class="hide-sm"><span class="pill" style="${s.ativo===false?'':'background:#e3f6ee;color:#05694c'}">${s.ativo===false?'Inativo':'Ativo'}</span></td></tr>`).join('')}</tbody></table>`;
}
function openSvc(id){
  const ex=id?svcById(id):null;
  const s=ex?Object.assign({},ex):{nome:'',tipo:'procedimento',categoria:'',duracao:cfg().intervalo,valor:'',cor:COLORS[S.servicos.length%COLORS.length],ativo:true,descricao:''};
  const cats=[...new Set(S.servicos.map(x=>x.categoria).filter(Boolean))].sort();
  const ov=openModal(`${mHead(ex?'Editar cadastro':'Novo serviço ou procedimento')}
  <div class="m-b"><div class="fg">
    <div class="full"><label class="f">Nome *</label><input class="input" id="s-n" value="${esc(s.nome)}" autofocus placeholder="Ex.: Limpeza, Restauração, Consulta de avaliação"></div>
    <div><label class="f">Tipo</label><select class="input" id="s-t"><option value="procedimento" ${s.tipo!=='servico'?'selected':''}>Procedimento</option><option value="servico" ${s.tipo==='servico'?'selected':''}>Serviço</option></select></div>
    <div><label class="f">Categoria</label><input class="input" id="s-c" list="cat-list" value="${esc(s.categoria)}" placeholder="Ex.: Prevenção, Ortodontia"><datalist id="cat-list">${cats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>
    <div><label class="f">Duração padrão (min)</label><input class="input" id="s-d" type="number" min="5" step="5" value="${esc(s.duracao)}"></div>
    <div><label class="f">Valor (R$)</label><input class="input" id="s-v" type="number" min="0" step="0.01" value="${esc(s.valor)}" placeholder="0,00"></div>
    <div class="full"><label class="f">Cor na agenda</label>${swatches(s.cor)}</div>
    <div class="full"><label class="f">Descrição</label><textarea class="input" id="s-ds" placeholder="Opcional">${esc(s.descricao||'')}</textarea></div>
    <div class="full"><label class="check"><input type="checkbox" id="s-a" ${s.ativo!==false?'checked':''}> Ativo (aparece ao agendar)</label></div>
  </div><div class="err" id="s-err"></div></div>
  <div class="m-f">${ex?'<button class="btn danger" id="s-del">Excluir</button>':''}<span class="sp"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="s-save">Salvar</button></div>`);
  bindSwatches(ov,c=>s.cor=c);
  $('#s-save',ov).onclick=async()=>{
    const n=$('#s-n',ov).value.trim();if(!n){$('#s-err',ov).textContent='Informe o nome.';return}
    Object.assign(s,{nome:n,tipo:$('#s-t',ov).value,categoria:$('#s-c',ov).value.trim(),duracao:Math.min(1440,Math.max(5,parseInt($('#s-d',ov).value)||cfg().intervalo)),valor:Math.max(0,parseFloat($('#s-v',ov).value)||0),descricao:$('#s-ds',ov).value.trim(),ativo:$('#s-a',ov).checked});
    try{await busy($('#s-save',ov),()=>saveRow('servicos',s));ov._close();toast('Cadastro salvo')}catch(e){}};
  const del=$('#s-del',ov);if(del)del.onclick=async()=>{if(await confirmDlg(`Excluir <b>${esc(s.nome)}</b>? Agendamentos já feitos continuam mostrando o nome. Para só esconder ao agendar, desmarque “Ativo”.`)){try{await deleteRow('servicos',s.id);ov._close();toast('Excluído')}catch(e){toast(errMsg(e))}}};
}
async function seedServicos(){
  const base=[
    ['Consulta de avaliação','servico','Clínico geral',30,120,'#0e9f8e'],
    ['Limpeza (profilaxia)','procedimento','Prevenção',40,180,'#0891b2'],
    ['Aplicação de flúor','procedimento','Prevenção',20,80,'#0891b2'],
    ['Restauração em resina','procedimento','Dentística',60,250,'#2563eb'],
    ['Extração simples','procedimento','Cirurgia',60,300,'#dc2626'],
    ['Tratamento de canal','procedimento','Endodontia',90,900,'#7c3aed'],
    ['Clareamento dental','procedimento','Estética',60,800,'#db2777'],
    ['Manutenção de aparelho','procedimento','Ortodontia',30,150,'#ca8a04'],
    ['Radiografia periapical','servico','Radiologia',15,40,'#64748b'],
    ['Retorno','servico','Clínico geral',20,0,'#16a34a']
  ].map(([nome,tipo,categoria,duracao,valor,cor])=>svcTo({nome,tipo,categoria,duracao,valor,cor,ativo:true}));
  try{const rows=await q(sb.from('servicos').insert(base).select());rows.forEach(r=>S.servicos.push(svcFrom(r)));render();toast('Lista adicionada — ajuste os valores à sua tabela')}catch(e){toast(errMsg(e))}
}
