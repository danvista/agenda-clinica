/* Agenda Clínica — parte 7 de 7 */
"use strict";
/* ---------- Eventos globais ---------- */
document.addEventListener('click',async e=>{
const el=e.target.closest('[data-act]');if(!el||el.closest('.overlay')||!READY)return;
const act=el.dataset.act,id=el.dataset.id;
switch(act){
case 'ag-today':ui.date=todayISO();ui.cal=null;ui.scrollInit=false;render();break;
case 'ag-prev':ui.date=addDays(ui.date,ui.view==='dia'?-1:-7);ui.cal=null;render();break;
case 'ag-next':ui.date=addDays(ui.date,ui.view==='dia'?1:7);ui.cal=null;render();break;
case 'ag-view':ui.view=el.dataset.v;try{localStorage.setItem('agenda-view',ui.view)}catch(x){}render();break;
case 'ag-goday':ui.date=el.dataset.date;ui.view='dia';render();break;
case 'ag-new':openAg(null,{});break;
case 'ag-open':openAg(id);break;
case 'cal-pick':ui.date=el.dataset.date;ui.cal=null;render();break;
case 'cal-prev':case 'cal-next':{const b=parseISO(ui.cal||ui.date.slice(0,7)+'-01');b.setMonth(b.getMonth()+(act==='cal-prev'?-1:1));ui.cal=toISO(b);render();break}
case 'pac-new':openPac(null);break;
case 'pac-open':openPac(id);break;
case 'svc-new':openSvc(null);break;
case 'svc-open':openSvc(id);break;
case 'svc-seed':el.disabled=true;await seedServicos();break;
case 'svc-tipo':ui.tipoSvc=el.dataset.v;render();break;
case 'prof-new':openProf(null);break;
case 'prof-open':openProf(id);break;
case 'usr-open':if(!e.target.closest('[data-act="usr-liberar"]'))openUsr(id);break;
case 'usr-liberar':try{await updPerfil(id,{ativo:true});toast('Acesso liberado')}catch(x){toast(errMsg(x))}break;
case 'cfg-save':{
const i=+$('#c-i').value,f=+$('#c-f').value;
if(f<=i){$('#c-err').textContent='O fim do expediente precisa ser depois do início.';return}
const patch={nome:$('#c-n').value.trim()||'Minha Clínica',inicio:i,fim:f,intervalo:+$('#c-iv').value,sabado:$('#c-sa').checked,domingo:$('#c-do').checked};
try{await busy(el,()=>q(sb.from('config').update(patch).eq('id',1)));CONF=patch;render();toast('Configurações salvas')}catch(x){}
break}
case 'bk-down':backupDown(el);break;
}
});
document.addEventListener('input',e=>{
if(e.target.id==='q-pac'){ui.qPac=e.target.value;$('#pac-list').innerHTML=pacTable();}
if(e.target.id==='q-svc'){ui.qSvc=e.target.value;$('#svc-list').innerHTML=svcTable();}
});
document.addEventListener('change',async e=>{
if(e.target.id!=='bk-file')return;
const f=e.target.files&&e.target.files[0];if(!f)return;
try{await importar(JSON.parse(await f.text()))}catch(err){toast(errMsg(err))}
finally{e.target.value=''}
});
// Atualização periódica (além do tempo real) e linha do "agora"
setInterval(()=>{if(READY&&document.visibilityState==='visible'&&!$('#modal-root .overlay'))reloadAll()},60000);
window.addEventListener('focus',()=>{if(READY)scheduleReload(300)});

/* ---------- Início ---------- */
async function boot(){
if(!configOk()||!window.supabase){showAuth('config');return}
sb=window.supabase.createClient(CONF_APP.supabaseUrl,CONF_APP.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let recovering=/type=recovery/.test(location.hash);
sb.auth.onAuthStateChange((ev)=>{
if(ev==='PASSWORD_RECOVERY'){recovering=true;showAuth('nova-senha')}
else if(ev==='SIGNED_OUT'){ME=null;if(channel){sb.removeChannel(channel);channel=null}AG.clear();MONTHS.clear();S.pacientes=[];S.perfis=[];showAuth('login')}
});
const {data}=await sb.auth.getSession();
if(recovering){showAuth('nova-senha');return}
if(data.session)await startApp(data.session);else showAuth('login');
}
// Inicia só depois que todas as partes do sistema carregaram
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
