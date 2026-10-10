import {loadCharacter} from './noname/init/loading.js';
import {alignSavedCode} from './rule-alignment.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function compileCardPatch(env,code,prefix){
 const {lib,game,ui,get,ai,_status}=env;
 const pack=Function('lib','game','ui','get','ai','_status','prefix',code)(lib,game,ui,get,ai,_status,prefix);
 if(!pack||typeof pack!=='object'||Object.keys(pack).some(k=>!['skill','translate'].includes(k))||!pack.skill?.[prefix+'main'])throw Error('草案必须返回 skill、translate，主技能必须是 prefix+main');
 for(const id of Object.keys(pack.skill))if(!id.startsWith(prefix)||lib.skill[id])throw Error('草案技能必须使用独立 prefix，且不能覆盖原技能ID');
 for(const id of Object.keys(pack.translate||{}))if(!id.startsWith(prefix))throw Error('草案翻译必须使用独立 prefix');
 for(const skill of Object.values(pack.skill))if(!skill||typeof skill!=='object')throw Error('技能逻辑格式无效');
 const refs=new Set(Object.keys(pack.skill));
 for(const [id,skill]of Object.entries(pack.skill))for(const sub of Object.keys(skill.subSkill||{}))refs.add(id+'_'+sub);
 for(const skill of Object.values(pack.skill))for(const field of ['group','global','derivation']){
  const ids=skill[field]===undefined?[]:Array.isArray(skill[field])?skill[field]:[skill[field]];
  if(ids.some(id=>typeof id!=='string'||!refs.has(id)))throw Error('辅助技能引用必须在本草案的独立命名空间中定义');
 }
 return pack;
}
export async function installCardImprovements(env,launch,record){
 const {lib,get,ui}=env,runtime=launch.settings.studioRuntime||{};
 if(!Object.keys(runtime.cardImprovements||{}).length&&!runtime.cardPreflight)return;
 const catalog=await(await fetch('./play-catalog.json')).json();lib.studioCardById={};let context='',buildingCard=false;
 const resolve=(p,sid)=>[p?.name1||p?.name,p?.name2].map(id=>lib.studioCardById[id]).find(c=>c?.skills[sid]);
 const engineId=v=>v.family?'studio_'+v.id.replaceAll('-','_')+'_general':v.id;
 const nativeIds=v=>lib.character[engineId(v)]?.skills||Object.values(lib.characterPack).find(p=>p[engineId(v)])?.[engineId(v)]?.skills||[];
 const hasSkill=(v,sid)=>v.skillDetails?.some(s=>s.id===sid)||nativeIds(v).includes(sid)||v.family&&nativeIds(v).some(id=>id.endsWith('_'+sid));
 const originalInfo=get.skillInfoTranslation.bind(get);
 get.skillInfoTranslation=function(id,p,noHTML=true){const change=p?resolve(p,id):context&&(buildingCard||document.querySelector('.menubg.charactercard'))?lib.studioCardById[context]:null,m=change?.skills[id];if(!m)return originalInfo(id,p,noHTML);const text=m.current.description;return noHTML?text:(m.added?'<span style="color:#63adf0">新增技能</span> ':'')+esc(text).replaceAll('\n','<br>')+` <details class="card-skill-note" style="position:relative;display:block;font-size:12px"><summary>修改备注 · ${m.history.length}次</summary><p>原技能：${esc(m.original.name)} · ${esc(m.original.description||'原包缺少描述')}</p>${m.history.map(x=>`<p>${esc(x.at)}<br>修改前：${esc(x.before.description)}<br>修改后：${esc(x.after.description)}<br>原因：${esc(x.reason)}</p>`).join('')}</details>`;};
 const nativeCard=ui.click.charactercard;
 ui.click.charactercard=function(name,...args){context=name;buildingCard=true;try{const result=nativeCard.call(this,name,...args),change=lib.studioCardById[name];const removed=Object.values(change?.skills||{}).filter(m=>m.current.deleted);const box=document.querySelector('.menubg.charactercard');if(box){const textNodes=box.querySelectorAll?.('div,span')||[];for(const m of Object.values(change?.skills||{}).filter(m=>m.added&&!m.current.deleted)){for(const node of textNodes)if(node.childElementCount===0&&node.textContent.trim()===m.current.name)node.style.color='#63adf0';}}if(box&&removed.length){const notes=document.createElement('div');notes.className='card-removed';notes.innerHTML=removed.map(m=>`<details><summary><s>${esc(m.current.name)}</s> · 已删除</summary><p>${esc(m.current.description)}</p>${m.history.map(x=>`<p>${esc(x.at)} · ${esc(x.reason)}</p>`).join('')}</details>`).join('');box.append(notes);}return result;}finally{buildingCard=false;}};
 const nativeTranslation=get.translation.bind(get);
 get.translation=function(value,...args){const m=typeof value==='string'&&context&&(buildingCard||document.querySelector('.menubg.charactercard'))?lib.studioCardById[context]?.skills[value]:null;return m?m.current.name:nativeTranslation(value,...args);};
 for(const [key,change]of Object.entries(runtime.cardImprovements||{})){
  const v=catalog.versions.find(v=>v.versionId===key)||runtime.generals?.find(v=>v.id===key);if(!v)continue;
  const id=engineId(v),c=lib.character[id];if(!c)continue;
  const pack=Object.keys(lib.characterPack).find(k=>lib.characterPack[k][id]&&launch.settings.packs.includes(k));
  if(!v.family&&(launch.settings.mode==='guozhan'?!v.scope.startsWith('mode/guozhan')&&v.scope!=='character/bwiki202610gz':v.scope!=='character/'+pack))continue;
  const skills={...change.skills},originalSkills=c.skills.slice(),aliases={};
  for(const [sid,m]of Object.entries(change.skills)){
   const actual=c.skills.includes(sid)?sid:lib.studioRuleById?.[id]?.aliases?.[sid]|| (v.family?c.skills.find(x=>x.endsWith('_'+sid)):sid);
   if(m.current.deleted){
    for(const other of c.skills.filter(x=>x!==actual))for(const field of ['group','global','derivation']){const refs=lib.skill[other]?.[field];if((Array.isArray(refs)?refs:[refs]).includes(actual))throw Error('删除的技能仍被 '+other+' 引用，请先调整依赖');}
    c.skills=c.skills.filter(x=>x!==actual);continue;
   }
   if(!m.current.code?.trim())continue;
   const prefix='card_'+change.id.replaceAll('-','_')+'_'+sid.replace(/[^a-zA-Z0-9_]/g,'_')+'_',patch=compileCardPatch(env,alignSavedCode(change,sid,m.current.code),prefix),replacement=prefix+'main';
   if(!m.added&&!c.skills.includes(actual))throw Error(v.name+'：改良目标技能不在该版本中');
   if(!lib.config.characters.includes('play_card_improvements'))lib.config.characters.push('play_card_improvements');
   patch.translate={...patch.translate,[replacement]:m.current.name,[replacement+'_info']:m.current.description};
   loadCharacter({name:'play_card_improvements',character:{},...patch});
   c.skills=m.added?[...c.skills,replacement]:c.skills.map(s=>s===actual?replacement:s);skills[replacement]=m;aliases[sid]=replacement;
  }
  lib.studioCardById[id]={...change,skills,version:key,originalSkills,aliases};record('card-improvement',{version:key,revision:change.id,skills:Object.keys(change.skills)});
 }
 if(runtime.cardPreflight){
  try{const p=runtime.cardPreflight,v=catalog.versions.find(v=>v.versionId===p.version)||runtime.generals?.find(v=>v.id===p.version);if(!v)throw Error('武将版本未载入：'+p.version+'。请重新选择具体实战版本');const added=runtime.cardImprovements?.[p.version]?.skills[p.skill]?.added;if(p.operation!=='add'&&!added&&!hasSkill(v,p.skill))throw Error('此版本没有技能 '+p.skill+'；请重新选择技能');if(p.operation==='delete'){const sid=lib.studioCardById[engineId(v)]?.aliases?.[p.skill]||nativeIds(v).find(x=>x===p.skill||v.family&&x.endsWith('_'+p.skill))||p.skill;for(const other of nativeIds(v).filter(x=>x!==sid))for(const field of ['group','global','derivation']){const refs=lib.skill[other]?.[field];if((Array.isArray(refs)?refs:[refs]).includes(sid))throw Error('该技能仍被 '+other+' 引用，不能直接删除');}}else compileCardPatch(env,p.code,'card_preflight_');parent.postMessage({type:'card-preflight',ok:true},location.origin);}catch(error){parent.postMessage({type:'card-preflight',error:error.message},location.origin);}launch.cardPreflight=true;
 }
}
