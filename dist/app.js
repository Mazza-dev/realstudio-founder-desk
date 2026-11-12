const $ = (s, root=document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, team, db;
const state = {
  page: 'clients', client: null, search: '',
  user: null, videos: [], resolved: [],
  report: null
};
const source = (url, text='Source ↗') => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const badge = (text, kind='') => `<span class="badge ${kind}">${esc(text)}</span>`;
const clientName = id => data.clients.find(c => c.id === id)?.name || id;
const allVideos = () => [...data.videos, ...state.videos];
function toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),2800);}

function renderAuth(message=''){
  document.body.classList.add('auth-locked');
  $('#app').innerHTML=`<div class="auth-card"><div class="brand"><span class="brand-mark"></span><span>REAL<span class="brand-light">STUDIO</span></span></div><p class="eyebrow">Founder desk · demo</p><h1>Sign in</h1><p>This sample dashboard uses Supabase accounts. Enter the email and password created for this demo.</p><form id="login-form"><label for="login-email">Email</label><input class="input" id="login-email" name="email" type="email" autocomplete="username" required><label for="login-password">Password</label><input class="input" id="login-password" name="password" type="password" autocomplete="current-password" required><button class="btn primary" type="submit">Sign in</button><p class="auth-error" role="alert">${esc(message)}</p></form><p class="auth-note">Access is by invitation. Public case information and team portraits are attributed to RealStudio; all work activity is sample data.</p></div>`;
  $('#login-form').addEventListener('submit',async e=>{
    e.preventDefault();const button=$('#login-form button');button.disabled=true;button.textContent='Signing in…';
    const f=new FormData(e.currentTarget);const {data:result,error}=await db.auth.signInWithPassword({email:String(f.get('email')).trim(),password:String(f.get('password'))});
    if(error){renderAuth(error.message);return;}await enterApp(result.user);
  });
}

