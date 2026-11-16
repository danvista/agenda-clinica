/* Agenda Clínica — parte 10: bot de WhatsApp */
"use strict";
/* Status "Não confirmado" logo depois de "Agendado" */
(function(){
  const ant=Object.assign({},STATUS);Object.keys(STATUS).forEach(k=>delete STATUS[k]);
  Object.keys(ant).forEach(k=>{STATUS[k]=ant[k];if(k==='agendado')STATUS.nao_confirmado={l:'Não confirmado',c:'#c2410c',bg:'#ffedd5'}});
})();
let WAC=null,waDraft=null;
document.head.insertAdjacentHTML('beforeend',`<style>
.wa-box{background:#f0fdf4;border:1px solid #bbf7d0;color:#14532d;border-radius:8px;padding:9px 12px;font-size:13px;margin-top:12px;line-height:1.55}
.wa-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;flex:none;align-self:center}
.wa-ok{background:#16a34a}.wa-wait{background:#f59e0b}.wa-err{background:#dc2626}
.wa-h3{font-size:13px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);margin:22px 0 8px}
.wa-tbl td{padding:7px 8px;font-size:13px}.wa-perr{background:#fde9e9;color:#9b1c1c}
</style>`);
async function waConf(force){
  if(WAC&&!force)return WAC;
  const r=await q(sb.from('config').select('wa_ativo,wa_horas_antes,wa_limite_horas').eq('id',1).maybeSingle());
  WAC=Object.assign({wa_ativo:false,wa_horas_antes:4,wa_limite_horas:1},r||{});return WAC;
}
const waErro=e=>/wa_|column|does not exist|schema cache/i.test(String(e&&e.message||''))?'O banco ainda não tem os campos do WhatsApp. Rode a atualização do banco (LEIA-ME).':errMsg(e);
const hhmm=s=>{const d=new Date(s);return fmtBR(toISO(d))+' às '+pad(d.getHours())+':'+pad(d.getMinutes())};
function waResumo(a){
  const w=a&&a.wa;if(!w)return '';
  const it=[];
  if(w.marcada)it.push(`Aviso de consulta marcada: ${hhmm(w.marcada)}`);
  if(w.conf)it.push(`Pedido de confirmação: ${hhmm(w.conf)}`);
  if(w.resp)it.push(`<b>${w.resp==='confirmou'?'Paciente confirmou':'Paciente desmarcou'}</b>${w.respEm?' em '+hhmm(w.respEm):''}`);
  if(w.erro)it.push(`<span style="color:var(--danger)">Erro no envio: ${esc(w.erro)}</span>`);
  return it.length?`<div class="wa-box"><b>WhatsApp automático</b>${it.map(x=>`<div>${x}</div>`).join('')}</div>`:'';
}
/* Detalhes do bot dentro do agendamento */
const _openAg10=openAg;
openAg=function(id,preset){
  _openAg10(id,preset);
  const a=id&&AG.get(id);if(!a)return;
  const ov=$$('#modal-root .overlay').pop();if(!ov)return;
  const h=waResumo(a);if(!h)return;
  const w=$('#ag-warn',ov);if(w)w.insertAdjacentHTML('beforebegin',h);
};
/* Ícone no bloco da agenda (computador) */
const _evHtml10=evHtml;
evHtml=function(o,c,showProf){
  let h=_evHtml10(o,c,showProf);const w=o.a.wa||{};
  const ic=w.resp==='confirmou'?'wa-ok':w.erro?'wa-err':w.conf&&!w.resp?'wa-wait':'';
  if(ic)h=h.replace('<div class="ev-t">',`<div class="ev-t"><i class="wa-dot ${ic}" title="${ic==='wa-ok'?'Confirmou pelo WhatsApp':ic==='wa-err'?'Erro no WhatsApp':'Aguardando resposta no WhatsApp'}"></i>`);
  return h;
};

