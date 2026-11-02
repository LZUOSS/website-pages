"""Official structured contest sources. No inferred rounds or dates."""
import json,re
from html import unescape
from datetime import datetime,timedelta,timezone
from zoneinfo import ZoneInfo

def codeforces(get):
    api='https://codeforces.com/api/contest.list?gym=false'
    payload=json.loads(get(api))
    if payload.get('status')!='OK': raise ValueError('Codeforces API returned non-OK status')
    now=datetime.now(timezone.utc);rows=[]
    for contest in payload['result']:
        if contest['phase']!='BEFORE' or not contest.get('startTimeSeconds'):continue
        start=datetime.fromtimestamp(contest['startTimeSeconds'],timezone.utc);end=start+timedelta(seconds=contest['durationSeconds'])
        if start<now or start>now+timedelta(days=90):continue
        link=f"https://codeforces.com/contest/{contest['id']}"
        rows.append(dict(id=f"codeforces-{contest['id']}",title=contest['name'],description='Codeforces 官方排期的线上算法赛。参赛范围、Rated 规则及报名要求请查看对应比赛公告。',category='competition',tags=['算法','Codeforces','线上'],link=link,sourceUrl=api,sourceName='Codeforces 官方 API',sourceKey='codeforces',retrievedOn=now.date().isoformat(),verifiedOn=None,date=start.strftime('%Y-%m-%d'),place='线上',timezone='UTC',timeline=[{'deadline':start.isoformat(),'comment':'比赛开始'},{'deadline':end.isoformat(),'comment':'比赛结束'}]))
    return rows

def atcoder(get):
    url='https://atcoder.jp/contests/';html=get(url);rows=[];seen=set();now=datetime.now(timezone.utc)
    for section in ['active','upcoming','weekday']:
        match=re.search(r'id="contest-table-'+section+r'"[^>]*>(.*?)</tbody>',html,re.S)
        if not match:continue
        for raw in re.findall(r'<tr[^>]*>(.*?)</tr>',match.group(1),re.S):
            cells=re.findall(r'<td[^>]*>(.*?)</td>',raw,re.S)
            if len(cells)<3:continue
            clock=re.search(r'<time[^>]*>([^<]+)</time>',cells[0]);anchor=re.search(r'<a href="(/contests/[^"/]+)"[^>]*>(.*?)</a>',cells[1],re.S)
            if not clock or not anchor:raise ValueError('AtCoder row changed')
            start=datetime.strptime(clock.group(1).strip(),'%Y-%m-%d %H:%M:%S%z');duration=re.sub('<[^>]+>','',cells[2]).strip();hours,minutes=map(int,duration.split(':'));end=start+timedelta(hours=hours,minutes=minutes)
            if end<now or start>now+timedelta(days=90) or anchor.group(1) in seen:continue
            seen.add(anchor.group(1));title=unescape(re.sub('<[^>]+>','',anchor.group(2))).strip();link='https://atcoder.jp'+anchor.group(1)
            rated=unescape(re.sub('<[^>]+>','',cells[3])).strip() if len(cells)>3 else ''
            rows.append(dict(id='atcoder-'+anchor.group(1).split('/')[-1],title=title,description=f'AtCoder 官方赛程中的线上编程比赛。时长 {hours} 小时 {minutes} 分钟；Rated 范围：{rated}。资格及生成式 AI 使用规则以比赛页面为准。',category='competition',tags=['算法','AtCoder','线上'],link=link,sourceUrl=url,sourceName='AtCoder 官方赛程',sourceKey='atcoder',retrievedOn=now.date().isoformat(),verifiedOn=None,date=start.strftime('%Y-%m-%d'),place='线上',timezone='Asia/Tokyo',timeline=[{'deadline':start.isoformat(),'comment':'比赛开始'},{'deadline':end.isoformat(),'comment':'比赛结束'}]))
    if not rows:raise ValueError('No AtCoder scheduled rows parsed; inspect source before overwriting')
    return rows
