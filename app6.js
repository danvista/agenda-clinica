/* Agenda Clínica — parte 6 de 7 */
"use strict";
/* ---------- Profissionais ---------- */
function vProfs(){
  const list=S.profissionais.slice().sort(byName),t=todayISO();
  return `<div class="page-head"><div><h1>Profissionais</h1><div class="muted">Cada profissional ativo vira uma coluna na visão diária da agenda</div></div>${isAdmin()?'<button class="btn primary" data-act="prof-new">+ Novo profissional</button>':''}</div>
  ${list.length?`<div class="prof-grid">${list.map(p=>{const n=agList().filter(a=>a.profissionalId===p.id&&a.data>=t&&!INATIVOS.includes(a.status)).length;
    return `<div class="card prof-card" ${isAdmin()?`data-act="prof-open" data-id="${esc(p.id)}"`:''} style="${isAdmin()?'':'cursor:default;'}${p.ativo===false?'opacity:.55':''}"><div class="avatar" style="background:${esc(p.cor||'#0e9f8e')}">${esc((p.nome||'?').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</div><div style="min-width:0"><b>${esc(p.nome)}</b><div class="muted" style="font-size:13px">${esc(p.especialidade||'—')}</div><div style="font-size:12.5px;margin-top:3px">${p.ativo===false?'Inativo':n+' agendamento(s) próximos'}</div></div></div>`}).join('')}</div>`
  :`<div class="card"><div class="empty"><h3>Nenhum profissional cadastrado</h3>${isAdmin()?`Cadastre dentistas e demais profissionais para separar a agenda por coluna.<div class="btns"><button class="btn primary" data-act="prof-new">+ Novo profissional</button></div>`:'O administrador ainda não cadastrou profissionais.'}</div></div>`}`;
}
function openProf(id){
  const ex=id?profById(id):null;
  const p=ex?Object.assign({},ex):{nome:'',especialidade:'',registro:'',telefone:'',cor:COLORS[(S.profissionais.length+1)%COLORS.length],ativo:true};
  const ov=openModal(`${mHead(ex?'Editar profissional':'Novo profissional')}
  <div class="m-b"><div class="fg">
    <div class="full"><label class="f">Nome *</label><input class="input" id="pr-n" value="${esc(p.nome)}" autofocus placeholder="Ex.: Dra. Ana Souza"></div>
    <div><label class="f">Especialidade</label><input class="input" id="pr-e" value="${esc(p.especialidade)}" placeholder="Ex.: Ortodontia"></div>
    <div><label class="f">Registro (CRO etc.)</label><input class="input" id="pr-r" value="${esc(p.registro||'')}"></div>
    <div><label class="f">Telefone</label><input class="input" id="pr-t" value="${esc(p.telefone||'')}"></div>
    <div><label class="f">Cor</label>${swatches(p.cor)}</div>
    <div class="full"><label class="check"><input type="checkbox" id="pr-a" ${p.ativo!==false?'checked':''}> Ativo (aparece na agenda)</label></div>
  </div><div class="err" id="pr-err"></div></div>
  <div class="m-f">${ex?'<button class="btn danger" id="pr-del">Excluir</button>':''}<span class="sp"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="pr-save">Salvar</button></div>`);
  bindSwatches(ov,c=>p.cor=c);
  $('#pr-save',ov).onclick=async()=>{const n=$('#pr-n',ov).value.trim();if(!n){$('#pr-err',ov).textContent='Informe o nome.';return}
    Object.assign(p,{nome:n,especialidade:$('#pr-e',ov).value.trim(),registro:$('#pr-r',ov).value.trim(),telefone:$('#pr-t',ov).value.trim(),ativo:$('#pr-a',ov).checked});
    try{await busy($('#pr-save',ov),()=>saveRow('profissionais',p));ov._close();toast('Profissional salvo')}catch(e){}};
  const del=$('#pr-del',ov);if(del)del.onclick=async()=>{if(await confirmDlg(`Excluir <b>${esc(p.nome)}</b>? Os agendamentos dele continuam na agenda, na coluna “Sem profissional”. Para só tirar da agenda, desmarque “Ativo”.`)){try{await deleteRow('profissionais',p.id);for(const a of AG.values())if(a.profissionalId===p.id)a.profissionalId='';if(ui.prof===p.id)ui.prof='all';ov._close();toast('Profissional excluído')}catch(e){toast(errMsg(e))}}};
}

