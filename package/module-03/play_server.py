"""Local play host. Explicit static roots; no native game file-write endpoints."""
import argparse, json, mimetypes, secrets, sqlite3, threading, webbrowser, socket, importlib.util, copy
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse, unquote, parse_qs
HERE=Path(__file__).resolve().parent
_network_spec=importlib.util.spec_from_file_location('local_network_store',HERE/'network-store.py')
_network_module=importlib.util.module_from_spec(_network_spec);_network_spec.loader.exec_module(_network_module)
NETWORK_ROOMS=_network_module.LocalRooms()
ASSETS=json.loads((HERE/'asset-map.json').read_text(encoding='utf-8'))
RESOURCE_PATHS={r['path'] for r in json.loads((HERE.parent/'module-01/resource-index.json').read_text(encoding='utf-8')) if r.get('kind') in {'image','audio','font'}}
DECKS=json.loads((HERE/'deck-catalog.json').read_text(encoding='utf-8'))
TOKEN=secrets.token_urlsafe(32)
DB=None
LOCK=threading.Lock()
PACKS=json.loads((HERE/'play-catalog.json').read_text(encoding='utf-8'))['enginePacks']
# The formal import retains two original portrait aliases absent from the old
# representative resource index. Only migrated portrait paths are added here;
# resolve_static still confines all files to the existing module-01 asset root.
RESOURCE_PATHS.update(v['portraitPath'] for v in json.loads((HERE/'play-catalog.json').read_text(encoding='utf-8'))['versions'] if v.get('scope')=='character/extra_generals' and v.get('portraitPath'))
RESOURCE_PATHS.add('project-art/dc_sb_zhugeliang_shadow.png')
DEFAULT={'mode':'identity','players':8,'control':'human','redraw':'unlimited','packs':['standard','shenhua','refresh','extra','yijiang','mobile','sp','sp2','xianding','huicui','sb','bwiki202610'], 'background':'ol_bg','speed':'normal','identityRole':'random','doubleNei':False,'doubleGeneral':False,'guozhanDeck':'custom','aozhan':False,'separatism':False,'feiyang':'online','inheritance':'mobile','singleMode':'dianjiang','deck':DECKS['packs']['standard']+DECKS['packs']['extra'],'customCode':''}
DEFAULT.update(rosters={},ratings={})
DEFAULT.update(studioRuntime={})
DEFAULT.update(identityVariant='standard')
IDENTITY_RULES_PATH=HERE/'identity-rules.json'

def identity_rules():
    return json.loads(IDENTITY_RULES_PATH.read_text(encoding='utf-8'))

def prepare_launch(v):
    v=validate(v)
    if v['mode']=='identity' and v['identityVariant']=='lichu':
        rules=identity_rules()
        if rules.get('status')!='ready':
            raise ValueError('立储与择途入口已准备，完整规则条款待确认后开放开局')
    return v

def migrate(v):
    v=dict(v)
    v.setdefault('identityVariant','standard')
    for key in ('rosters','ratings','studioRuntime'):v.setdefault(key,{})
    for roster in v['rosters'].values():
        for seat in roster.get('seats',[]):seat.get('filters',{}).setdefault('collections',[])
    return v

def validate_rosters(v):
    rosters=v['rosters'];ratings=v['ratings']
    if not isinstance(rosters,dict) or any(k not in {'identity','guozhan','doudizhu','single'} for k in rosters):raise ValueError('选将方案无效')
    for mode,r in rosters.items():
        if not isinstance(r,dict) or set(r)!={'humanSeat','revealAI','seats'}:raise ValueError('选将方案字段无效')
        if type(r['revealAI']) is not bool or type(r['humanSeat']) is not int:raise ValueError('选将控制无效')
        seats=r['seats']
        if not isinstance(seats,list) or not 2<=len(seats)<=12 or not 0<=r['humanSeat']<len(seats):raise ValueError('选将座位无效')
        for seat in seats:
            if not isinstance(seat,dict) or set(seat)!={'method','picks','locked','filters'} or seat['method'] not in {'manual','random'} or type(seat['locked']) is not bool:raise ValueError('成员选将方式无效')
            if not isinstance(seat['picks'],list) or len(seat['picks'])>2 or any(not isinstance(k,str) or not 1<=len(k)<=200 for k in seat['picks']):raise ValueError('武将版本无效')
            f=seat['filters']
            if not isinstance(f,dict) or set(f)!={'pools','groups','strengths','collections'}:raise ValueError('筛选字段无效')
            for key in f:
                if not isinstance(f[key],list) or len(f[key])>40 or len(set(f[key]))!=len(f[key]) or any(not isinstance(x,str) or len(x)>100 for x in f[key]):raise ValueError('筛选值无效')
            if any(x not in {'extreme','strong','weak','unknown'} for x in f['strengths']):raise ValueError('强度筛选无效')
    if not isinstance(ratings,dict) or len(ratings)>6000:raise ValueError('粗评配置无效')
    for key,roles in ratings.items():
        if not isinstance(key,str) or not 1<=len(key)<=200 or not isinstance(roles,dict):raise ValueError('粗评版本无效')
        for role,r in roles.items():
            if role not in {'landlord','farmer','duel','identity'} or not isinstance(r,dict) or set(r)!={'label','reason'} or r['label'] not in {'extreme','strong','weak','unknown'} or not isinstance(r['reason'],str) or len(r['reason'])>2000:raise ValueError('粗评标签或依据无效')
