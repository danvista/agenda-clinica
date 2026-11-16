/* Agenda Clínica — parte 1 de 7 */
"use strict";
/* ---------- Utilidades ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const toISO=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseISO=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const todayISO=()=>toISO(new Date());
const addDays=(s,n)=>{const d=parseISO(s);d.setDate(d.getDate()+n);return toISO(d)};
const weekStart=s=>{const d=parseISO(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return toISO(d)};
const toMin=h=>{const [a,b]=String(h||'0:0').split(':').map(Number);return (a||0)*60+(b||0)};
const toHM=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(+v||0);
const DOW=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const DOWS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const fmtBR=s=>{if(!s)return'';const [y,m,d]=String(s).slice(0,10).split('-');return d+'/'+m+'/'+y};
const fmtLong=s=>{const d=parseISO(s);return DOW[d.getDay()]+', '+d.getDate()+' de '+MES[d.getMonth()]+' de '+d.getFullYear()};
const idade=s=>{if(!s)return'';const b=parseISO(s),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return a>=0&&a<130?a+' anos':''};
const monthOf=s=>s.slice(0,7);
const PPM=1.5;
const STATUS={
agendado:{l:'Agendado',c:'#2563eb',bg:'#e9f0fe'},
confirmado:{l:'Confirmado',c:'#059669',bg:'#e3f6ee'},
aguardando:{l:'Aguardando',c:'#d97706',bg:'#fdf1df'},
atendimento:{l:'Em atendimento',c:'#7c3aed',bg:'#f1eafe'},
atendido:{l:'Atendido',c:'#0f766e',bg:'#e0f2f1'},
faltou:{l:'Faltou',c:'#dc2626',bg:'#fde9e9'},
cancelado:{l:'Cancelado',c:'#6b7280',bg:'#eff1f3'}
};
const INATIVOS=['cancelado','faltou'];
const COLORS=['#0e9f8e','#2563eb','#7c3aed','#db2777','#ea580c','#ca8a04','#16a34a','#0891b2','#64748b','#dc2626'];
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ---------- Supabase ---------- */
const CONF_APP=window.AGENDA_CONFIG||{};
let sb=null;
function configOk(){return CONF_APP.supabaseUrl&&!/SEU-PROJETO/.test(CONF_APP.supabaseUrl)&&CONF_APP.supabaseKey&&!/COLE_AQUI/.test(CONF_APP.supabaseKey)}
function errMsg(e){
const m=String(e&&(e.message||e.error_description)||e||'');
if(/row-level security|permission denied|42501/i.test(m)||(e&&e.code==='42501'))return 'Você não tem permissão para esta ação.';
if(/Invalid login credentials/i.test(m))return 'E-mail ou senha incorretos.';
if(/Email not confirmed/i.test(m))return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
if(/User already registered/i.test(m))return 'Este e-mail já tem cadastro. Use "Esqueci minha senha" se precisar.';
if(/Password should be at least|weak password/i.test(m))return 'A senha precisa ter pelo menos 8 caracteres, com letras e números.';
if(/rate limit/i.test(m))return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
if(/administrador ativo/i.test(m))return 'É preciso ter pelo menos um administrador ativo.';
if(/Failed to fetch|NetworkError|network/i.test(m))return 'Sem conexão com o servidor. Verifique a internet.';
if(/JWT|token/i.test(m))return 'Sua sessão expirou. Entre novamente.';
return m||'Erro inesperado.';
}
async function q(p){const {data,error}=await p;if(error)throw error;return data}
async function fetchAll(table,build){
let out=[],from=0;
for(;;){let b=sb.from(table).select('*');if(build)b=build(b);b=b.order('id');const d=await q(b.range(from,from+999));out=out.concat(d||[]);if(!d||d.length<1000)break;from+=1000;}
return out;
}

