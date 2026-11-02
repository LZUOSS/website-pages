import {dayKey, monthDays, eventsOn} from './calendar-core.js';
const $ = id => document.getElementById(id);
const today = dayKey(Date.now());
let year = +today.slice(0,4), month = +today.slice(5,7)-1, selected = today, list = false, events = [];
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayDay = key => `${+key.slice(5,7)} 月 ${+key.slice(8)} 日`;
const displayTime = value => new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
const feed = new URL('data/community-calendar.ics',location.href).href;
$('cal-feed').value = feed;
$('cal-google').href = 'https://calendar.google.com/calendar/u/0/r?cid='+encodeURIComponent(feed);
$('cal-copy').addEventListener('click', async () => {
  try {await navigator.clipboard.writeText(feed); $('cal-copy-status').textContent='订阅链接已复制，粘贴到日历的“通过网址订阅”中即可。';}
  catch {$('cal-feed').focus(); $('cal-feed').select(); $('cal-copy-status').textContent='请复制上方已选中的订阅地址。';}
});
function render() {
  $('cal-month').textContent = `${year} / ${String(month+1).padStart(2,'0')}`;
  $('cal-grid').hidden = list;
  $('cal-month-view').setAttribute('aria-pressed',String(!list));
  $('cal-list-view').setAttribute('aria-pressed',String(list));
  $('cal-month-view').classList.toggle('selected',!list); $('cal-list-view').classList.toggle('selected',list);
  const days = monthDays(year, month);
  $('cal-grid').innerHTML = ['日','一','二','三','四','五','六'].map(d=>`<span class="calendar-weekday">${d}</span>`).join('') + days.map(key=>{
    const matches=eventsOn(events,key), inMonth=+key.slice(5,7)===month+1;
    return `<button class="calendar-day ${inMonth?'':'outside'} ${key===today?'is-today':''} ${key===selected?'is-selected':''}" data-day="${key}" aria-pressed="${key===selected}" aria-label="${key}${key===today?'，今天':''}，${matches.length} 项活动"><span class="calendar-day-number">${+key.slice(8)}</span>${matches.slice(0,2).map(e=>`<span class="calendar-event-chip">${escape(e.title)}</span>`).join('')}${matches.length>2?`<span class="calendar-more">+${matches.length-2}</span>`:''}${matches.length?'<i class="calendar-mobile-dot"></i>':''}</button>`;
  }).join('');
  const monthPrefix=`${year}-${String(month+1).padStart(2,'0')}`;
  const matching=list ? events.filter(e=>monthDays(year,month).filter(k=>k.startsWith(monthPrefix)).some(k=>eventsOn([e],k).length)) : eventsOn(events,selected);
  matching.sort((a,b)=>a.start.localeCompare(b.start));
  $('cal-agenda-title').textContent=list?`${month+1} 月日程`:`${displayDay(selected)} · 活动安排`;
  $('cal-count').textContent=`${matching.length} 项`;
  $('cal-events').innerHTML=matching.length ? matching.map(e=>{
    const url=/^https?:\/\//.test(e.url||'')?e.url:null;
    const time=e.allDay?`${displayDay(e.start)} · ${e.timeTbd?'具体时间待定':'全天'}${e.end>new Date(new Date(e.start+'T00:00:00Z').getTime()+86400000).toISOString().slice(0,10)?' / 多日活动':''}`:`${displayTime(e.start)} — ${displayTime(e.end)}`;
    return `<article class="calendar-event-detail"><span class="badge">${escape(e.category||'社区活动')}</span><h3>${escape(e.title)}</h3><p class="calendar-event-time">${escape(time)}</p>${e.location?`<p>地点：${escape(e.location)}</p>`:''}${e.description?`<p class="calendar-description">${escape(e.description)}</p>`:''}${url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">查看活动公告 ↗</a>`:''}</article>`;
  }).join('') : `<div class="calendar-empty"><span aria-hidden="true">＋</span><div><h3>${events.length?'这段时间暂时没有活动':'暂无已公布的社区活动'}</h3><p>${events.length?'换个日期看看，或订阅日历等待新安排。':'新的相聚正在酝酿。排期确认后，会在这里与大家见面。'}</p></div></div>`;
}
$('cal-grid').addEventListener('click',event=>{
  const button=event.target.closest('[data-day]'); if(!button)return;
  selected=button.dataset.day; year=+selected.slice(0,4); month=+selected.slice(5,7)-1; render();
  $('cal-grid').querySelector(`[data-day="${selected}"]`)?.focus();
});
function move(delta) {const d=new Date(Date.UTC(year,month+delta,1)); year=d.getUTCFullYear();month=d.getUTCMonth();selected=d.toISOString().slice(0,10);render();}
$('cal-prev').addEventListener('click',()=>move(-1)); $('cal-next').addEventListener('click',()=>move(1));
$('cal-today').addEventListener('click',()=>{year=+today.slice(0,4);month=+today.slice(5,7)-1;selected=today;render();});
$('cal-month-view').addEventListener('click',()=>{list=false;render();}); $('cal-list-view').addEventListener('click',()=>{list=true;render();});
try {
  const response=await fetch('data/community-calendar.json');if(!response.ok)throw Error('load');
  const data=await response.json();if(!Array.isArray(data.events))throw Error('format');events=data.events;
  $('cal-status').textContent='';$('cal-status').hidden=true;render();
} catch {render();$('cal-status').textContent='日历暂时无法加载，请刷新重试。活动信息可联系社区确认。';$('cal-events').innerHTML='<p>活动数据加载失败。</p>';}
