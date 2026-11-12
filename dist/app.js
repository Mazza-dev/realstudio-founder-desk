const $ = (s, root=document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, team, db;
const state = {
  page: 'clients', client: null, search: '',
  user: null, videos: [], resolved: [], statuses: {},
  report: null
};
const source = (url, text='Source ↗') => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const badge = (text, kind='') => `<span class="badge ${kind}">${esc(text)}</span>`;
const clientName = id => data.clients.find(c => c.id === id)?.name || id;
const allVideos = () => [...data.videos, ...state.videos];
const currentStatus = (type, id) => state.statuses[`${type}:${id}`] || 'To plan';
const statusOptions = ['To plan','In progress','In review','Waiting','Needs decision','Done'];
const statusSelect = (type,id) => `<select class="status-select" data-status-type="${type}" data-status-id="${esc(id)}" aria-label="Change status">${statusOptions.map(s=>`<option value="${s}" ${currentStatus(type,id)===s?'selected':''}>${s}</option>`).join('')}</select>`;
function toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),2800);}

function renderAuth(message=''){
  document.body.classList.add('auth-locked');
  $('#app').innerHTML=`<div class="auth-card"><div class="brand"><span class="brand-mark"></span><span>REAL<span class="brand-light">STUDIO</span></span></div><p class="eyebrow">Founder desk</p><h1>Sign in</h1><form id="login-form"><label for="login-email">Email</label><input class="input" id="login-email" name="email" type="email" autocomplete="username" required><label for="login-password">Password</label><input class="input" id="login-password" name="password" type="password" autocomplete="current-password" required><button class="btn primary" type="submit">Sign in</button><p class="auth-error" role="alert">${esc(message)}</p></form></div>`;
  $('#login-form').addEventListener('submit',async e=>{
    e.preventDefault();const button=$('#login-form button');button.disabled=true;button.textContent='Signing in…';
    const f=new FormData(e.currentTarget);const {data:result,error}=await db.auth.signInWithPassword({email:String(f.get('email')).trim(),password:String(f.get('password'))});
    if(error){renderAuth(error.message);return;}await enterApp(result.user);
  });
}

async function enterApp(user){
  state.user=user;
  const [videos,reviewed,statuses]=await Promise.all([
    db.from('demo_videos').select('id,client_id,title,url,created_at').eq('user_id',user.id).order('created_at',{ascending:false}),
    db.from('reviewed_decisions').select('decision_id').eq('user_id',user.id),
    db.from('workspace_statuses').select('record_type,record_id,status')
  ]);
  if(videos.error||reviewed.error||statuses.error){renderAuth('Could not load the workspace. Please try again.');return;}
  state.videos=videos.data.map(v=>({id:v.id,clientId:v.client_id,title:v.title,url:v.url,platform:'Link',format:'Video',sourceType:'Saved',views:null,note:''}));
  state.resolved=reviewed.data.map(d=>d.decision_id);
  state.statuses=Object.fromEntries(statuses.data.map(s=>[`${s.record_type}:${s.record_id}`,s.status]));
  document.body.classList.remove('auth-locked');
  const [page,client]=location.hash.slice(1).split('/');if(['clients','teammates','decisions','reports'].includes(page)){state.page=page;state.client=client||null;}
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===state.page));
  $('#crumb').textContent=({clients:'Clients',teammates:'Teammates',decisions:'Founder decisions',reports:'Reports'})[state.page];
  render();
}

function setPage(page, client=null){
  state.page=page;state.client=client;state.search='';state.report=null;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  $('#crumb').textContent=({clients:'Clients',teammates:'Teammates',decisions:'Founder decisions',reports:'Reports'})[page];
  location.hash=client ? `#clients/${client}` : `#${page}`;
  render();window.scrollTo(0,0);
}

function pageHead(title,side=''){
  return `<div class="page-header"><h1>${title}</h1>${side}</div>`;
}

