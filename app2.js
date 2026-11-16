/* Agenda Clínica — parte 2 de 7 */
"use strict";
/* ---------- Login ---------- */
const brandHtml=n=>`<div class="brand"><div class="brand-logo">A</div><div><div class="brand-name">${esc(n||'Agenda Clínica')}</div><div class="brand-sub">Agenda</div></div></div>`;
function showAuth(mode,msg){
  READY=false;
  $('#app').hidden=true;const box=$('#auth');box.hidden=false;
  $$('#modal-root .overlay').forEach(o=>o.remove());
  let body='';
  if(mode==='login')body=`<h1>Entrar</h1><p>Acesse a agenda da clínica.</p>
    <form id="f"><div class="f-row"><label class="f">E-mail</label><input class="input" id="a-e" type="email" autocomplete="username" required autofocus></div>
    <div class="f-row"><label class="f">Senha</label><input class="input" id="a-s" type="password" autocomplete="current-password" required></div>
    <button class="btn primary" type="submit">Entrar</button><div class="err" id="a-err"></div></form>
    <div class="auth-links"><button class="linkbtn" data-m="recuperar">Esqueci minha senha</button><button class="linkbtn" data-m="cadastro">Solicitar acesso</button></div>`;
  else if(mode==='cadastro')body=`<h1>Solicitar acesso</h1><p>Crie seu login. O administrador da clínica precisa liberar seu acesso antes do primeiro uso.</p>
    <form id="f"><div class="f-row"><label class="f">Seu nome</label><input class="input" id="a-n" required autofocus></div>
    <div class="f-row"><label class="f">E-mail</label><input class="input" id="a-e" type="email" autocomplete="username" required></div>
    <div class="f-row"><label class="f">Senha (mín. 8 caracteres)</label><input class="input" id="a-s" type="password" minlength="8" autocomplete="new-password" required></div>
    <button class="btn primary" type="submit">Criar login</button><div class="err" id="a-err"></div></form>
    <div class="auth-links"><button class="linkbtn" data-m="login">Já tenho login</button></div>`;
  else if(mode==='recuperar')body=`<h1>Recuperar senha</h1><p>Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
    <form id="f"><div class="f-row"><label class="f">E-mail</label><input class="input" id="a-e" type="email" required autofocus></div>
    <button class="btn primary" type="submit">Enviar link</button><div class="err" id="a-err"></div></form>
    <div class="auth-links"><button class="linkbtn" data-m="login">Voltar para o login</button></div>`;
  else if(mode==='nova-senha')body=`<h1>Criar nova senha</h1><p>Digite a nova senha da sua conta.</p>
    <form id="f"><div class="f-row"><label class="f">Nova senha</label><input class="input" id="a-s" type="password" minlength="8" autocomplete="new-password" required autofocus></div>
    <div class="f-row"><label class="f">Repita a nova senha</label><input class="input" id="a-s2" type="password" minlength="8" autocomplete="new-password" required></div>
    <button class="btn primary" type="submit">Salvar nova senha</button><div class="err" id="a-err"></div></form>`;
  else if(mode==='pendente')body=`<h1>Aguardando liberação</h1><p>Seu login foi criado, mas o administrador da clínica ainda precisa liberar seu acesso. Depois que ele liberar, é só entrar de novo.</p>
    <button class="btn primary" id="a-retry" type="button">Verificar novamente</button><div class="auth-links"><button class="linkbtn" id="a-out">Sair</button></div>`;
  else if(mode==='config')body=`<h1>Configuração pendente</h1><p>Preencha o arquivo <b>config.js</b> com o endereço e a chave publishable do seu projeto no Supabase. Veja o passo a passo no LEIA-ME.</p>`;
  box.innerHTML=`<div class="auth-card">${brandHtml()}${body}${msg?`<div class="okbox">${msg}</div>`:''}</div>`;
  $$('[data-m]',box).forEach(b=>b.onclick=()=>showAuth(b.dataset.m));
  const out=$('#a-out',box);if(out)out.onclick=()=>sb.auth.signOut();
  const retry=$('#a-retry',box);if(retry)retry.onclick=async()=>{const {data}=await sb.auth.getSession();if(data.session)startApp(data.session);else showAuth('login')};
  const f=$('#f',box);if(!f)return;
  const af=$('[autofocus]',box);if(af)setTimeout(()=>af.focus(),30);
  f.onsubmit=async e=>{
    e.preventDefault();const err=$('#a-err',box),btn=$('button[type=submit]',f);err.textContent='';btn.disabled=true;
    try{
      if(mode==='login'){
        const {data,error}=await sb.auth.signInWithPassword({email:$('#a-e',f).value.trim(),password:$('#a-s',f).value});
        if(error)throw error;await startApp(data.session);
      }else if(mode==='cadastro'){
        const {data,error}=await sb.auth.signUp({email:$('#a-e',f).value.trim(),password:$('#a-s',f).value,options:{data:{nome:$('#a-n',f).value.trim()},emailRedirectTo:location.origin+location.pathname}});
        if(error)throw error;
        if(data.session)await startApp(data.session);
        else showAuth('login','Login criado! Se pedirmos, confirme pelo link enviado ao seu e-mail. Depois aguarde o administrador liberar o acesso.');
      }else if(mode==='recuperar'){
        const {error}=await sb.auth.resetPasswordForEmail($('#a-e',f).value.trim(),{redirectTo:location.origin+location.pathname});
        if(error)throw error;showAuth('login','Se este e-mail tiver cadastro, você vai receber um link para criar uma nova senha.');
      }else if(mode==='nova-senha'){
        const s1=$('#a-s',f).value,s2=$('#a-s2',f).value;
        if(s1!==s2)throw new Error('As senhas não conferem.');
        const {error}=await sb.auth.updateUser({password:s1});if(error)throw error;
        history.replaceState(null,'',location.pathname+'#agenda');
        const {data}=await sb.auth.getSession();if(data.session)await startApp(data.session);else showAuth('login','Senha alterada. Entre com a nova senha.');
      }
    }catch(ex){err.textContent=errMsg(ex)}
    finally{btn.disabled=false}
  };
}

