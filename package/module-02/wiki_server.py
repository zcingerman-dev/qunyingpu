"""Local-only Wiki storage and static assets. Never loads game/extension code."""
import argparse
import copy
import hashlib
import json
import secrets
import sqlite3
import threading
import webbrowser
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
BASE=json.loads((HERE/'wiki-data.json').read_text(encoding='utf-8'))
NETWORK=json.loads((HERE/'relation-network.json').read_text(encoding='utf-8'))
BASE['entities'].extend(NETWORK['entities'])
BASE['sources'].extend(NETWORK['sources'])
BASE['relations'].extend(NETWORK['relations'])
for relation in BASE['relations']:
    relation.update(NETWORK.get('relationSupplements',{}).get(relation['id'],{}))
for entity in BASE['entities']:
    supplement=NETWORK['entitySupplements'].get(entity['id'])
    if supplement:
        entity['aliases']=list(dict.fromkeys(entity.get('aliases',[])+supplement.get('aliases',[])))
        entity['note']=supplement['note'] if supplement.get('replaceNote') else entity.get('note','')+('\n'+supplement['note'] if supplement.get('note') else '')
        entity['identityEvidence']=entity.get('identityEvidence',[])+supplement.get('sources',[])
        for key in ['name','category','world','citation','graphEligible','canonicalId']:
            if key in supplement:entity[key]=supplement[key]
for version in BASE['versions']:
    version['originalEntityId']=version['entityId']
    version['entityId']=NETWORK.get('versionIdentityLinks',{}).get(version['versionId'],NETWORK.get('identityLinks',{}).get(version['entityId'],version['entityId']))
BASE_PEOPLE={e['id'] for e in BASE['entities']}
BASE_VERSIONS={v['versionId'] for v in BASE['versions']+BASE.get('retiredVersions',[])}
BASE_RELATIONS={r['id'] for r in BASE['relations']}
FIELDS={'entities','customEntities','customVersions','relations','hiddenRelations','identityOverrides','versionRecords'}
EMPTY={'entities':{},'customEntities':[],'customVersions':[],'relations':{},'hiddenRelations':[],'identityOverrides':{},'versionRecords':{}}
TOKEN=secrets.token_urlsafe(32)
DB=None

def string(value,limit=10000,required=False):
    if not isinstance(value,str) or len(value)>limit or required and not value.strip():raise ValueError('文本为空、类型不正确或超出长度上限')
    return value

def validate_person(p):
    if not isinstance(p,dict) or not set(p)<={'id','name','category','world','note','citation','aliases'}:raise ValueError('人物字段不支持')
    string(p.get('name'),120,True)
    if p.get('category') not in {'historical','fiction','works','other','pending'}:raise ValueError('人物分类不支持')
    for k in ['world','note','citation']:string(p.get(k))
    if p.get('category')!='pending' and not p.get('citation','').strip():raise ValueError('确认人物分类需要填写分类依据/来源')
    if 'aliases' in p:
        if not isinstance(p['aliases'],list) or len(p['aliases'])>200:raise ValueError('别名列表不正确')
        for a in p['aliases']:string(a,120,True)