async function enterApp(user){
  state.user=user;
  const [videos,reviewed]=await Promise.all([
    db.from('demo_videos').select('id,client_id,title,url,created_at').eq('user_id',user.id).order('created_at',{ascending:false}),
    db.from('reviewed_decisions').select('decision_id').eq('user_id',user.id)
  ]);
  if(videos.error||reviewed.error){renderAuth('The demo database is not ready yet. Please try again shortly.');return;}
  state.videos=videos.data.map(v=>({id:v.id,clientId:v.client_id,title:v.title,url:v.url,platform:'Public link',format:'Added for review',sourceType:'Added to demo',views:null,note:'Added by the reviewer. Platform metrics are not connected.'}));
  state.resolved=reviewed.data.map(d=>d.decision_id);
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

function pageHead(kicker,title,intro,side=''){
  return `<div class="page-header"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p class="page-intro">${intro}</p></div>${side}</div>`;
}

function clientsPage(){
  if(state.client) return clientDetail(state.client);
  const cards=data.clients.map(c=>`<article class="card client-card">
    <div class="card-top"><div><h3>${esc(c.name)}</h3><div class="meta">${esc(c.category)}</div></div>${badge(c.sampleStatus,c.sampleStatus==='Decision needed'?'amber':'')}</div>
    <div class="result">${esc(c.result)}</div><p>${esc(c.resultDetail)}</p>
    <div class="card-bottom"><span class="subtle">${esc(c.sampleOwner)} · sample workflow</span><button class="btn small" data-client="${esc(c.id)}">Open account ↗</button></div>
  </article>`).join('');
  const rows=data.work.map(w=>`<div class="list-row"><strong>${esc(w.title)}<br><span class="meta">${esc(clientName(w.clientId))}</span></strong><span>${esc(w.owner)}</span>${badge(w.status,w.status==='Needs decision'?'amber':w.status==='Waiting'?'muted':'green')}<span>${esc(w.due)}</span></div>`).join('');
  return `<div class="page">${pageHead('01 / Client work','Clients','The public case results are real. The work queue shows how I would keep delivery visible in a founder dashboard.')}
    <div class="notice"><strong>How to read this demo</strong> &nbsp;Case results and the two Toom videos come from RealStudio's public site. Owners, dates and task status below are sample workflow data.</div>
    <div class="section-title"><h2>Accounts in view</h2><span>3 public case studies</span></div><div class="three-col">${cards}</div>
    <div class="section-title"><h2>Work moving now</h2><span>Sample task feed</span></div><div class="list"><div class="list-row head"><span>Task / account</span><span>Owner</span><span>Status</span><span>Due</span></div>${rows}</div>
    <div class="section-title"><h2>Demo sources</h2></div><div class="two-col"><div class="card"><h3>Public evidence</h3><p class="meta">Case pages and videos are linked within each account. Headline numbers belong to the full case, not an individual video.</p></div><div class="card"><h3>Sample workflow</h3><p class="meta">The task feed is a small, fictional operating example. ${source('demo-feed.csv','Download the sample CSV ↗')}</p></div></div>
  </div>`;
}

function videoCard(v){
  const isEmbed=v.url.includes('play.gumlet.io/embed/');
  return `<article class="video-card"><div class="video-thumb"><button class="play" data-video="${esc(v.id)}" aria-label="${isEmbed?'Play':'Open'} ${esc(v.title)}">${isEmbed?'▶':'↗'}</button></div>
    <div class="video-info"><div class="card-top"><div><h3>${esc(v.title)}</h3><span class="meta">${esc(v.format||v.platform)}${v.length?' · '+esc(v.length):''}</span></div>${badge(v.sourceType,v.sourceType==='Public case'?'green':'muted')}</div>
    <p>${esc(v.note||'Added for review. Metrics have not been connected.')}</p><div class="card-bottom"><span class="subtle">${v.views==null?'Clip views not public':esc(v.views)+' views'}</span>${source(v.url,'Open original ↗')}</div></div></article>`;
}

function clientDetail(id){
  const c=data.clients.find(x=>x.id===id);if(!c)return clientsPage();
  const work=data.work.filter(x=>x.clientId===id);
  const vids=allVideos().filter(x=>x.clientId===id);
  return `<div class="page"><button class="back" id="back-clients">← All clients</button>${pageHead('01 / Account',esc(c.name),esc(c.category),source(c.source,'View RealStudio case ↗'))}
    <div class="page-hero"><p class="eyebrow">Public case result</p><h2>${esc(c.result)}</h2><p>${esc(c.resultDetail)}</p></div>
    <div class="three-col"><div class="card"><p class="eyebrow">Current focus · demo</p><h3>${esc(c.focus)}</h3></div><div class="card"><p class="eyebrow">Next deliverable · demo</p><h3>${esc(c.next)}</h3></div><div class="card"><p class="eyebrow">Sample owner</p><h3>${esc(c.sampleOwner)}</h3><span class="meta">Last sample update ${esc(c.lastUpdate)}</span></div></div>
    <div class="section-title"><h2>Video library</h2><span>${vids.length} saved</span></div>
    ${id==='toom'?'<p class="case-note"><strong>Views are not assigned to these clips.</strong> The public 4.5M total covers three campaign videos, while only two are shown here.</p>':''}
    ${vids.length?`<div class="video-grid">${vids.map(videoCard).join('')}</div>`:'<div class="empty">No public video link is attached to this case yet. Add a video below to show how a new review enters the queue.</div>'}
    <div class="section-title"><h2>Add a video</h2><span>Saved to your Supabase account</span></div>
    <div class="card"><p class="meta">Paste a public video URL and name it. This creates a review record; it does not pull private performance metrics.</p><form id="add-video" class="inline-form"><input name="title" class="input" placeholder="Video title" required maxlength="80"><input name="url" class="input" placeholder="https://…" type="url" required><button class="btn primary" type="submit">Add video</button></form></div>
    <div class="section-title"><h2>Work queue</h2><span>Sample workflow</span></div><div class="list"><div class="list-row head"><span>Task</span><span>Owner</span><span>Status</span><span>Due</span></div>${work.map(w=>`<div class="list-row"><strong>${esc(w.title)}<br><span class="meta">${esc(w.update)}</span></strong><span>${esc(w.owner)}</span>${badge(w.status,w.status==='Needs decision'?'amber':'green')}<span>${esc(w.due)}</span></div>`).join('')}</div>
  </div>`;
}

function teammatesPage(){
  const term=state.search.toLowerCase();const filtered=team.filter(p=>(p.name+' '+p.role).toLowerCase().includes(term));
  const updates=data.work.filter(w=>!term||(w.owner+' '+w.title+' '+clientName(w.clientId)).toLowerCase().includes(term));
  return `<div class="page">${pageHead('02 / People','Teammates','RealStudio names, photos and titles are taken from its public team roster. The demo work queue is organized by role and does not claim these people posted updates.',`<input class="search" id="team-search" type="search" placeholder="Find a person or role" value="${esc(state.search)}" aria-label="Search teammates">`)}
    <div class="notice"><strong>Public roster</strong> &nbsp;These are current profiles shown on RealStudio's website. The sample tasks elsewhere in this demo are Tolani's example of an operating system, not a record of staff activity. ${source('https://real-studio.de/studio','View team ↗')}</div>
    <div class="section-title"><h2>Example handoffs by function</h2><span>Sample workflow</span></div>
    ${updates.length?`<div class="list"><div class="list-row head"><span>Next commitment</span><span>Function</span><span>Status</span><span>Due</span></div>${updates.map(w=>`<div class="list-row"><strong>${esc(w.title)}<br><span class="meta">${esc(clientName(w.clientId))} · ${esc(w.update)}</span></strong><span>${esc(w.owner)}</span>${badge(w.status,w.status==='Needs decision'?'amber':w.status==='Waiting'?'muted':'green')}<span>${esc(w.due)}</span></div>`).join('')}</div>`:'<div class="empty">No sample handoffs match this search.</div>'}
    <div class="section-title"><h2>Team</h2><span>${filtered.length} of ${team.length} people</span></div>
    <div class="team-grid">${filtered.map(p=>`<article class="card person"><img src="${esc(p.image)}" alt="Portrait of ${esc(p.name)}" loading="lazy"><div class="person-details"><h3>${esc(p.name)}</h3><div class="meta">${esc(p.role)}</div><div class="source">Public team profile · ${source(p.source,'Source ↗')}</div></div></article>`).join('')}</div>
  </div>`;
}

function decisionsPage(){
  const open=data.decisions.filter(d=>!state.resolved.includes(d.id));
  const done=data.decisions.filter(d=>state.resolved.includes(d.id));
  const card=(d,resolved=false)=>`<article class="card decision"><div><div class="card-top"><span class="meta">${esc(clientName(d.clientId))} · ${esc(d.sourceType)}</span>${badge(resolved?'Reviewed':'Needs review',resolved?'green':'amber')}</div><h3 style="margin-top:13px">${esc(d.title)}</h3><p>${esc(d.detail)}</p><p class="rec"><strong>Suggested next step</strong><br>${esc(d.recommendation)}</p><div class="card-bottom"><span class="subtle">${esc(d.owner)} · ${esc(d.due)} · ${source(data.clients.find(c=>c.id===d.clientId).source,'Public case ↗')}</span><button class="btn small ${resolved?'ghost':''}" data-resolve="${esc(d.id)}">${resolved?'Reopen':'Mark reviewed'}</button></div></div></article>`;
  return `<div class="page">${pageHead('03 / Decisions','Founder decisions','Only the choices that need a person. Each recommendation tells you which public result it draws on and what is still missing.')}
    <div class="notice"><strong>Sample decision queue</strong> &nbsp;These recommendations are Tolani's proposed workflow. They are not requests from RealStudio or its clients.</div>
    <div class="section-title"><h2>Needs review</h2><span>${open.length} open</span></div>${open.length?`<div class="two-col">${open.map(d=>card(d)).join('')}</div>`:'<div class="empty">All sample decisions are marked reviewed.</div>'}
    ${done.length?`<div class="section-title"><h2>Reviewed</h2><span>${done.length}</span></div><div class="two-col">${done.map(d=>card(d,true)).join('')}</div>`:''}
  </div>`;
}

function buildReport(){
  const open=data.decisions.filter(d=>!state.resolved.includes(d.id));
  const today=data.asOf;
  const due=data.work.filter(w=>w.due==='2026-11-13');
  const added=state.videos.length;
  const stamp=new Date().toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
  const html=`<div class="report-box" id="report-result"><p class="eyebrow">Generated ${esc(stamp)}</p><h2>Founder update · sample feed for ${esc(today)}</h2>
    <p>This is a generated summary of the public case data and clearly marked demo records in this dashboard. It is not a live RealStudio report.</p>
    <div class="stat-strip"><div class="stat"><strong>${data.clients.length}</strong><span>Public client cases</span></div><div class="stat"><strong>${data.videos.length+added}</strong><span>Video links in this account</span></div><div class="stat"><strong>${open.length}</strong><span>Sample decisions open</span></div></div>
    <h3>Client work</h3><ul>${data.clients.map(c=>`<li><strong>${esc(c.name)}</strong> · ${esc(c.resultDetail)} ${source(c.source,'Case ↗')} Next sample step · ${esc(c.next)}.</li>`).join('')}</ul>
    <h3>Videos and creators</h3><p>${data.videos.length} verified showcase video links from the Toom case${added?`, plus ${added} video link${added===1?'':'s'} added to this account`:''}. No individual video views, creator-level results, or new creator posts are available. The case's 4.5M views cannot be split between the two clips. ${source(data.clients[0].source,'Toom source ↗')}</p>
    <h3>Team and blockers</h3><p>${data.work.length} sample tasks are in the queue. ${data.work.filter(w=>w.status==='Waiting').length} is waiting for data and ${data.work.filter(w=>w.status==='Needs decision').length} needs a decision. These are demo statuses, not staff updates. ${source('demo-feed.csv','Sample feed ↗')}</p>
    <h3>Decisions required</h3><ul>${open.length?open.map(d=>`<li><strong>${esc(clientName(d.clientId))}</strong> · ${esc(d.title)} ${source(data.clients.find(c=>c.id===d.clientId).source,'Case ↗')}</li>`).join(''):'<li>No sample decisions remain open.</li>'}</ul>
    <h3>Next commitments in the sample feed</h3><ul>${due.map(w=>`<li>${esc(clientName(w.clientId))} · ${esc(w.title)} · ${esc(w.owner)}</li>`).join('')}</ul>
    <p class="subtle">To make this live, RealStudio would need to authorize its Slack, video, shop and analytics sources. This demo uses no access to those systems.</p></div>`;
  const plain=`Founder update · sample feed for ${today}\nGenerated ${stamp}\n\n${data.clients.length} public case studies. ${data.videos.length+added} video links. ${open.length} sample decisions open.\n\nClient work\n${data.clients.map(c=>`${c.name}: ${c.resultDetail} Next sample step: ${c.next}. Source: ${c.source}`).join('\n')}\n\nTeam and blockers\n${data.work.length} sample tasks. ${data.work.filter(w=>w.status==='Waiting').length} waiting for data. ${data.work.filter(w=>w.status==='Needs decision').length} needs a decision.\n\nDecisions\n${open.map(d=>`${clientName(d.clientId)}: ${d.title}`).join('\n')||'None open'}\n\nNext sample commitments\n${due.map(w=>`${clientName(w.clientId)}: ${w.title} (${w.owner})`).join('\n')}\n\nPublic case data and demo workflow; not a live RealStudio report.`;
  return {html,plain};
}

function reportsPage(){
  return `<div class="page">${pageHead('04 / Daily readout','Reports','One button turns the current case links, saved videos, sample work queue and open decisions into a short founder update.')}
    <div class="page-hero"><p class="eyebrow">One useful report</p><h2>Generate the daily readout</h2><p>Runs on the data visible here. It will not send a message or invent private sales, video or teammate metrics.</p><div class="report-actions"><button class="btn primary" id="generate-report">Generate report ↗</button><a class="btn ghost" href="demo-feed.csv" download>Download sample feed</a></div></div>
    <div class="two-col"><div class="card"><h3>Included now</h3><p class="meta">Three public cases, two public Toom clips, video links saved to your Supabase account, sample task statuses and founder decisions.</p></div><div class="card"><h3>Needed for a live version</h3><p class="meta">Authorized client analytics, shop results, video accounts and Slack updates. No connection to RealStudio's systems is implied here.</p></div></div>
    <div id="report-slot">${state.report?state.report.html+'<div class="report-actions"><button class="btn" id="copy-report">Copy text</button><button class="btn" id="download-report">Download text</button></div>':''}</div>
  </div>`;
}

function render(){
  $('#app').innerHTML=({clients:clientsPage,teammates:teammatesPage,decisions:decisionsPage,reports:reportsPage})[state.page]();
  document.querySelectorAll('[data-client]').forEach(b=>b.addEventListener('click',()=>setPage('clients',b.dataset.client)));
  $('#back-clients')?.addEventListener('click',()=>setPage('clients'));
  $('#team-search')?.addEventListener('input',e=>{state.search=e.target.value;const pos=e.target.selectionStart;render();const input=$('#team-search');input.focus();input.setSelectionRange(pos,pos);});
  $('#add-video')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),title=String(f.get('title')).trim(),url=String(f.get('url')).trim();try{const u=new URL(url);if(u.protocol!=='https:')throw Error();}catch{toast('Use an https video link');return;}const button=form.querySelector('button');button.disabled=true;const {data:row,error}=await db.from('demo_videos').insert({user_id:state.user.id,client_id:state.client,title,url}).select('id').single();if(error){button.disabled=false;toast('Could not save video');return;}state.videos.push({id:row.id,clientId:state.client,title,platform:'Public link',url,format:'Added for review',sourceType:'Added to demo',views:null,note:'Added by the reviewer. Platform metrics are not connected.'});render();toast('Video added to this account');});
  document.querySelectorAll('[data-video]').forEach(b=>b.addEventListener('click',()=>{const v=allVideos().find(x=>x.id===b.dataset.video);if(!v)return;if(!v.url.includes('play.gumlet.io/embed/')){window.open(v.url,'_blank','noopener');return;}const d=$('#video-dialog');$('.modal-body',d).innerHTML=`<h2>${esc(v.title)}</h2><iframe src="${esc(v.url)}" title="${esc(v.title)}" allow="autoplay; fullscreen" allowfullscreen></iframe><p class="meta">${esc(v.note)}</p>`;d.showModal();}));
  document.querySelectorAll('[data-resolve]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.resolve,wasReviewed=state.resolved.includes(id);b.disabled=true;const result=wasReviewed?await db.from('reviewed_decisions').delete().eq('user_id',state.user.id).eq('decision_id',id):await db.from('reviewed_decisions').insert({user_id:state.user.id,decision_id:id});if(result.error){b.disabled=false;toast('Could not update decision');return;}state.resolved=wasReviewed?state.resolved.filter(x=>x!==id):[...state.resolved,id];render();}));
  $('#generate-report')?.addEventListener('click',()=>{state.report=buildReport();render();$('#report-result')?.scrollIntoView({behavior:'smooth',block:'start'});});
  $('#copy-report')?.addEventListener('click',()=>navigator.clipboard.writeText(state.report.plain).then(()=>toast('Report copied')));
  $('#download-report')?.addEventListener('click',()=>{const blob=new Blob([state.report.plain],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='realstudio-founder-update.txt';a.click();URL.revokeObjectURL(url);});
}

document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
$('.modal-close').addEventListener('click',()=>$('#video-dialog').close());
$('#video-dialog').addEventListener('close',()=>$('.modal-body').innerHTML='');
$('#current-date').textContent=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
$('#sign-out').addEventListener('click',async()=>{await db.auth.signOut();state.user=null;state.videos=[];state.resolved=[];state.report=null;renderAuth();});
Promise.all([fetch('data.json').then(r=>r.json()),fetch('team.json').then(r=>r.json())]).then(async([d,t])=>{
  data=d;team=t;
  const config=window.REALSTUDIO_SUPABASE;
  if(!config?.url||!config?.publishableKey){$('#app').innerHTML='<div class="auth-card"><div class="brand"><span class="brand-mark"></span><span>REALSTUDIO</span></div><h1>Setup in progress</h1><p>Supabase sign-in is being connected. Please check back shortly.</p></div>';return;}
  db=supabase.createClient(config.url,config.publishableKey);
  const {data:session,error}=await db.auth.getSession();
  if(error){renderAuth(error.message);return;}
  if(session.session?.user)await enterApp(session.session.user);else renderAuth();
  db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'&&state.user){state.user=null;renderAuth();}});
}).catch(()=>{$('#app').innerHTML='<div class="auth-card"><h1>Could not load the demo</h1><p>Please refresh the page.</p></div>';});