function clientsPage(){
  if(state.client) return clientDetail(state.client);
  const cards=data.clients.map(c=>`<article class="card client-card">
    <div class="card-top"><div><h3>${esc(c.name)}</h3><div class="meta">${esc(c.category)}</div></div>${statusSelect('client',c.id)}</div>
    <div class="result">${esc(c.result)}</div><p>${esc(c.resultDetail)}</p>
    <div class="card-bottom"><span class="subtle">${esc(c.sampleOwner)}</span><button class="btn small" data-client="${esc(c.id)}">Open</button></div>
  </article>`).join('');
  const rows=data.work.map(w=>`<div class="list-row"><strong>${esc(w.title)}<br><span class="meta">${esc(clientName(w.clientId))}</span></strong><span>${esc(w.owner)}</span>${statusSelect('task',w.id)}<span>${esc(w.due)}</span></div>`).join('');
  return `<div class="page">${pageHead('Clients')}
    <div class="section-title"><h2>Accounts</h2></div><div class="three-col">${cards}</div>
    <div class="section-title"><h2>Work</h2></div><div class="list"><div class="list-row head"><span>Task</span><span>Function</span><span>Status</span><span>Due</span></div>${rows}</div>
  </div>`;
}

function videoCard(v){
  const isEmbed=v.url.includes('play.gumlet.io/embed/');
  return `<article class="video-card"><div class="video-thumb"><button class="play" data-video="${esc(v.id)}" aria-label="${isEmbed?'Play':'Open'} ${esc(v.title)}">${isEmbed?'▶':'↗'}</button></div>
    <div class="video-info"><div class="card-top"><div><h3>${esc(v.title)}</h3><span class="meta">${esc(v.format||v.platform)}${v.length?' · '+esc(v.length):''}</span></div></div>
    <p>${esc(v.note||'')}</p><div class="card-bottom"><span class="subtle">${v.views==null?'Views unavailable':esc(v.views)+' views'}</span>${source(v.url,'Open video ↗')}</div></div></article>`;
}

function clientDetail(id){
  const c=data.clients.find(x=>x.id===id);if(!c)return clientsPage();
  const work=data.work.filter(x=>x.clientId===id);
  const vids=allVideos().filter(x=>x.clientId===id);
  return `<div class="page"><button class="back" id="back-clients">← Clients</button>${pageHead(esc(c.name),statusSelect('client',c.id))}
    <div class="page-hero"><h2>${esc(c.result)}</h2><p>${esc(c.resultDetail)}</p></div>
    <div class="two-col"><div class="card"><p class="eyebrow">Focus</p><h3>${esc(c.focus)}</h3></div><div class="card"><p class="eyebrow">Next</p><h3>${esc(c.next)}</h3></div></div>
    <div class="section-title"><h2>Video library</h2><span>${vids.length} saved</span></div>
    ${vids.length?`<div class="video-grid">${vids.map(videoCard).join('')}</div>`:'<div class="empty">No videos yet.</div>'}
    <div class="section-title"><h2>Add video</h2></div>
    <div class="card"><form id="add-video" class="inline-form"><input name="title" class="input" placeholder="Video title" required maxlength="80"><input name="url" class="input" placeholder="https://…" type="url" required><button class="btn primary" type="submit">Add video</button></form></div>
    <div class="section-title"><h2>Work</h2></div><div class="list"><div class="list-row head"><span>Task</span><span>Function</span><span>Status</span><span>Due</span></div>${work.map(w=>`<div class="list-row"><strong>${esc(w.title)}</strong><span>${esc(w.owner)}</span>${statusSelect('task',w.id)}<span>${esc(w.due)}</span></div>`).join('')}</div>
  </div>`;
}

function teammatesPage(){
  const term=state.search.toLowerCase();const filtered=team.filter(p=>(p.name+' '+p.role).toLowerCase().includes(term));
  const updates=data.work.filter(w=>!term||(w.owner+' '+w.title+' '+clientName(w.clientId)).toLowerCase().includes(term));
  return `<div class="page">${pageHead('Teammates',`<input class="search" id="team-search" type="search" placeholder="Find a person or role" value="${esc(state.search)}" aria-label="Search teammates">`)}
    <div class="section-title"><h2>Work by function</h2></div>
    ${updates.length?`<div class="list"><div class="list-row head"><span>Task</span><span>Function</span><span>Status</span><span>Due</span></div>${updates.map(w=>`<div class="list-row"><strong>${esc(w.title)}<br><span class="meta">${esc(clientName(w.clientId))}</span></strong><span>${esc(w.owner)}</span>${statusSelect('task',w.id)}<span>${esc(w.due)}</span></div>`).join('')}</div>`:'<div class="empty">No matching work.</div>'}
    <div class="section-title"><h2>Team</h2><span>${filtered.length} of ${team.length} people</span></div>
    <div class="team-grid">${filtered.map(p=>`<article class="card person"><img src="${esc(p.image)}" alt="Portrait of ${esc(p.name)}" loading="lazy"><div class="person-details"><h3>${esc(p.name)}</h3><div class="meta">${esc(p.role)}</div></div></article>`).join('')}</div>
  </div>`;
}

