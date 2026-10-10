"""Local personal library and metered model calls. No model adjudicates game rules."""
import base64
import ctypes
import hashlib
import json
import math
import os
import re
import secrets
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
import sys
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parent))
import desktop_bridge
import card_improvements
import fast_training
import optimization
import background_jobs
import background_drafts
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError

HERE = Path(__file__).resolve().parent
DB = None
PLAY = None
SKINS = None
LOCK = threading.RLock()
SECRETS = {}
DEFAULT_CONFIG = dict(provider='codex', endpoint='https://api.openai.com/v1', model='',saveKey=False,maxOutput=4096)
EXTERNAL_WORK={'codex-work','doubao-work','deepseek-work','desktop-work'}
DESKTOP={'codex-desktop'}|EXTERNAL_WORK
DEFAULT = dict(collections=[], diy=[], assets=[], config=DEFAULT_CONFIG, aiOverrides={})
MODES = {'identity','guozhan','doudizhu','single'}

def now(): return datetime.now(timezone.utc).isoformat()
class ClosingConnection(sqlite3.Connection):
    def __exit__(self,*args):
        try: return super().__exit__(*args)
        finally: self.close()
def connect(): return sqlite3.connect(DB, timeout=20, factory=ClosingConnection)
def dump(x): return json.dumps(x, ensure_ascii=False, separators=(',',':'))
def ident(prefix): return prefix + secrets.token_hex(10)
def _self():return SimpleNamespace(**globals())

def initialize(db, play):
    global DB, PLAY
    DB = Path(db).resolve(); PLAY = play; DB.parent.mkdir(parents=True, exist_ok=True)
    with connect() as d:
        d.execute('CREATE TABLE IF NOT EXISTS personal (id INTEGER PRIMARY KEY, revision INTEGER, value TEXT)')
        d.execute('INSERT OR IGNORE INTO personal VALUES(1,0,?)', (dump(DEFAULT),))
        d.execute('CREATE TABLE IF NOT EXISTS secret (id INTEGER PRIMARY KEY, encrypted BLOB)')
        d.execute('CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, at TEXT, value TEXT)')
        d.execute('CREATE TABLE IF NOT EXISTS games (job TEXT, stage TEXT, cycle INTEGER, n INTEGER, at TEXT, value TEXT, PRIMARY KEY(job,stage,cycle,n))')
        d.execute('CREATE TABLE IF NOT EXISTS calls (id TEXT PRIMARY KEY, job TEXT, at TEXT, purpose TEXT, status TEXT, usage TEXT, value TEXT)')
        d.execute('CREATE TABLE IF NOT EXISTS asset_blobs (id TEXT PRIMARY KEY, mime TEXT, data BLOB)')
        d.execute('CREATE TABLE IF NOT EXISTS skin_bindings (version TEXT PRIMARY KEY, name TEXT NOT NULL)')
        row = d.execute('SELECT encrypted FROM secret WHERE id=1').fetchone()
        if row:
            try:
                saved=json.loads(protect(row[0], False).decode())
                SECRETS.update(key=saved['key'],endpoint=saved['endpoint'])
            except (OSError, ValueError): pass
        # A interrupted HTTP request may have reached its provider. Never resend it
        # automatically or release its reservation as if the request were free.
        for request_id, job_id, value in d.execute("SELECT id,job,value FROM calls WHERE status='pending'").fetchall():
            charge=json.loads(value).get('reservation',0)
            d.execute("UPDATE calls SET status='failed',value=? WHERE id=?",(dump(dict(answer=None,usage={},cost=charge,conservative=True,interrupted=True)),request_id))
            if job_id:
                saved=d.execute('SELECT value FROM jobs WHERE id=?',(job_id,)).fetchone()
                if saved:
                    j=json.loads(saved[0]);j['reserved']=max(0,j.get('reserved',0)-charge);j['pendingCalls']=max(0,j.get('pendingCalls',0)-1);j['calls']+=1;j['cost']+=charge
                    d.execute('UPDATE jobs SET value=? WHERE id=?',(dump(j),job_id))
        for key,value in d.execute('SELECT id,value FROM jobs').fetchall():
            j=json.loads(value)
            if j['status'] in {'running','cloning','summarizing','reporting'}:
                j['status']='paused';j['pauseReason']='服务已重启。请配置临时密钥后续跑；中断局需要结束并单列为故障局。'
                d.execute('UPDATE jobs SET value=? WHERE id=?',(dump(j),key))

    card_improvements.initialize(connect)
    background_drafts.initialize(_self())
    # Completed logs survive service restarts; never restart an interrupted match.
    with connect() as d: interrupted=[json.loads(r[0]) for r in d.execute('SELECT value FROM jobs')]
    for job in interrupted:
        if optimization.enabled(job) and job.get('active'):
            optimization.finish(sys.modules[__name__] if __name__ in sys.modules else _self(),job,{'game':dict(match=job['active']['match'],outcome='fault',fault='服务重启导致后台局中断',rounds=0)})

def protect(data, encrypt=True):
    """Windows current-user DPAPI; deliberately no plaintext fallback."""
    if os.name != 'nt': raise ValueError('此系统不支持本机加密保存，请使用临时密钥')
    from ctypes import wintypes
    class Blob(ctypes.Structure):
        _fields_ = [('size',wintypes.DWORD),('data',ctypes.POINTER(ctypes.c_ubyte))]
    buf = ctypes.create_string_buffer(data); source = Blob(len(data), ctypes.cast(buf,ctypes.POINTER(ctypes.c_ubyte))); out = Blob()
    fn = ctypes.windll.crypt32.CryptProtectData if encrypt else ctypes.windll.crypt32.CryptUnprotectData
    if not fn(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(out)):
        raise OSError('本机密钥加密失败')
    try: return ctypes.string_at(out.data, out.size)
    finally: ctypes.windll.kernel32.LocalFree(out.data)

def read():
    with connect() as d: row = d.execute('SELECT revision,value FROM personal WHERE id=1').fetchone()
    state=json.loads(row[1]);state['config']={k:state['config'].get(k,v) for k,v in DEFAULT_CONFIG.items()}
    return row[0],state

