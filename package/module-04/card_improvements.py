"""Append-only, version-scoped card corrections; original imports remain intact."""
import copy
import json
import secrets
import re
from datetime import datetime, timezone

def initialize(connect):
    with connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS card_revisions (id TEXT PRIMARY KEY, version TEXT, at TEXT, value TEXT)')
        db.execute('CREATE TABLE IF NOT EXISTS card_active (version TEXT PRIMARY KEY, revision TEXT)')

def read(connect, version=None, history=False):
    with connect() as db:
        rows=db.execute('SELECT r.value FROM card_active a JOIN card_revisions r ON a.revision=r.id'+(' WHERE a.version=?' if version else ''),(version,) if version else ()).fetchall()
        values=[json.loads(r[0]) for r in rows]
        if version:
            result=values[0] if values else dict(version=version,id='',skills={})
            if history:result['revisions']=[json.loads(r[0]) for r in db.execute('SELECT value FROM card_revisions WHERE version=? ORDER BY at,id',(version,))]
            return result
        return {v['version']:v for v in values}

def write(connect, catalog, value):
    version=value.get('version');base=next((v for v in catalog if v.get('versionId',v.get('id'))==version),None)
    if not base:raise ValueError('武将版本不存在')
    reason=value.get('reason','')
    if not isinstance(reason,str) or not reason.strip() or len(reason)>4000:raise ValueError('请填写修改或恢复原因（最多4000字）')
    current=read(connect,version);expected=value.get('expected','')
    if expected!=current['id']:raise ValueError('这个版本已在另一页修改，请重新选择后继续')
    skills=copy.deepcopy(current['skills']);restored=None
    if 'restore' in value:
        restored=value['restore']
        if restored:
            with connect() as db:row=db.execute('SELECT value FROM card_revisions WHERE id=? AND version=?',(restored,version)).fetchone()
            if not row:raise ValueError('要恢复的修改记录不存在')
            skills=json.loads(row[0])['skills']
        else:skills={}
    else:
        operation=value.get('operation','modify');sid=value.get('skill')
        if operation not in {'add','modify','delete','restore-skill'}:raise ValueError('技能操作无效')
        original=next((s for s in base.get('skillDetails',[]) if s['id']==sid),None)
        if operation=='add':
            if not sid:sid='added_'+secrets.token_hex(8)
            if not isinstance(sid,str) or not re.fullmatch(r'added_[a-zA-Z0-9_]{1,80}',sid):raise ValueError('新增技能标识无效')
            if original or sid in skills:raise ValueError('技能已存在，请使用修改操作')
            original=dict(id=sid,name='',description='')
        elif not original and sid in skills and skills[sid].get('added'):original=skills[sid]['original']
        if not original:raise ValueError('所选版本中没有这个技能')
        patch={k:value.get(k,'') for k in ('name','description','code')}
        for k,limit in [('name',120),('description',16000),('code',200000)]:
            if not isinstance(patch[k],str) or len(patch[k])>limit:raise ValueError('技能内容格式无效或过长')
        prior=skills.get(sid,dict(original={k:original.get(k,'') for k in ('id','name','description')},history=[],added=operation=='add'))
        previous=prior.get('current',{k:original.get(k,'') for k in ('name','description')})
        if operation=='delete':patch={**previous,'deleted':True}
        elif operation=='restore-skill':patch={**previous,'deleted':False}
        else:
            if not patch['name'].strip() or not patch['description'].strip():raise ValueError('技能名称与说明不能为空')
            if prior.get('added') and not patch['code'].strip():raise ValueError('新增技能需要可运行代码；仅有文字请保留为草稿')
            patch['deleted']=False
        prior['history'].append(dict(at=datetime.now(timezone.utc).isoformat(),operation=operation,before=copy.deepcopy(previous),after=copy.deepcopy(patch),reason=reason.strip()))
        prior['current']=patch;skills[sid]=prior
    result=dict(id='card-'+secrets.token_hex(12),version=version,at=datetime.now(timezone.utc).isoformat(),parent=current['id'],reason=reason.strip(),skills=skills)
    if restored is not None:result['restoredFrom']=restored
    with connect() as db:
        row=db.execute('SELECT revision FROM card_active WHERE version=?',(version,)).fetchone()
        if (row[0] if row else '')!=expected:raise ValueError('这个版本已在另一页修改，请重新选择后继续')
        db.execute('INSERT INTO card_revisions VALUES(?,?,?,?)',(result['id'],version,result['at'],json.dumps(result,ensure_ascii=False)))
        db.execute('INSERT OR REPLACE INTO card_active VALUES(?,?)',(version,result['id']))
    return read(connect,version,True)