/* ---------- Usuários (admin) ---------- */
function vUsuarios(){
  const list=S.perfis.slice().sort((a,b)=>(a.ativo===b.ativo?0:a.ativo?1:-1)||String(a.nome).localeCompare(String(b.nome),'pt-BR'));
  const pend=list.filter(u=>!u.ativo).length;
  return `<div class="page-head"><div><h1>Usuários</h1><div class="muted">${list.length} usuário(s)${pend?` · <b style="color:var(--warn)">${pend} aguardando liberação</b>`:''}</div></div></div>
  <div class="infobox"><b>Como adicionar alguém da equipe:</b> peça para a pessoa abrir o sistema e clicar em <b>Solicitar acesso</b>. O pedido aparece aqui como “Aguardando” — clique em <b>Liberar</b>. Você também pode criar o login direto no painel do Supabase (Authentication → Users → Add user) e liberar aqui.</div>
  <div class="card">${list.length?`<table class="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Situação</th><th></th></tr></thead><tbody>${list.map(u=>`<tr class="click" data-act="usr-open" data-id="${esc(u.id)}"><td><b>${esc(u.nome||'—')}</b>${u.id===ME.id?' <span class="pill">você</span>':''}</td><td>${esc(u.email)}</td><td>${u.papel==='admin'?'Administrador':'Equipe'}</td><td>${u.ativo?'<span class="pill" style="background:#e3f6ee;color:#05694c">Liberado</span>':'<span class="pill badge-pend">Aguardando</span>'}</td><td style="text-align:right">${u.ativo?'':`<button class="btn sm primary" data-act="usr-liberar" data-id="${esc(u.id)}">Liberar</button>`}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Nenhum usuário.</div>'}</div>`;
}
async function updPerfil(id,patch){
  const r=await q(sb.from('perfis').update(patch).eq('id',id).select().single());
  const i=S.perfis.findIndex(x=>x.id===id);if(i>=0)S.perfis[i]=r;
  if(id===ME.id){ME=r;if(!isAdmin()){location.hash='agenda';startApp((await sb.auth.getSession()).data.session);return r}}
  render();return r;
}
function openUsr(id){
  const u=S.perfis.find(x=>x.id===id);if(!u)return;
  const ov=openModal(`${mHead('Usuário')}<div class="m-b"><div class="fg">
    <div class="full"><label class="f">Nome</label><input class="input" id="u-n" value="${esc(u.nome)}" autofocus></div>
    <div class="full"><label class="f">E-mail (login)</label><input class="input" value="${esc(u.email)}" disabled></div>
    <div><label class="f">Papel</label><select class="input" id="u-p"><option value="equipe" ${u.papel!=='admin'?'selected':''}>Equipe (agenda e pacientes)</option><option value="admin" ${u.papel==='admin'?'selected':''}>Administrador (tudo)</option></select></div>
    <div><label class="f">Acesso</label><label class="check" style="margin-top:9px"><input type="checkbox" id="u-a" ${u.ativo?'checked':''}> Liberado</label></div>
  </div><p class="muted" style="font-size:13px;margin:14px 0 0">Para bloquear alguém que saiu da equipe, desmarque “Liberado”. A troca de senha é feita pela própria pessoa em “Esqueci minha senha”, ou pelo painel do Supabase.</p><div class="err" id="u-err"></div></div>
  <div class="m-f"><span class="sp"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="u-ok">Salvar</button></div>`);
  $('#u-ok',ov).onclick=async()=>{const err=$('#u-err',ov);err.textContent='';
    try{await updPerfil(u.id,{nome:$('#u-n',ov).value.trim(),papel:$('#u-p',ov).value,ativo:$('#u-a',ov).checked});ov._close();toast('Usuário atualizado')}catch(e){err.textContent=errMsg(e)}};
}