def public_state():
    revision, state = read()
    return dict(revision=revision, **state, hasKey=bool(SECRETS.get('key')) and SECRETS.get('endpoint')==state['config']['endpoint'].rstrip('/'),
        keySaved=bool(state['config']['saveKey']), token=PLAY.TOKEN,usage=usage_totals(),desktop=desktop_bridge.session_info(),skinBindings=skin_bindings())

def skin_bindings():
    with connect() as d:return dict(d.execute('SELECT version,name FROM skin_bindings'))

def bind_skin(value):
    key=short(value.get('version',''),200);name=short(value.get('name',''),120)
    _,s=read()
    if not any(g['id']==key for g in s['diy']):raise ValueError('仅可手动绑定已保存的 DIY 武将版本')
    if name and (not SKINS or name not in SKINS.by_name):raise ValueError('这个名字没有导入的皮肤')
    with LOCK,connect() as d:
        if name:d.execute('INSERT OR REPLACE INTO skin_bindings VALUES(?,?)',(key,name))
        else:d.execute('DELETE FROM skin_bindings WHERE version=?',(key,))
    return dict(skinBindings=skin_bindings())

def short(value, maximum=2000):
    if not isinstance(value,str) or len(value)>maximum: raise ValueError('文本内容无效或过长')
    return value

def media(path):
    if not re.fullmatch(r'/studio/media/[a-f0-9]{64}',path): raise ValueError('图片地址无效')
    with connect() as d: row=d.execute('SELECT mime,data FROM asset_blobs WHERE id=?',(path.rsplit('/',1)[-1],)).fetchone()
    if not row: raise ValueError('图片不存在')
    return row

def image_data(value):
    if value.startswith('/studio/media/'):
        mime,blob=media(value);return 'data:'+mime+';base64,'+base64.b64encode(blob).decode()
    return value

def validate_state(v):
    if len(dump(v).encode())>60*1024*1024: raise ValueError('本批上传超过 60 MB，请分批上传')
    if not isinstance(v,dict) or set(v)!=set(DEFAULT): raise ValueError('个人资料字段不完整')
    for key, limit in [('collections',500),('diy',2000),('assets',3000)]:
        if not isinstance(v[key],list) or len(v[key])>limit: raise ValueError('个人资料数量过多')
        if len({x['id'] for x in v[key]})!=len(v[key]): raise ValueError('资料编号重复')
    catalog = json.loads((HERE.parent/'module-03/play-catalog.json').read_text(encoding='utf-8'))
    versions = {x['versionId'] for x in catalog['versions']+catalog.get('retiredVersions',[])}
    for g in v['diy']:
        for key in ('id','family','name','group','sex','description','code','portrait'):
            short(g.get(key,''),200000 if key=='code' else 16000 if key=='description' else 500)
        if 'skills' in g:
            if not isinstance(g['skills'],list) or not 1<=len(g['skills'])<=50:raise ValueError('DIY 技能数量须为1～50')
            for skill in g['skills']:
                if not isinstance(skill,dict):raise ValueError('DIY 技能格式无效')
                short(skill.get('name',''),100);short(skill.get('description',''),16000);short(skill.get('key',''),200)
        if not g['id'].startswith('diy-') or not g['family'].startswith('diy-'): raise ValueError('DIY 编号无效')
        if type(g.get('hp')) is not int or not 1<=g['hp']<=99 or type(g.get('version')) is not int or g['version']<1: raise ValueError('DIY 版本或体力无效')
        if g['sex'] not in {'male','female','double','none'} or g['group'] not in {'wei','shu','wu','qun','jin','shen','key'}: raise ValueError('DIY 性别或势力无效')
        if not isinstance(g.get('published'),bool): raise ValueError('DIY 发布状态无效')
        versions.add(g['id'])
    for f in v['collections']:
        short(f['id'],100); short(f['name'],100)
        if not f['name'].strip() or not isinstance(f['items'],list) or len(f['items'])>6000: raise ValueError('收藏夹内容无效')
        seen=set()
        for item in f['items']:
            if set(item)!= {'version','skin'} or item['version'] not in versions: raise ValueError('收藏的武将版本不存在')
            short(item['skin'],1000)
            if (item['version'],item['skin']) in seen: raise ValueError('收藏项重复')
            seen.add((item['version'],item['skin']))
    for a in v['assets']:
        short(a['id'],100); short(a['name'],300)
        for key in ('original','image'):
            value=short(a[key],24*1024*1024)
            if value.startswith('/studio/media/'): media(value)
            elif not re.match(r'^data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$',value): raise ValueError('图片格式无效，请使用 PNG/JPEG/WebP/GIF')
    asset_ids={a['id'] for a in v['assets']}
    if any(g['portrait'] and g['portrait'] not in asset_ids for g in v['diy']): raise ValueError('DIY 立绘仍有引用，请先替换相关素材')
    if any(x['skin'].startswith('asset-') and x['skin'] not in asset_ids for f in v['collections'] for x in f['items']): raise ValueError('收藏皮肤仍有素材引用')
    c=v['config']
    if set(c)!=set(DEFAULT_CONFIG) or c['provider'] not in {'codex','openai','deepseek','doubao','custom'}|DESKTOP: raise ValueError('API 配置无效')
    if c['provider'] not in DESKTOP:
        u=urlparse(c['endpoint'])
        if u.username or u.password or u.query or u.fragment or not u.hostname or not (u.scheme=='https' or u.scheme=='http' and u.hostname in {'127.0.0.1','localhost','::1'}): raise ValueError('API 地址需 HTTPS 或本机 HTTP 地址')
    short(c['model'],200);short(c['endpoint'],1000)
    if type(c['saveKey']) is not bool:raise ValueError('密钥保存配置无效')
    if type(c['maxOutput']) is not int or not 64<=c['maxOutput']<=32000:raise ValueError('每次输出上限须为64～32000')
    if len(v['aiOverrides'])>6000: raise ValueError('AI 版本过多')
    for k,a in v['aiOverrides'].items():
        short(k,200); short(a.get('code',''),200000); short(a.get('policy',''),30000)
        if a.get('mode') not in {'identity','doudizhu'}: raise ValueError('仅身份场和斗地主可采用通用 AI')
    return v