def validate_state(value):
    if isinstance(value,dict) and set(value)==FIELDS-{'versionRecords'}:value={**value,'versionRecords':{}}
    if not isinstance(value,dict) or set(value)!=FIELDS:raise ValueError('备份或状态结构不正确')
    v=copy.deepcopy(value)
    if not isinstance(v['entities'],dict) or not isinstance(v['relations'],dict) or not isinstance(v['identityOverrides'],dict):raise ValueError('记录映射不正确')
    if not isinstance(v['customEntities'],list) or not isinstance(v['customVersions'],list) or not isinstance(v['hiddenRelations'],list):raise ValueError('记录列表不正确')
    if len(v['customEntities'])>5000 or len(v['customVersions'])>5000 or len(v['relations'])>20000:raise ValueError('导入记录过多')
    people=set(BASE_PEOPLE)
    for p in v['customEntities']:
        validate_person(p);ident=string(p.get('id'),100,True)
        if not ident.startswith('user-p-') or ident in people:raise ValueError('自建人物 ID 重复或格式不正确')
        people.add(ident)
    for key,p in v['entities'].items():
        if key not in people:raise ValueError('编辑的人物不存在')
        validate_person(p)
        if 'id' in p and p['id']!=key:raise ValueError('人物 ID 与编辑记录不一致')
    versions=set(BASE_VERSIONS)
    for item in v['customVersions']:
        if not isinstance(item,dict) or set(item)-{'versionId','entityId','id','displayName','group','hp','scope','sourceLabel','skills','skillDetails','originPackage','note'}:raise ValueError('自建版本字段不支持')
        ident=string(item.get('versionId'),100,True)
        if not ident.startswith('user-v-') or ident in versions or item.get('entityId') not in people:raise ValueError('自建版本 ID 或人物不正确')
        versions.add(ident)
        for k in ['id','displayName']:string(item.get(k),120,True)
        if not isinstance(item.get('hp'),(int,float)) or isinstance(item.get('hp'),bool) or not 1<=item['hp']<=999:raise ValueError('体力必须在 1 到 999 之间')
        string(item.get('group',''),120)
        if not isinstance(item.get('skillDetails'),list) or len(item['skillDetails'])>100:raise ValueError('技能列表不正确')
        for skill in item['skillDetails']:
            if not isinstance(skill,dict) or set(skill)-{'id','name','description','hasAI'}:raise ValueError('技能字段不正确')
            for k in ['id','name']:string(skill.get(k),120,True)
            string(skill.get('description',''))
        if item.get('skills')!=[s['id'] for s in item['skillDetails']]:raise ValueError('技能 ID 列表与技能资料不一致')
    for key,r in v['relations'].items():
        if not isinstance(r,dict) or set(r)-{'id','from','to','label','reverseLabel','kind','symmetric','evidenceType','confidence','note','sources','citation'}:raise ValueError('关系字段不支持')
        if r.get('id')!=key or key not in BASE_RELATIONS and not key.startswith('user-r-'):raise ValueError('关系 ID 不正确')
        if r.get('from') not in people or r.get('to') not in people or r['from']==r['to']:raise ValueError('关系需要两个不同的已存在人物')
        for k in ['label','reverseLabel','kind']:string(r.get(k),120,True)
        if r.get('evidenceType') not in {'history','literature','package','custom'}:raise ValueError('关系证据类型不支持')
        if r.get('confidence') not in {'verified','package','pending','custom'}:raise ValueError('关系核实状态不支持')
        if r['confidence']=='verified' and r['evidenceType']=='custom':raise ValueError('自定义关系不能直接标为已核实史料')
        string(r.get('note',''));string(r.get('citation'),10000,True)
        if not isinstance(r.get('symmetric'),bool):raise ValueError('双向关系字段不正确')
        if r.get('sources')!=[]:raise ValueError('编辑关系请用来源说明字段，勿注入来源对象')
    if any(k not in BASE_RELATIONS and k not in v['relations'] for k in v['hiddenRelations']):raise ValueError('隐藏关系不存在')
    for key,target in v['identityOverrides'].items():
        if key not in versions or target not in people:raise ValueError('版本归属人物不正确')
    if not isinstance(v['versionRecords'],dict) or len(v['versionRecords'])>10000:raise ValueError('版本技能记录格式不正确')
    for key,record in v['versionRecords'].items():
        if key not in versions:raise ValueError('技能记录对应的武将版本不存在')
        if not isinstance(record,dict) or set(record)!={'label','skillDetails','note','citation'}:raise ValueError('版本技能记录字段不正确')
        string(record['label'],120,True);string(record['note']);string(record['citation'])
        if not isinstance(record['skillDetails'],list) or len(record['skillDetails'])>100:raise ValueError('版本记录最多支持 100 个技能')
        skill_ids=set()
        for skill in record['skillDetails']:
            if not isinstance(skill,dict) or set(skill)!={'id','name','description'}:raise ValueError('记录技能字段不正确')
            string(skill['id'],120,True);string(skill['name'],120,True);string(skill['description'])
            if skill['id'] in skill_ids:raise ValueError('同一版本中的技能标识不可重复')
            skill_ids.add(skill['id'])
    return v

def connect():
    db=sqlite3.connect(DB,timeout=5)
    db.execute('PRAGMA foreign_keys=ON')
    return db

