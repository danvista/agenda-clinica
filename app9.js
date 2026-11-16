/* Agenda Clínica — parte 9: receitas e logotipo */
"use strict";
let RXC=null,rxDraft=null;
async function rxConf(force){
  if(RXC&&!force)return RXC;
  const r=await q(sb.from('config').select('endereco,telefone,cidade,logo').eq('id',1).maybeSingle());
  RXC=Object.assign({endereco:'',telefone:'',cidade:'',logo:''},r||{});
  if(!/^data:image\/(png|jpeg|webp);base64,/.test(RXC.logo||''))RXC.logo='';
  return RXC;
}
const VIAS=['Uso oral','Uso tópico','Uso sublingual','Uso externo','Uso local (bochecho)','Uso injetável'];
const dataExtenso=s=>{const d=parseISO(s);return d.getDate()+' de '+MES[d.getMonth()]+' de '+d.getFullYear()};
const rxVazio=()=>({medicamento:'',quantidade:'',via:VIAS[0],posologia:''});
const rxFrom=r=>({id:r.id,pacienteId:r.paciente_id,profissionalId:r.profissional_id||'',data:String(r.data).slice(0,10),tipo:r.tipo==='controle'?'controle':'simples',itens:Array.isArray(r.itens)?r.itens:[],obs:r.obs||'',enderecoPaciente:r.endereco_paciente||''});
const rxTo=x=>({paciente_id:x.pacienteId,profissional_id:x.profissionalId||null,data:x.data,tipo:x.tipo,
  itens:x.itens.map(i=>({medicamento:String(i.medicamento||'').trim(),quantidade:String(i.quantidade||'').trim(),via:i.via||VIAS[0],posologia:String(i.posologia||'').trim()})),
  obs:x.obs||'',endereco_paciente:x.enderecoPaciente||''});
const rxErro=e=>/receitas|endereco|logo|does not exist|schema cache/i.test(String(e&&e.message||''))?'O banco ainda não tem a tabela de receitas. Rode a atualização do banco (LEIA-ME).':errMsg(e);

/* Sugestões a partir das receitas já feitas na clínica */
async function rxSugestoes(){
  const m=new Map();
  try{const rows=await q(sb.from('receitas').select('itens').order('criado_em',{ascending:false}).limit(300));
    rows.forEach(r=>(r.itens||[]).forEach(i=>{const k=norm(i.medicamento).trim();if(k&&!m.has(k))m.set(k,i)}));}catch(e){}
  return m;
}

