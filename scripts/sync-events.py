#!/usr/bin/env python3
"""Fetch a pinned upstream YAML snapshot and merge locally verified announcements.
Usage: python3 scripts/sync-events.py (requires PyYAML; frontend needs no dependency).
Any request/parse/validation failure leaves the previous output untouched.
"""
import json, re, os, tempfile
from pathlib import Path
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo
from urllib.request import Request, urlopen
import yaml
from contest_sources import codeforces, atcoder
ROOT = Path(__file__).resolve().parent.parent
REPO = 'hust-open-atom-club/open-source-deadlines'
def get(url):
    with urlopen(Request(url, headers={'User-Agent':'LZUOSS-events-sync','Accept':'application/vnd.github+json'}), timeout=30) as r:
        return r.read().decode('utf-8')
def normalize(point, zone):
    raw = str(point.get('date') or point.get('deadline') or '')
    day_only = bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', raw))
    if day_only:
        # Date-only announcements do not publish an exact time. Keep day precision.
        dt = datetime.combine(datetime.fromisoformat(raw).date(), time.min)
    elif 'T24:' in raw:
        dt = datetime.fromisoformat(raw.replace('T24:', 'T00:')) + timedelta(days=1)
    else:
        dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None: dt = dt.replace(tzinfo=ZoneInfo(zone))
    return {'at':dt.isoformat(), 'dayOnly':day_only, 'comment':str(point['comment'])}
def validate(row):
    if not row['link'].startswith(('https://','http://')): raise ValueError('Invalid event link')
    row['timeline'] = sorted([normalize(p,row['timezone']) for p in row['timeline']], key=lambda p:p['at'])
    if row.get('availability') not in (None,'open_ended','needs_verification','closed'): raise ValueError('Invalid availability')
    if not row['timeline'] and row.get('availability') not in ('open_ended','needs_verification'): raise ValueError('Missing timeline: '+row['id'])
    if row.get('availability')=='open_ended' and not (row.get('verifiedOn') and row.get('statusNote')): raise ValueError('Open-ended opportunity needs verification and explanation')
    return row
commit=json.loads(get(f'https://api.github.com/repos/{REPO}/commits/main'))
sha=commit['sha']; rows=[]
for file in ['conferences.yml','competitions.yml','activities.yml']:
    items=yaml.safe_load(get(f'https://raw.githubusercontent.com/{REPO}/{sha}/data/{file}'))
    if not isinstance(items,list): raise ValueError('Expected YAML list')
    for item in items:
        for event in item.get('events',[]):
            rows.append(validate({'id':event['id'],'title':item['title'],'description':item.get('description',''),'category':item['category'],'tags':item.get('tags',[]),'date':event.get('date',''),'place':event.get('place',''),'timezone':event['timezone'],'link':event['link'],'timeline':event['timeline'],'sourceName':'Open Source Deadlines 社区收录','sourceUrl':f'https://github.com/{REPO}/blob/{sha}/data/{file}','verifiedOn':None,'availability':'needs_verification' if re.search(r'长期|全年|滚动招募',str(event.get('date',''))+' '+item['title']) else None}))
# Preserve previous official platform snapshots on transient fetch failures.
previous_path=ROOT/'data/events.json'
previous=json.loads(previous_path.read_text()) if previous_path.exists() else {'items':[]}
reports=[]
for key,loader,url in [('codeforces',codeforces,'https://codeforces.com/api/contest.list?gym=false'),('atcoder',atcoder,'https://atcoder.jp/contests/')]:
    try:
        additions=[validate(row) for row in loader(get)]
        rows.extend(additions)
        reports.append({'key':key,'url':url,'status':'ok','count':len(additions),'fetchedAt':datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds')})
    except Exception as error:
        retained=[row for row in previous['items'] if row.get('sourceKey')==key]
        rows.extend(retained)
        reports.append({'key':key,'url':url,'status':'stale','count':len(retained)})
        print(f'WARNING: {key} sync failed; kept {len(retained)} previous records: {error}')
curated=json.loads((ROOT/'data/curated-events.json').read_text())
merged={row['id']:row for row in rows}
for row in curated: merged[row['id']]=validate(row)
now=datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds')
output={'syncedAt':now,'upstreamCommit':sha,'upstreamUpdatedAt':commit['commit']['committer']['date'],'upstreamUrl':f'https://github.com/{REPO}','sourceReports':reports,'items':list(merged.values())}
target=ROOT/'data/events.json'; target.parent.mkdir(parents=True,exist_ok=True)
with tempfile.NamedTemporaryFile(mode='w',dir=target.parent,delete=False,encoding='utf-8') as f:
    json.dump(output,f,ensure_ascii=False,indent=2); f.write('\n'); temp=f.name
os.replace(temp,target)
print(f'Saved {len(merged)} events ({len(curated)} locally verified); upstream {sha}')
