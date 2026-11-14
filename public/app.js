const $ = (s, root=document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, team;
const state = {
  page: 'clients', client: null, search: '',
  videos: [], resolved: [], statuses: {}, statusUpdated: {}, reviewedAt: {},
  report: null, generating: false
};
const storageKey = 'realstudio-founder-desk-v1';
function saveChanges(){
  try { localStorage.setItem(storageKey,JSON.stringify({videos:state.videos,resolved:state.resolved,statuses:state.statuses,statusUpdated:state.statusUpdated,reviewedAt:state.reviewedAt})); }
  catch { toast('Could not save changes in this browser'); }
}
function loadChanges(){
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');
    state.videos=Array.isArray(saved.videos)?saved.videos:[];
    state.resolved=Array.isArray(saved.resolved)?saved.resolved:[];
    state.statuses=saved.statuses&&typeof saved.statuses==='object'?saved.statuses:{};
    state.statusUpdated=saved.statusUpdated&&typeof saved.statusUpdated==='object'?saved.statusUpdated:{};
    state.reviewedAt=saved.reviewedAt&&typeof saved.reviewedAt==='object'?saved.reviewedAt:{};
  } catch { /* Use the default view if browser storage is unavailable. */ }
}
const source = (url, text='Source ↗') => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const badge = (text, kind='') => `<span class="badge ${kind}">${esc(text)}</span>`;
const clientName = id => data.clients.find(c => c.id === id)?.name || id;
const allVideos = () => [...data.videos, ...state.videos];
const currentStatus = (type, id) => state.statuses[`${type}:${id}`] || 'To plan';
const statusOptions = ['To plan','In progress','In review','Waiting','Needs decision','Done'];
const statusSelect = (type,id) => `<select class="status-select" data-status-type="${type}" data-status-id="${esc(id)}" aria-label="Change status">${statusOptions.map(s=>`<option value="${s}" ${currentStatus(type,id)===s?'selected':''}>${s}</option>`).join('')}</select>`;
function toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),2800);}

function enterApp(){
  loadChanges();
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

function reportPayload(){
  return {
    generatedAt:new Date().toISOString(),timeZone:'Europe/Berlin',
    clients:data.clients.map(c=>({id:c.id,name:c.name,category:c.category,result:c.result,resultDetail:c.resultDetail,focus:c.focus,next:c.next,status:currentStatus('client',c.id),statusUpdatedAt:state.statusUpdated[`client:${c.id}`]||null})),
    work:data.work.map(w=>({id:w.id,client:clientName(w.clientId),title:w.title,function:w.owner,status:currentStatus('task',w.id),statusUpdatedAt:state.statusUpdated[`task:${w.id}`]||null,due:w.due})),
    decisions:data.decisions.map(d=>({id:d.id,client:clientName(d.clientId),title:d.title,detail:d.detail,recommendation:d.recommendation,function:d.owner,reviewed:state.resolved.includes(d.id),reviewedAt:state.reviewedAt[d.id]||null})),
    videos:allVideos().map(v=>({client:clientName(v.clientId),title:v.title,url:v.url,format:v.format,views:v.views,createdAt:v.createdAt||null})),
    team:team.map(p=>({name:p.name,role:p.role}))
  };
}

function localReport(){
  const input=reportPayload();
  const day=value=>value?new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)):null;
  const today=day(new Date().toISOString());
  const changes=[
    ...input.clients.filter(c=>day(c.statusUpdatedAt)===today).map(c=>`${c.name} is ${c.status.toLowerCase()}.`),
    ...input.work.filter(w=>day(w.statusUpdatedAt)===today).map(w=>`${w.title} is ${w.status.toLowerCase()}.`),
    ...input.videos.filter(v=>day(v.createdAt)===today).map(v=>`${v.title} was added to ${v.client}.`)
  ];
  const open=input.decisions.filter(d=>!d.reviewed);
  return `Today\n${changes.length?changes.join('\n'):'No updates were recorded today.'}\n\nOpen decisions\n${open.length?open.map(d=>`${d.client}: ${d.title}`).join('\n'):'None.'}\n\nNext\n${open.length?`Review ${open[0].title.toLowerCase()}.`:'Check the work queue for the next update.'}`;
}