def save(value):
    with LOCK:
        revision, old = read()
        if value.get('revision')!=revision: raise ValueError('资料已在另一页更新，请刷新')
        state=validate_state(value['state'])
        # Immutable DIY revisions already referenced by play or tests must be retained.
        referenced=set()
        with PLAY.connect() as d:
            for row in d.execute('SELECT settings FROM matches'):
                referenced.update(g['id'] for g in json.loads(row[0]).get('studioRuntime',{}).get('generals',[]))
        for g in old['diy']:
            replacement=next((x for x in state['diy'] if x['id']==g['id']),None)
            if g['id'] in referenced and replacement!=g: raise ValueError('该 DIY 版本已有对局引用，请保存为新版本')
        if 'apiKey' in value:
            key=short(value['apiKey'],1000).strip()
            if key: SECRETS.update(key=key,endpoint=state['config']['endpoint'].rstrip('/'))
            elif value.get('clearKey'): SECRETS.pop('key',None)
        with connect() as d:
            for a in state['assets']:
                for field in ('original','image'):
                    if a[field].startswith('/studio/media/'): continue
                    header,encoded=a[field].split(',',1);blob=base64.b64decode(encoded,validate=True);mime=header[5:header.index(';')]
                    if len(blob)>15*1024*1024: raise ValueError('单张原图或选取图片超过15 MB，请缩小尺寸')
                    digest=hashlib.sha256(mime.encode()+blob).hexdigest()
                    d.execute('INSERT OR IGNORE INTO asset_blobs VALUES(?,?,?)',(digest,mime,blob));a[field]='/studio/media/'+digest
            d.execute('UPDATE personal SET revision=?,value=? WHERE id=1',(revision+1,dump(state)))
            retained_diy={g['id'] for g in state['diy']}
            for (bound,) in d.execute('SELECT version FROM skin_bindings').fetchall():
                if bound not in retained_diy:d.execute('DELETE FROM skin_bindings WHERE version=?',(bound,))
            d.execute('DELETE FROM secret')
            if state['config']['saveKey'] and SECRETS.get('key') and SECRETS.get('endpoint')==state['config']['endpoint'].rstrip('/'):
                d.execute('INSERT INTO secret VALUES(1,?)',(protect(dump(dict(key=SECRETS['key'],endpoint=SECRETS['endpoint'])).encode()),))
        return public_state()

def runtime():
    _,s=read()
    return dict(cardImprovements=card_improvements.read(connect),generals=[g for g in s['diy'] if g['published']],
        collections=s['collections'], aiOverrides=s['aiOverrides'],
        portraits={a['id']:a['image'] for a in s['assets']})

def job_get(key):
    with connect() as d: row=d.execute('SELECT value FROM jobs WHERE id=?',(key,)).fetchone()
    if not row: raise ValueError('测试任务不存在')
    return json.loads(row[0])

def job_save(job):
    with connect() as d: d.execute('UPDATE jobs SET value=? WHERE id=?',(dump(job),job['id']))

def job_games(job, stage=None):
    with connect() as d:
        rows=d.execute('SELECT value FROM games WHERE job=?'+(' AND stage=?' if stage else '')+' ORDER BY at',(job,stage) if stage else (job,)).fetchall()
    return [json.loads(r[0]) for r in rows]

def summarize(games):
    valid=[g for g in games if not g.get('fault')]; n=len(valid)
    wins=sum(g.get('outcome')=='win' for g in valid); draws=sum(g.get('outcome')=='draw' for g in valid)
    rounds=sum(g.get('rounds',0) for g in valid)
    def avg(k,den=None): return round(sum(g.get(k,0) for g in valid)/(n if den is None else den),3) if (n if den is None else den) else None
    cards={}
    for g in valid:
        for k,v in g.get('keyCards',{}).items():
            a=cards.setdefault(k,dict(used=0,gained=0,games=0,wins=0))
            a['used']+=v.get('used',0); a['gained']+=v.get('gained',0)
            if v.get('used',0) or v.get('gained',0): a['games']+=1; a['wins']+=g.get('outcome')=='win'
    for a in cards.values(): a['winRateWhenPresent']=round(a['wins']/a['games'],4) if a['games'] else None
    breakdown={}
    for g in valid:
        for name,count in g.get('gainedCards',{}).items(): breakdown[name]=breakdown.get(name,0)+count
    roles={}
    for g in valid: roles.setdefault(g.get('role','未知'),[]).append(g)
    return dict(total=len(games),valid=n,faults=len(games)-n,wins=wins,draws=draws,
        winRate=round(wins/n,4) if n else None,rounds=rounds, firstRoundFlow=avg('firstRoundFlow'),
        averageFlow=avg('flow',rounds),averageFlowValue=avg('flowValue',rounds),
        maxDamage=max((g.get('maxDamage',0) for g in valid),default=None),
        maxRoundDamage=max((g.get('maxRoundDamage',0) for g in valid),default=None),
        averageRoundDamage=avg('damage',rounds),averageEnemyLoss=avg('enemyLoss',rounds),
        averageResponseLoss=avg('responseLoss',rounds),averageSkillLoss=avg('skillLoss',rounds),
        averageOtherLoss=avg('otherLoss',rounds),averageAllyDraw=avg('allyDraw',rounds),
        gainedCards=breakdown,keyCards=cards,roles={r:dict(games=len(gs),wins=sum(x.get('outcome')=='win' for x in gs),winRate=sum(x.get('outcome')=='win' for x in gs)/len(gs)) for r,gs in roles.items()},
        warning='本次测试中该武将强度过低' if n and wins/n<.2 else '',
        note='过牌含摸牌和其他实际获得，排除开局发牌；锦囊1.7、装备1.3、其他1。敌方失牌只计手牌/装备，技能归因优先于响应归因。平均项按测试将参与的整轮及末轮统计，额外回合和回合外计入同轮。key牌为频次与胜负关联，不代表因果。')

