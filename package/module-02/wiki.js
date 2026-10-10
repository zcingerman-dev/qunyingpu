'use strict';
(() => {
const base=window.WIKI_DATA,network=window.WIKI_RELATION_NETWORK,$=id=>document.getElementById(id);
if(!base){document.body.textContent='Wiki 数据未加载，请保留模块目录中的文件。';return;}
if(!network){document.body.textContent='关系资料未加载，请保留 relation-network.js 并刷新页面。';return;}
// Add a curated feed without changing the original catalog digest or personal saves.
base.entities.push(...network.entities);base.sources.push(...network.sources);base.relations.push(...network.relations);
for(const r of base.relations)Object.assign(r,network.relationSupplements?.[r.id]||{});
for(const e of base.entities){const s=network.entitySupplements[e.id];if(!s)continue;e.aliases=[...new Set([...(e.aliases||[]),...(s.aliases||[])])];e.note=s.replaceNote?s.note:(e.note||'')+(s.note?'\n'+s.note:'');e.identityEvidence=[...(e.identityEvidence||[]),...(s.sources||[])];for(const k of ['name','category','world','citation','graphEligible','canonicalId'])if(k in s)e[k]=s[k];}
const identityNetwork={...network,groups:JSON.parse(JSON.stringify(network.groups))};
const labels=window.WikiIdentity.labels;
const evidenceLabels={history:'史籍记载',literature:'作品情节',package:'包体设定',custom:'自定义'};
const confidenceLabels={verified:'已核实',package:'包体资料',pending:'待核实',custom:'个人设定'};
const groupLabels={wei:'魏',shu:'蜀',wu:'吴',qun:'群',shen:'神',jin:'晋',key:'Key'};
const kindLabels={family:'亲属',marriage:'婚姻',service:'君臣与任职',friend:'好友 / 故交',co_spouse:'同妻妾',title:'同称号 / 合称',sworn:'结义',plot:'情节关联',pair:'包内搭配',substitute:'包内替换',conflict:'冲突 / 诛杀',support:'援护 / 合作',diplomacy:'外交 / 册封',custom:'自定义'};
const clone=o=>JSON.parse(JSON.stringify(o)),fmt=n=>Number(n).toLocaleString('zh-CN');
const empty=()=>({entities:{},customEntities:[],customVersions:[],relations:{},hiddenRelations:[],identityOverrides:{},versionRecords:{}});
const plain=s=>String(s??'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
const option=(select,value,text)=>{const n=el('option',text);n.value=value;select.append(n);};
const encoded=p=>p.split('/').map(encodeURIComponent).join('/');
const asset=p=>'../module-01/'+encoded(p);
const safeLink=(text,href)=>{const a=el('a',text);if(/^https?:\/\//i.test(href)){a.href=href;a.target='_blank';a.rel='noopener';}else if(href.startsWith('../module-01/')){a.href=href;a.target='_blank';}return a;};
const uuid=prefix=>prefix+(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(16).slice(2));
const sources=new Map(base.sources.map(s=>[s.id,s]));
let cardChanges={};
let state=empty(),revision=0,token='',online=false,busy=false,people=[],versions=[],relations=[],personMap,versionMap,peopleByLabel,personLabels,searchIndex,history=[];
let view='directory',category='',page=1,selected='',selectedVersion='',detailTab='skills',timer,bgBlob,editSave,pendingImport;
const storeKey='noname-wiki-v1-'+base.catalogDigest;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,4500);}
function sourceLinks(list,container){
 for(const r of list||[]){const s=r.sourceId?sources.get(r.sourceId):r;if(!s)continue;if(s.url)container.append(safeLink(s.title,s.url));else if(s.path)container.append(safeLink(s.title+(s.line?' : '+s.line:''),asset(s.path)));}
}
function sourceText(e){return (e.identityEvidence||[]).map(r=>{const s=r.sourceId?sources.get(r.sourceId):r;return s?.url||s?.title||'';}).join('\n');}
function hydrate(){
 const prepared=window.WikiIdentity.prepare(base,identityNetwork,state);
 people=prepared.people;personMap=prepared.personMap;network.groups=prepared.groups;
 const rank=v=>(v.scope==='character/standard'?0:v.originPackage==='ziqi'?1:v.originPackage==='user'?2:3);
 versions=prepared.versions.sort((a,b)=>rank(a)-rank(b)||a.displayName.localeCompare(b.displayName,'zh-CN'));
 versionMap=new Map(versions.map(v=>[v.versionId,v]));
 relations=prepared.relations;
 const featured=['赵云','曹操','刘备','孙权','关羽','诸葛亮','貂蝉','孙悟空'];
 people.sort((a,b)=>{const ai=featured.indexOf(a.name),bi=featured.indexOf(b.name);return (ai<0?999:ai)-(bi<0?999:bi)||a.name.localeCompare(b.name,'zh-CN')||a.world.localeCompare(b.world,'zh-CN');});
 const labelCounts=new Map();for(const e of people){const label=e.name+' · '+e.world;labelCounts.set(label,(labelCounts.get(label)||0)+1);}
 personLabels=new Map(people.map(e=>{const label=e.name+' · '+e.world;return[e.id,label+(labelCounts.get(label)>1?' · '+e.id:'')];}));peopleByLabel=new Map([...personLabels].map(([id,label])=>[label,id]));
 searchIndex=new Map(people.map(e=>[e.id,[e.name,e.world,...e.aliases||[],...e.versionIds.flatMap(id=>{const v=versionMap.get(id),record=state.versionRecords[id];return[v.id,v.displayName,...v.aliases||[],...v.skillDetails.flatMap(s=>[s.id,plain(s.name)]),...record?[record.label,...record.skillDetails.flatMap(s=>[s.id,plain(s.name)])]:[]];})].join(' ').toLowerCase()]));
 $('stat-people').textContent=fmt(people.length);$('stat-versions').textContent=fmt(versions.length);$('stat-relations').textContent=fmt(relations.length+network.groups.reduce((n,g)=>n+g.participants.length,0));
 for(const key of ['all',...Object.keys(labels)])$('count-'+key).textContent=fmt(key==='all'?people.length:people.filter(e=>e.category===key).length);
 const datalist=document.createDocumentFragment();for(const label of peopleByLabel.keys()){const o=el('option');o.value=label;datalist.append(o);}$('people-options').replaceChildren(datalist);
 const prior=$('graph-kind').value;$('graph-kind').replaceChildren();option($('graph-kind'),'','全部关系类型');for(const k of new Set([...relations.map(r=>r.kind),...network.groups.map(g=>g.kind)]))option($('graph-kind'),k,kindLabels[k]||k);$('graph-kind').value=prior;
 selected=personMap.get(selected)?.id||people.find(e=>e.name==='赵云')?.id||people[0]?.id||'';
 renderDirectory();renderPerson();renderCoverage();graphView.refresh();
 if(view==='graph')renderGraph();
 versionView.refresh();
}
function validateState(s){
 const fields=['entities','customEntities','customVersions','relations','hiddenRelations','identityOverrides','versionRecords'];
 if(s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).length===6&&!('versionRecords' in s))s={...s,versionRecords:{}};
 if(!s||typeof s!=='object'||Array.isArray(s)||fields.some(k=>!(k in s))||Object.keys(s).length!==fields.length)throw Error('资料结构不正确');
 for(const k of ['entities','relations','identityOverrides','versionRecords'])if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))throw Error('记录映射不正确');
 for(const k of ['customEntities','customVersions','hiddenRelations'])if(!Array.isArray(s[k]))throw Error('记录列表不正确');
 const ids=new Set(base.entities.map(e=>e.id));
 const validatePerson=p=>{if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['id','name','category','world','note','citation','aliases'].includes(k)))throw Error('人物字段不支持');if(typeof p.name!=='string'||!p.name.trim()||!labels[window.WikiIdentity.category(p.category,p.world)])throw Error('人物名称或分类不正确');if(typeof p.citation!=='string'||p.category!=='pending'&&!p.citation.trim())throw Error('确认分类需要填写来源');if(typeof p.note!=='string'||typeof p.world!=='string'||!Array.isArray(p.aliases)||p.aliases.some(a=>typeof a!=='string'||!a.trim()))throw Error('人物资料类型不正确');};
 for(const e of s.customEntities){validatePerson(e);if(!e.id?.startsWith('user-p-')||ids.has(e.id))throw Error('自建人物 ID 重复或无效');ids.add(e.id);}
 for(const [key,e]of Object.entries(s.entities)){if(!ids.has(key)||e.id!==undefined&&e.id!==key)throw Error('编辑的人物不存在或 ID 不一致');validatePerson(e);}
 const versionIds=new Set(base.versions.map(v=>v.versionId));
 for(const v of s.customVersions){if(!v.versionId?.startsWith('user-v-')||versionIds.has(v.versionId)||!ids.has(v.entityId))throw Error('版本 ID 或人物不正确');versionIds.add(v.versionId);if(!v.id?.trim()||!v.displayName?.trim()||!Number.isFinite(v.hp)||v.hp<1||v.hp>999||!Array.isArray(v.skillDetails))throw Error('版本名称、体力或技能不正确');if(!Array.isArray(v.skills)||JSON.stringify(v.skills)!==JSON.stringify(v.skillDetails.map(s=>s.id)))throw Error('技能列表不一致');for(const skill of v.skillDetails)if(!skill.id?.trim()||!skill.name?.trim()||typeof skill.description!=='string')throw Error('技能内容不正确');}
 const relationIds=new Set(base.relations.map(r=>r.id));
 for(const [key,r]of Object.entries(s.relations)){if(r.id!==key||!relationIds.has(key)&&!key.startsWith('user-r-'))throw Error('关系 ID 不正确');relationIds.add(key);if(!ids.has(r.from)||!ids.has(r.to)||r.from===r.to||!r.label?.trim()||!r.reverseLabel?.trim()||!r.citation?.trim()||!evidenceLabels[r.evidenceType]||!['verified','package','pending','custom'].includes(r.confidence)||typeof r.symmetric!=='boolean'||!r.kind?.trim()||!Array.isArray(r.sources)||r.sources.length)throw Error('关系资料不完整');}
 if(s.hiddenRelations.some(id=>!relationIds.has(id)))throw Error('隐藏关系不存在');
 for(const [v,e]of Object.entries(s.identityOverrides))if(!versionIds.has(v)||!ids.has(e))throw Error('版本归属不存在');
 for(const [id,r]of Object.entries(s.versionRecords)){
  if(!versionIds.has(id)||!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join(',')!=='citation,label,note,skillDetails')throw Error('版本技能记录格式或归属不正确');
  if(typeof r.label!=='string'||!r.label.trim()||r.label.length>120||typeof r.note!=='string'||typeof r.citation!=='string'||r.note.length>10000||r.citation.length>10000||!Array.isArray(r.skillDetails)||r.skillDetails.length>100)throw Error('版本技能记录内容不正确');
  const seen=new Set();for(const skill of r.skillDetails){if(!skill||typeof skill!=='object'||Object.keys(skill).sort().join(',')!=='description,id,name'||typeof skill.id!=='string'||!skill.id.trim()||skill.id.length>120||typeof skill.name!=='string'||!skill.name.trim()||skill.name.length>120||typeof skill.description!=='string'||skill.description.length>10000||seen.has(skill.id))throw Error('技能标识重复或技能资料不完整');seen.add(skill.id);}
 }
 if(JSON.stringify(s).length>2e6)throw Error('资料超过本版本可导入上限');
 return s;
}
async function request(route,method='GET',payload){
 const response=await fetch((location.pathname.startsWith('/wiki/')?'/wiki':'')+route,{method,headers:payload?{'Content-Type':'application/json','X-Wiki-Token':token}:{},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(8000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'本地存储读取失败');return result;
}
async function commit(next,reason){
 if(busy)throw Error('正在保存，请稍后');next=validateState(next);busy=true;
 try{
  if(online){const r=await request('/api/state','PUT',{state:next,expectedRevision:revision,catalogDigest:base.catalogDigest,reason});state=r.state;revision=r.revision;}
  else{
   const item={revision:revision+1,created:new Date().toISOString(),reason,state:clone(next)};
   const nextHistory=[item,...history].slice(0,30);
   localStorage.setItem(storeKey,JSON.stringify({catalogDigest:base.catalogDigest,state:next,revision:item.revision,history:nextHistory}));state=next;revision=item.revision;history=nextHistory;
  }
  hydrate();updateStatus();toast('已保存：'+reason);if(view==='manage')await renderHistory();
 }finally{busy=false;}
}
function updateStatus(){$('storage-status').textContent=(online?'已连接本地资料库':'浏览器本地保存 · 建议导出备份')+' · 资料记录 #'+revision;}
function portrait(path,name,container){if(!path){container.append(el('span',name.slice(0,1)));return;}const img=el('img');img.alt=name;img.src=asset(path);img.loading='lazy';img.onerror=()=>img.replaceWith(el('span',name.slice(0,1)));container.append(img);}
function renderDirectory(){
 const q=$('search').value.trim().toLowerCase(),faction=$('faction').value,origin=$('origin').value;
 const matches=people.filter(e=>(!category||e.category===category)&&(!q||CharacterSearch.matches(q,[e.name,...e.aliases||[],...e.versionIds.map(id=>versionMap.get(id).displayName)],searchIndex.get(e.id)))&&(!faction&&!origin||e.versionIds.some(id=>{const v=versionMap.get(id);return(!origin||v.originPackage===origin)&&(!faction||(Array.isArray(v.group)?v.group.includes(faction):v.group===faction));})));
 const pages=Math.max(1,Math.ceil(matches.length/24));page=Math.min(page,pages);$('result-count').textContent=fmt(matches.length)+' 位人物';$('page').textContent=page+' / '+pages;$('prev').disabled=page===1;$('next').disabled=page===pages;$('empty').hidden=matches.length>0;
 const fragment=document.createDocumentFragment();
 for(const e of matches.slice((page-1)*24,page*24)){
  const card=button('',()=>selectPerson(e.id),'person-card'+(selected===e.id?' selected':''));card.setAttribute('aria-label','查看人物 '+e.name);card.dataset.entityId=e.id;
  const art=el('div',undefined,'card-portrait');portrait(e.portrait,e.name,art);const body=el('div',undefined,'card-body');body.append(el('h3',e.name),el('p',e.world,'card-world'));
  const meta=el('div',undefined,'card-meta');meta.append(el('span',labels[e.category],'tag '+e.category),el('span',e.versionIds.length?e.versionIds.length+' 个版本':'关系人物'));body.append(meta);card.append(art,body);fragment.append(card);
 }$('people-grid').replaceChildren(fragment);
}
function selectPerson(id){if(!personMap.has(id))return;selected=personMap.get(id).id;selectedVersion='';detailTab='skills';setView('directory');renderDirectory();renderPerson();historyHash();}
function historyHash(){try{window.history.replaceState(null,'','#person='+encodeURIComponent(selected));}catch{}}
function sourceLabel(v){return {ziqi:'电脑版资料',shijian:'移动版资料',user:'本地新增'}[v.originPackage]||v.sourceLabel;}
function versionLabel(v){return v.displayName+' · '+sourceLabel(v)+' · '+v.scope.replace('character/','').replace('extension/','');}
function renderSkills(v,parent){
 if(!v){parent.append(el('p','这个人物暂无武将版本，可补充资料版本。','detail-empty'));return;}
 const meta=el('div',undefined,'version-meta');for(const t of [v.id,(Array.isArray(v.group)?v.group.map(g=>groupLabels[g]||g).join('/'):groupLabels[v.group]||v.group||'未标势力'),(v.hp??'?')+' 血',sourceLabel(v),v.originPackage==='user'?'新增资料版本 · 暂不可对战':'采用合并后的有效定义'])meta.append(el('span',t,'tag'));parent.append(meta);
 if(v.sourceURL){parent.append(safeLink('BWiki 版本来源 ↗',v.sourceURL));if(v.released)parent.append(el('p','上线日期：'+v.released+(v.testServer?' · 测试服，独立将池':'')+' · 资料核对截至 2026-10-04','note'));if(v.availability==='rules-unpublished')parent.append(el('p','完整技能规则尚未公开；此版本仅记录资料，暂不加入实战将池。','note'));}
 if(v.sourcePath)parent.append(safeLink('查看版本定义 ↗',asset(v.sourcePath)));
 for(const s of v.skillDetails){const section=el('section',undefined,'skill');const title=el('h4',plain(s.name));title.append(el('small',s.id));if(s.added){title.style.color='#287cb5';title.append(el('small','新增'));}if(s.deleted){title.style.textDecoration='line-through';title.append(el('small','已删除 · 不参与结算'));}section.append(title,el('p',plain(s.description||'暂缺技能说明')));const source=el('div',s.hasAI?'有原生 AI 字段 · 尚未训练':'','source');if(s.sourcePath)source.append(safeLink(' 来源文件 ↗',asset(s.sourcePath)));section.append(source);if(s.descriptionEvidence&&!s.descriptionEvidence.silent&&!s.modification){const e=s.descriptionEvidence,d=el('details',undefined,'skill-description-source');d.append(el('summary','说明补齐来源'+(e.history?.length?' · 历史版本':'')),el('p',e.note));d.append(safeLink('BWiki · '+e.title+' ↗',e.url));d.append(el('p','核对日期：'+e.checkedAt.slice(0,10)+(e.history?.length?' · '+e.history.join('、'):''),'note'));section.append(d);}if(s.modification){const m=s.modification,d=el('details',undefined,'skill-modification');d.append(el('summary','修改备注 · '+m.history.length+'次'));d.append(el('p','原技能：'+plain(m.original.name)+' · '+plain(m.original.description||'原包缺少描述')));for(const x of m.history)d.append(el('p',x.at+'\n修改前：'+plain(x.before.description)+'\n修改后：'+plain(x.after.description)+'\n原因：'+x.reason));section.append(d);}parent.append(section);}
 if(!v.skillDetails.length)parent.append(el('p','无技能资料。','detail-empty'));
 if(v.portraitFallback)parent.append(el('p','本版本立绘使用旧包同名素材补充，技能仍采用电脑版定义。','note'));
}
function relationRow(r,center){
 const row=el('article',undefined,'relation-row'),title=el('div',undefined,'row-title'),out=r.from===center,other=personMap.get(out?r.to:r.from);
 title.append(el('span',personMap.get(center)?.name+(r.symmetric?' ↔ ':' → ')),button(other?.name||'未匹配人物',()=>selectPerson(other?.id),'person-link'),el('span','：'+(out?r.label:r.reverseLabel)),el('span',window.RelationshipNetwork.evidenceText(r),'evidence '+r.evidenceType),el('span',r.confidence==='verified'&&state.relations[r.id]?'用户标为已核实':confidenceLabels[r.confidence]||'待核实','note'));row.append(title);
 if(r.note)row.append(el('p',r.note,'note'));const links=el('div',undefined,'source-list');sourceLinks(r.sources,links);if(r.citation)links.append(el('span','本地来源：'+r.citation));row.append(links);
 const actions=el('div',undefined,'head-actions');actions.append(button('编辑关系',()=>editRelation(r)));actions.append(button('隐藏关系',async()=>{try{const next=clone(state);for(const id of r.mergedIds||[r.id])if(!next.hiddenRelations.includes(id))next.hiddenRelations.push(id);await commit(next,'隐藏关系 '+r.label);}catch(e){toast(e.message);}}));row.append(actions);return row;
}
function renderPerson(){
 const panel=$('person-panel');panel.replaceChildren();const e=personMap.get(selected);if(!e)return;
 const head=el('div',undefined,'person-head'),imageBox=el('div');portrait(e.portrait,e.name,imageBox);const info=el('div');info.append(el('h2',e.name),el('span',labels[e.category],'tag '+e.category),el('p',e.world,'world'));
 const actions=el('div',undefined,'head-actions');actions.append(button('编辑人物',()=>editPerson(e)),button('关系图谱',()=>{$('graph-group').value='';$('graph-center').value=personLabel(e.id);setView('graph');}),button('版本技能图',()=>versionView.open(e.id),'version-map-button'));info.append(actions);head.append(imageBox,info);panel.append(head,el('p',e.note,'identity-note'));
 const citations=el('div',undefined,'source-list');sourceLinks(e.identityEvidence,citations);if(e.citation)citations.append(el('span','分类依据：'+e.citation));panel.append(citations);
 if(e.canonicalId)panel.append(button('查看对应人物：'+personMap.get(e.canonicalId)?.name,()=>selectPerson(e.canonicalId),'person-link'));
 if(e.graphEligible===false)panel.append(el('p','仅保留人物简介与游戏版本，不纳入三国关系图谱及连接路径。','note'));
 const recordCount=e.versionIds.filter(id=>state.versionRecords[id]).length;if(recordCount)panel.append(el('p','已保存 '+recordCount+' 条个人版本技能记录，可在“版本技能图”查看。','note'));
 const tabs=el('div',undefined,'detail-tabs');for(const[k,label]of [['skills','版本与技能'],['relations','人物关系'],['assets','素材'],['notes','包内简介']]){const b=button(label,()=>{detailTab=k;renderPerson();},detailTab===k?'active':'');tabs.append(b);}panel.append(tabs);
 if(detailTab==='relations'){
  const rows=relations.filter(r=>r.from===e.id||r.to===e.id);graphView.memberships(e.id,panel);for(const r of rows)panel.append(relationRow(r,e.id));if(!rows.length&&!network.groups.some(g=>g.participants.some(p=>p.personId===e.id)))panel.append(el('p','暂无已录入关系，可以添加有出处的关系。','detail-empty'));panel.append(button('新增关系',()=>editRelation(null,e.id)));return;
 }
 const current=versionMap.get(selectedVersion);if(!current||current.entityId!==e.id)selectedVersion=e.versionIds[0]||'';
 const v=versionMap.get(selectedVersion);
 if(e.versionIds.length){const select=el('select',undefined,'version-select');select.id='version-select';select.setAttribute('aria-label','武将版本');for(const id of e.versionIds)option(select,id,versionLabel(versionMap.get(id)));select.value=selectedVersion;select.onchange=()=>{selectedVersion=select.value;renderPerson();};panel.append(select);}
 if(detailTab==='skills'){
  const buttons=el('div',undefined,'head-actions');if(e.versionIds.length>1)buttons.append(button('比较版本',()=>openCompare(e)));buttons.append(button('新增资料版本',()=>editVersion(e)));if(v){buttons.append(button('调整版本归属',()=>editOwnership(v)));if(v.originPackage!=='user'&&v.availability!=='rules-unpublished'){const favorite=el('a','收藏此版本','button');favorite.href='/personal/index.html?wikiFavorite='+encodeURIComponent(v.versionId);favorite.target='_blank';favorite.rel='noopener';buttons.append(favorite);const link=el('a','实战体验此版本','wiki-experience');link.href='/play/index.html?wikiVersion='+encodeURIComponent(v.versionId);link.target='_blank';link.rel='noopener';buttons.append(link);}}panel.append(buttons);renderSkills(v,panel);
 }else if(detailTab==='assets'){
  const assets=el('div',undefined,'asset-list');if(v?.portraitPath){const box=el('div',undefined,'card-portrait');box.style.height='280px';portrait(v.portraitPath,v.displayName,box);assets.append(box);}
  const items=v?.relatedAssets||[];for(const a of items.slice(0,80)){assets.append(safeLink(a.role+' · '+a.path.split('/').at(-1),asset(a.path)));if(/\.(mp3|ogg|wav)$/i.test(a.path)){const audio=el('audio');audio.src=asset(a.path);audio.controls=true;audio.preload='none';assets.append(audio);}}
  if(!items.length)assets.append(el('p','当前版本暂无直接关联素材。','detail-empty'));if(items.length>80)assets.append(el('p','仅列前 80 项，完整清单见版本索引。','note'));panel.append(assets);if(v){const shared=button('查看同名武将皮肤',()=>SkinLibrary.gallery({key:v.versionId,title:v.displayName+' · 同名共享皮肤',select:false}));panel.append(shared);const note=el('p','正在读取共享皮肤数量…','note');panel.append(note);SkinLibrary.forVersion(v.versionId).then(r=>{if(note.isConnected)note.textContent=r.count?`${r.name}的各个版本共用 ${r.count} 张皮肤；在“我的”收藏此版本后选择使用。`:'该名字暂无导入皮肤。';}).catch(err=>{if(note.isConnected)note.textContent=err.message;});}
 }else{
  panel.append(el('p',plain(v?.intro||'包内未提供简介。'),'intro'),el('p','以上是包体中的人物简介或架空故事；未自动转换为史实关系。','note'));
 }
}
function setView(name){view=name;for(const k of ['directory','graph','manage'])$(k+'-view').hidden=k!==name;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==='graph'){if(!$('graph-center').value)$('graph-center').value=personLabel(selected);renderGraph();}if(name==='manage'){renderCoverage();renderHistory().catch(e=>toast(e.message));}}
function personLabel(id){return personLabels.get(personMap.get(id)?.id||id)||'';}
function resolvePerson(text){if(peopleByLabel.has(text))return peopleByLabel.get(text);if(personMap.has(text))return text;let found=people.filter(e=>e.name===text||(e.aliases||[]).includes(text));if(!found.length)found=people.filter(e=>CharacterSearch.matches(text,[e.name,...e.aliases||[]]));return found.length===1?found[0].id:null;}
function graphPerson(id){return personMap?.get(id)?.id||id;}
function isGraphEligible(id){return personMap?.get(id)?.graphEligible!==false&&!personMap?.get(id)?.canonicalId;}
function filteredRelations(){return relations.filter(r=>isGraphEligible(r.from)&&isGraphEligible(r.to)&&window.RelationshipNetwork.matchesEvidence(r,$('graph-evidence').value)&&(!$('graph-kind').value||r.kind===$('graph-kind').value));}
function renderGraph(){graphView.render();}
function findPath(){
 const from=graphPerson(resolvePerson($('path-from').value)),to=graphPerson(resolvePerson($('path-to').value)),result=$('path-result');result.replaceChildren();
 if(!from||!to){result.append(el('p','请从人物建议列表选择有效的起点和终点。'));return;}
 if(!isGraphEligible(from)||!isGraphEligible(to)){result.append(el('p','其中有人物仅保留简介，不纳入三国关系图谱及连接路径；版本别名请使用对应人物。'));return;}
 if(from===to){result.append(el('p','起点与终点是同一人物。'));return;}
 const found=window.RelationshipNetwork.shortestPath(from,to,filteredRelations(),graphView.allowedGroups());
 if(!found){result.append(el('p','当前已录入关系和筛选范围中未找到连接；不代表两人没有关系。'));return;}
 const addNode=id=>{const g=network.groups.find(g=>g.id===id);return g?button(g.name,()=>graphView.openGroup(id),'person-link group-path'):button(personMap.get(id)?.name||id,()=>selectPerson(id),'person-link');};
 result.append(addNode(from));for(const step of found)result.append(el('span','— '+step.label+' / '+window.RelationshipNetwork.evidenceText(step.relation)+' →','step'),addNode(step.to));
 result.append(el('p','这条路径只说明已录入的关系或参与记录；同一称号、同一情节不等于好友，跨证据类型不构成新的史实结论。','note path-explanation'));
}
function field(name,label,value,type='text',options,parent=$('edit-fields')){const wrapper=el('label',label,'field'+(type==='checkbox'?' checkbox':''));let input;if(type==='select'){input=el('select');for(const[k,v]of options)option(input,k,v);}else if(type==='textarea'){input=el('textarea');input.rows=4;}else{input=el('input');input.type=type;}input.name=name;input.id='edit-'+name;if(type==='checkbox')input.checked=!!value;else input.value=value??'';if(name==='from'||name==='to'||name==='entity')input.setAttribute('list','people-options');wrapper.append(input);parent.append(wrapper);return input;}
function openEdit(title,build,save){$('edit-title').textContent=title;$('edit-fields').replaceChildren();$('edit-error').textContent='';build();editSave=save;$('edit-dialog').showModal();}
const values=()=>Object.fromEntries(new FormData($('edit-form')).entries());
function editPerson(e){openEdit(e?'编辑人物 · '+e.name:'新增人物',()=>{field('name','人物名称',e?.name);field('category','人物分类',e?.category||'works','select',Object.entries(labels));field('world','历史时期或作品',e?.world||'我的创作');field('note','人物说明 / 我的笔记',e?.note||'','textarea');field('citation','分类依据与出处',e?.citation||sourceText(e||{}),'textarea');field('aliases','别名（每行一个）',(e?.aliases||[]).join('\n'),'textarea');},async data=>{
 const item={name:data.name.trim(),category:data.category,world:data.world.trim(),note:data.note,citation:data.citation.trim(),aliases:data.aliases.split('\n').map(s=>s.trim()).filter(Boolean)};
 const next=clone(state);if(e)next.entities[e.id]=item;else{item.id=uuid('user-p-');next.customEntities.push(item);selected=item.id;}await commit(next,(e?'编辑人物 ':'新增人物 ')+item.name);
 });}
function editRelation(r,from=selected){openEdit(r?'编辑关系':'新增人物关系',()=>{field('from','起点人物',personLabel(r?.from||from));field('to','终点人物',personLabel(r?.to));field('label','起点是终点的…（如：父亲、君主）',r?.label||'友人');field('reverseLabel','终点是起点的…（如：儿子、臣属）',r?.reverseLabel||'友人');field('kind','关系类型',r?.kind||'custom','select',Object.entries(kindLabels));field('evidenceType','证据类型',r?.evidenceType||'custom','select',Object.entries(evidenceLabels));field('confidence','核实状态',r?.confidence||'pending','select',[['pending','待核实'],['verified','已核实（自行确认）'],['package','包体资料'],['custom','个人自定义']]);field('symmetric','双向相同的关系',r?.symmetric||false,'checkbox');field('citation','出处 / 来源说明',r?.citation||(r?.sources||[]).map(x=>x.sourceId?sources.get(x.sourceId)?.url:x.path+':'+x.line).join('\n'),'textarea');field('note','适用范围与备注',r?.note||'','textarea');},async data=>{
 const item={id:r?.id||uuid('user-r-'),from:resolvePerson(data.from),to:resolvePerson(data.to),label:data.label.trim(),reverseLabel:data.reverseLabel.trim(),kind:data.kind,symmetric:!!data.symmetric,evidenceType:data.evidenceType,confidence:data.confidence,citation:data.citation.trim(),note:data.note,sources:[]};const next=clone(state);next.relations[item.id]=item;next.hiddenRelations=next.hiddenRelations.filter(id=>id!==item.id);await commit(next,'保存关系 '+data.label);
 });}
function editVersion(e){openEdit('为 '+e.name+' 新增资料版本',()=>{field('id','武将 ID','my_character');field('displayName','版本显示名',e.name+' · 自定义');field('group','游戏势力','qun','select',Object.entries(groupLabels));field('hp','初始体力',4,'number');let index=0;const addSkill=()=>{const i=index++,row=el('section',undefined,'skill');row.append(el('h3','技能 '+(i+1)),button('移除此技能',()=>row.remove()));field('skillId'+i,'技能标识','my_skill_'+(i+1),'text',undefined,row);field('skillName'+i,'技能名称','我的技能','text',undefined,row);field('skillDescription'+i,'技能说明','','textarea',undefined,row);$('edit-fields').append(row);};addSkill();$('edit-fields').append(button('再加一个技能',addSkill));$('edit-fields').append(el('p','此处新增资料版本，不执行技能脚本。可执行的技能请在基础实战的本地扩展中编写。','note'));},async data=>{
 const skillDetails=Object.keys(data).filter(k=>/^skillId\d+$/.test(k)).map(k=>{const i=k.slice(7);return{id:data[k].trim(),name:data['skillName'+i].trim(),description:data['skillDescription'+i]};}),item={versionId:uuid('user-v-'),entityId:e.id,id:data.id.trim(),displayName:data.displayName.trim(),group:data.group,hp:Number(data.hp),scope:'我的资料',sourceLabel:'本地新增',originPackage:'user',skills:skillDetails.map(s=>s.id),skillDetails};const next=clone(state);next.customVersions.push(item);await commit(next,'新增版本 '+item.displayName);selectedVersion=item.versionId;renderPerson();
 });}
function editOwnership(v){openEdit('调整版本所属人物',()=>{field('entity','归属人物',personLabel(v.entityId));$('edit-fields').append(el('p',v.displayName+' · '+v.id+'；版本技能和包体来源保持原样。','note'));},async data=>{const id=resolvePerson(data.entity);if(!id)throw Error('请从建议列表选择有效人物');const next=clone(state);next.identityOverrides[v.versionId]=id;await commit(next,'调整版本归属 '+v.displayName);selected=id;selectedVersion=v.versionId;renderDirectory();renderPerson();});}
function openCompare(e){for(const id of ['compare-left','compare-right']){$(id).replaceChildren();for(const key of e.versionIds)option($(id),key,versionLabel(versionMap.get(key)));}$('compare-left').value=e.versionIds[0];$('compare-right').value=e.versionIds[1];renderCompare();$('compare-dialog').showModal();}
function renderCompare(){const a=versionMap.get($('compare-left').value),b=versionMap.get($('compare-right').value),box=$('compare-content');box.replaceChildren();if(!a||!b)return;const same=a.definitionFingerprint&&a.definitionFingerprint===b.definitionFingerprint;box.append(el('p',same?'定义指纹相同。':'技能列表、说明、属性或定义指纹不同；请分别查看。','difference'));for(const v of [a,b]){const article=el('article');article.append(el('h3',v.displayName));renderSkills(v,article);box.append(article);}}
function renderCoverage(){const box=$('coverage');box.replaceChildren();if(network.identityAudit){const a=network.identityAudit;box.append(el('p','本次审核原待核实记录 '+fmt(a.reviewedRecords)+' 条，归档 '+fmt(a.resolvedRecords)+' 条；同人物合并 '+fmt(a.mergedRecords)+' 条。下方显示当前人物分类数量。','note'));}for(const key of Object.keys(labels)){const count=people.filter(e=>e.category===key).length,row=el('div',undefined,'coverage-row'),progress=el('progress');progress.max=people.length;progress.value=count;row.append(el('span',labels[key]+' '+fmt(count)),progress);box.append(row);}box.append(el('p',relations.filter(r=>r.evidenceType==='history').length+' 条史籍关系 · '+relations.filter(r=>r.evidenceType==='literature').length+' 条作品关系 · '+relations.filter(r=>r.evidenceType==='package').length+' 条包体关系','note'));box.append(el('p',network.groups.filter(g=>g.kind==='title').length+' 组共同称号 · '+network.groups.filter(g=>g.kind==='plot').length+' 个著名情节（独立节点）','note'));}
async function renderHistory(){const box=$('history');box.replaceChildren();const items=online?(await request('/api/history')).history:history;for(const item of items){const row=el('div',undefined,'history-row');row.append(el('span','#'+item.revision+' · '+item.reason+'\n'+new Date(item.created).toLocaleString('zh-CN')));if(item.revision!==revision)row.append(button('恢复此记录',async()=>{try{
 if(online){const r=await request('/api/restore','POST',{revision:item.revision,expectedRevision:revision,reason:'恢复记录 #'+item.revision});state=r.state;revision=r.revision;hydrate();updateStatus();await renderHistory();toast('已恢复并保留此前历史');}
 else await commit(clone(item.state),'恢复记录 #'+item.revision);
 }catch(e){toast(e.message);}}));box.append(row);}if(!items.length)box.append(el('p','还没有个人编辑记录。','note'));}
function exportData(){const data={schemaVersion:1,catalogDigest:base.catalogDigest,exportedAt:new Date().toISOString(),revision,state};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='群英谱-我的资料-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出个人编辑备份');}
async function prepareImport(file){try{if(!file)return;if(file.size>4*1024*1024)throw Error('导入文件超过 4 MB');const data=JSON.parse(await file.text());if(data.schemaVersion!==1||data.catalogDigest!==base.catalogDigest)throw Error('备份格式或武将目录版本不一致');data.state=validateState(data.state);pendingImport=data.state;$('import-summary').textContent=Object.keys(data.state.entities).length+' 条人物编辑，'+data.state.customEntities.length+' 位新增人物，'+data.state.customVersions.length+' 个新增版本，'+Object.keys(data.state.relations).length+' 条关系编辑，'+Object.keys(data.state.versionRecords).length+' 条版本技能记录。';$('import-dialog').showModal();}catch(e){toast('导入失败：'+e.message);}finally{$('import').value='';}}
async function runCommand(){const text=$('console-input').value.trim(),split=text.indexOf(' '),command=split<0?text:text.slice(0,split),args=split<0?'':text.slice(split+1);let result;try{
 if(command==='help')result={queries:['stats','find 姓名或技能','show 人物ID','groups 称号或情节关键词','group 称号或情节ID'],writes:['set-person {"id":"人物ID","name":"名称","category":"works","world":"出处","note":"笔记","citation":"来源","aliases":[]}','add-relation {"from":"人物ID","to":"人物ID","label":"友人","reverseLabel":"友人","kind":"custom","symmetric":true,"evidenceType":"custom","confidence":"pending","citation":"我的设定","note":""}','add-version {"entityId":"人物ID","id":"my_general","displayName":"新版本","group":"qun","hp":4,"skillDetails":[{"id":"my_skill","name":"技能","description":"规则"}]}']};
 else if(command==='stats')result={people:people.length,versions:versions.length,relations:relations.length,titleGroups:network.groups.filter(g=>g.kind==='title').length,storyEvents:network.groups.filter(g=>g.kind==='plot').length,revision,storage:online?'本地资料库':'浏览器本地保存'};
 else if(command==='find')result=people.filter(e=>CharacterSearch.matches(args,[e.name,...e.aliases||[]],searchIndex.get(e.id))).slice(0,40).map(e=>({id:e.id,name:e.name,world:e.world,versions:e.versionIds.length}));
 else if(command==='show'){const e=personMap.get(resolvePerson(args)||args);if(!e)throw Error('人物不存在');result={...e,versions:e.versionIds.map(id=>versionMap.get(id)),relations:relations.filter(r=>r.from===e.id||r.to===e.id),memberships:network.groups.filter(g=>g.participants.some(p=>p.personId===e.id))};}
 else if(command==='groups')result=network.groups.filter(g=>g.name.includes(args)).map(g=>({id:g.id,name:g.name,kind:g.kind,evidenceType:g.evidenceType}));
 else if(command==='group')result=network.groups.find(g=>g.id===args||g.name===args)||'未找到该称号或情节';
 else{const payload=JSON.parse(args),next=clone(state);if(command==='set-person'){const {id,...fields}=payload;if(!personMap.has(id))throw Error('人物不存在');next.entities[id]=fields;}
 else if(command==='add-relation'){payload.id=uuid('user-r-');payload.sources=[];next.relations[payload.id]=payload;}
 else if(command==='add-version'){payload.versionId=uuid('user-v-');payload.skills=payload.skillDetails.map(s=>s.id);payload.scope='我的资料';payload.sourceLabel='本地新增';payload.originPackage='user';next.customVersions.push(payload);}
 else throw Error('不支持的命令，请输入 help');await commit(next,'控制台 '+command);result={saved:true,revision};}
 $('console-output').textContent=JSON.stringify(result,null,2);
 }catch(e){$('console-output').textContent='操作未写入：'+e.message;}}