/* ---------- Janela da receita ---------- */
function openRx(pacId,opts={}){
  const p=pacById(pacId);if(!p){toast('Paciente não encontrado.');return}
  const ex=opts.rx||null,profs=activeProfs();
  const r=ex?JSON.parse(JSON.stringify(ex)):{pacienteId:pacId,profissionalId:opts.prof||(ui.prof!=='all'?ui.prof:((profs[0]||{}).id||'')),data:todayISO(),tipo:opts.tipo||'simples',
    itens:opts.copy?JSON.parse(JSON.stringify(opts.copy)):[rxVazio()],obs:opts.obs||'',enderecoPaciente:opts.endereco||''};
  if(!r.itens.length)r.itens.push(rxVazio());
  const extra=r.profissionalId&&!profs.find(x=>x.id===r.profissionalId)&&profById(r.profissionalId);
  const prOpts=`<option value="">— Sem profissional —</option>`+profs.concat(extra?[extra]:[]).map(x=>`<option value="${esc(x.id)}" ${x.id===r.profissionalId?'selected':''}>${esc(x.nome)}</option>`).join('');
  const ov=openModal(`${mHead(ex?'Receita':'Nova receita')}
  <div class="m-b">
    <div class="rx-pac-box"><b>${esc(p.nome)}</b>${p.cpf?` <span class="muted">· CPF ${esc(p.cpf)}</span>`:''}</div>
    <div class="fg">
      <div><label class="f">Profissional que assina</label><select class="input" id="rx-pr">${prOpts}</select></div>
      <div><label class="f">Data</label><input type="date" class="input" id="rx-dt" value="${esc(r.data)}"></div>
      <div class="full"><label class="f">Tipo de receita</label><div class="tabs" id="rx-tipo"><button type="button" data-t="simples">Simples</button><button type="button" data-t="controle">Controle especial (2 vias)</button></div></div>
      <div class="full" id="rx-end-w"><label class="f">Endereço do paciente</label><input class="input" id="rx-end" value="${esc(r.enderecoPaciente)}" placeholder="Obrigatório na receita de controle especial"></div>
    </div>
    <label class="f" style="margin-top:18px">Medicamentos</label>
    <div id="rx-itens"></div>
    <button type="button" class="btn sm" id="rx-add">+ Adicionar medicamento</button>
    <div style="margin-top:16px"><label class="f">Orientações ao paciente (opcional)</label><textarea class="input" id="rx-obs" placeholder="Ex.: evitar alimentos duros nas primeiras 24 horas">${esc(r.obs)}</textarea></div>
    <datalist id="rx-meds"></datalist>
    <div class="err" id="rx-err"></div>
  </div>
  <div class="m-f">${ex?'<button class="btn danger" id="rx-del">Excluir</button>':''}<span class="sp"></span><button class="btn" data-close>Cancelar</button><button class="btn" id="rx-save">Salvar</button><button class="btn primary" id="rx-print">Salvar e imprimir</button></div>`);
  const box=$('#rx-itens',ov);
  let sug=new Map();
  rxSugestoes().then(m=>{sug=m;$('#rx-meds',ov).innerHTML=[...m.values()].map(i=>`<option value="${esc(i.medicamento)}">`).join('')});
  const draw=()=>{box.innerHTML=r.itens.map((it,i)=>`<div class="rx-it" data-i="${i}"><div class="rx-it-n">${i+1}</div><div class="rx-it-f">
      <div class="rx-row"><input class="input rx-med" data-k="medicamento" list="rx-meds" autocomplete="off" placeholder="Medicamento e concentração (ex.: Amoxicilina 500 mg)" value="${esc(it.medicamento)}"><input class="input rx-qtd" data-k="quantidade" placeholder="Quantidade (ex.: 21 cápsulas)" value="${esc(it.quantidade)}"></div>
      <div class="rx-row"><select class="input rx-via" data-k="via">${VIAS.concat(VIAS.includes(it.via)?[]:[it.via]).map(v=>`<option ${v===it.via?'selected':''}>${esc(v)}</option>`).join('')}</select><input class="input rx-pos" data-k="posologia" placeholder="Como usar (ex.: 1 cápsula de 8 em 8 horas por 7 dias)" value="${esc(it.posologia)}"></div>
    </div><button type="button" class="x rx-rm" aria-label="Remover medicamento">×</button></div>`).join('')};
  draw();
  box.addEventListener('input',e=>{const el=e.target,w=el.closest('.rx-it');if(!w||!el.dataset.k)return;r.itens[+w.dataset.i][el.dataset.k]=el.value});
  box.addEventListener('change',e=>{const el=e.target;if(!el.classList.contains('rx-med'))return;
    const w=el.closest('.rx-it'),it=r.itens[+w.dataset.i],s=sug.get(norm(el.value).trim());
    if(s){if(!it.posologia){it.posologia=s.posologia||'';$('.rx-pos',w).value=it.posologia}if(!it.quantidade){it.quantidade=s.quantidade||'';$('.rx-qtd',w).value=it.quantidade}if(s.via){it.via=s.via;const sel=$('.rx-via',w);if(![...sel.options].some(o=>o.value===s.via))sel.add(new Option(s.via,s.via));sel.value=s.via}}});
  box.addEventListener('click',e=>{const b=e.target.closest('.rx-rm');if(!b)return;const i=+b.closest('.rx-it').dataset.i;r.itens.splice(i,1);if(!r.itens.length)r.itens.push(rxVazio());draw()});
  $('#rx-add',ov).onclick=()=>{r.itens.push(rxVazio());draw();const m=$$('.rx-med',box).pop();if(m)m.focus()};
  const setTipo=t=>{r.tipo=t;$$('#rx-tipo button',ov).forEach(b=>b.classList.toggle('on',b.dataset.t===t));$('#rx-end-w',ov).hidden=t!=='controle'};
  $$('#rx-tipo button',ov).forEach(b=>b.onclick=()=>setTipo(b.dataset.t));setTipo(r.tipo);
  const salvar=async(btn,imprimir)=>{
    const err=$('#rx-err',ov);err.textContent='';
    r.profissionalId=$('#rx-pr',ov).value;r.data=$('#rx-dt',ov).value||todayISO();r.obs=$('#rx-obs',ov).value.trim();r.enderecoPaciente=$('#rx-end',ov).value.trim();
    const itens=r.itens.filter(i=>String(i.medicamento||'').trim());
    if(!itens.length){err.textContent='Inclua pelo menos um medicamento.';return}
    if(profs.length&&!r.profissionalId){err.textContent='Escolha o profissional que vai assinar a receita.';return}
    if(r.tipo==='controle'&&!r.enderecoPaciente){err.textContent='Informe o endereço do paciente (exigido na receita de controle especial).';return}
    r.itens=itens;
    btn.disabled=true;
    try{
      const row=rxTo(r);
      const res=r.id?await q(sb.from('receitas').update(row).eq('id',r.id).select().single()):await q(sb.from('receitas').insert(row).select().single());
      Object.assign(r,rxFrom(res));
    }catch(e){err.textContent=rxErro(e);btn.disabled=false;return}
    ov._close();toast('Receita salva');if(opts.onSave)opts.onSave();
    if(imprimir)imprimirRx(r);
  };
  $('#rx-save',ov).onclick=e=>salvar(e.currentTarget,false);
  $('#rx-print',ov).onclick=e=>salvar(e.currentTarget,true);
  const del=$('#rx-del',ov);if(del)del.onclick=async()=>{if(await confirmDlg(`Excluir a receita de <b>${fmtBR(r.data)}</b>?`)){try{await q(sb.from('receitas').delete().eq('id',r.id));ov._close();toast('Receita excluída');if(opts.onSave)opts.onSave()}catch(e){toast(rxErro(e))}}};
}