def now():return datetime.now(timezone.utc).isoformat()
def connect():return sqlite3.connect(DB,timeout=10)
def initialize():
    DB.parent.mkdir(parents=True,exist_ok=True)
    with connect() as d:
        d.execute('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, revision INTEGER, value TEXT)')
        d.execute('CREATE TABLE IF NOT EXISTS history (revision INTEGER PRIMARY KEY, at TEXT, value TEXT)')
        d.execute('CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, at TEXT, settings TEXT, status TEXT, modified INTEGER DEFAULT 0, checkpoint TEXT)')
        d.execute('CREATE TABLE IF NOT EXISTS events (match_id TEXT, seq INTEGER, payload TEXT, PRIMARY KEY(match_id,seq))')
        d.execute('INSERT OR IGNORE INTO state VALUES(1,0,?)',(json.dumps(DEFAULT,ensure_ascii=False),))
def validate(v):
    v=migrate(v)
    if not isinstance(v,dict) or set(v)!=set(DEFAULT):raise ValueError('设置字段不完整或不支持')
    if v['mode'] not in {'identity','guozhan','doudizhu','single'}:raise ValueError('只支持四种模式')
    if type(v['players']) is not int or not 2<=v['players']<=12:raise ValueError('人数无效')
    if v['mode']=='identity' and v['players']>10:raise ValueError('身份场最多十人')
    if v['identityVariant'] not in {'standard','lichu'}:raise ValueError('身份场玩法无效')
    if v['mode']=='identity' and v['identityVariant']=='lichu':
        if not 8<=v['players']<=10:raise ValueError('立储与择途支持八至十人')
        if v['doubleGeneral'] is not False:raise ValueError('立储与择途仅支持单将')
    if v['mode']=='doudizhu' and v['players']!=3 or v['mode']=='single' and v['players']!=2:raise ValueError('斗地主三人、单挑两人')
    if v['control'] not in {'human','auto'} or v['speed'] not in {'slow','normal','fast','vfast','vvfast'}:raise ValueError('控制或速度设置不支持')
    if v['redraw']!='unlimited' and (not isinstance(v['redraw'],str) or not v['redraw'].isdigit() or not 0<=int(v['redraw'])<=999):raise ValueError('手气次数无效')
    if v['identityRole'] not in {'random','zhu','zhong','fan','nei'}:raise ValueError('身份无效')
    if v['guozhanDeck'] not in {'custom','normal','old','yingbian'}:raise ValueError('国战牌堆无效')
    if v['feiyang'] not in {'online','mobile','decade'} or v['inheritance'] not in {'online','mobile','decade'}:raise ValueError('斗地主变体无效')
    if v['singleMode']!='dianjiang':raise ValueError('当前使用点将单挑')
    for k in ['doubleNei','doubleGeneral','aozhan','separatism']:
        if type(v[k]) is not bool:raise ValueError('开关类型无效')
    if not isinstance(v['packs'],list) or not v['packs'] or len(v['packs'])>len(PACKS) or any(x not in PACKS for x in v['packs']) or len(set(v['packs']))!=len(v['packs']):raise ValueError('武将包配置无效')
    if v['background'] not in {'ol_bg','sanying_bg','zhulin_bg','default','custom'}:raise ValueError('背景无效')
    if not isinstance(v['customCode'],str) or len(v['customCode'])>200000:raise ValueError('扩展代码过长')
    if not isinstance(v['deck'],list) or not 20<=len(v['deck'])<=10000:raise ValueError('牌堆须为 20 至 10000 张')
    for c in v['deck']:
        if not isinstance(c,list) or not 3<=len(c)<=4 or c[0] not in {'spade','heart','club','diamond'} or type(c[1]) is not int or not 1<=c[1]<=13 or not isinstance(c[2],str) or not c[2] or len(c[2])>100:raise ValueError('卡牌花色、点数或名称无效')
        if len(c)==4 and c[3] not in {'fire','thunder','ice','kami','stab'}:raise ValueError('卡牌属性无效')
    validate_rosters(v)
    if not isinstance(v['studioRuntime'],dict) or len(json.dumps(v['studioRuntime']))>28*1024*1024:raise ValueError('个人实战资料过大')
    return v