/* ---------- Configurações (admin) ---------- */
function vConfig(){
  const c=cfg(),hrs=Array.from({length:24},(_,i)=>i);
  return `<div class="page-head"><h1>Configurações</h1></div>
  <div class="card cfg-sec"><h2>Clínica e agenda</h2><div class="fg">
    <div class="full"><label class="f">Nome da clínica</label><input class="input" id="c-n" value="${esc(c.nome)}"></div>
    <div><label class="f">Início do expediente</label><select class="input" id="c-i">${hrs.map(h=>`<option value="${h}" ${h===c.inicio?'selected':''}>${pad(h)}:00</option>`).join('')}</select></div>
    <div><label class="f">Fim do expediente</label><select class="input" id="c-f">${hrs.slice(1).concat([24]).map(h=>`<option value="${h}" ${h===c.fim?'selected':''}>${pad(h)}:00</option>`).join('')}</select></div>
    <div><label class="f">Intervalo da grade</label><select class="input" id="c-iv">${[10,15,20,30,60].map(v=>`<option value="${v}" ${v===c.intervalo?'selected':''}>${v} minutos</option>`).join('')}</select></div>
    <div><label class="f">Dias na visão semanal</label><label class="check" style="margin-top:8px"><input type="checkbox" id="c-sa" ${c.sabado?'checked':''}> Sábado</label><label class="check" style="margin-top:6px"><input type="checkbox" id="c-do" ${c.domingo?'checked':''}> Domingo</label></div>
  </div><div class="err" id="c-err"></div><div style="margin-top:16px"><button class="btn primary" data-act="cfg-save">Salvar configurações</button></div></div>
  <div class="card cfg-sec"><h2>Backup</h2>
    <p class="muted" style="margin-top:0">O plano gratuito do Supabase não guarda cópias automáticas. Baixe um backup pelo menos uma vez por semana e guarde em local seguro (ele contém dados de pacientes).</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="bk-down">Baixar backup completo</button><label class="btn" style="display:inline-block">Importar backup…<input type="file" id="bk-file" accept=".json,application/json" hidden></label></div>
    <div class="muted" style="font-size:12.5px;margin-top:10px">Também aceita o backup copiado da versão de teste (Claude). ${S.pacientes.length} pacientes · ${S.servicos.length} serviços/procedimentos · ${S.profissionais.length} profissionais</div></div>`;
}
async function backupDown(btn){
  btn.disabled=true;
  try{
    const [config,profissionais,servicos,pacientes,agendamentos]=await Promise.all([
      q(sb.from('config').select('*')),fetchAll('profissionais'),fetchAll('servicos'),fetchAll('pacientes'),fetchAll('agendamentos')]);
    const data={app:'agenda-clinica',versao:2,exportadoEm:new Date().toISOString(),tabelas:{config,profissionais,servicos,pacientes,agendamentos}};
    const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-agenda-'+todayISO()+'.json';document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
    toast('Backup baixado');
  }catch(e){toast(errMsg(e))}finally{btn.disabled=false}
}
const pick=(o,keys)=>{const r={};keys.forEach(k=>{if(o[k]!==undefined)r[k]=o[k]});return r};
async function upsertChunks(table,rows){for(let i=0;i<rows.length;i+=500)await q(sb.from(table).upsert(rows.slice(i,i+500),{onConflict:'id'}))}
async function importar(obj){
  let T;
  if(obj&&obj.tabelas){T=obj.tabelas;}
  else{
    const d=obj&&(obj.dados||obj);if(!d||typeof d!=='object')throw new Error('Arquivo de backup inválido.');
    const map=new Map(),nid=old=>{if(!old)return null;if(UUID_RE.test(old))return old;if(!map.has(old))map.set(old,crypto.randomUUID());return map.get(old)};
    const cg=(d.config||[]).find(x=>x.id==='geral');
    T={config:cg?[{id:1,nome:cg.nome,inicio:cg.inicio,fim:cg.fim,intervalo:cg.intervalo,sabado:cg.sabado!==false,domingo:!!cg.domingo}]:[],
      profissionais:(d.profissionais||[]).map(p=>Object.assign(profTo(p),{id:nid(p.id)})),
      servicos:(d.servicos||[]).map(s=>Object.assign(svcTo(s),{id:nid(s.id)})),
      pacientes:(d.pacientes||[]).map(p=>Object.assign(pacTo(p),{id:nid(p.id)})),
      agendamentos:[]};
    const pacs=new Set(T.pacientes.map(p=>p.id)),profs=new Set(T.profissionais.map(p=>p.id));
    T.agendamentos=(d.agendamentos||[]).filter(a=>pacs.has(nid(a.pacienteId))).map(a=>{const r=agTo(a);r.id=nid(a.id);r.paciente_id=nid(a.pacienteId);r.profissional_id=a.profissionalId&&profs.has(nid(a.profissionalId))?nid(a.profissionalId):null;r.servicos=(a.servicos||[]).map(x=>({id:nid(x.id),nome:x.nome,valor:+x.valor||0,duracao:+x.duracao||0}));r.hora=String(a.hora).slice(0,5);if(!STATUS[r.status])r.status='agendado';return r});
  }
  const C=['id','nome','inicio','fim','intervalo','sabado','domingo'];
  const cols={profissionais:['id','nome','especialidade','registro','telefone','cor','ativo'],servicos:['id','nome','tipo','categoria','duracao','valor','cor','descricao','ativo'],pacientes:['id','nome','telefone','email','nascimento','cpf','obs'],agendamentos:['id','paciente_id','profissional_id','data','hora','duracao','status','obs','servicos','valor']};
  const n=['profissionais','servicos','pacientes','agendamentos'].reduce((t,k)=>t+((T[k]||[]).length),0);
  if(!n&&!(T.config||[]).length)throw new Error('Arquivo de backup sem dados.');
  if(!(await confirmDlg(`Importar ${n} registro(s)? Registros com o mesmo identificador serão substituídos.`,'Importar',false)))return;
  const cf=(T.config||[])[0];if(cf)await q(sb.from('config').update(pick(cf,C.slice(1))).eq('id',1));
  for(const k of ['profissionais','servicos','pacientes','agendamentos'])if((T[k]||[]).length)await upsertChunks(k,T[k].map(r=>pick(r,cols[k])));
  toast('Backup importado');
  MONTHS.clear();AG.clear();await loadBase();await ensureMonths(neededMonths());render();
}