def create_job(value):
    c=value['config']; mode=c.get('mode')
    if mode not in MODES: raise ValueError('测试模式无效')
    for key,default in [('trainGames',100),('testGames',50)]:
        c.setdefault(key,default)
        if type(c[key]) is not int or not 1<=c[key]<=10000: raise ValueError('局数须为 1～10000')
    short(c.get('target',''),200); short(c.get('guidance',''),16000)
    if not c.get('target'): raise ValueError('必须指定测试武将版本')
    if mode=='single' and not c.get('opponent'): raise ValueError('单挑双方均须由你指定')
    if mode=='guozhan' and not c.get('partner'): raise ValueError('国战须指定测试将的副将')
    if not 0<=c.get('targetSeat',0)<c.get('players',8): raise ValueError('测试座次无效')
    settings=PLAY.validate(value['settings']); settings['studioRuntime']=runtime(); settings['mode']=mode
    settings['players']=2 if mode=='single' else 3 if mode=='doudizhu' else int(c.get('players',8))
    c['players']=settings['players']
    c.setdefault('role','rotate');c.setdefault('lockSeats',False);c.setdefault('targetSeat',0)
    if c['role'] not in {'rotate','zhu','zhong','fan','nei'}:raise ValueError('测试身份无效')
    if mode=='doudizhu' and c['role'] not in {'rotate','zhu','fan'}:raise ValueError('斗地主只支持地主或农民')
    if mode=='identity' and ((settings['players']==2 and c['role'] not in {'rotate','zhu','fan'}) or (settings['players']==3 and c['role']=='zhong')):raise ValueError('当前人数不包含所选身份，请调整人数或身份')
    if type(c['lockSeats']) is not bool or type(c['targetSeat']) is not int or not 0<=c['targetSeat']<settings['players']:raise ValueError('锁定座次配置无效')
    settings['control']='auto'; settings['doubleGeneral']=False; settings['identityRole']='random'; settings['redraw']=str(c.get('redraw',0)); settings['speed']='vfast'
    PLAY.validate(settings)
    _,state=read()
    if state['config']['provider'] in EXTERNAL_WORK and not desktop_bridge.session_info()['connected']:
        raise ValueError('请先在工作客户端启动本机任务指令，并检查工作通道在线')
    if state['config']['provider'] not in DESKTOP and not SECRETS.get('key'): raise ValueError('请先在顶部配置 API 密钥')
    if state['config']['provider'] not in EXTERNAL_WORK and not state['config']['model']: raise ValueError('请填写账户可用的模型名称')
    c.setdefault('driver','model')
    if c['driver'] not in {'model','batch-local'}:raise ValueError('测试操作方式无效')
    if c['driver']=='batch-local':c.setdefault('batchSize',10)
    job=dict(id=ident('test-'),at=now(),config=c,settings=settings,status='running',stage='train',cycle=0,
        policy='',frozenPolicy='',notes='',analysis='',calls=0,inputTokens=0,outputTokens=0,cost=0,
        reserved=0,pendingCalls=0,pricing={},usageUnknown=0,
        provider={**state['config'],'timeout':120,'vision':True},
        reports=[],next=0,active=None,seed=secrets.token_hex(8))
    if fast_training.enabled(job):job['batchTraining']=fast_training.state(c)
    with connect() as d: d.execute('INSERT INTO jobs VALUES(?,?,?)',(job['id'],job['at'],dump(job)))
    return job

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kw): return None

def json_result(text):
    text=re.sub(r'^```(?:json)?\s*|\s*```$', '', text.strip())
    try: return json.loads(text)
    except json.JSONDecodeError:
        start=text.find('{');end=text.rfind('}')
        if start>=0 and end>start: return json.loads(text[start:end+1])
        raise ValueError('模型没有返回可解析的 JSON，请调整模型或重试')

def usage_totals():
    it=ot=unknown=0
    with connect() as d:
        for status,usage in d.execute("SELECT status,usage FROM calls WHERE status!='pending'"):
            u=json.loads(usage or '{}');it+=int(u.get('input_tokens',u.get('prompt_tokens',0)));ot+=int(u.get('output_tokens',u.get('completion_tokens',0)))
            if not u:unknown+=1
    return dict(inputTokens=it,outputTokens=ot,unknown=unknown)

def model_list(value):
    c=value.get('config',read()[1]['config'])
    if c['provider']=='codex-desktop':return desktop_bridge.codex_models()
    if c['provider'] in EXTERNAL_WORK:return dict(models=[],manual=True,hardTokenLimit=False,note='沿用工作客户端当前模型；此接口不读取客户端账户模型列表')
    key=value.get('apiKey') or (SECRETS.get('key') if SECRETS.get('endpoint')==c['endpoint'].rstrip('/') else '')
    if not key:raise ValueError('先输入密钥，再读取账户模型列表')
    check={**read()[1],'config':{k:c.get(k,v) for k,v in DEFAULT_CONFIG.items()}};validate_state(check)
    try:
        request=Request(c['endpoint'].rstrip('/')+'/models',headers={'Authorization':'Bearer '+key})
        with build_opener(NoRedirect).open(request,timeout=20) as res:raw=json.loads(res.read(4*1024*1024))
        return dict(models=[dict(id=short(m['id'],200),name=m.get('name',m['id'])) for m in raw['data'] if isinstance(m,dict) and isinstance(m.get('id'),str)],hardTokenLimit=True)
    except (HTTPError,URLError,ValueError,KeyError,TypeError):return dict(models=[],manual=True,hardTokenLimit=True,note='服务商未返回模型列表，可手动填写账户可用模型或推理接入点 ID')