/* ---------- Mapeamento banco <-> tela ---------- */
const pacFrom=r=>({id:r.id,nome:r.nome,telefone:r.telefone||'',email:r.email||'',nascimento:r.nascimento||'',cpf:r.cpf||'',obs:r.obs||'',ultimo:r.ultimo_atendimento||'',proximo:r.proximo?String(r.proximo).replace(' ','T'):''});
const pacTo=p=>({nome:p.nome,telefone:p.telefone||'',email:p.email||'',nascimento:p.nascimento||null,cpf:p.cpf||'',obs:p.obs||''});
const svcFrom=r=>({id:r.id,nome:r.nome,tipo:r.tipo,categoria:r.categoria||'',duracao:+r.duracao||0,valor:+r.valor||0,cor:r.cor,descricao:r.descricao||'',ativo:r.ativo!==false});
const svcTo=s=>({nome:s.nome,tipo:s.tipo==='servico'?'servico':'procedimento',categoria:s.categoria||'',duracao:+s.duracao||30,valor:+s.valor||0,cor:s.cor||COLORS[0],descricao:s.descricao||'',ativo:s.ativo!==false});
const profFrom=r=>({id:r.id,nome:r.nome,especialidade:r.especialidade||'',registro:r.registro||'',telefone:r.telefone||'',cor:r.cor,ativo:r.ativo!==false});
const profTo=p=>({nome:p.nome,especialidade:p.especialidade||'',registro:p.registro||'',telefone:p.telefone||'',cor:p.cor||COLORS[0],ativo:p.ativo!==false});
const agFrom=r=>({id:r.id,pacienteId:r.paciente_id,profissionalId:r.profissional_id||'',data:r.data,hora:String(r.hora||'').slice(0,5),duracao:+r.duracao||30,status:r.status,obs:r.obs||'',servicos:Array.isArray(r.servicos)?r.servicos:[],valor:+r.valor||0,wa:{marcada:r.wa_marcada_em||null,conf:r.wa_conf_em||null,resp:r.wa_resposta||null,respEm:r.wa_resposta_em||null,erro:r.wa_erro||null}});
const agTo=a=>({paciente_id:a.pacienteId,profissional_id:a.profissionalId||null,data:a.data,hora:a.hora,duracao:+a.duracao||30,status:a.status||'agendado',obs:a.obs||'',servicos:(a.servicos||[]).map(x=>({id:x.id,nome:x.nome,valor:+x.valor||0,duracao:+x.duracao||0})),valor:+a.valor||0});
const TABLES={pacientes:['pacientes',pacTo,pacFrom],servicos:['servicos',svcTo,svcFrom],profissionais:['profissionais',profTo,profFrom],agendamentos:['agendamentos',agTo,agFrom]};

/* ---------- Estado ---------- */
const S={pacientes:[],servicos:[],profissionais:[],perfis:[]};
let CONF={nome:'Minha Clínica',inicio:7,fim:20,intervalo:30,sabado:true,domingo:false};
const AG=new Map();
const MONTHS=new Set(),LOADING=new Set();
let ME=null,READY=false,channel=null;
const isAdmin=()=>ME&&ME.papel==='admin';

async function loadPacientes(){S.pacientes=(await fetchAll('pacientes_resumo')).map(pacFrom)}
async function loadBase(){
const [pac,svc,prof,conf]=await Promise.all([
fetchAll('pacientes_resumo'),fetchAll('servicos'),fetchAll('profissionais'),
q(sb.from('config').select('*').eq('id',1).maybeSingle())
]);
S.pacientes=pac.map(pacFrom);S.servicos=svc.map(svcFrom);S.profissionais=prof.map(profFrom);
if(conf)CONF={nome:conf.nome,inicio:+conf.inicio,fim:+conf.fim,intervalo:+conf.intervalo,sabado:!!conf.sabado,domingo:!!conf.domingo};
if(isAdmin())S.perfis=await fetchAll('perfis');
}
async function loadMonth(m){
const [y,mo]=m.split('-').map(Number);
const de=m+'-01',ate=toISO(new Date(y,mo,0));
const rows=await fetchAll('agendamentos',b=>b.gte('data',de).lte('data',ate));
for(const [id,a] of AG)if(monthOf(a.data)===m)AG.delete(id);
rows.forEach(r=>AG.set(r.id,agFrom(r)));
MONTHS.add(m);
}
async function ensureMonths(ms){
const miss=ms.filter(m=>!MONTHS.has(m)&&!LOADING.has(m));
if(!miss.length)return false;
miss.forEach(m=>LOADING.add(m));
try{await Promise.all(miss.map(loadMonth));return true}
catch(e){toast(errMsg(e));return false}
finally{miss.forEach(m=>LOADING.delete(m))}
}
function neededMonths(){
const set=new Set([monthOf(ui.date),monthOf(ui.cal||ui.date)]);
const st=weekStart(ui.date);for(let i=0;i<7;i++)set.add(monthOf(addDays(st,i)));
return [...set];
}
let reloadT=null,reloading=false;
function scheduleReload(ms=700){clearTimeout(reloadT);reloadT=setTimeout(reloadAll,ms)}
async function reloadAll(){
if(!READY||reloading)return;reloading=true;
try{
const ms=[...MONTHS];
await loadBase();
await Promise.all(ms.map(loadMonth));
setStatus(true);scheduleRender();
}catch(e){setStatus(false)}
finally{reloading=false}
}
function setStatus(ok){$('#side-status').textContent=ok?'Sincronizado':'Sem conexão — tentando de novo';if(!ok)setBanner('warn','Sem conexão com o servidor. As informações podem estar desatualizadas.');else if(bannerKind==='warn')setBanner(null)}