for(const b of document.querySelectorAll('nav button'))b.onclick=()=>setView(b.dataset.view);
for(const b of document.querySelectorAll('[data-category]'))b.onclick=()=>{category=b.dataset.category;page=1;document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('active',x===b));renderDirectory();};
$('search').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;renderDirectory();},120);};for(const id of ['faction','origin'])$(id).onchange=()=>{page=1;renderDirectory();};$('prev').onclick=()=>{page--;renderDirectory();};$('next').onclick=()=>{page++;renderDirectory();};
for(const id of ['draw-graph','find-path','run-command','export','add-person','add-relation','refresh-history'])$(id).onclick=({ 'draw-graph':()=>{$('graph-group').value='';renderGraph();},'find-path':findPath,'run-command':runCommand,export:exportData,'add-person':()=>editPerson(null),'add-relation':()=>editRelation(null),'refresh-history':()=>renderHistory().catch(e=>toast(e.message))})[id];
for(const id of ['graph-evidence','graph-kind','graph-depth'])$(id).onchange=()=>{renderGraph();$('path-result').replaceChildren();};
for(const id of ['close-edit','cancel-edit'])$(id).onclick=()=>$('edit-dialog').close();$('edit-form').onsubmit=async event=>{event.preventDefault();$('edit-error').textContent='';$('save-edit').disabled=true;try{await editSave(values());$('edit-dialog').close();}catch(e){$('edit-error').textContent=e.message;}finally{$('save-edit').disabled=false;}};
$('close-compare').onclick=()=>$('compare-dialog').close();for(const id of ['compare-left','compare-right'])$(id).onchange=renderCompare;
for(const id of ['close-import','cancel-import'])$(id).onclick=()=>{$('import-dialog').close();pendingImport=null;};$('import').onchange=()=>prepareImport($('import').files[0]);$('confirm-import').onclick=async()=>{try{if(pendingImport){await commit(clone(pendingImport),'导入个人资料');$('import-dialog').close();pendingImport=null;}}catch(e){toast('导入未完成：'+e.message);}};
function background(path){document.body.style.backgroundImage=path?'url("'+encoded(path)+'")':'';try{localStorage.setItem('wiki-background',path);}catch{}}
$('background').onchange=()=>background($('background').value);$('background-file').onchange=async()=>{try{const file=$('background-file').files[0];if(!file)return;const {pickImage}=await import('/studio/image-picker.js');const result=await pickImage(file);if(!result)return;document.body.style.backgroundImage='url("'+result.image+'")';$('background').value='';}catch(e){toast(e.message);}};
async function init(){
 if(location.protocol!=='file:')try{const r=await request('/api/state');if(r.catalogDigest!==base.catalogDigest)throw Error('本地编辑与当前武将目录版本不符，请先导出旧编辑');state=validateState(r.state);revision=r.revision;token=r.token;online=true;}catch(e){toast('采用浏览器本地保存：'+e.message);}
 if(!online)try{const saved=JSON.parse(localStorage.getItem(storeKey));if(saved?.catalogDigest===base.catalogDigest){state=validateState(saved.state);revision=saved.revision;history=saved.history||[];}else history=[{revision:0,created:new Date().toISOString(),reason:'初始化',state:empty()}];}catch(e){toast('浏览器存储不可读，编辑后请导出备份');}
 if(location.pathname.startsWith('/wiki/')){try{const r=await(await fetch('/api/card-improvements')).json();cardChanges=r.changes||{};for(const [key,change]of Object.entries(cardChanges)){const v=base.versions.find(v=>v.versionId===r.links[key]);if(v){v.cardImprovement=change;v.skillDetails=[...v.skillDetails.map(s=>({...s,...change.skills[s.id]?.current,modification:change.skills[s.id],added:!!change.skills[s.id]?.added})),...Object.entries(change.skills).filter(([id,m])=>m.added&&!v.skillDetails.some(s=>s.id===id)).map(([id,m])=>({id,...m.current,added:true,modification:m}))];}}}catch(e){toast('武将改良记录暂时不可读取：'+e.message);}}
 const match=location.hash.match(/person=([^&]+)/);if(match)selected=decodeURIComponent(match[1]);hydrate();updateStatus();
 const params=new URL(location.href).searchParams;if(params.get('view')==='graph'){const group=params.get('group');if(group&&network.groups.some(g=>g.id===group))$('graph-group').value=group;setView('graph');}
 const linked=new URL(location.href).searchParams.get('playVersion');if(linked&&location.pathname.startsWith('/wiki/')){try{const r=await(await fetch('/api/version-link?play='+encodeURIComponent(linked))).json();if(r.wikiVersion){const v=versionMap.get(r.wikiVersion);if(v){selected=v.entityId;selectedVersion=v.versionId;renderDirectory();renderPerson();historyHash();}}else toast('此版本暂无对应的人物资料。');}catch{toast('关联资料暂时不可读取');}}
 try{const saved=localStorage.getItem('wiki-background');if([...$('background').options].some(o=>o.value===saved)){background(saved);$('background').value=saved;}}catch{}
}
const graphView=window.RelationshipNetwork.create({
 getGroups:()=>network.groups,getPerson:id=>personMap?.get(id),getRelations:filteredRelations,isEligible:isGraphEligible,sourceLinks,evidenceLabels,relationRow,
 selectPerson,resolveCenter:()=>{const text=$('graph-center').value.trim();return graphPerson(text?resolvePerson(text):selected);},
 setCenter:id=>{$('graph-center').value=personLabel(id);},openGraph:()=>setView('graph')
});
const versionView=window.createVersionSkillView({
 getPerson:id=>personMap?.get(id),getVersions:id=>versions.filter(v=>v.entityId===id),getRecord:id=>state.versionRecords[id],sourceUrl:asset,
 saveRecord:async(id,record)=>{const next=clone(state);if(record)next.versionRecords[id]=record;else delete next.versionRecords[id];await commit(next,(record?'保存版本技能记录 ':'恢复包内技能资料 ')+(versionMap.get(id)?.displayName||id));},
 addVersion:id=>editVersion(personMap.get(id))
});
init().catch(e=>{toast(e.message);console.error(e);});
})();