def model_call(job_id,purpose,prompt,request_id,image=None):
    with LOCK:
        with connect() as d:cached=d.execute('SELECT status,value FROM calls WHERE id=?',(request_id,)).fetchone()
        if cached:
            if cached[0]=='done':return json.loads(cached[1])
            raise ValueError('该调用已提交，请在暂停后显式续跑；不会自动重复调用')
        if job_id:
            job=job_get(job_id)
            if job['status']!='running' and not (optimization.enabled(job) and job['status'] in {'cloning','summarizing','reporting'}):raise ValueError('任务已暂停或等待确认')
            cfg=job['provider']
        else:cfg=read()[1]['config'];job=dict(pendingCalls=0,calls=0,cost=0)
        def reject(reason):
            if job_id:job.update(status='paused',pauseReason=reason);job_save(job)
            raise ValueError(reason)
        desktop=cfg['provider'] in DESKTOP;key=SECRETS.get('key')
        if not desktop:
            if not key:reject('尚未配置 API 密钥')
            if SECRETS.get('endpoint')!=cfg['endpoint'].rstrip('/'):reject('当前密钥属于其他 API 地址，请切回该服务商并配置密钥')
        if cfg['provider'] not in EXTERNAL_WORK and not cfg['model']:reject('请填写模型名称')
        if image and (not isinstance(image,str) or not re.match(r'^data:image/(png|jpeg|webp|gif);base64,',image)):reject('请使用本机上传的图片')
        if cfg['provider'] in EXTERNAL_WORK and not desktop_bridge.session_info()['connected']:reject('桌面工作模式尚未连接，请先启动复制的任务指令')
        job['pendingCalls']=job.get('pendingCalls',0)+1
        if job_id:job_save(job)
        with connect() as d:d.execute('INSERT INTO calls VALUES(?,?,?,?,?,?,?)',(request_id,job_id or '',now(),purpose,'pending','{}',dump({'reservation':0})))
    failure=None;answer=None;usage={}
    alive=lambda:not job_id or job_get(job_id)['status'] in {'running','cloning','summarizing','reporting'}
    try:
        if cfg['provider']=='codex-desktop':answer,usage=desktop_bridge.codex_call(cfg['model'],prompt,image,cfg['maxOutput'],alive)
        elif desktop:answer,usage=desktop_bridge.external_call(request_id,purpose,prompt,image,cfg['maxOutput'],alive)
        else:
            responses=cfg['provider'] in {'codex','openai'}
            content=[dict(type='input_text' if responses else 'text',text=prompt)]
            if image:content.append(dict(type='input_image',image_url=image) if responses else dict(type='image_url',image_url=dict(url=image)))
            if responses:payload=dict(model=cfg['model'],input=[dict(role='user',content=content)],max_output_tokens=cfg['maxOutput'],store=False);suffix='/responses'
            else:payload=dict(model=cfg['model'],messages=[dict(role='user',content=content if image else prompt)],max_tokens=cfg['maxOutput'],stream=False,response_format=dict(type='json_object'));suffix='/chat/completions'
            request=Request(cfg['endpoint'].rstrip('/')+suffix,data=dump(payload).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+key},method='POST')
            with build_opener(NoRedirect).open(request,timeout=cfg.get('timeout',120)) as res:raw=json.loads(res.read(32*1024*1024))
            usage=raw.get('usage') or {}
            if responses:
                text=''.join(c.get('text','') for o in raw.get('output',[]) for c in o.get('content',[]) if c.get('type')=='output_text')
                if raw.get('status')=='incomplete':raise ValueError('输出被截断，请提高每次输出上限')
            else:text=raw['choices'][0]['message']['content']
            answer=json_result(text)
        if not isinstance(answer,dict):raise ValueError('模型须返回 JSON 对象')
    except HTTPError as e:failure=f'API 返回 {e.code}；请检查模型权限、密钥、余额和地址'
    except (URLError,TimeoutError,OSError):failure='模型连接失败或已断开；本局暂停'
    except (ValueError,KeyError,TypeError) as e:failure=str(e) if desktop else 'API 输出无效或被截断，请检查模型和输出上限'
    with LOCK:
        current=job_get(job_id) if job_id else job
        it=int(usage.get('input_tokens',usage.get('prompt_tokens',0)));ot=int(usage.get('output_tokens',usage.get('completion_tokens',0)))
        current['pendingCalls']=max(0,current.get('pendingCalls',0)-1);current['calls']=current.get('calls',0)+1
        current['inputTokens']=current.get('inputTokens',0)+it;current['outputTokens']=current.get('outputTokens',0)+ot
        current['usageUnknown']=current.get('usageUnknown',0)+(not bool(usage))
        if failure and job_id:current.update(status='paused',pauseReason=failure)
        if job_id:job_save(current)
        result=dict(answer=answer if not failure else None,usage=usage,cost=0,conservative=not bool(usage),usageUnknown=not bool(usage),hardTokenLimit=not desktop)
        with connect() as d:d.execute('UPDATE calls SET status=?,usage=?,value=? WHERE id=?',('failed' if failure else 'done',dump(usage),dump(result),request_id))
    if failure:raise ValueError(failure)
    return result

def report_call(key,purpose,prompt,kind,fields):
    job=job_get(key);attempt=job.get('reportAttempts',{}).get(kind,0)
    try:
        result=model_call(key,purpose,prompt,kind+':'+str(attempt))
        if any(not isinstance(result['answer'].get(f),str) or not result['answer'][f].strip() for f in fields): raise ValueError('模型未返回完整的策略或评价，请检查输出后续跑')
        return result
    except ValueError as error:
        with LOCK:
            job=job_get(key);job.setdefault('reportAttempts',{})[kind]=attempt+1
            job['status']='paused';job['pauseReason']=str(error);job_save(job)
        raise

