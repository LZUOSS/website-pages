export const dayKey = value => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function monthDays(year, month) {
  const offset = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return Array.from({length:42}, (_, i) => new Date(Date.UTC(year, month, 1 - offset + i)).toISOString().slice(0,10));
}
export function eventsOn(events, key) {
  return events.filter(e => {
    if (e.status === 'cancelled') return false;
    if (e.allDay) return e.start <= key && key < e.end;
    return dayKey(e.start) <= key && key <= dayKey(new Date(new Date(e.end).getTime()-1));
  }).sort((a,b)=>a.start.localeCompare(b.start));
}
