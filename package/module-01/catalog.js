'use strict';
(() => {
const data=window.RESOURCE_DATA;
if(!data){document.body.textContent='资源数据未加载。请将目录中的文件保留在一起，再打开 index.html。';return;}
const $=id=>document.getElementById(id);
const fmt=n=>Number(n).toLocaleString('zh-CN');
const size=n=>n>=1e9?(n/1e9).toFixed(2)+' GB':n>=1e6?(n/1e6).toFixed(1)+' MB':n>=1e3?(n/1e3).toFixed(1)+' KB':n+' B';
const url=p=>p.split('/').map(encodeURIComponent).join('/');
const plain=s=>String(s??'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'');
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const link=(text,p)=>{const a=node('a',text);a.href=url(p);a.target='_blank';a.rel='noopener';return a;};
let tab='resources',kind='image',page=1,filtered=[],timer,bgBlob;
const pageSize=40;
const groups={wei:'魏',shu:'蜀',wu:'吴',qun:'群',shen:'神',jin:'晋',key:'Key',western:'西方'};
const groupName=g=>Array.isArray(g)?g.map(groupName).join(' / '):groups[g]||g||'未标明';
const sourceNames={shijian:'诗笺移动包',ziqi:'子琪电脑版'};
const portraitPath=c=>c.portraitPath||(c.portrait?'package/'+c.portrait:null);
const definitionPath=c=>c.sourcePath||'package/'+c.source;
$('stat-files').textContent=fmt(data.summary.totalIndexedFiles);
$('stat-images').textContent=fmt(data.summary.kindCounts.image);
$('stat-characters').textContent=fmt(data.summary.sourceCounts.uniqueCharacterIds);
$('stat-audio').textContent=fmt(data.summary.kindCounts.audio);
function option(select,value,text){const o=node('option',text);o.value=value;select.append(o);}
function setupFilters(){
  $('search').value='';$('category-filter').replaceChildren();$('pack-filter').replaceChildren();$('source-filter').replaceChildren();
  option($('category-filter'),'','全部分类');option($('pack-filter'),'','全部资源包');option($('source-filter'),'','全部包体');
  option($('source-filter'),'shijian','诗笺移动包');option($('source-filter'),'ziqi','子琪电脑版');
  if(tab==='resources')option($('source-filter'),'shared','两包共有');
  if(tab==='characters'){
    const allGroups=[...new Set(data.characters.flatMap(c=>Array.isArray(c.group)?c.group:[c.group]))].filter(Boolean).sort();
    for(const g of allGroups)option($('category-filter'),g,groupName(g));
    for(const p of [...new Set(data.characters.map(c=>c.scope))].sort())option($('pack-filter'),p,p);
  }else{
    for(const c of Object.keys(data.summary.categoryLabels))if(data.resources.some(r=>(r.categories||[r.c]).includes(c)&&(!kind||r.k===kind)))option($('category-filter'),c,data.summary.categoryLabels[c]);
    for(const p of [...new Set(data.resources.filter(r=>!kind||r.k===kind).flatMap(r=>r.packs||[r.pack]))].sort())option($('pack-filter'),p,p);
  }
}
function setupSidebar(){
 const side=$('resource-sidebar');side.replaceChildren(node('div',tab==='characters'?'定义范围':'资源类型','side-label'));
 if(tab==='characters'){
   side.append(node('p','同名或同 ID 的跨包冲突采用子琪电脑版；相同定义合并。新包内不同技能或属性版本分别保留。','note'));
   side.append(node('p','人物史实分类待 Wiki 模块核实，包体阵营不等于历史身份。','note'));
   return;
 }
 const choices=[['image','图片'],['audio','音频'],['dynamic','动态骨骼 / 图集'],['video','视频'],['font','字体'],['source','代码与样式'],['data','数据与文档'],['archive','内嵌压缩包'],['other','其他'],['','全部资源']];
 for(const [k,label]of choices){
   const b=node('button');b.append(node('span',label),node('small',fmt(k?data.summary.kindCounts[k]||0:data.resources.length)));
   b.classList.toggle('active',k===kind);b.onclick=()=>{kind=k;page=1;setupFilters();setupSidebar();render();};side.append(b);
 }
 const design=node('button');design.append(node('span','设计源文件'),node('small',fmt(data.summary.kindCounts.design||0)));design.classList.toggle('active',kind==='design');design.onclick=()=>{kind='design';page=1;setupFilters();setupSidebar();render();};side.append(design);
}
function mediaPreview(r,container,large=false){
 if(r.k==='image'){
  const img=node('img');img.alt=r.n||r.p.split('/').at(-1);img.src=url(r.p);img.loading=large?'eager':'lazy';img.decoding='async';img.onerror=()=>{img.replaceWith(node('span','图片无法解码 · 原文件已保留','file-label'));};container.append(img);
 }else if(r.k==='audio'&&large){const audio=node('audio');audio.controls=true;audio.preload='none';audio.src=url(r.p);container.append(audio);}
 else if(r.k==='video'&&large){const video=node('video');video.controls=true;video.preload='metadata';video.src=url(r.p);container.append(video);}
 else{const label=r.k==='dynamic'?r.p.split('.').at(-1).toUpperCase():({audio:'♫',video:'VIDEO',font:'字',source:'CODE',data:'DATA',archive:'ZIP',design:'PSD',other:'FILE'}[r.k]||'FILE');container.append(node('span',label,'file-icon'));}
}
function resourceTile(r){
 const card=node('article',undefined,'tile');const visual=node('button',undefined,'visual'+(r.k==='image'?'':' placeholder'));visual.setAttribute('aria-label','查看 '+(r.n||r.p.split('/').at(-1)));mediaPreview(r,visual);visual.onclick=()=>showResource(r);card.append(visual);
 card.append(node('span',data.summary.categoryLabels[r.c],'badge'));
 const body=node('div',undefined,'tile-body');body.append(node('h3',(r.n?r.n+' · ':'')+r.p.split('/').at(-1)));
 const meta=node('div',undefined,'meta');meta.append(node('span',r.w?r.w+' × '+r.h:size(r.b)),node('span',r.pack));body.append(meta,node('p',r.p,'path'));
 if(r.sources)body.append(node('p',r.sources.length>1?'两包共有 · 相同内容已合并':sourceNames[r.sources[0]],'origin-note'));
 if(r.k==='audio'){const a=node('audio');a.controls=true;a.preload='none';a.src=url(r.p);a.setAttribute('aria-label','播放 '+(r.n||r.p.split('/').at(-1)));body.append(a);}
 const a=link('打开原文件 ↗',r.p);a.className='open';body.append(a);card.append(body);return card;
}
function characterTile(c){
 const card=node('article',undefined,'tile char-tile');const visual=node('button',undefined,'visual');visual.setAttribute('aria-label','查看武将 '+plain(c.name));
 if(portraitPath(c))mediaPreview({k:'image',p:portraitPath(c),n:plain(c.name)},visual);else visual.append(node('span','尚无直接匹配立绘','file-label'));
 visual.onclick=()=>showCharacter(c);card.append(visual,node('span',groupName(c.group)+' · '+(c.hp??c.maxHp??'?')+' 血','badge'));
 const body=node('div',undefined,'tile-body');body.append(node('h3',plain(c.name)),node('p',c.id,'path'),node('div',c.skillDetails.map(s=>plain(s.name)).join(' / ')||'无静态技能列表','skills'));
 const meta=node('div',undefined,'meta');meta.append(node('span',c.scope.replace('character/','').replace('extension/','')),node('span','查看定义 ↗'));body.append(meta);if(c.sourceLabel)body.append(node('p',c.sourceLabel+' · '+c.mergeStatus,'origin-note'));card.append(body);return card;
}
function render(){
 const q=$('search').value.trim().toLowerCase(),cat=$('category-filter').value,pack=$('pack-filter').value,src=$('source-filter').value;
 if(tab==='characters')filtered=data.characters.filter(c=>(!src||(c.originPackage||'shijian')===src)&&(!pack||c.scope===pack)&&(!cat||(Array.isArray(c.group)?c.group.includes(cat):c.group===cat))&&(!q||[c.id,c.name,c.source,...c.aliases||[],...c.replacesIds||[],...c.skillDetails.map(s=>s.name+' '+s.id)].join(' ').toLowerCase().includes(q)));
 else filtered=data.resources.filter(r=>{
   if(kind&&r.k!==kind)return false;
   const origins=r.sources||['shijian'];if(src==='shared'&&origins.length<2)return false;if(src&&src!=='shared'&&!origins.includes(src))return false;
   if(q&&!(r.p+' '+r.n+' '+(r.aliasSearch||'')).toLowerCase().includes(q))return false;
   if(r.bindings)return r.bindings.some(b=>(!src||src==='shared'||b.s===src)&&(!pack||b.p===pack)&&(!cat||b.c===cat||r.c===cat&&cat==='dynamic_texture'));
   return (!cat||(r.categories||[r.c]).includes(cat))&&(!pack||(r.packs||[r.pack]).includes(pack));
 });
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
 $('listing-title').textContent=tab==='characters'?'武将静态定义':({image:'图片素材',audio:'音频素材',dynamic:'动态素材',video:'视频',font:'字体',source:'代码与样式',data:'数据与文档',archive:'内嵌压缩包',other:'其他文件',design:'设计源文件'}[kind]||'全部资源');
 $('result-count').textContent=fmt(filtered.length)+' 项';$('page-number').textContent=page+' / '+pages;$('previous').disabled=page===1;$('next').disabled=page===pages;$('empty').hidden=filtered.length>0;
 $('listing-note').textContent=tab==='characters'?'合并后 '+fmt(data.characters.length)+' 条有效定义，'+fmt(data.summary.sourceCounts.uniqueCharacterIds)+' 个不同 ID；同名冲突以后包为准，原始替换记录可下载。':kind==='dynamic'?'图集和贴图按各自来源记录配套；动态播放将在界面模块接入。':'相同文件内容合并显示，保留来源与原路径别名。可筛选子琪电脑版或两包共有素材。';
 const fragment=document.createDocumentFragment();for(const r of filtered.slice((page-1)*pageSize,page*pageSize))fragment.append(tab==='characters'?characterTile(r):resourceTile(r));$('grid').replaceChildren(fragment);
}
function prepareDialog(){
 // Remove media from the previous detail before creating another one.
 $('detail-content').replaceChildren();const layout=node('div',undefined,'detail-layout'),preview=node('div',undefined,'detail-preview'),info=node('div',undefined,'detail-info');layout.append(preview,info);$('detail-content').append(layout);return{preview,info};
}
function showResource(r){const{preview,info}=prepareDialog();mediaPreview(r,preview,true);info.append(node('h2',r.n||r.p.split('/').at(-1)),node('p',data.summary.categoryLabels[r.c]+' · '+r.pack+' · '+size(r.b)),node('p',r.p));if(r.w)info.append(node('p',r.w+' × '+r.h+' 像素'));
 if(r.sources){info.append(node('p','来源：'+r.sources.map(s=>sourceNames[s]).join(' / ')+'；合并 '+r.refs+' 个原始文件引用。','source-line'));const aliases=node('details');aliases.append(node('summary','查看原路径别名'),node('p',r.aliasSearch));info.append(aliases);}
 const actions=node('div',undefined,'detail-links');actions.append(link('打开原文件 ↗',r.p));const copy=node('button','复制相对路径');copy.onclick=()=>copyText(r.p);actions.append(copy);info.append(actions);
 if(r.k==='dynamic'){const atlases=data.dynamic?.filter(d=>d.atlas===r.p||d.skeletonCandidates.includes(r.p))||[];for(const atlas of atlases){info.append(node('p',(sourceNames[atlas.originPackage]||'诗笺移动包')+' · 配套图集：'+atlas.atlas));for(const s of atlas.skeletonCandidates)info.append(link(s,s));for(const t of atlas.textures)info.append(node('p',(t.present?'已找到贴图：':'原路径未找到：')+t.path));}info.append(node('p','本模块仅整理文件和配套候选，未验证动态播放器兼容性。','desc'));}
 $('detail-dialog').showModal();}
function showCharacter(c){const{preview,info}=prepareDialog();if(portraitPath(c))mediaPreview({k:'image',p:portraitPath(c),n:plain(c.name)},preview,true);else preview.append(node('span','尚无直接匹配立绘','file-label'));
 info.append(node('h2',plain(c.name)),node('p',c.id+' · '+groupName(c.group)+' · '+(c.hp??'?')+' 血'+(c.maxHp!==undefined?' / 上限 '+c.maxHp:'')),node('p','定义来源：'+c.source+':'+c.line));
 if(c.sourceLabel)info.append(node('p','当前采用：'+c.sourceLabel+' · '+c.mergeStatus,'source-line'));
 if(c.mergedRecords?.length>1)info.append(node('p','相同定义已合并 '+c.mergedRecords.length+' 条记录；ID 别名：'+c.aliases.join(' / ')));
 if(c.portraitFallback)info.append(node('p','本包暂无直接立绘，图片使用旧包同名素材补充；技能仍采用新包定义。'));
 const actions=node('div',undefined,'detail-links');actions.append(link('查看定义文件 ↗',definitionPath(c)));info.append(actions);if(c.intro)info.append(node('p',plain(c.intro)+'\n（包内简介，未进行史实核验）','desc'));
 for(const s of c.skillDetails){const section=node('section',undefined,'skill-detail');section.append(node('h4',plain(s.name)+' · '+s.id),node('p',plain(s.description||'未静态提取到技能说明。')));const label=s.source?(s.resolution==='same_package'?'同资源包定义':'其他资源包引用候选')+' · '+(s.hasAI?'有原生 AI 字段':'未直接提取到 AI 字段'):'静态定义未解析';section.append(node('p',label));if(s.source)section.append(link('来源：'+s.source+':'+s.line,s.sourcePath||'package/'+s.source));info.append(section);}
 if(c.relatedAssets?.length){const details=node('details');details.append(node('summary','查看关联立绘、语音及皮肤候选（'+c.relatedAssets.length+'）'));const links=node('div',undefined,'asset-links');for(const a of c.relatedAssets)links.append(link(a.role+' · '+a.path,a.path));details.append(links);info.append(details);}
 info.append(node('p','人物分类：待 Wiki 模块核实。原生 AI 字段不代表已完成训练。','desc'));$('detail-dialog').showModal();}
function closeDialog(){$('detail-dialog').close();$('detail-content').replaceChildren();}
$('close-detail').onclick=closeDialog;$('detail-dialog').addEventListener('close',()=>{$('detail-content').replaceChildren();});$('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog')){const r=$('detail-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
function toast(text){$('toast').textContent=text;$('toast').hidden=false;setTimeout(()=>{$('toast').hidden=true;},2500);}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('路径已复制');}catch{toast('浏览器不允许复制，请选中详情中的路径复制。');}}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===b));$('browser-panel').hidden=!['resources','characters'].includes(tab);$('report-panel').hidden=tab!=='report';$('requirements-panel').hidden=tab!=='requirements';if(['resources','characters'].includes(tab)){page=1;setupFilters();setupSidebar();render();}});
$('search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;render();},120);});for(const id of['category-filter','pack-filter','source-filter'])$(id).onchange=()=>{page=1;render();};$('previous').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
function background(p){document.body.style.backgroundImage=p?'url("'+url(p)+'")':'';try{localStorage.setItem('shijian-catalog-background',p);}catch{}}
for(const r of data.resources.filter(r=>r.c==='background'))option($('background-picker'),r.p,r.pack+' / '+r.p.split('/').at(-1));
$('background-picker').onchange=()=>background($('background-picker').value);
$('background-upload').onchange=()=>{const f=$('background-upload').files[0];if(!f)return;if(bgBlob)URL.revokeObjectURL(bgBlob);bgBlob=URL.createObjectURL(f);document.body.style.backgroundImage='url("'+bgBlob+'")';$('background-picker').value='';toast('本地背景已用于当前浏览');};
$('clear-background').onclick=()=>{$('background-picker').value='';$('background-upload').value='';if(bgBlob){URL.revokeObjectURL(bgBlob);bgBlob=null;}background('');};
try{const saved=localStorage.getItem('shijian-catalog-background');if(saved&&data.resources.some(r=>r.p===saved&&r.c==='background')){$('background-picker').value=saved;background(saved);}}catch{}
function reportCard(title,paragraphs){const article=node('article',undefined,'report-card');article.append(node('h3',title));for(const p of paragraphs)article.append(node('p',p));$('report-content').append(article);return article;}
const summary=data.summary;
if(summary.merge){const m=summary.merge;
reportCard('双包导入与文件合并',['诗笺移动包 1.11.0 + 子琪电脑版 1.11.5.2。新版资料提取自电脑版 resources/app，未启动游戏程序。','导入 '+fmt(m.totalFileReferences)+' 个文件引用，新增实体文件 '+fmt(m.newPhysicalFiles)+' 个（'+size(m.newPhysicalBytes)+'）；'+fmt(m.reusedFileReferences)+' 个新包引用直接复用已有内容。目录当前显示 '+fmt(summary.totalIndexedFiles)+' 份不同文件内容。']);
reportCard('武将优先规则',['同名或同 ID 的跨包冲突采用子琪电脑版；完全相同的定义合并。“神、界、谋”等显示前缀保留。新版包内部不同技能或属性的版本仍分别保留。','新版静态识别 '+fmt(m.desktopCharacterDefinitions)+' 条武将定义；旧包 '+fmt(m.oldDefinitionsSuperseded)+' 条定义由新包接替，保留旧包独有 '+fmt(m.oldDefinitionsRetained)+' 条。合并后 '+fmt(m.activeCharacterDefinitions)+' 条有效定义、'+fmt(m.activeDistinctCharacterIds)+' 个不同 ID。完整替换过程可下载。']);
reportCard('技能与素材关联',['技能比较记录 ID 列表、说明和定义代码指纹；代码指纹差异表示源码有变化，不等于已经证明游戏结算不同。原生 AI 字段分别随所属来源保存，尚未进行训练。','武将详情显示实际采用的来源，关联立绘、技能代码、语音和皮肤候选。新包暂无立绘时，明确标注采用旧包同名素材补充。']);
reportCard('素材配套与检查范围',[fmt(summary.kindCounts.image)+' 张不同图片内容；新导入图片头读取问题 '+fmt(summary.imageHeaderIssues)+' 项。音频和动态动画只做抽样验证，完整配套清单可下载。','相同内容只显示一次，保留两个包的原始路径别名。旧包完整解压目录仍保留，合并前资料保存在 history/before-desktop-2026-10-02，支持回溯。']);
reportCard('规则与证据边界',['本阶段合并资源和静态资料。新包版本优先不代表已把两个包的运行代码混合；单挑引擎将明确规则和依赖版本，之后独立验收。','包内简介、搭配、替换关系仍属于包体资料，历史关系在 Wiki 模块另行核实。API 训练和成品模块组合尚未进行。']);
reportCard('验收入口',['可在“包体来源”中选择子琪电脑版或两包共有素材；武将详情标明当前采用的来源。建议搜索“孙悟空”或在资源包中选择“天庭”查看新增内容。','合并报告、替换清单、资源索引和原始文件均保存在本地。本次调整仍属于资源模块。']);
}else{
reportCard('已拆出的内容',[fmt(summary.primaryFiles)+' 个主包文件 + '+fmt(summary.nestedFiles)+' 个内嵌资源；主包解压 '+size(summary.primaryBytes)+'。7 个内嵌 ZIP 已另外解开，原始目录与压缩包均保留。','全部解压文件读取时完成 CRC 校验，并记录 SHA256。'+fmt(summary.kindCounts.image)+' 张图片均能读取图片头；没有对所有图片进行完整像素解码，也没有逐个试听所有音频。']);
reportCard('武将、技能与 AI',[fmt(summary.sourceCounts.characters)+' 条武将静态定义，'+fmt(summary.sourceCounts.uniqueCharacterIds)+' 个不同 ID；'+fmt(summary.sourceCounts.skills)+' 条技能及子技能定义，其中 '+fmt(summary.sourceCounts.skillsWithAI)+' 条带原生 AI 字段。','这些数字包括不同版本、模式专用定义和扩展内容。动态创建的内容、覆盖顺序与实际启用状态，仍需引擎模块核验。'+fmt(summary.sourceCounts.charactersWithPortrait)+' 条武将定义已有直接立绘或同名候选匹配。']);
reportCard('单挑规则与训练接口',['包内版本：1.11.0。现有 single 模式包括新 1v1、点将单挑等，发牌和替补逻辑不同。建议测试引擎以点将单挑的每人 4 张开局牌为基线，防止白板血量改变开局牌数；最终规则在引擎模块固定并记录。','决策入口和 AI 逻辑依赖游戏事件与界面对象，接入 API 需要适配合法行动、玩家可见信息、随机种子和暂停恢复。不能把资源已提取当作训练已可运行。']);
reportCard('素材配套与已知缺口',[fmt(summary.dynamicAtlases)+' 个图集，其中包括 Spine 文本图集和 JSON 精灵图集；配套文件记录在 dynamic-index.json。2 组图集共 4 个纹理引用未直接对应原路径，已找到同名、改名或 WebP 替代候选，需在动画模块核验。','3 个扩展记录或参数文件不能作为独立 JavaScript 解析，已列入报告；未修改原文件。'+fmt(summary.duplicateGroups)+' 组内容重复文件，多余副本合计约 '+size(summary.duplicateBytesBeyondFirstCopy)+'，目前全部保留。']);
reportCard('关系索引的证据边界',['已提取包内简介及 '+fmt(summary.sourceCounts.associations)+' 条搭配、替换或替身记录。这些是游戏设定证据，不能直接当作亲属、君臣、史实或演义关系。','包内 Key、联动、自制及架空版本需分别确认人物身份。Wiki 模块会保留原 ID、版本、出处和可信度，纯虚构人物归入“其他”。']);
reportCard('交付与验收',['当前交付模块 01：完整拆包、资源目录、静态数据、复用分析及需求记录。未运行包内游戏程序、未连接真实 API、未组合后续模块。','可以检查图片搜索与放大、音频试听、武将技能说明、背景切换和原始资源路径。资源浏览页面可直接打开 index.html，文件需保持在同一目录。']);
}
setupFilters();setupSidebar();render();
})();