/* ---------- Impressão / PDF ---------- */
function rxPagina(r,p,pr,c,via){
  const ctrl=r.tipo==='controle',grupos=[];
  r.itens.forEach(i=>{const g=grupos[grupos.length-1];if(g&&g.via===i.via)g.itens.push(i);else grupos.push({via:i.via||VIAS[0],itens:[i]})});
  let n=0;
  const corpo=grupos.map(g=>`<div class="rx-pvia">${esc(g.via)}</div>`+g.itens.map(i=>{n++;return `<div class="rx-item"><div class="rx-l1"><span class="rx-num">${n}.</span><b>${esc(i.medicamento)}</b><span class="rx-dots"></span><span class="rx-q">${esc(i.quantidade)}</span></div>${i.posologia?`<div class="rx-ppos">${esc(i.posologia)}</div>`:''}</div>`}).join('')).join('');
  const cab=`<header class="rx-cab">${c.logo?`<img class="rx-logo" src="${esc(c.logo)}" alt="">`:''}<div class="rx-cab-t"><div class="rx-clin">${esc(CONF.nome)}</div>${c.endereco?`<div>${esc(c.endereco)}${c.cidade?' · '+esc(c.cidade):''}</div>`:''}${c.telefone?`<div>Telefone: ${esc(c.telefone)}</div>`:''}</div></header>`;
  const ln=t=>`<div class="rx-ln">${t}</div>`;
  const emit=ctrl?`<div class="rx-box"><div class="rx-box-t">Identificação do emitente</div><div>Nome: <b>${esc(pr?pr.nome:'')}</b></div><div>Registro profissional: ${esc(pr&&pr.registro||'')}</div><div>Endereço: ${esc(c.endereco||'')}</div><div>Cidade: ${esc(c.cidade||'')}${c.telefone?' · Telefone: '+esc(c.telefone):''}</div></div>`:'';
  const pac=`<div class="rx-pac"><div><span>Paciente:</span> <b>${esc(p.nome)}</b></div>${ctrl?`<div><span>Endereço:</span> ${esc(r.enderecoPaciente||'')}</div>`:''}</div>`;
  const ass=`<div class="rx-ass"><div class="rx-local">${esc(c.cidade?c.cidade+', ':'')}${dataExtenso(r.data)}</div><div class="rx-linha"></div><div class="rx-pr">${pr?`<b>${esc(pr.nome)}</b>${pr.registro?`<div>${esc(pr.registro)}</div>`:''}${pr.especialidade?`<div>${esc(pr.especialidade)}</div>`:''}`:'Assinatura e carimbo'}</div></div>`;
  const comp=ctrl?`<div class="rx-ctrl-b"><div class="rx-box"><div class="rx-box-t">Identificação do comprador</div>${ln('Nome')}${ln('RG / Órgão emissor')}${ln('Endereço')}${ln('Cidade / UF')}${ln('Telefone')}</div><div class="rx-box"><div class="rx-box-t">Identificação do fornecedor</div><div style="height:22mm"></div><div class="rx-linha" style="width:auto"></div><div class="rx-small">Assinatura do farmacêutico</div>${ln('Data')}</div></div>`:'';
  return `<section class="rx-page${ctrl?' ctrl':''}">${cab}<h1 class="rx-tit">${ctrl?'Receituário de controle especial':'Receituário'}${via?`<span>${via}</span>`:''}</h1>${emit}${pac}<div class="rx-corpo">${corpo}</div>${r.obs?`<div class="rx-obs"><b>Orientações:</b> ${esc(r.obs).replace(/\n/g,'<br>')}</div>`:''}<div class="rx-fill"></div>${ass}${comp}</section>`;
}
async function imprimirRx(r,pac){
  let c;try{c=await rxConf()}catch(e){c={endereco:'',telefone:'',cidade:'',logo:''}}
  const p=pac||pacById(r.pacienteId)||{nome:'—'},pr=profById(r.profissionalId);
  const vias=r.tipo==='controle'?['1ª via — Farmácia','2ª via — Paciente']:[''];
  let root=$('#print-root');if(!root){root=document.createElement('div');root.id='print-root';document.body.appendChild(root)}
  root.innerHTML=vias.map(v=>rxPagina(r,p,pr,c,v)).join('');
  await Promise.all($$('img',root).map(i=>i.complete?0:new Promise(res=>{i.onload=i.onerror=res})));
  const t=document.title;document.title=`Receita - ${p.nome} - ${fmtBR(r.data).replace(/\//g,'-')}`;
  document.body.classList.add('printing');
  const fim=()=>{document.title=t;document.body.classList.remove('printing');window.removeEventListener('afterprint',fim)};
  window.addEventListener('afterprint',fim);
  setTimeout(()=>window.print(),60);
}