async function startApp(session){
  if(!session){showAuth('login');return}
  let perfil;
  try{perfil=await q(sb.from('perfis').select('*').eq('id',session.user.id).maybeSingle())}
  catch(e){showAuth('login');$('#a-err')&&($('#a-err').textContent=errMsg(e));return}
  if(!perfil||!perfil.ativo){ME=null;showAuth('pendente');return}
  ME=perfil;
  $('#auth').hidden=true;$('#app').hidden=false;
  $('#u-nome').textContent=perfil.nome||perfil.email;
  $('#u-papel').textContent=(perfil.papel==='admin'?'Administrador':'Equipe')+' · '+perfil.email;
  $$('#nav [data-admin]').forEach(a=>a.hidden=!isAdmin());
  $('#view').innerHTML='<div class="loading"><div><div class="spin"></div>Carregando agenda…</div></div>';
  try{
    AG.clear();MONTHS.clear();
    await loadBase();
    await ensureMonths(neededMonths());
    READY=true;setStatus(true);
  }catch(e){setBanner('err',esc(errMsg(e)));READY=true}
  subscribe();
  if(!isAdmin()&&['usuarios','configuracoes'].includes(location.hash.slice(1)))location.hash='agenda';
  ui.scrollInit=false;render();
}
function subscribe(){
  if(channel)sb.removeChannel(channel);
  try{channel=sb.channel('agenda-mudancas').on('postgres_changes',{event:'*',schema:'public'},()=>scheduleReload()).subscribe();}catch(e){channel=null}
}
$('#u-sair').onclick=async()=>{await sb.auth.signOut();};
$('#u-senha').onclick=()=>{
  const ov=openModal(`${mHead('Alterar minha senha')}<div class="m-b"><div class="fg"><div class="full"><label class="f">Nova senha</label><input class="input" type="password" id="ns1" minlength="8" autocomplete="new-password" autofocus></div><div class="full"><label class="f">Repita a nova senha</label><input class="input" type="password" id="ns2" autocomplete="new-password"></div></div><div class="err" id="ns-err"></div></div><div class="m-f"><span class="sp"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ns-ok">Salvar</button></div>`,'sm');
  $('#ns-ok',ov).onclick=async()=>{const a=$('#ns1',ov).value,b=$('#ns2',ov).value,err=$('#ns-err',ov);
    if(a.length<8){err.textContent='Use pelo menos 8 caracteres.';return}if(a!==b){err.textContent='As senhas não conferem.';return}
    const {error}=await sb.auth.updateUser({password:a});if(error){err.textContent=errMsg(error);return}ov._close();toast('Senha alterada')};
};

/* ---------- Roteamento ---------- */
const ROUTES=['agenda','pacientes','procedimentos','profissionais','usuarios','configuracoes'];
const route=()=>{const h=location.hash.slice(1);if(!ROUTES.includes(h))return 'agenda';if((h==='usuarios'||h==='configuracoes')&&!isAdmin())return 'agenda';return h};
window.addEventListener('hashchange',()=>{ui.scrollInit=false;if(READY)render()});
const ui={view:'dia',date:todayISO(),prof:'all',cal:null,scrollInit:false,qPac:'',qSvc:'',tipoSvc:'todos'};
try{const v=localStorage.getItem('agenda-view');if(v==='dia'||v==='semana')ui.view=v;}catch(e){}

let renderQueued=false;
function scheduleRender(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;if(READY)render();});}
function render(){
  if(!READY)return;
  $('#brand-name').textContent=CONF.nome;document.title=CONF.nome+' · Agenda';
  const r=route();
  $$('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.r===r));
  const v=$('#view');
  const act=document.activeElement,actId=act&&act.id,selS=act&&act.selectionStart;
  const gw=$('#grid-wrap'),st=gw?gw.scrollTop:0,sl=gw?gw.scrollLeft:0;
  if(r==='agenda'){v.innerHTML=vAgenda();afterAgenda(gw?st:null,sl);ensureMonths(neededMonths()).then(ch=>{if(ch)scheduleRender()});}
  else if(r==='pacientes')v.innerHTML=vPacientes();
  else if(r==='procedimentos')v.innerHTML=vServicos();
  else if(r==='profissionais')v.innerHTML=vProfs();
  else if(r==='usuarios')v.innerHTML=vUsuarios();
  else v.innerHTML=vConfig();
  if(actId){const el=document.getElementById(actId);if(el&&el!==act){el.focus();try{el.setSelectionRange(selS,selS)}catch(e){}}}
}