def state():
    with connect() as d:r=d.execute('SELECT revision,value FROM state WHERE id=1').fetchone()
    return {'revision':r[0],'settings':migrate(json.loads(r[1])),'token':TOKEN}
def resolve_static(url):
    rel=unquote(url).lstrip('/')
    if not rel or rel.endswith('/'):rel+='index.html'
    if '\\' in rel or any(x in {'.','..'} or ':' in x for x in PurePosixPath(rel).parts):return None
    if rel.startswith('assets/'):
        logical=rel[7:];physical=ASSETS.get(logical)
        if not physical:return None
        p=(HERE.parent/'module-01'/physical).resolve();root=(HERE.parent/'module-01').resolve()
        return p if p.is_relative_to(root) and p.is_file() else None
    if rel.startswith('resource/'):
        physical=rel[9:]
        if physical not in RESOURCE_PATHS:return None
        p=(HERE.parent/'module-01'/physical).resolve();root=(HERE.parent/'module-01').resolve()
        return p if p.is_relative_to(root) and p.is_file() else None
    if rel in ASSETS and Path(rel).suffix.lower() in {'.jpg','.jpeg','.png','.webp','.gif','.svg','.avif','.mp3','.ogg','.wav','.woff','.woff2','.ttf','.otf'}:
        return resolve_static('/assets/'+rel)
    allowed={'index.html','arena.html','play.css','play.js','arena.css','arena-boot.js','bridge.js','roster-rules.js','roster-ui.js','roster-engine.js','roster.css','preload.js','play-catalog.json','deck-catalog.json','asset-map.json','LICENSE','model-controller.js','test-metrics.js','personal-engine.js','appearance.js','appearance.css','background.js','card-improvements.js','local-controller.js'}
    allowed.update({'portrait-input.js','private-card-tags.js','network-table.js','network-roster.js','network-roster-ui.js','network-roster-index.json'})
    allowed.update({'network-arena.css','network-controls.js'})
    allowed.update({'operation-quality.js','rule-alignment.js','rule-personal-data.js'})
    allowed.update({'identity-options.js','identity-rules.json','identity-rules-core.js','identity-succession.js'})
    allowed.update({'network.html','network.css','network-ui.js','network-host.js','network-transport.js','network-random.js','network-port.js','network-rtc.js','network-view.js','network-session.js','network-options.js','network-selection.js','internet.html','internet-ui.js'})
    if rel in allowed:return HERE/rel
    if rel.startswith('engine/') or rel.startswith('data/'):return None
    p=(HERE/'engine'/rel).resolve();root=(HERE/'engine').resolve()
    if p.is_relative_to(root) and p.is_file() and p.suffix.lower() in {'.js','.json','.css','.html','.txt','.md','.png','.jpg','.jpeg','.webp','.svg','.gif','.woff','.woff2','.ttf','.otf'}:return p
    return None
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,format,*args):
        if args and str(args[0]).startswith('GET') and '404' not in str(args):return
        super().log_message(format,*args)
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        self.send_header('X-Content-Type-Options','nosniff')
        connection_policy="'self' ws: wss:" if urlparse(self.path).path=='/internet.html' else "'self'"
        self.send_header('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' blob:; img-src 'self' data: blob:; connect-src "+connection_policy+"; frame-src 'self' blob:; object-src 'none'; base-uri 'self'")
        super().end_headers()
    def json(self,data,status=200):
        b=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
    def host_ok(self):return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
    def read_body(self,limit=32*1024*1024):
        if not self.host_ok() or self.headers.get('Origin') not in {f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'} or self.headers.get('X-Play-Token')!=TOKEN:raise PermissionError('本机页面验证失败')
        n=int(self.headers.get('Content-Length',0))
        if not 0<n<=limit:raise ValueError('请求过大')
        return json.loads(self.rfile.read(n))
    def do_GET(self):
        if not self.host_ok():return self.json({'error':'Host 无效'},403)
        u=urlparse(self.path);path=u.path
        if path.startswith('/api/network/'):
            try:
                parts=path.split('/');ident,op=parts[3:5];room_token=self.headers.get('X-Room-Token','')
                if op=='launch':
                    info=NETWORK_ROOMS.launch(ident,room_token)
                    with connect() as d:r=d.execute('SELECT settings FROM matches WHERE id=?',(info['match'],)).fetchone()
                    return self.json(dict(id=info['match'],settings=json.loads(r[0]),events=[],modified=False,replay=False,network=dict(room=ident,engineToken=room_token,seed=info['seed'],generals=info['generals'])))
                if op in {'poll','inbox'}:return self.json(NETWORK_ROOMS.poll(ident,room_token,int(parse_qs(u.query).get('after',['0'])[0]),op=='inbox'))
                raise ValueError('联机接口不存在')
            except PermissionError as e:return self.json({'error':str(e)},403)
            except (ValueError,KeyError,TypeError,IndexError) as e:return self.json({'error':str(e)},400)
        if path=='/api/state':return self.json(state())
        if path=='/api/identity-rules':return self.json(identity_rules())
        if path=='/api/matches':
            with connect() as d:rows=d.execute('SELECT id,at,settings,status,modified FROM matches ORDER BY at DESC LIMIT 100').fetchall()
            return self.json({'matches':[{'id':r[0],'at':r[1],'settings':json.loads(r[2]),'status':r[3],'modified':bool(r[4])}for r in rows]})
        if path.startswith('/api/match/'):
            ident=path.split('/')[3]
            with connect() as d:
                r=d.execute('SELECT at,settings,status,modified,checkpoint FROM matches WHERE id=?',(ident,)).fetchone()
                if not r:return self.json({'error':'对局不存在'},404)
                events=d.execute('SELECT payload FROM events WHERE match_id=? ORDER BY seq',(ident,)).fetchall()
            return self.json({'id':ident,'at':r[0],'settings':json.loads(r[1]),'status':r[2],'modified':bool(r[3]),'checkpoint':json.loads(r[4])if r[4]else None,'events':[json.loads(e[0])for e in events]})
        if path in {'/checkFile','/checkDir','/readFileAsText','/getFileList'}:
            query=parse_qs(u.query);name=query.get('fileName',query.get('dir',['']))[0];p=resolve_static('/'+name)
            if path=='/getFileList':return self.json({'success':True,'data':{'folders':[],'files':[]}})
            if path=='/readFileAsText':return self.json({'success':bool(p),'data':p.read_text(encoding='utf-8')if p else '', 'errorMsg':'文件不可读取' if not p else ''})
            return self.json({'success':True,'data':'file'if p else 'none'})
        p=resolve_static(path)
        if not p or not p.is_file():return self.json({'error':'文件不存在'},404)
        ctype=mimetypes.guess_type(str(p))[0]or'application/octet-stream'
        if p.suffix=='.js':ctype='text/javascript'
        b=p.read_bytes();self.send_response(200);self.send_header('Content-Type',ctype);self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
    def do_POST(self):self.mutate()
    def do_PUT(self):self.mutate()
    def mutate(self):
        try:
            value=self.read_body();path=urlparse(self.path).path
            if path.startswith('/api/network/'):
                parts=path.split('/');op=parts[-1];room_token=self.headers.get('X-Room-Token','')
                if op=='create':
                    generals=value.get('generals')
                    catalog=json.loads((HERE/'play-catalog.json').read_text(encoding='utf-8'))
                    standard={v['id'] for v in catalog['versions'] if v.get('scope')=='character/standard'}
                    if not isinstance(generals,list) or len(generals)!=2 or any(g not in standard for g in generals):raise ValueError('第一阶段请选择两个标准包武将')
                    return self.json(NETWORK_ROOMS.create(generals))
                if op=='join':return self.json(NETWORK_ROOMS.join(value['code']))
                ident=parts[3]
                if op=='action':return self.json(NETWORK_ROOMS.action(ident,room_token,value))
                if op=='publish':return self.json(NETWORK_ROOMS.publish(ident,room_token,value))
                if op=='close':return self.json(NETWORK_ROOMS.close(ident,room_token))
                if op=='start':
                    with NETWORK_ROOMS.lock:
                        room,member=NETWORK_ROOMS.auth(ident,room_token)
                        if member!='host' or room['phase']!='lobby' or 'client' not in room['members']:raise ValueError('需由Host在Client加入后开始')
                        config=copy.deepcopy(DEFAULT);config.update(mode='single',players=2,control='human',packs=['standard'],redraw='0',speed='vfast',background='zhulin_bg',doubleGeneral=False)
                        ident_match=secrets.token_hex(12)
                        with LOCK,connect() as d:d.execute('INSERT INTO matches(id,at,settings,status,modified) VALUES(?,?,?,?,?)',(ident_match,now(),json.dumps(validate(config),ensure_ascii=False),'本地联机准备中',False))
                        return self.json(NETWORK_ROOMS.start(ident,room_token,ident_match))
                raise ValueError('联机接口不存在')
            with LOCK,connect() as d:
                if path=='/api/state':
                    v=validate(value['settings']);revision=d.execute('SELECT revision FROM state WHERE id=1').fetchone()[0]
                    if value.get('revision')!=revision:return self.json({'error':'设置已在另一个页面更新，请刷新'},409)
                    text=json.dumps(v,ensure_ascii=False);d.execute('UPDATE state SET revision=?,value=? WHERE id=1',(revision+1,text));d.execute('INSERT INTO history VALUES(?,?,?)',(revision+1,now(),text));return self.json({'revision':revision+1,'settings':v})
                if path=='/api/launch':
                    v=prepare_launch(value['settings']);ident=secrets.token_hex(12);d.execute('INSERT INTO matches(id,at,settings,status,modified) VALUES(?,?,?,?,?)',(ident,now(),json.dumps(v,ensure_ascii=False),'准备中',bool(v['customCode'])));return self.json({'id':ident})
                if path.startswith('/api/match/'):
                    ident=path.split('/')[3]
                    if not d.execute('SELECT 1 FROM matches WHERE id=?',(ident,)).fetchone():raise ValueError('对局不存在')
                    if path.endswith('/selection'):
                        old=d.execute('SELECT settings,status FROM matches WHERE id=?',(ident,)).fetchone()
                        if old[1] not in {'准备中','选将中'}:raise ValueError('本局选将已完成，阵容不可覆盖')
                        original=migrate(json.loads(old[0]));v=validate(value['settings'])
                        if any(v[k]!=original[k] for k in DEFAULT if k not in {'rosters','ratings'}):raise ValueError('本局规则已加载，请返回设置后重新准备')
                        d.execute('UPDATE matches SET settings=? WHERE id=?',(json.dumps(v,ensure_ascii=False),ident))
                        return self.json({'saved':True})
                    events=value.get('events',[])
                    if not isinstance(events,list)or len(events)>2000:raise ValueError('操作记录过多')
                    for e in events:
                        if not isinstance(e,dict)or type(e.get('seq'))is not int:raise ValueError('操作记录无效')
                        d.execute('INSERT OR IGNORE INTO events VALUES(?,?,?)',(ident,e['seq'],json.dumps(e,ensure_ascii=False)))
                    status=value.get('status','进行中')
                    if not isinstance(status,str)or len(status)>100:raise ValueError('状态无效')
                    checkpoint=value.get('checkpoint')
                    d.execute('UPDATE matches SET status=?, modified=MAX(modified,?),checkpoint=COALESCE(?,checkpoint) WHERE id=?',(status,bool(value.get('modified')),json.dumps(checkpoint,ensure_ascii=False)if checkpoint is not None else None,ident))
                    return self.json({'saved':True})
                return self.json({'error':'不支持该操作'},404)
        except PermissionError as e:self.json({'error':str(e)},403)
        except (ValueError,KeyError,TypeError,IndexError,json.JSONDecodeError)as e:self.json({'error':str(e)},400)
class PlayHTTPServer(ThreadingHTTPServer):
    allow_reuse_address=False
    def server_bind(self):
        if hasattr(socket,'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
        super().server_bind()

def main():
    global DB
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8767);p.add_argument('--db',type=Path,default=HERE/'data/play.sqlite');p.add_argument('--open-browser',action='store_true');args=p.parse_args();DB=args.db.resolve();initialize()
    server=PlayHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'基础实战入口 http://127.0.0.1:{args.port}/index.html',flush=True)
    if args.open_browser:webbrowser.open(f'http://127.0.0.1:{args.port}/index.html')
    server.serve_forever()
if __name__=='__main__':main()