function reportsPage(){
  return `<div class="page">${pageHead('Reports')}
    <div class="page-hero"><h2>Daily update</h2><div class="report-actions"><button class="btn primary" id="generate-report" ${state.generating?'disabled':''}>${state.generating?'Generating…':'Generate report'}</button></div></div>
    <div id="report-slot">${state.report?`<div class="report-box" id="report-result"><pre class="report-text">${esc(state.report.plain)}</pre></div><div class="report-actions"><button class="btn" id="copy-report">Copy text</button><button class="btn" id="download-report">Download text</button></div>`:''}</div>
  </div>`;
}

function render(){
  $('#app').innerHTML=({clients:clientsPage,teammates:teammatesPage,decisions:decisionsPage,reports:reportsPage})[state.page]();
  document.querySelectorAll('[data-status-type]').forEach(select=>select.addEventListener('change',async e=>{
    const el=e.currentTarget,type=el.dataset.statusType,id=el.dataset.statusId,key=`${type}:${id}`,status=el.value;
    const updatedAt=new Date().toISOString();
    state.statuses[key]=status;state.statusUpdated[key]=updatedAt;state.report=null;saveChanges();render();toast('Status saved');
  }));
  document.querySelectorAll('[data-client]').forEach(b=>b.addEventListener('click',()=>setPage('clients',b.dataset.client)));
  $('#back-clients')?.addEventListener('click',()=>setPage('clients'));
  $('#team-search')?.addEventListener('input',e=>{state.search=e.target.value;const pos=e.target.selectionStart;render();const input=$('#team-search');input.focus();input.setSelectionRange(pos,pos);});
  $('#add-video')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget),title=String(f.get('title')).trim(),url=String(f.get('url')).trim();try{const u=new URL(url);if(u.protocol!=='https:')throw Error();}catch{toast('Use an https video link');return;}state.videos.push({id:crypto.randomUUID(),clientId:state.client,title,url,createdAt:new Date().toISOString(),format:'Video',sourceType:'Saved',views:null,note:''});saveChanges();render();toast('Video added');});
  document.querySelectorAll('[data-video]').forEach(b=>b.addEventListener('click',()=>{const v=allVideos().find(x=>x.id===b.dataset.video);if(!v)return;if(!v.url.includes('play.gumlet.io/embed/')){window.open(v.url,'_blank','noopener');return;}const d=$('#video-dialog');$('.modal-body',d).innerHTML=`<h2>${esc(v.title)}</h2><iframe src="${esc(v.url)}" title="${esc(v.title)}" allow="autoplay; fullscreen" allowfullscreen></iframe><p class="meta">${esc(v.note)}</p>`;d.showModal();}));
  document.querySelectorAll('[data-resolve]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.resolve,wasReviewed=state.resolved.includes(id);state.resolved=wasReviewed?state.resolved.filter(x=>x!==id):[...state.resolved,id];if(wasReviewed)delete state.reviewedAt[id];else state.reviewedAt[id]=new Date().toISOString();state.report=null;saveChanges();render();}));
  $('#generate-report')?.addEventListener('click',async()=>{
    state.generating=true;state.report=null;render();
    try{
      const response=await fetch('/api/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(reportPayload())});
      const result=await response.json();if(!response.ok||!result.report)throw Error(result.error||'Could not generate report');
      state.report={plain:result.report};
    }catch{state.report={plain:localReport()};}
    state.generating=false;render();$('#report-result')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('#copy-report')?.addEventListener('click',()=>navigator.clipboard.writeText(state.report.plain).then(()=>toast('Report copied')));
  $('#download-report')?.addEventListener('click',()=>{const blob=new Blob([state.report.plain],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='realstudio-founder-update.txt';a.click();URL.revokeObjectURL(url);});
}

document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
$('.modal-close').addEventListener('click',()=>$('#video-dialog').close());
$('#video-dialog').addEventListener('close',()=>$('.modal-body').innerHTML='');
Promise.all([fetch('data.json').then(r=>r.json()),fetch('team.json').then(r=>r.json())]).then(async([d,t])=>{
  data=d;team=t;
  enterApp();
}).catch(()=>{$('#app').innerHTML='<div class="auth-card"><h1>Could not load the workspace</h1><p>Please refresh the page.</p></div>';});