async function saveRow(kind,obj){
const [table,to,from]=TABLES[kind];
const row=to(obj);
const r=obj.id?await q(sb.from(table).update(row).eq('id',obj.id).select().single())
:await q(sb.from(table).insert(row).select().single());
const saved=from(r);
if(kind==='agendamentos'){AG.set(saved.id,saved);loadPacientes().then(scheduleRender).catch(()=>{});}
else{
const arr=S[kind],i=arr.findIndex(x=>x.id===saved.id);
if(kind==='pacientes'&&i>=0){saved.ultimo=arr[i].ultimo;saved.proximo=arr[i].proximo}
if(i>=0)arr[i]=saved;else arr.push(saved);
}
scheduleRender();
return saved;
}
async function deleteRow(kind,id){
await q(sb.from(TABLES[kind][0]).delete().eq('id',id));
if(kind==='agendamentos'){AG.delete(id);loadPacientes().then(scheduleRender).catch(()=>{});}
else S[kind]=S[kind].filter(x=>x.id!==id);
if(kind==='pacientes')for(const [k,a] of AG)if(a.pacienteId===id)AG.delete(k);
scheduleRender();
}

/* ---------- Derivados ---------- */
const cfg=()=>CONF;
const pacById=id=>S.pacientes.find(p=>p.id===id);
const profById=id=>S.profissionais.find(p=>p.id===id);
const svcById=id=>S.servicos.find(s=>s.id===id);
const activeProfs=()=>S.profissionais.filter(p=>p.ativo!==false).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
const byName=(a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR');
const sortAg=(a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora);
const agList=()=>Array.from(AG.values());
function waLink(p,a){
let n=String(p&&p.telefone||'').replace(/\D/g,'');if(!n)return'';
if(n.length<=11)n='55'+n;
const c=cfg(),pr=a&&profById(a.profissionalId);
const nome=String(p.nome||'').split(' ')[0];
const msg=a?`Olá ${nome}! Passando para confirmar seu horário na ${c.nome} em ${fmtBR(a.data)} às ${a.hora}${pr?' com '+pr.nome:''}. Podemos confirmar?`:`Olá ${nome}!`;
return 'https://wa.me/'+n+'?text='+encodeURIComponent(msg);
}

/* ---------- Banner, toast, modais ---------- */
let bannerKind=null;
function setBanner(kind,msg){bannerKind=kind;$('#banner').innerHTML=kind?`<div class="banner ${kind}">${msg}</div>`:'';}
let toastT;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3000);}
function openModal(html,cls=''){
const ov=document.createElement('div');ov.className='overlay';
ov.innerHTML=`<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
ov.addEventListener('mousedown',e=>{if(e.target===ov)ov._close();});
ov._close=()=>{ov.remove();};
ov.addEventListener('click',e=>{if(e.target.closest('[data-close]'))ov._close();});
$('#modal-root').appendChild(ov);
const f=ov.querySelector('[autofocus]');if(f)setTimeout(()=>f.focus(),30);
return ov;
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const o=$$('#modal-root .overlay').pop();if(o)o._close();}});
function confirmDlg(msg,ok='Excluir',danger=true){
return new Promise(res=>{
const ov=openModal(`<div class="m-h"><h2>Confirmar</h2><button class="x" data-close>×</button></div><div class="m-b">${msg}</div><div class="m-f"><span class="sp"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="cf-ok" ${danger?'style="background:var(--danger);border-color:var(--danger)"':''}>${ok}</button></div>`,'sm');
const c=ov._close;let done=false;
ov._close=()=>{c();if(!done)res(false)};
$('#cf-ok',ov).onclick=()=>{done=true;c();res(true)};
});
}
const mHead=t=>`<div class="m-h"><h2>${t}</h2><button class="x" data-close aria-label="Fechar">×</button></div>`;
function swatches(sel){return `<div class="swatches">${COLORS.map(c=>`<button type="button" class="sw ${c===sel?'on':''}" data-c="${c}" style="background:${c}" aria-label="Cor"></button>`).join('')}</div>`}
function bindSwatches(root,cb){$$('.sw',root).forEach(b=>b.onclick=()=>{$$('.sw',root).forEach(x=>x.classList.remove('on'));b.classList.add('on');cb(b.dataset.c)})}
async function busy(btn,fn){btn.disabled=true;try{return await fn()}catch(e){toast(errMsg(e));throw e}finally{btn.disabled=false}}
