const types={conference:'会议',competition:'竞赛',activity:'活动 / 训练营'};
let data=null,type='all',query='',limit=6;
const list=document.querySelector('#event-list');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?escapeHtml(url.href):'#';}catch{return '#';}}
function localDate(now,zone){const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
function pending(point,event,now){return point.dayOnly?point.at.slice(0,10)>=localDate(now,event.timezone):Date.parse(point.at)>now.getTime();}
function nextPoint(event,now){return event.timeline.find(p=>pending(p,event,now));}
function dateLabel(point,event){if(point.dayOnly)return point.at.slice(0,10);return new Intl.DateTimeFormat('zh-CN',{timeZone:event.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(point.at));}
function countdown(point,event,now){if(!point)return '历史记录';if(point.dayOnly){const days=Math.round((Date.parse(point.at.slice(0,10)+'T00:00:00Z')-Date.parse(localDate(now,event.timezone)+'T00:00:00Z'))/86400000);return days===0?'就在今天':`还有 ${days} 天`;}const hours=Math.ceil((Date.parse(point.at)-now.getTime())/3600000);return hours>=24?`还有 ${Math.floor(hours/24)} 天 ${hours%24} 小时`:`还有 ${hours} 小时`;}
function matchesScope(e){const scope=document.querySelector('#event-scope').value;return scope==='all'||(scope==='online'?!!e.sourceKey:!e.sourceKey);}
function opportunityState(event, now=new Date()) {
  if(event.availability==='closed')return 'history';
  if(event.availability==='needs_verification')return 'uncertain';
  if(event.availability==='open_ended') {
    const checked=Date.parse(`${event.verifiedOn}T00:00:00+08:00`);
    return Number.isFinite(checked)&&now.getTime()-checked<=30*86400000&&now.getTime()>=checked?'open':'uncertain';
  }
  if(nextPoint(event,now))return 'scheduled';
  if(event.timeline.length===1&&/开始|启动|开营|发布/.test(event.timeline[0].comment))return 'uncertain';
  return 'history';
}
function inView(event,view,now){const state=opportunityState(event,now);return view==='current'?(state==='scheduled'||state==='open'):state===view;}
function lastPointTime(event){return event.timeline.length?Date.parse(event.timeline.at(-1).at):0;}
function cardBadge(event,now){return event.state==='open'?'长期开放':event.state==='uncertain'?'状态待核实':event.state==='history'?'历史记录':countdown(event.next,event,now);}
function render(){
  if(!data)return;
  const now=new Date(),view=document.querySelector('#event-view').value;
  const basis=data.items.filter(e=>inView(e,view,now)&&matchesScope(e));
  const items=basis.filter(e=>(type==='all'||e.category===type)&&`${e.title} ${e.description} ${e.place} ${e.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).map(e=>({...e,next:nextPoint(e,now),state:opportunityState(e,now)}));
  items.sort((a,b)=>view==='history'?lastPointTime(b)-lastPointTime(a):view==='uncertain'?String(b.verifiedOn||'').localeCompare(a.verifiedOn||''):(a.next?Date.parse(a.next.at):Infinity)-(b.next?Date.parse(b.next.at):Infinity));
  const labels={current:'当前与长期',open:'长期开放',uncertain:'状态待核实',history:'历史记录'};
  document.querySelector('#event-count').textContent=`${labels[view]} · ${items.length} 项`;
  list.innerHTML=items.slice(0,limit).map(e=>{
    const stateNote=e.availability==='open_ended'&&e.state==='uncertain'?'此长期机会已超过 30 天未复核，需确认当前申请状态。':(e.statusNote||(e.state==='uncertain'?'这条记录缺少明确结束或截止信息，当前状态尚不能确认。':null));
    return `<article class="entry event-card"><div class="entry-heading"><span class="event-type">${escapeHtml(types[e.category]||'活动')}</span><h3>${escapeHtml(e.title)}</h3><span class="badge countdown ${e.state==='uncertain'?'badge-uncertain':''}">${escapeHtml(cardBadge(e,now))}</span></div><p class="entry-description">${escapeHtml(e.description)}</p>${stateNote?`<p class="status-note">${escapeHtml(stateNote)}</p>`:''}<div class="entry-meta"><span>${escapeHtml(e.place)}</span><span>${escapeHtml(e.timezone)}</span>${e.tags.slice(0,3).map(t=>`<span>#${escapeHtml(t)}</span>`).join('')}</div><div class="entry-actions"><a class="action primary" href="${safeUrl(e.link)}" target="_blank" rel="noopener noreferrer">查看官方说明 ↗</a>${e.state==='scheduled'&&e.next?`<button class="action calendar-button" data-id="${escapeHtml(e.id)}">导出日历 ↓</button>`:''}</div><details class="timeline"><summary>时间线与来源</summary>${e.timeline.length?`<ul>${e.timeline.map(p=>`<li><strong>${escapeHtml(p.comment)}</strong> · ${escapeHtml(dateLabel(p,e))}</li>`).join('')}</ul>`:'<p>官方未公布固定的统一报名截止节点。</p>'}<p>来源：<a href="${safeUrl(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(e.sourceName)} ↗</a>${e.verifiedOn?` · 核对于 ${escapeHtml(e.verifiedOn)}`:e.retrievedOn?` · 抓取于 ${escapeHtml(e.retrievedOn)}`:' · 社区收录，参与前请核对官网'}</p><p>安排：${escapeHtml(e.date)}</p></details></article>`;
  }).join('');
  if(!items.length)list.innerHTML=`<p class="event-empty">${view==='uncertain'?'当前筛选下没有待核实记录。':view==='open'?'当前筛选下没有经近期核对的长期机会。':view==='history'?'当前筛选下没有历史记录。':'当前筛选下暂无日程或长期机会，可切换“状态待核实”或“历史记录”查看其他条目。'}</p>`;
  document.querySelector('#more-events').hidden=items.length<=limit;
  document.querySelectorAll('[data-type]').forEach(b=>{const n=b.dataset.type==='all'?basis.length:basis.filter(e=>e.category===b.dataset.type).length;b.textContent=(b.dataset.type==='all'?'全部':types[b.dataset.type])+` (${n})`;});
}
async function loadEvents(){try{const response=await fetch('data/events.json');if(!response.ok)throw new Error('HTTP '+response.status);const payload=await response.json();if(!Array.isArray(payload.items))throw new Error('Invalid data');data=payload;const stamp=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(data.syncedAt));const age=Date.now()-Date.parse(data.syncedAt);const stale=(data.sourceReports||[]).filter(x=>x.status!=='ok');document.querySelector('#data-status').textContent=`数据同步：${stamp} · 时间以活动当地时区为准${age>7*86400000?' · 数据超过 7 天未更新，请以官网为准':''}${stale.length?' · 部分来源同步失败，保留此前快照':''}`;document.querySelector('#source-version').textContent=`上游版本：${data.upstreamCommit.slice(0,8)} · 上游提交：${data.upstreamUpdatedAt.slice(0,10)}。共收录 ${data.items.length} 条历史与当前记录。平台赛程仅同步未来 90 天已公布的比赛；可通过社区邮件补充其他活动。`;render();}catch(error){document.querySelector('#data-status').textContent='活动数据暂时加载失败，请刷新页面重试。';document.querySelector('#event-count').textContent='加载失败';list.innerHTML='<p class="event-empty"><a href="https://oseddl.openatom.club/" target="_blank" rel="noopener noreferrer">前往参考活动站查看 ↗</a></p>';}}
document.querySelectorAll('[data-type]').forEach(button=>button.addEventListener('click',()=>{type=button.dataset.type;limit=6;document.querySelectorAll('[data-type]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();}));document.querySelector('#event-view').addEventListener('change',()=>{limit=6;render();});document.querySelector('#event-scope').addEventListener('change',()=>{limit=6;render();});document.querySelector('#event-search').addEventListener('input',event=>{query=event.target.value.trim();limit=6;render();});document.querySelector('#more-events').addEventListener('click',()=>{limit+=6;render();});
function icsText(value){return String(value).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function makeCalendar(event){const now=new Date(),point=nextPoint(event,now);if(!point||opportunityState(event,now)!=='scheduled')throw new Error('No confirmed future calendar node');const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const start=point.dayOnly?'DTSTART;VALUE=DATE:'+point.at.slice(0,10).replace(/-/g,''):'DTSTART:'+new Date(point.at).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LZUOSS//Open Source Events//ZH','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${event.id}-${point.at.slice(0,10)}@lzuoss-events`,`DTSTAMP:${stamp}`,start,`SUMMARY:${icsText(event.title+' · '+point.comment)}`,`DESCRIPTION:${icsText(event.description+'\n活动时区：'+event.timezone+'\n来源：'+event.sourceUrl)}`,`URL:${event.link}`,`LOCATION:${icsText(event.place)}`,'END:VEVENT','END:VCALENDAR'];const encoder=new TextEncoder();return lines.flatMap(line=>{const folded=[];let current='';for(const c of line){if(encoder.encode(current+c).length>73){folded.push(current);current=' '+c;}else current+=c;}folded.push(current);return folded;}).join('\r\n')+'\r\n';}
list.addEventListener('click',event=>{const button=event.target.closest('.calendar-button');if(!button)return;const item=data.items.find(e=>e.id===button.dataset.id);if(!item)return;const url=URL.createObjectURL(new Blob([makeCalendar(item)],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=item.id+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
loadEvents();setInterval(()=>{if(data&&!list.contains(document.activeElement)&&!list.querySelector('details[open]'))render();},60000);