function decisionsPage(){
  const open=data.decisions.filter(d=>!state.resolved.includes(d.id));
  const done=data.decisions.filter(d=>state.resolved.includes(d.id));
  const card=(d,resolved=false)=>`<article class="card decision"><div><div class="card-top"><span class="meta">${esc(clientName(d.clientId))}</span>${badge(resolved?'Reviewed':'To review',resolved?'green':'amber')}</div><h3 style="margin-top:13px">${esc(d.title)}</h3><p>${esc(d.detail)}</p><p class="rec"><strong>Next step</strong><br>${esc(d.recommendation)}</p><div class="card-bottom"><span class="subtle">${esc(d.owner)}</span><button class="btn small ${resolved?'ghost':''}" data-resolve="${esc(d.id)}">${resolved?'Reopen':'Mark reviewed'}</button></div></div></article>`;
  return `<div class="page">${pageHead('Founder decisions')}
    <div class="section-title"><h2>To review</h2><span>${open.length}</span></div>${open.length?`<div class="two-col">${open.map(d=>card(d)).join('')}</div>`:'<div class="empty">Nothing to review.</div>'}
    ${done.length?`<div class="section-title"><h2>Reviewed</h2><span>${done.length}</span></div><div class="two-col">${done.map(d=>card(d,true)).join('')}</div>`:''}
  </div>`;
}

function buildReport(){
  const open=data.decisions.filter(d=>!state.resolved.includes(d.id));
  const active=data.work.filter(w=>['In progress','In review'].includes(currentStatus('task',w.id)));
  const waiting=data.work.filter(w=>['Waiting','Needs decision'].includes(currentStatus('task',w.id)));
  const stamp=new Date().toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
  const html=`<div class="report-box" id="report-result"><p class="eyebrow">${esc(stamp)}</p><h2>Daily update</h2>
    <div class="stat-strip"><div class="stat"><strong>${active.length}</strong><span>In motion</span></div><div class="stat"><strong>${waiting.length}</strong><span>Waiting</span></div><div class="stat"><strong>${open.length}</strong><span>Decisions</span></div></div>
    <h3>Clients</h3><ul>${data.clients.map(c=>`<li><strong>${esc(c.name)}</strong> · ${esc(currentStatus('client',c.id))}</li>`).join('')}</ul>
    <h3>In motion</h3><ul>${active.length?active.map(w=>`<li>${esc(clientName(w.clientId))} · ${esc(w.title)} · ${esc(currentStatus('task',w.id))}</li>`).join(''):'<li>None</li>'}</ul>
    <h3>Waiting</h3><ul>${waiting.length?waiting.map(w=>`<li>${esc(clientName(w.clientId))} · ${esc(w.title)}</li>`).join(''):'<li>None</li>'}</ul>
    <h3>Decisions</h3><ul>${open.length?open.map(d=>`<li>${esc(clientName(d.clientId))} · ${esc(d.title)}</li>`).join(''):'<li>None</li>'}</ul></div>`;
  const plain=`Daily update · ${stamp}\n\nClients\n${data.clients.map(c=>`${c.name} · ${currentStatus('client',c.id)}`).join('\n')}\n\nIn motion\n${active.map(w=>`${clientName(w.clientId)} · ${w.title} · ${currentStatus('task',w.id)}`).join('\n')||'None'}\n\nWaiting\n${waiting.map(w=>`${clientName(w.clientId)} · ${w.title}`).join('\n')||'None'}\n\nDecisions\n${open.map(d=>`${clientName(d.clientId)} · ${d.title}`).join('\n')||'None'}`;
  return {html,plain};
}

function reportsPage(){
  return `<div class="page">${pageHead('Reports')}
    <div class="page-hero"><h2>Daily update</h2><div class="report-actions"><button class="btn primary" id="generate-report">Generate report</button></div></div>
    <div id="report-slot">${state.report?state.report.html+'<div class="report-actions"><button class="btn" id="copy-report">Copy text</button><button class="btn" id="download-report">Download text</button></div>':''}</div>
  </div>`;
}

