"""Read-only artwork catalog; sharing uses stripped display names, not person IDs."""
import html
import json
import re
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
LIBRARY=ROOT/'module-01/skin-library'
PREFIXES=sorted('闪耀战姬 闪耀 烽火起 崭峥嵘 峥嵘 汉末神 汉末 长安神 春秋梦 春秋 战役篇 九鼎 智将 K系列 荆州 雒城 长安 乌巢 燕幽 用间 经典 手杀 新杀 十周年 会玩 欢乐 OL SP TW RE J.SP SCL PE ddd gz_ std_ 那兔 虎牢 武将传 文心雕龙 渭南 风云 荆扬 江东 樊城 定军 白马 合肥 欧陆 官渡 骰子 传械 奇巧 集蜜 铁索 画饼 仇渊 赛马 骏骊 骥 S特 五官王 祭风 毅重 节钺 国战 龙 荆 魂 忍 御 冥 爻 有 兴 勘律 书 乐 将 侠 友 合 嗔 威 射 工神 天侯 神箭 威武 扶危 巧魁 断狱 枯目 恶来 毅勇 百计 浴火 翊汉 绝尘 烈帝 桃 梦 礼 缘 转 起 蛇 衰 慢 神 界 谋 族 势 星 幻 新 旧 汉 晋 标 狂 牢 芳许 数学 数 承 君 玄 结依 ☆ ★ 青史 雁翎 闪 徐兖 疑 新秀 魔 武 烈 圣'.split(),key=len,reverse=True)

def normalize(name,protected=()):
    """Remove version decorations while protecting known bare personal names."""
    name=html.unescape(re.sub(r'<[^>]*>','',str(name or ''))).strip()
    name=re.sub(r'[（(](?:移动版|十周年|OL|国战|测试服)[^）)]*[）)]$','',name).strip()
    name=re.sub(r'^\d+(?:SP)?','',name,flags=re.I)
    for _ in range(12):
        prefix=next((p for p in PREFIXES if name.lower().startswith(p.lower()) and len(name)>len(p)+1),None)
        if not prefix:break
        candidate=name[len(prefix):].lstrip('_ -·')
        if name in protected and candidate not in protected:
            # Keep actual names such as 武安国 rather than stripping their surname.
            probe=candidate
            for _ in range(12):
                p=next((p for p in PREFIXES if probe.lower().startswith(p.lower()) and len(probe)>len(p)+1),None)
                if not p:break
                probe=probe[len(p):].lstrip('_ -·')
                if probe in protected:break
            if probe not in protected:break
        name=candidate
    return name

class Library:
    def __init__(self,catalog,wiki):
        file=LIBRARY/'catalog.json'
        self.catalog=json.loads(file.read_text(encoding='utf-8')) if file.is_file() else {'skins':[],'summary':{}}
        self.protected=set(self.catalog.get('protectedNames',[])) or {e['name'] for e in wiki['entities'] if not e.get('canonicalId')}
        self.version_names={v['versionId']:normalize(v.get('name') or v.get('displayName'),self.protected) for v in catalog['versions']+wiki['versions']}
        self.version_names.update(self.catalog.get('versionNames',{}))
        self.name_ids={}
        for v in catalog['versions']+wiki['versions']:
            name=self.version_names[v['versionId']]
            self.name_ids.setdefault(name,set()).add(v['id'])
        self.by_name={}
        for skin in self.catalog['skins']:
            for name in skin['names']:self.by_name.setdefault(name,[]).append(skin)
        self.names=sorted(self.by_name)
        self.by_hash={s['hash']:s for s in self.catalog['skins']}

    def get(self,key='',binding='',name=''):
        name=binding or self.version_names.get(key) or name
        return {'name':name,'skins':self.by_name.get(name,[]),'count':len(self.by_name.get(name,[])),'characterIds':sorted(self.name_ids.get(name,[]))}

    def overview(self):
        return {'summary':self.catalog['summary'],'names':[{'name':n,'count':len(self.by_name[n])} for n in self.names]}

    def image(self,rel):
        match=re.fullmatch(r'(images|thumbs)/([a-f0-9]{64})\.jpg',rel)
        if not match or match[2] not in self.by_hash:return None
        p=LIBRARY/rel
        return p if p.is_file() else None