def coach_fast(key):
    with LOCK:
        job=job_get(key);b=job['batchTraining']
        if job['status']=='summarizing':
            job['status']='running';job_save(job)
    if not b['pendingCoach']:return job
    if job['status']=='paused':raise ValueError('请先续跑，再分析本批记录')
    games=[g for g in job_games(key) if g['stage']=='train' and g['cycle']==job['cycle']]
    recent=[g for g in games if not g.get('fault') and g['n']>=b['lastCoachAt']]
    traces=[]
    # Individual branch includes every semantic event of the completed match.
    # Batch branch samples three complete traces; all ten games enter statistics.
    selected=recent if b['branch']=='individual' else recent[-3:]
    for g in selected:
        trace=[]
        with PLAY.connect() as db:
            for (raw,) in db.execute('SELECT payload FROM events WHERE match_id=? ORDER BY seq',(g['match'],)):
                e=json.loads(raw);kind=e.get('type','');data=e.get('data',{})
                if kind not in {'local-ai-choice','test-loss','hp-metrics','flow-metrics','engine:log','test-assignment','test-fault'}:continue
                if kind=='local-ai-choice':data={k:data.get(k) for k in ('event','skill','seat','result','policyRevision')}
                if kind=='engine:log':data={'content':re.sub('<[^>]*>','',str(data.get('content','')))}
                trace.append({'seq':e['seq'],'type':kind,'data':data})
        traces.append(dict(match=g['match'],outcome=g['outcome'],events=trace))
    context=fast_training.prompt_context(job,games,summarize(games),traces)
    frozen=b['branch']=='frozen' and job['next']>b['checkpoint']
    prompt=('你是三国杀本地AI教练。原生引擎结算，本地AI操作。只调整操作策略与技能AI字段，不得修改技能效果、体力或牌堆。'
        '返回JSON {"policy":"下一阶段操作指导","analysis":"基于实际记录的分析","aiCode":"return {技能ID:{AI字段}}; 或空字符串",'
        '"predictedWinRate":0.5,"skillFixDraft":"技能文字与实现不符的修复建议或空字符串"}。'
        'aiCode仅返回被测试武将（国战含副将）已有技能的ai字段。每个函数可用lib/game/ui/get/ai/_status。'
        '不得修改全局对象或规则，不得读取其他人的隐藏手牌/牌堆。空代码保留上次本地策略；纯文字指导不会自动成为可执行代码，需明确这个限制。'
        'needForecast=true时预测尚未开打的下一批胜率，0～1；不能修改既往预测。'
        '报告包含首轮过牌、平均过牌、最高伤害、每轮伤害、敌方失牌分类、队友摸牌、key牌和局限。'
        +('策略已固定：仅出最终报告，原policy与aiCode必须保留。' if frozen else '')+'\n'+dump(context))
    kind='coach:'+key+':'+str(job['cycle'])+':'+str(job['next'])
    result=report_call(key,'本地实战批次分析',prompt,kind,('policy','analysis'))
    try:
        with LOCK:
            current=job_get(key)
            if current['status']=='paused':return current
            if not current['batchTraining']['pendingCoach']:return current
            if current['cycle']!=job['cycle'] or current['next']!=job['next']:raise ValueError('批次已改变，不能应用过期分析')
            ans=result['answer']
            if frozen:ans={**ans,'policy':current['policy'],'aiCode':current.get('aiCode','')}
            fast_training.record_coach(current,ans)
            current['skillFixDraft']=short(ans.get('skillFixDraft',''),30000)
            current['batchTraining']['lastAnalysisTraceGames']=len(selected)
            if current['reports']:
                current['reports'][-1].update(policy=current['policy'],analysis=current['analysis'],batchTraining=current['batchTraining'])
            job_save(current);return current
    except ValueError as error:
        with LOCK:
            current=job_get(key);current['status']='paused';current['pauseReason']=str(error)
            current.setdefault('reportAttempts',{})[kind]=current.get('reportAttempts',{}).get(kind,0)+1;job_save(current)
        raise

def api_get(path):
    if path=='/drafts':return background_drafts.list_items(_self())
    if path.startswith('/draft/'):return background_drafts.get(_self(),path.split('/')[2])
    if path=='/improvements': return dict(changes=card_improvements.read(connect))
    if path.startswith('/improvement/'):
        return card_improvements.read(connect,path.split('/')[2],True)
    if path=='/state': return public_state()
    if path=='/runtime': return runtime()
    if path=='/desktop/status':return desktop_bridge.session_info()
    if path=='/jobs':
        with connect() as d: rows=d.execute('SELECT value FROM jobs ORDER BY at DESC').fetchall()
        jobs=[json.loads(x[0]) for x in rows]
        for job in jobs:
            games=job_games(job['id'])
            job['recordCounts']={stage:dict(completed=sum(g['stage']==stage and not g.get('fault') for g in games),faults=sum(g['stage']==stage and g['outcome']=='fault' for g in games)) for stage in ('sample','train','test')}
        return dict(jobs=jobs)
    if path.startswith('/job/'):
        parts=path.split('/');job=job_get(parts[2])
        if len(parts)>3 and parts[3]=='status':return dict(job=job)
        if len(parts)>3 and parts[3]=='preview':return background_jobs.capture(job['id'])
        return dict(job=job,games=job_games(job['id']))
    if path=='/export':
        _,s=read();s['config']['saveKey']=False
        for a in s['assets']:
            for field in ('original','image'): a[field]=image_data(a[field])
        with connect() as d: reports=[json.loads(x[0]) for x in d.execute('SELECT value FROM jobs ORDER BY at')]
        with connect() as d: revisions=[json.loads(x[0]) for x in d.execute('SELECT value FROM card_revisions ORDER BY at,id')]
        return dict(schema=1,state=s,jobs=reports,games={j['id']:job_games(j['id']) for j in reports},skinBindings=skin_bindings(),cardImprovements=card_improvements.read(connect),cardRevisionHistory=revisions)
    raise ValueError('个人接口不存在')

