'use strict';
window.createVersionSkillView=function(api){
 const $=id=>document.getElementById(id),dialog=$('version-map-dialog');
 const text=value=>String(value??'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'');
 const make=(tag,value,cls)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;if(cls)node.className=cls;return node;};
 const action=(label,fn,cls)=>{const node=make('button',label,cls);node.type='button';node.onclick=fn;return node;};
 const clone=value=>JSON.parse(JSON.stringify(value));
 let personId='',currentId='',mode='cards',editing=false,saving=false,focusSkill='',all=[],visible=[],skillIndex;
 function skillsFor(version){return $('version-map-data').value==='records'&&api.getRecord(version.versionId)?api.getRecord(version.versionId).skillDetails:version.skillDetails;}
 function labelFor(version){return $('version-map-data').value==='records'&&api.getRecord(version.versionId)?api.getRecord(version.versionId).label:version.displayName;}
 function hintFor(version){const peers=all.filter(v=>labelFor(v)===labelFor(version)&&v.scope===version.scope&&v.originPackage===version.originPackage);return peers.length>1?'同名版本 '+(peers.findIndex(v=>v.versionId===version.versionId)+1)+' / '+peers.length:'';}
 function analyze(){
  all=api.getVersions(personId);skillIndex=new Map();
  for(const version of all){for(const skill of skillsFor(version)){
   if(!skillIndex.has(skill.id))skillIndex.set(skill.id,{id:skill.id,name:text(skill.name),versions:new Set(),descriptions:new Set()});
   const entry=skillIndex.get(skill.id);entry.versions.add(version.versionId);entry.descriptions.add(text(skill.description).replace(/\s+/g,' ').trim());
  }}
  const query=$('version-map-search').value.trim().toLowerCase(),origin=$('version-map-origin').value;
  visible=all.filter(v=>(!origin||v.originPackage===origin)&&(!query||CharacterSearch.matches(query,[labelFor(v),v.displayName],[v.id,...skillsFor(v).flatMap(s=>[s.id,text(s.name),text(s.description)])].join(' '))));
  if(!visible.some(v=>v.versionId===currentId)){currentId=visible[0]?.versionId||'';focusSkill='';}
  const person=api.getPerson(personId);
  $('version-map-title').textContent=(person?.name||'人物')+' · 版本技能图';
  const summary=$('version-map-summary');summary.replaceChildren();
  for(const [number,label]of [[all.length,'个武将版本'],[skillIndex.size,'种技能标识'],[all.filter(v=>api.getRecord(v.versionId)).length,'条个人记录']]){
   const item=make('div');item.append(make('strong',number),make('span',label));summary.append(item);
  }
  summary.append(make('p','当前显示 '+visible.length+' 个版本 · 点击版本查看、记录或校订技能。','note'));
 }
 function skillClass(id){const entry=skillIndex.get(id);return entry?.descriptions.size>1?'varied':entry?.versions.size>1?'shared':'unique';}
 function choose(id,skill=''){
  if(editing){$('version-record-error').textContent='请先保存或取消当前编辑，再切换版本。';return;}
  currentId=id;focusSkill=skill;renderOverview();renderDetail();
  dialog.dataset.panel='detail';
  if(skill){for(const section of $('version-map-detail').querySelectorAll('[data-skill]'))if(section.dataset.skill===skill)section.scrollIntoView({block:'nearest'});}
 }
 function renderOverview(){
  const box=$('version-map-overview'),top=box.scrollTop,left=box.scrollLeft;box.replaceChildren();
  $('version-mode-cards').setAttribute('aria-pressed',mode==='cards');$('version-mode-matrix').setAttribute('aria-pressed',mode==='matrix');
  if(!visible.length){box.append(make('p',all.length?'没有匹配的版本，请调整搜索或来源。':'这个人物暂无武将版本，点击“新增版本”建立技能资料。','empty'));return;}
  if(mode==='cards'){
   const grid=make('div',undefined,'version-card-grid');
   for(const version of visible){
    const card=action('',()=>choose(version.versionId),'version-card'+(currentId===version.versionId?' selected':''));card.dataset.version=version.versionId;card.setAttribute('aria-label','查看技能版本 '+labelFor(version));card.setAttribute('aria-pressed',currentId===version.versionId);
    const title=make('div',undefined,'version-card-title');title.append(make('h3',labelFor(version)));if($('version-map-data').value==='records'&&api.getRecord(version.versionId))title.append(make('span','个人记录','tag record-tag'));card.append(title);
    card.append(make('p',({ziqi:'电脑版资料',shijian:'移动版资料',user:'本地新增'}[version.originPackage]||version.sourceLabel)+' · '+version.scope.replace('character/','').replace('extension/','')+' · '+(version.hp??'?')+' 血','note'),make('small',version.id,'version-code'));if(hintFor(version))card.append(make('span',hintFor(version),'note'));
    const tags=make('div',undefined,'version-skill-tags');for(const skill of skillsFor(version)){
     const tag=make('span',text(skill.name),'skill-chip '+skillClass(skill.id));tag.title=skill.id+'\n'+text(skill.description);tags.append(tag);
    }if(!skillsFor(version).length)tags.append(make('span','暂无技能','note'));card.append(tags);grid.append(card);
   }box.append(grid);
  }else{
   const table=make('table',undefined,'version-skill-matrix'),head=make('thead'),headRow=make('tr');headRow.append(make('th','技能 / 武将版本'));
   for(const v of visible){const th=make('th');th.append(action(labelFor(v),()=>choose(v.versionId)),make('small',({ziqi:'电脑版资料',shijian:'移动版资料',user:'本地新增'}[v.originPackage]||v.sourceLabel)+' · '+v.scope.replace('character/','').replace('extension/',''),'note'));if(hintFor(v))th.append(make('small',hintFor(v),'note'));if($('version-map-data').value==='records'&&api.getRecord(v.versionId))th.append(make('small','个人记录','record-tag'));headRow.append(th);}head.append(headRow);table.append(head);
   const body=make('tbody'),shown=new Set(visible.flatMap(v=>skillsFor(v).map(s=>s.id)));
   for(const entry of skillIndex.values()){if(!shown.has(entry.id))continue;const row=make('tr'),title=make('th');title.append(make('span',entry.name),make('small',entry.id,'version-code'));if(entry.descriptions.size>1)title.append(make('small','说明有差异','varied-label'));row.append(title);
    for(const v of visible){const cell=make('td'),found=skillsFor(v).find(s=>s.id===entry.id);if(found){const b=action('●',()=>choose(v.versionId,entry.id),'matrix-skill '+skillClass(entry.id));b.setAttribute('aria-label','查看 '+labelFor(v)+' 的 '+text(found.name));b.title=text(found.description)||'暂无技能说明';cell.append(b);}else cell.append(make('span','—','matrix-empty'));row.append(cell);}
    body.append(row);
   }table.append(body);box.append(table);if(!shown.size)box.append(make('p','当前版本暂无技能说明，可通过“记录 / 编辑技能”补充。','empty'));
  }box.scrollTop=top;box.scrollLeft=left;
 }
 function renderDetail(){
  const box=$('version-map-detail');box.replaceChildren();box.append(action('← 返回版本列表',()=>{dialog.dataset.panel='overview';},'version-return'));const version=all.find(v=>v.versionId===currentId);if(!version){box.append(make('p','选择一个版本查看技能。','detail-empty'));return;}
  const record=api.getRecord(currentId),usingRecord=$('version-map-data').value==='records'&&record;
  const heading=make('div',undefined,'version-detail-heading');heading.append(make('h3',labelFor(version)),make('span',usingRecord?'我的版本技能记录':version.originPackage==='user'?'新增版本资料':'包内版本技能','tag'+(usingRecord?' record-tag':'')));box.append(heading);
  box.append(make('p',({ziqi:'电脑版资料',shijian:'移动版资料',user:'本地新增'}[version.originPackage]||version.sourceLabel)+' · '+version.id+' · '+(version.hp??'?')+' 血','note'));if(hintFor(version))box.append(make('p',hintFor(version),'note'));
  const actions=make('div',undefined,'head-actions');actions.append(action(record?'编辑技能记录':'记录 / 编辑技能',()=>editRecord(version),'primary'));if(record)actions.append(action('恢复包内资料',()=>resetRecord(version)));box.append(actions);
  if(record&&!usingRecord)box.append(make('p','此版本已有个人记录；切换“我的记录优先”查看。','record-note'));
  if(usingRecord){if(record.note)box.append(make('p',record.note,'record-note'));if(record.citation)box.append(make('p','记录依据：'+record.citation,'note'));if(record.label!==version.displayName)box.append(make('p','包内版本名称：'+version.displayName,'note'));}
  if(version.sourcePath){const a=make('a','查看包内原定义 ↗');a.href=api.sourceUrl(version.sourcePath);a.target='_blank';a.rel='noopener';box.append(a);}
  for(const skill of skillsFor(version)){
   const section=make('section',undefined,'skill'+(focusSkill===skill.id?' focused-skill':''));section.dataset.skill=skill.id;
   const h=make('h4',text(skill.name));h.append(make('small',skill.id));section.append(h,make('span',skillIndex.get(skill.id)?.versions.size+' 个版本使用','skill-chip '+skillClass(skill.id)),make('p',text(skill.description||'暂无技能说明')));box.append(section);
  }if(!skillsFor(version).length)box.append(make('p','此版本暂无技能资料，可以直接记录技能。','detail-empty'));
 }
 function setEditing(value){editing=value;for(const id of ['version-map-search','version-map-origin','version-map-data','version-map-add','version-mode-cards','version-mode-matrix'])$(id).disabled=value;}
 function editRecord(version){
  setEditing(true);const old=api.getRecord(version.versionId),draft=clone(old||{label:version.displayName,skillDetails:version.skillDetails.map(s=>({id:s.id,name:text(s.name),description:text(s.description)})),note:'',citation:'据 '+({ziqi:'电脑版资料',shijian:'移动版资料',user:'本地新增'}[version.originPackage]||version.sourceLabel)+' / '+version.id+' 的包内资料整理'});
  const box=$('version-map-detail');box.replaceChildren();box.append(make('h3','记录技能 · '+version.displayName),make('p','填入这个版本的技能清单；修改会作为个人记录保存。','note'));
  const form=make('form');form.id='version-record-form';let index=0;
  function field(parent,label,value,type='text',name){const wrapper=make('label',label,'field'),input=make(type==='textarea'?'textarea':'input');if(type==='textarea')input.rows=3;else input.type=type;input.name=name;input.value=value||'';input.maxLength=type==='textarea'?10000:120;wrapper.append(input);parent.append(wrapper);return input;}
  field(form,'版本记录名称',draft.label,'text','label');field(form,'版本备注',draft.note,'textarea','note');field(form,'记录依据 / 出处',draft.citation,'textarea','citation');
  const rows=make('div');rows.id='version-record-skills';form.append(rows);
  function addSkill(skill={id:'',name:'',description:''}){
   if(rows.children.length>=100){error.textContent='每个版本最多记录 100 个技能。';return;}
   const i=index++,row=make('section',undefined,'record-skill-row');row.append(make('h4','技能 '+(i+1)),action('移除',()=>row.remove(),'record-remove'));
   field(row,'技能标识',skill.id,'text','skillId'+i).dataset.field='id';field(row,'技能名称',skill.name,'text','skillName'+i).dataset.field='name';field(row,'技能说明',skill.description,'textarea','skillDescription'+i).dataset.field='description';rows.append(row);
  }
  const error=make('p','','error');error.id='version-record-error';error.setAttribute('role','alert');
  for(const skill of draft.skillDetails)addSkill(skill);form.append(action('添加技能',()=>addSkill()),error);
  const actions=make('div',undefined,'record-form-actions'),cancel=action('取消',()=>{setEditing(false);renderDetail();}),save=make('button','保存技能记录','primary');save.type='submit';actions.append(cancel,save);form.append(actions);box.append(form);
  form.onsubmit=async event=>{
   event.preventDefault();if(saving)return;error.textContent='';saving=true;save.disabled=true;cancel.disabled=true;$('close-version-map').disabled=true;
   const record={label:form.elements.namedItem('label').value.trim(),note:form.elements.namedItem('note').value,citation:form.elements.namedItem('citation').value,skillDetails:[...rows.children].map(row=>Object.fromEntries([...row.querySelectorAll('[data-field]')].map(input=>[input.dataset.field,input.dataset.field==='description'?input.value:input.value.trim()])))};
   try{await api.saveRecord(version.versionId,record);setEditing(false);refresh();}catch(e){error.textContent=e.message;}finally{saving=false;save.disabled=false;cancel.disabled=false;$('close-version-map').disabled=false;}
  };
 }
 async function resetRecord(version){if(saving)return;saving=true;const id=version.versionId;try{await api.saveRecord(id,null);refresh();}catch(e){$('version-map-detail').append(make('p',e.message,'error'));}finally{saving=false;}}
 function refresh(){if(!dialog.open)return;analyze();renderOverview();if(!editing)renderDetail();}
 function open(id){if(saving)return;personId=id;currentId='';focusSkill='';mode='cards';dialog.dataset.panel='overview';setEditing(false);$('version-map-search').value='';$('version-map-origin').value='';$('version-map-data').value='records';if(!dialog.open)dialog.showModal();dialog.scrollTop=0;refresh();$('version-map-search').focus();}
 $('close-version-map').onclick=()=>{if(!saving){setEditing(false);dialog.close();}};
 dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();else setEditing(false);});
 for(const id of ['version-map-search','version-map-origin','version-map-data'])$(id).addEventListener(id==='version-map-search'?'input':'change',()=>{if(id!=='version-map-data')dialog.dataset.panel='overview';refresh();});
 $('version-mode-cards').onclick=()=>{mode='cards';$('version-map-overview').scrollTop=0;$('version-map-overview').scrollLeft=0;renderOverview();};$('version-mode-matrix').onclick=()=>{mode='matrix';$('version-map-overview').scrollTop=0;$('version-map-overview').scrollLeft=0;renderOverview();};
 $('version-map-add').onclick=()=>{$('version-map-search').value='';$('version-map-origin').value='';api.addVersion(personId);};
 return{open,refresh};
};