function render(){
  $('#app').innerHTML=({clients:clientsPage,teammates:teammatesPage,decisions:decisionsPage,reports:reportsPage})[state.page]();
  document.querySelectorAll('[data-status-type]').forEach(select=>select.addEventListener('change',async e=>{
    const el=e.currentTarget,type=el.dataset.statusType,id=el.dataset.statusId,key=`${type}:${id}`,previous=currentStatus(type,id),status=el.value;
    el.disabled=true;
    const {error}=await db.from('workspace_statuses').upsert({record_type:type,record_id:id,status,updated_by:state.user.id},{onConflict:'record_type,record_id'});
    if(error){el.value=previous;el.disabled=false;toast('Could not save status');return;}
    state.statuses[key]=status;state.report=null;render();toast('Status saved');
  }));
  document.querySelectorAll('[data-client]').forEach(b=>b.addEventListener('click',()=>setPage('clients',b.dataset.client)));
  $('#back-clients')?.addEventListener('click',()=>setPage('clients'));
  $('#team-search')?.addEventListener('input',e=>{state.search=e.target.value;const pos=e.target.selectionStart;render();const input=$('#team-search');input.focus();input.setSelectionRange(pos,pos);});
  $('#add-video')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),title=String(f.get('title')).trim(),url=String(f.get('url')).trim();try{const u=new URL(url);if(u.protocol!=='https:')throw Error();}catch{toast('Use an https video link');return;}const button=form.querySelector('button');button.disabled=true;const {data:row,error}=await db.from('demo_videos').insert({user_id:state.user.id,client_id:state.client,title,url}).select('id').single();if(error){button.disabled=false;toast('Could not save video');return;}state.videos.push({id:row.id,clientId:state.client,title,url,format:'Video',sourceType:'Saved',views:null,note:''});render();toast('Video added');});
  document.querySelectorAll('[data-video]').forEach(b=>b.addEventListener('click',()=>{const v=allVideos().find(x=>x.id===b.dataset.video);if(!v)return;if(!v.url.includes('play.gumlet.io/embed/')){window.open(v.url,'_blank','noopener');return;}const d=$('#video-dialog');$('.modal-body',d).innerHTML=`<h2>${esc(v.title)}</h2><iframe src="${esc(v.url)}" title="${esc(v.title)}" allow="autoplay; fullscreen" allowfullscreen></iframe><p class="meta">${esc(v.note)}</p>`;d.showModal();}));
  document.querySelectorAll('[data-resolve]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.resolve,wasReviewed=state.resolved.includes(id);b.disabled=true;const result=wasReviewed?await db.from('reviewed_decisions').delete().eq('user_id',state.user.id).eq('decision_id',id):await db.from('reviewed_decisions').insert({user_id:state.user.id,decision_id:id});if(result.error){b.disabled=false;toast('Could not update decision');return;}state.resolved=wasReviewed?state.resolved.filter(x=>x!==id):[...state.resolved,id];render();}));
  $('#generate-report')?.addEventListener('click',()=>{state.report=buildReport();render();$('#report-result')?.scrollIntoView({behavior:'smooth',block:'start'});});
  $('#copy-report')?.addEventListener('click',()=>navigator.clipboard.writeText(state.report.plain).then(()=>toast('Report copied')));
  $('#download-report')?.addEventListener('click',()=>{const blob=new Blob([state.report.plain],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='realstudio-founder-update.txt';a.click();URL.revokeObjectURL(url);});
}

document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
$('.modal-close').addEventListener('click',()=>$('#video-dialog').close());
$('#video-dialog').addEventListener('close',()=>$('.modal-body').innerHTML='');
$('#sign-out').addEventListener('click',async()=>{await db.auth.signOut();state.user=null;state.videos=[];state.resolved=[];state.statuses={};state.report=null;renderAuth();});
Promise.all([fetch('data.json').then(r=>r.json()),fetch('team.json').then(r=>r.json())]).then(async([d,t])=>{
  data=d;team=t;
  const config=window.REALSTUDIO_SUPABASE;
  if(!config?.url||!config?.publishableKey){$('#app').innerHTML='<div class="auth-card"><div class="brand"><span class="brand-mark"></span><span>REALSTUDIO</span></div><h1>Setup in progress</h1><p>Supabase sign-in is being connected. Please check back shortly.</p></div>';return;}
  db=supabase.createClient(config.url,config.publishableKey);
  const {data:session,error}=await db.auth.getSession();
  if(error){renderAuth(error.message);return;}
  if(session.session?.user)await enterApp(session.session.user);else renderAuth();
  db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'&&state.user){state.user=null;renderAuth();}});
}).catch(()=>{$('#app').innerHTML='<div class="auth-card"><h1>Could not load the workspace</h1><p>Please refresh the page.</p></div>';});