/* ---------- Receitas no cadastro do paciente e no agendamento ---------- */
const _openPac=openPac;
openPac=function(id){
  _openPac(id);
  if(!id)return;
  const ov=$$('#modal-root .overlay').pop();if(!ov)return;
  const f=$('.m-f',ov),cancel=f&&$('[data-close]',f);
  const b=document.createElement('button');b.type='button';b.className='btn';b.id='p-rx-new';b.textContent='Receita';
  b.onclick=()=>openRx(id,{onSave:carregar});
  if(cancel)f.insertBefore(b,cancel);
  const sec=document.createElement('div');sec.className='hist';sec.innerHTML='<h4>Receitas</h4><div id="p-rx"><div class="muted" style="font-size:13px">Carregando…</div></div>';
  const errEl=$('#p-err',ov);if(errEl)errEl.parentNode.insertBefore(sec,errEl);
  async function carregar(){
    let rows;
    try{rows=(await q(sb.from('receitas').select('*').eq('paciente_id',id).order('data',{ascending:false}).order('criado_em',{ascending:false}).limit(50))).map(rxFrom)}
    catch(e){const bx=$('#p-rx',ov);if(bx)bx.textContent=rxErro(e);return}
    const bx=$('#p-rx',ov);if(!bx)return;
    bx.innerHTML=rows.length?rows.map((r,i)=>{const pr=profById(r.profissionalId);return `<div class="hist-it rx-hi" data-i="${i}"><div class="rx-hi-t"><b>${fmtBR(r.data)}</b>${r.tipo==='controle'?' <span class="pill rx-ctl">Controle especial</span>':''}<div class="muted">${esc(r.itens.map(x=>x.medicamento).join(', '))}${pr?' · '+esc(pr.nome):''}</div></div><div class="rx-acts"><button type="button" class="btn sm" data-a="print">Imprimir</button><button type="button" class="btn sm" data-a="copy">Repetir</button></div></div>`}).join(''):'<div class="muted" style="font-size:13px">Nenhuma receita ainda.</div>';
    $$('.rx-hi',bx).forEach(h=>h.onclick=e=>{const r=rows[+h.dataset.i],a=e.target.closest('[data-a]');
      if(!a)openRx(id,{rx:r,onSave:carregar});
      else if(a.dataset.a==='print')imprimirRx(r);
      else openRx(id,{copy:r.itens,tipo:r.tipo,prof:r.profissionalId,obs:r.obs,endereco:r.enderecoPaciente,onSave:carregar});});
  }
  carregar();
};
const _openAg=openAg;
openAg=function(id,preset){
  _openAg(id,preset);
  const a=id&&AG.get(id);if(!a)return;
  const ov=$$('#modal-root .overlay').pop();if(!ov)return;
  const f=$('.m-f',ov),cancel=f&&$('[data-close]',f);if(!cancel)return;
  const b=document.createElement('button');b.type='button';b.className='btn';b.id='ag-rx';b.textContent='Receita';
  b.onclick=()=>{const cur=AG.get(id)||a;openRx(cur.pacienteId,{prof:cur.profissionalId})};
  f.insertBefore(b,cancel);
};