def initialize(path):
    global DB
    DB=path.resolve();DB.parent.mkdir(parents=True,exist_ok=True)
    with connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS revisions (revision INTEGER PRIMARY KEY AUTOINCREMENT, created TEXT NOT NULL, reason TEXT NOT NULL, digest TEXT NOT NULL, state TEXT NOT NULL)')
        if not db.execute('SELECT 1 FROM revisions LIMIT 1').fetchone():
            db.execute('INSERT INTO revisions(created,reason,digest,state) VALUES(?,?,?,?)',(datetime.now(timezone.utc).isoformat(),'初始化',BASE['catalogDigest'],json.dumps(EMPTY)))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,format,*args):pass
    def allowed_host(self):return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
    def json_response(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(raw)
    def do_GET(self):
        if not self.allowed_host():return self.json_response(403,{'error':'仅允许本机地址'})
        route=urlparse(self.path).path
        if route in ['/api/state','/api/history']:
            with connect() as db:
                if route=='/api/state':
                    revision,stamp,reason,digest,state=db.execute('SELECT * FROM revisions ORDER BY revision DESC LIMIT 1').fetchone()
                    saved_state=validate_state(json.loads(state))
                    return self.json_response(200,{'revision':revision,'created':stamp,'catalogDigest':digest,'currentCatalogDigest':BASE['catalogDigest'],'state':saved_state,'token':TOKEN})
                rows=db.execute('SELECT revision,created,reason FROM revisions ORDER BY revision DESC LIMIT 100').fetchall()
                return self.json_response(200,{'history':[dict(zip(['revision','created','reason'],row)) for row in rows]})
        decoded=unquote(route)
        target=(ROOT/decoded.lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not decoded.startswith(('/module-02/','/module-01/')):return self.send_error(404)
        if target.is_relative_to(HERE/'data') or target.suffix.lower() in {'.sqlite','.db','.py','.cmd','.ps1'}:return self.send_error(404)
        if target.is_dir():return self.send_error(404)
        super().do_GET()
    def write(self,restore=False):
        if not self.allowed_host() or self.headers.get('X-Wiki-Token')!=TOKEN:return self.json_response(403,{'error':'保存凭据无效，请刷新页面'})
        origin=self.headers.get('Origin')
        if origin and origin not in {f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'}:return self.json_response(403,{'error':'不允许其他网页修改本地资料'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=4*1024*1024:raise ValueError('请求为空或超过 4 MB')
            if self.headers.get('Content-Type','').split(';')[0]!='application/json':raise ValueError('需要 JSON 格式')
            payload=json.loads(self.rfile.read(length))
            expected=payload.get('expectedRevision')
            if not isinstance(expected,int):raise ValueError('缺少当前版本号')
            reason=string(payload.get('reason','保存本地编辑'),400,True)
            with connect() as db:
                db.execute('BEGIN IMMEDIATE')
                current=db.execute('SELECT revision FROM revisions ORDER BY revision DESC LIMIT 1').fetchone()[0]
                if current!=expected:return self.json_response(409,{'error':'资料已在其他页面更新，请刷新后重新编辑','revision':current})
                if restore:
                    row=db.execute('SELECT state FROM revisions WHERE revision=?',(payload.get('revision'),)).fetchone()
                    if not row:raise ValueError('历史版本不存在')
                    state=validate_state(json.loads(row[0]))
                else:
                    if payload.get('catalogDigest')!=BASE['catalogDigest']:raise ValueError('备份资料版本与当前武将目录不同，不能直接覆盖')
                    state=validate_state(payload.get('state'))
                encoded=json.dumps(state,ensure_ascii=False,separators=(',',':'))
                cursor=db.execute('INSERT INTO revisions(created,reason,digest,state) VALUES(?,?,?,?)',(datetime.now(timezone.utc).isoformat(),reason,BASE['catalogDigest'],encoded))
                revision=cursor.lastrowid
            return self.json_response(200,{'revision':revision,'state':state})
        except (ValueError,TypeError,json.JSONDecodeError) as error:return self.json_response(400,{'error':str(error)})
        except sqlite3.Error:return self.json_response(503,{'error':'本地存储暂时不可用，请稍后重试'})
    def do_PUT(self):
        if urlparse(self.path).path!='/api/state':return self.json_response(404,{'error':'接口不存在'})
        self.write()
    def do_POST(self):
        if urlparse(self.path).path!='/api/restore':return self.json_response(404,{'error':'接口不存在'})
        self.write(restore=True)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8766)
    parser.add_argument('--db',type=Path,default=HERE/'data/wiki.sqlite')
    parser.add_argument('--open-browser',action='store_true')
    args=parser.parse_args();initialize(args.db)
    url=f'http://127.0.0.1:{args.port}/module-02/index.html'
    try:server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    except OSError as error:
        print('Cannot start the local server. The port may already be in use.\n'+url+'\n'+str(error))
        return
    if args.open_browser:
        browser_timer=threading.Timer(0.5,lambda:webbrowser.open(url))
        browser_timer.daemon=True;browser_timer.start()
    print(json.dumps({'url':f'http://127.0.0.1:{args.port}/module-02/index.html','storage':str(DB)},ensure_ascii=True),flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
if __name__=='__main__':main()