/* ---------- Configurações do bot ---------- */
const _vConfig10=vConfig;
vConfig=function(){return _vConfig10()+`<div class="card cfg-sec" id="wa-cfg"><h2>WhatsApp automático</h2>
  <p class="muted" style="margin-top:0">Envia "consulta marcada" quando o paciente é agendado e pede confirmação antes da consulta. Quem não responder passa para <b style="color:#c2410c">Não confirmado</b>. Precisa da conta da Meta configurada (veja o LEIA-ME).</p>
  <label class="check"><input type="checkbox" id="wa-on"> Ligar o WhatsApp automático</label>
  <div class="fg" style="margin-top:14px">
    <div><label class="f">Pedir confirmação</label><select class="input" id="wa-h">${[2,3,4,6,8,12,24,48].map(h=>`<option value="${h}">${h} horas antes</option>`).join('')}</select></div>
    <div><label class="f">Sem resposta, marcar "Não confirmado"</label><select class="input" id="wa-l">${[0,1,2,3,6,12,24].map(h=>`<option value="${h}">${h?h+(h>1?' horas':' hora')+' antes':'no horário da consulta'}</option>`).join('')}</select></div>
  </div><div class="err" id="wa-err"></div>
  <div style="margin-top:14px"><button class="btn primary" type="button" id="wa-save">Salvar WhatsApp</button></div>
  <h3 class="wa-h3">Últimas mensagens</h3><div id="wa-log" class="muted" style="font-size:13px">Carregando…</div></div>`};
async function waCfgMontar(){
  const sec=$('#wa-cfg');if(!sec||sec.dataset.ok)return;sec.dataset.ok='1';
  let c;try{c=await waConf(true)}catch(e){$('#wa-err').textContent=waErro(e);return}
  if(!$('#wa-cfg'))return;
  const d=waDraft||{on:!!c.wa_ativo,h:String(c.wa_horas_antes),l:String(c.wa_limite_horas)};
  $('#wa-on').checked=d.on;$('#wa-h').value=d.h;$('#wa-l').value=d.l;
  const guarda=()=>{waDraft={on:$('#wa-on').checked,h:$('#wa-h').value,l:$('#wa-l').value}};
  ['#wa-on','#wa-h','#wa-l'].forEach(s=>$(s).onchange=guarda);
  $('#wa-save').onclick=async e=>{const btn=e.currentTarget,err=$('#wa-err');err.textContent='';
    const h=+$('#wa-h').value,l=+$('#wa-l').value;if(l>=h){err.textContent='O prazo para "Não confirmado" precisa ser menor que o do pedido de confirmação.';return}
    btn.disabled=true;
    try{await q(sb.from('config').update({wa_ativo:$('#wa-on').checked,wa_horas_antes:h,wa_limite_horas:l}).eq('id',1));WAC=null;waDraft=null;toast($('#wa-on').checked?'WhatsApp automático ligado':'WhatsApp automático desligado')}
    catch(x){err.textContent=waErro(x)}finally{btn.disabled=false}};
  try{
    const rows=await q(sb.from('wa_log').select('*').order('criado_em',{ascending:false}).limit(15));
    const box=$('#wa-log');if(!box)return;
    const nomes={marcada:'Consulta marcada',confirmacao:'Pedido de confirmação',resposta:'Resposta do paciente',erro:'Erro'};
    box.innerHTML=rows.length?`<table class="tbl wa-tbl"><tbody>${rows.map(r=>{const a=r.agendamento_id&&AG.get(r.agendamento_id),p=a&&pacById(a.pacienteId);
      return `<tr><td style="white-space:nowrap">${hhmm(r.criado_em)}</td><td><span class="pill ${r.tipo==='erro'?'wa-perr':''}">${nomes[r.tipo]||esc(r.tipo)}</span></td><td>${esc(p?p.nome:r.telefone)}${r.detalhe?` <span class="muted">— ${esc(r.detalhe==='confirmou'?'confirmou':r.detalhe==='cancelou'?'desmarcou':r.detalhe)}</span>`:''}</td></tr>`}).join('')}</tbody></table>`:'Nenhuma mensagem enviada ainda.';
  }catch(e){const box=$('#wa-log');if(box)box.textContent=waErro(e)}
}
const _render10=render;
render=function(){_render10();if(READY&&route()==='configuracoes')waCfgMontar();};