/* ---------- Configurações: logotipo e dados da receita ---------- */
function reduzLogo(file){
  return new Promise((res,rej)=>{
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)){rej(new Error('Use uma imagem PNG ou JPG.'));return}
    const fr=new FileReader();fr.onerror=()=>rej(new Error('Não foi possível ler a imagem.'));
    fr.onload=()=>{const img=new Image();img.onerror=()=>rej(new Error('Não foi possível abrir a imagem.'));
      img.onload=()=>{let w=img.naturalWidth,h=img.naturalHeight;const s=Math.min(1,600/w,240/h);w=Math.max(1,Math.round(w*s));h=Math.max(1,Math.round(h*s));
        const desenha=(fundo)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d');if(fundo){cx.fillStyle='#fff';cx.fillRect(0,0,w,h)}cx.drawImage(img,0,0,w,h);return cv};
        let d=desenha(false).toDataURL('image/png');
        if(d.length>250000)d=desenha(true).toDataURL('image/jpeg',0.85);
        res(d)};
      img.src=fr.result};
    fr.readAsDataURL(file);
  });
}
const _vConfig=vConfig;
vConfig=function(){return _vConfig()+`<div class="card cfg-sec" id="rx-cfg"><h2>Receitas e logotipo</h2>
  <p class="muted" style="margin-top:0">O logotipo e estes dados aparecem no cabeçalho e no rodapé das receitas impressas.</p>
  <div class="rx-logo-row"><div class="rx-logo-prev" id="rx-logo-prev"><span>Sem logotipo</span></div>
    <div><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn" style="display:inline-block">Escolher imagem…<input type="file" id="rx-logo-file" accept="image/png,image/jpeg,image/webp" hidden></label><button class="btn danger" type="button" id="rx-logo-rm">Remover</button></div>
    <div class="muted" style="font-size:12.5px;margin-top:6px">PNG ou JPG. Fundo transparente fica melhor. A imagem é reduzida automaticamente.</div></div></div>
  <div class="fg" style="margin-top:16px">
    <div class="full"><label class="f">Endereço da clínica</label><input class="input" id="rx-c-end" placeholder="Rua, número, bairro"></div>
    <div><label class="f">Cidade / UF</label><input class="input" id="rx-c-cid" placeholder="Ex.: São Paulo - SP"></div>
    <div><label class="f">Telefone</label><input class="input" id="rx-c-tel" placeholder="(11) 3333-4444"></div>
  </div><div class="err" id="rx-c-err"></div>
  <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" id="rx-c-save">Salvar dados da receita</button><button class="btn" type="button" id="rx-c-ex">Ver receita de exemplo</button></div></div>`};