def api_post(path,value):
    if path=='/draft':return background_drafts.create(_self(),value)
    if path=='/improvement':
        catalog=json.loads((HERE.parent/'module-03/play-catalog.json').read_text(encoding='utf-8'))['versions']+read()[1]['diy']
        with LOCK:return card_improvements.write(connect,catalog,value)
    if path=='/state': return save(value)
    if path=='/skins/bind':return bind_skin(value)
    if path=='/job':
        if value.get('config',{}).get('workflow')=='outer-v2':
            result=optimization.create(_self(),value);background_jobs.ensure(result['id']);return job_get(result['id'])
        return create_job(value)
    if path=='/models':return model_list(value)
    if path=='/desktop/connect':return desktop_bridge.create_connection(value['_base'])
    if path=='/generate':
        prompt=short(value.get('prompt',''),200000)
        picture=value.get('image')
        return model_call(None,'DIY代码草案',prompt,ident('diy-call-'),image_data(picture) if picture else None)
    if not path.startswith('/job/'): raise ValueError('接口不存在')
    parts=path.split('/');key=parts[2];action=parts[3] if len(parts)>3 else ''
    if optimization.enabled(job_get(key)):
        result=optimization.handle(_self(),key,action,value)
        if action=='control' and value.get('action') in {'resume','evaluate','optimize'}:background_jobs.ensure(key)
        return result
    with LOCK:
        job=job_get(key)
        if action=='control':
            cmd=value['action']
            if cmd=='pause':
                if job['status'] not in {'running','paused','summarizing','reporting'}: raise ValueError('当前阶段已经结束，无需暂停')
                job['status']='paused';job['pauseReason']='用户暂停'
            elif cmd=='diagnostic':
                job['status']='paused';job['pauseReason']=short(value.get('message','选择接入异常'),4000)
                job['diagnostic']={k:value.get(k) for k in ('message','event','skill','seat','match')}
            elif cmd=='resume':
                if job['status'] not in {'paused','error'}: raise ValueError('当前任务无需续跑')
                job['status']='running';job['pauseReason']=''
            elif cmd=='output-limit':
                n=value['maxOutput']
                if type(n) is not int or not 64<=n<=32000:raise ValueError('输出上限须为64～32000')
                job['provider']['maxOutput']=n
            elif cmd in {'optimize','evaluate'}:
                if job['status']!='review': raise ValueError('请先完成优化并查看报告')
                job['stage']='train' if cmd=='optimize' else 'test';job['cycle']+=1;job['next']=0;job['active']=None;job['status']='running';job['pauseReason']=''
                if cmd=='evaluate':
                    job['frozenPolicy']=job['policy'];job['frozenAI']=job.get('aiCode','')
                elif fast_training.enabled(job):job['batchTraining']=fast_training.state(job['config'])
            elif cmd=='notes': job['notes']=short(value.get('notes',''),16000);job['analysis']=short(value.get('analysis',''),40000)
            elif cmd=='delete':
                if job['pendingCalls']: raise ValueError('仍有 API 请求，请等待完成后删除')
                ids=[x['match'] for x in job_games(key) if x.get('match')]
                if job.get('active'): ids.append(job['active']['match'])
                with connect() as d:
                    d.execute('DELETE FROM games WHERE job=?',(key,));d.execute('DELETE FROM calls WHERE job=?',(key,));d.execute('DELETE FROM jobs WHERE id=?',(key,))
                with PLAY.connect() as d:
                    for mid in ids: d.execute('DELETE FROM events WHERE match_id=?',(mid,));d.execute('DELETE FROM matches WHERE id=?',(mid,))
                return dict(deleted=True)
            else: raise ValueError('任务操作无效')
            job_save(job);return job
        if action=='begin':
            if job['status']!='running': raise ValueError('任务尚未开始或已暂停')
            if job['active']:
                if job['active'].get('owner')!=value.get('owner'): raise ValueError('已有活动对局。请回到原标签页；原页已关闭时，点击“结束中断局”后续跑。')
                return dict(job=job,active=job['active'])
            count=job['config']['trainGames' if job['stage']=='train' else 'testGames']
            if job['next']>=count: raise ValueError('当前阶段已打满，请先整理策略或查看报告')
            settings=job['settings'];mid=secrets.token_hex(12)
            config=job['config'];n=settings['players'];shift=0 if config.get('lockSeats') else job['next']%n
            seat=(config.get('targetSeat',0)+shift)%n
            role=config.get('role') if settings['mode'] in {'identity','doudizhu'} and config.get('role')!='rotate' else None
            settings['identityRole']=role or 'random'
            settings['studioRuntime']['test']=dict(job=key,stage=job['stage'],cycle=job['cycle'],n=job['next'],seed=mid,targetSeat=seat,role=role,display='stream',driver=config.get('driver','model'))
            if fast_training.enabled(job):
                b=job['batchTraining']
                if b['pendingCoach']:raise ValueError('请先完成本批策略分析再开始下一局')
                settings['studioRuntime']['test']['policyRevision']=b['lastCoachAt']
                settings['studioRuntime']['test']['localAI']=job.get('frozenAI','') if job['stage']=='test' else job.get('aiCode','')
                settings['studioRuntime']['test']['targetVersion']=config['target']
                settings['studioRuntime']['test']['partnerVersion']=config.get('partner','')
            with PLAY.connect() as d: d.execute('INSERT INTO matches(id,at,settings,status,modified) VALUES(?,?,?,?,?)',(mid,now(),dump(settings),'准备中',bool(settings['customCode'])))
            job['active']=dict(match=mid,n=job['next'],stage=job['stage'],cycle=job['cycle'],owner=short(value.get('owner',''),100));job_save(job)
            return dict(job=job,active=job['active'])
        if action=='finish':
            game=value['game']
            if not job['active'] or game.get('match')!=job['active']['match']: raise ValueError('不属于当前活动对局')
            if game.get('outcome')!='fault':
                c=job['config'];n=job['settings']['players'];shift=0 if c.get('lockSeats') else job['next']%n
                if game.get('targetSeat')!=(c.get('targetSeat',0)+shift)%n or c.get('mode') in {'identity','doudizhu'} and c.get('role','rotate')!='rotate' and game.get('role')!=c['role']:
                    game.update(outcome='fault',fault='实际身份或座位与测试配置不一致，已排除胜率')
            for metric in ('rounds','flow','flowValue','firstRoundFlow','damage','maxDamage','maxRoundDamage','enemyLoss','skillLoss','responseLoss','otherLoss','allyDraw'):
                n=game.get(metric,0)
                if type(n) not in (int,float) or not math.isfinite(n) or n<0: raise ValueError('测评统计无效')
            if game.get('outcome') not in {'win','loss','draw','fault'}: raise ValueError('对局结果无效')
            if game.get('skillSpecs'): job['skillSpecs']=game['skillSpecs']
            game.update(stage=job['stage'],cycle=job['cycle'],n=job['next'],at=now())
            ordinal=len([g for g in job_games(key) if g['stage']==job['stage'] and g['cycle']==job['cycle']])
            game['controller']=job['config'].get('driver','model')
            game['policyRevision']=job.get('batchTraining',{}).get('lastCoachAt',0)
            with connect() as d: d.execute('INSERT INTO games VALUES(?,?,?,?,?,?)',(key,job['stage'],job['cycle'],ordinal,game['at'],dump(game)))
            job['active']=None
            if not fast_training.enabled(job) or not game.get('fault'):job['next']+=1
            if fast_training.enabled(job) and not game.get('fault'):
                fast_training.after_game(job,[g for g in job_games(key) if g['stage']==job['stage'] and g['cycle']==job['cycle']])
            count=job['config']['trainGames' if job['stage']=='train' else 'testGames']
            if game.get('fault'): job['status']='paused';job['pauseReason']=game['fault']
            if job['next']>=count and not game.get('fault'):
                job['status']='summarizing' if job['stage']=='train' else 'reporting'
                gs=[g for g in job_games(key) if g['stage']==job['stage'] and g['cycle']==job['cycle']]
                job['reports'].append(dict(stage=job['stage'],cycle=job['cycle'],at=now(),metrics=summarize(gs),policy=job['frozenPolicy'] if job['stage']=='test' else job['policy']))
            job_save(job);return job
        if action=='adopt':
            if job['config']['mode'] not in {'identity','doudizhu'}: raise ValueError('单挑和国战仅保存针对策略，不更新通用武将 AI')
            revision,state=read();state['aiOverrides'][job['config']['target']+'|'+job['config']['mode']]=dict(version=job['config']['target'],mode=job['config']['mode'],code=short(value.get('code',''),200000),policy=job['policy'],job=key,at=now())
            return save(dict(revision=revision,state=state))
    # Outbound request must run without the storage lock held.
    if action=='decision':
        choice=value['choice'];allowed=choice.get('legal',[])
        if not allowed or len(allowed)>3000: raise ValueError('没有合法候选')
        prompt='你是三国杀操作 AI。引擎负责结算。只根据可见信息从 legal 列表中选一个 id，输出 JSON {"id":"候选id","reason":"简短理由"}。禁止臆造行动。\n用户指导：'+job['config'].get('guidance','')+'\n固定/优化操作策略：'+(job['frozenPolicy'] if job['stage']=='test' else job['policy'])+'\n'+dump(choice)
        answer=model_call(key,'合法行动',prompt,short(value['request'],200))
        if answer['answer'].get('id') not in {x['id'] for x in allowed}:
            with LOCK:
                current=job_get(key);current.update(status='paused',pauseReason='模型选择不在合法行动中，本局暂停');job_save(current)
            raise ValueError('模型选择不在合法行动中，本局暂停')
        return answer
    if action=='coach':
        if not fast_training.enabled(job) or job['stage']!='train':raise ValueError('此任务不是本地批次优化')
        return coach_fast(key)
    if action=='policy':
        gs=[g for g in job_games(key) if g['stage']=='train' and g['cycle']==job['cycle']]
        with LOCK:
            if job['status']=='summarizing':job['status']='running';job_save(job)
        recent_choices=[]
        with PLAY.connect() as d:
            for g in gs[-3:]:
                rows=d.execute('SELECT payload FROM events WHERE match_id=? ORDER BY seq DESC',(g['match'],)).fetchall()
                choices=[json.loads(r[0])['data'] for r in rows if json.loads(r[0]).get('type')=='model-choice'][:15]
                recent_choices.append(dict(match=g['match'],outcome=g['outcome'],choices=list(reversed(choices))))
        prompt='你是三国杀 AI 教练。只优化操作策略，不改变任何技能规则、体力、牌堆。根据真实对局统计和实际操作记录给出下一阶段固定策略，输出 JSON {"policy":"可执行的操作指导","analysis":"统计依据与局限","aiCode":"return {技能ID:{...AI字段}}; 或空字符串","skillFixDraft":"文字与实现不一致时的修复草案，否则空字符串"}。aiCode 只返回技能 ai 对象，禁止改技能内容。\n'+dump(dict(config=job['config'],previous=job['policy'],metrics=summarize(gs),recent=gs[-3:],decisions=recent_choices,skillSpecs=job.get('skillSpecs',[])))
        result=report_call(key,'优化策略草案',prompt,'policy:'+key+':'+str(job['cycle'])+':'+str(job['next']),('policy','analysis'))
        with LOCK:
            job=job_get(key);ans=result['answer'];job['policy']=short(ans.get('policy',''),30000);job['aiCode']=short(ans.get('aiCode',''),200000);job['skillFixDraft']=short(ans.get('skillFixDraft',''),30000);job['analysis']=short(ans.get('analysis',''),40000)
            if job['next']>=job['config']['trainGames']:
                job['status']='review';job['frozenPolicy']=job['policy']
                if job['reports']:job['reports'][-1].update(policy=job['policy'],analysis=job['analysis'])
            job_save(job)
        return job
    if action=='evaluation':
        if job['stage']!='test' or job['next']<job['config']['testGames']: raise ValueError('请先打完固定策略实战')
        if job['status']=='complete': return job
        gs=[g for g in job_games(key) if g['stage']=='test' and g['cycle']==job['cycle']]
        with LOCK:
            if job['status']=='reporting':job['status']='running';job_save(job)
        prompt='你是三国杀测评员。仅评价已经完成的固定策略实战，不修改策略或技能。输出 JSON {"analysis":"根据胜率、首轮和每轮过牌、伤害、失牌、队友摸牌、key牌等给出实战评价，明确对手条件、样本量与局限；胜率低于20%须说明本次强度过低"}。和局计入分母，故障局排除。不得声称严格强弱偏序或因果最优。\n'+dump(dict(config=job['config'],policy=job['frozenPolicy'],metrics=summarize(gs),recent=gs[-3:]))
        result=report_call(key,'固定策略实战评价',prompt,'evaluation:'+key+':'+str(job['cycle']),('analysis',))
        with LOCK:
            job=job_get(key);job['analysis']=short(result['answer'].get('analysis',''),40000)
            if job['reports']:job['reports'][-1]['analysis']=job['analysis']
            job['status']='complete';job['pauseReason']='';job_save(job)
        return job
    raise ValueError('任务接口不存在')
