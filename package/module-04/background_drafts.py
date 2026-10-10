"""Recoverable model drafts. Generation never applies or publishes a skill."""
import threading
import json

def initialize(studio):
    with studio.connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, at TEXT, value TEXT)')
        for key,raw in db.execute('SELECT id,value FROM drafts').fetchall():
            item=json.loads(raw)
            if item['status']=='pending':
                item.update(status='failed',error='服务重启导致生成中断；不会自动再次调用，请重新生成')
                db.execute('UPDATE drafts SET value=? WHERE id=?',(studio.dump(item),key))
def save(studio,draft):
    with studio.connect() as db:db.execute('INSERT OR REPLACE INTO drafts VALUES(?,?,?)',(draft['id'],draft['at'],studio.dump(draft)))
def get(studio,key):
    with studio.connect() as db:row=db.execute('SELECT value FROM drafts WHERE id=?',(key,)).fetchone()
    if not row:raise ValueError('后台草案不存在')
    return json.loads(row[0])
def list_items(studio):
    with studio.connect() as db:return {'drafts':[json.loads(r[0]) for r in db.execute('SELECT value FROM drafts ORDER BY at DESC')]}
def create(studio,value):
    requested=value.get('requested');version=value.get('version')
    if not isinstance(requested,dict) or requested.get('version')!=version:raise ValueError('技能草案目标无效')
    if not any(v['versionId']==version for v in json.loads((studio.HERE.parent/'module-03/play-catalog.json').read_text(encoding='utf8'))['versions']) and not any(v['id']==version for v in studio.read()[1]['diy']):raise ValueError('草案武将不存在')
    prompt=studio.short(value.get('prompt',''),200000)
    if not prompt.strip():raise ValueError('草案指令不能为空')
    draft=dict(id=studio.ident('draft-'),at=studio.now(),version=version,requested=requested,status='pending',answer=None,error='')
    save(studio,draft)
    def work():
        try:
            result=studio.model_call(None,'武将卡改良草案',prompt,draft['id']);draft.update(status='done',**result)
        except Exception as error:draft.update(status='failed',error=str(error))
        with studio.LOCK:save(studio,draft)
    threading.Thread(target=work,daemon=True).start();return draft