async function rxCfgMontar(){
  if(!$('#rx-cfg'))return;
  if(!rxDraft){
    try{const c=await rxConf(true);rxDraft={endereco:c.endereco||'',telefone:c.telefone||'',cidade:c.cidade||'',logo:c.logo||''}}
    catch(e){const er=$('#rx-c-err');if(er)er.textContent=rxErro(e);return}
  }
  const sec=$('#rx-cfg');if(!sec||sec.dataset.ok)return;sec.dataset.ok='1';
  const prev=()=>{$('#rx-logo-prev').innerHTML=rxDraft.logo?`<img src="${esc(rxDraft.logo)}" alt="Logotipo">`:'<span>Sem logotipo</span>';$('#rx-logo-rm').hidden=!rxDraft.logo};
  [['rx-c-end','endereco'],['rx-c-cid','cidade'],['rx-c-tel','telefone']].forEach(([i,k])=>{const el=$('#'+i);el.value=rxDraft[k];el.oninput=()=>{rxDraft[k]=el.value}});
  prev();
  $('#rx-logo-file').onchange=async e=>{const fl=e.target.files&&e.target.files[0];e.target.value='';if(!fl)return;
    try{rxDraft.logo=await reduzLogo(fl);prev();$('#rx-c-err').textContent='';toast('Logotipo carregado — clique em Salvar')}catch(x){$('#rx-c-err').textContent=x.message}};
  $('#rx-logo-rm').onclick=()=>{rxDraft.logo='';prev()};
  $('#rx-c-save').onclick=async e=>{const btn=e.currentTarget,err=$('#rx-c-err');err.textContent='';btn.disabled=true;
    try{await q(sb.from('config').update({endereco:rxDraft.endereco.trim(),cidade:rxDraft.cidade.trim(),telefone:rxDraft.telefone.trim(),logo:rxDraft.logo}).eq('id',1));RXC=null;toast('Dados da receita salvos')}
    catch(x){err.textContent=rxErro(x)}finally{btn.disabled=false}};
  $('#rx-c-ex').onclick=()=>{
    const pr=activeProfs()[0];
    const r={pacienteId:'',profissionalId:pr?pr.id:'',data:todayISO(),tipo:'simples',obs:'Exemplo para conferir o layout. Não use esta receita.',enderecoPaciente:'',
      itens:[{medicamento:'Medicamento de exemplo 500 mg',quantidade:'1 caixa',via:'Uso oral',posologia:'Tomar conforme orientação do profissional.'}]};
    const salvo=RXC;RXC={endereco:rxDraft.endereco,telefone:rxDraft.telefone,cidade:rxDraft.cidade,logo:rxDraft.logo};
    imprimirRx(r,{nome:'Paciente de exemplo'}).finally(()=>{RXC=salvo});
  };
}
const _render9=render;
render=function(){_render9();if(READY&&route()==='configuracoes')rxCfgMontar();};

/* ---------- Backup inclui receitas e dados da receita ---------- */
backupDown=async function(btn){
  btn.disabled=true;
  try{
    const [config,profissionais,servicos,pacientes,agendamentos]=await Promise.all([
      q(sb.from('config').select('*')),fetchAll('profissionais'),fetchAll('servicos'),fetchAll('pacientes'),fetchAll('agendamentos')]);
    let receitas=[];try{receitas=await fetchAll('receitas')}catch(e){}
    const data={app:'agenda-clinica',versao:3,exportadoEm:new Date().toISOString(),tabelas:{config,profissionais,servicos,pacientes,agendamentos,receitas}};
    const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-agenda-'+todayISO()+'.json';document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
    toast('Backup baixado');
  }catch(e){toast(errMsg(e))}finally{btn.disabled=false}
};
const _importar=importar;
importar=async function(obj){
  const T=obj&&obj.tabelas;
  if(!T)return _importar(obj);
  let ok=false;const cd=confirmDlg;
  confirmDlg=async(...a)=>{const r=await cd(...a);ok=r;return r};
  try{await _importar(obj)}finally{confirmDlg=cd}
  if(!ok)return;
  try{
    const cf=(T.config||[])[0];
    if(cf&&('logo' in cf||'endereco' in cf)){await q(sb.from('config').update({endereco:cf.endereco||'',cidade:cf.cidade||'',telefone:cf.telefone||'',logo:cf.logo||''}).eq('id',1));RXC=null;rxDraft=null}
    const R=(T.receitas||[]).map(r=>({id:r.id,paciente_id:r.paciente_id,profissional_id:r.profissional_id||null,data:r.data,tipo:r.tipo,itens:r.itens||[],obs:r.obs||'',endereco_paciente:r.endereco_paciente||''}));
    for(let i=0;i<R.length;i+=500)await q(sb.from('receitas').upsert(R.slice(i,i+500),{onConflict:'id'}));
    if(R.length)toast(`Backup importado (com ${R.length} receita(s))`);
  }catch(e){toast(rxErro(e))}
};
