import {loadCharacter} from './noname/init/loading.js';

// Catalog contracts are per version; inherited names must not leak another version's text.
export async function installRuleDescriptions(env,launch){
 const {lib,get,ui}=env,settings=launch.settings;
 const catalog=await(await fetch('./play-catalog.json')).json(),byId={};
 for(const v of catalog.versions){
  const scope=settings.mode==='guozhan'?v.scope?.startsWith('mode/guozhan')||v.scope==='character/bwiki202610gz':settings.mode==='single'&&v.scope==='mode/single.js'||v.scope?.startsWith('character/')&&settings.packs.includes(v.scope.slice(10));
  if(!scope||!lib.character[v.id])continue;
  const active=lib.character[v.id].skills;
  if(!v.skillDetails.some(s=>active.includes(s.runtimeSkillId||s.id)))continue;
  const skills={},aliases={};
  for(const s of v.skillDetails){
   const actual=s.runtimeSkillId||s.id;if(!active.includes(actual))continue;
   skills[actual]=s;skills[s.id]=s;if(actual!==s.id)aliases[s.id]=actual;
   lib.translate[actual]=s.name;lib.translate[actual+'_info']=s.description||'';
  }
  byId[v.id]={version:v.versionId,skills,aliases};
 }
 lib.studioRuleById=byId;
 const previous=get.skillInfoTranslation.bind(get);let context='',building=false;
 const resolve=(p,sid)=>[p?.name1||p?.name,p?.name2].map(id=>byId[id]).find(v=>v?.skills[sid]);
 get.skillInfoTranslation=function(sid,p,noHTML=true){
  const record=p?resolve(p,sid):context&&(building||document.querySelector('.menubg.charactercard'))?byId[context]:null;
  const skill=record?.skills[sid];
  if(!skill)return previous(sid,p,noHTML);
  const method=skill.descriptionEvidence?.method||'';
  // Keep native state-dependent text unless a selected Wiki rule replaced it.
  if(p&&lib.dynamicTranslate?.[sid]&&!method.includes('wiki'))return previous(sid,p,noHTML);
  const text=skill.description||'';
  return noHTML?get.plainText?.(text)||text:text.replaceAll('\n','<br>');
 };
 const previousCard=ui.click.charactercard;
 ui.click.charactercard=function(name,...args){context=name;building=true;try{return previousCard.call(this,name,...args);}finally{building=false;}};
}

export function alignSavedCode(change,sid,code){
 if(change.id==='card-3a33e1cdc54b492a8d1294b9'&&sid==='dcsbguyi'){
  // 全场 includes characters that died earlier in this same round.
  return code.replace('!game.hasPlayer(other=>total(other)>damage)','!game.players.concat(game.dead||[]).some(other=>total(other)>damage)');
 }
 return code;
}

export async function installPersonalRuleAlignment(env,launch,record){
 const {lib}=env;
 const change=lib.studioCardById?.dc_sb_zhugeliang;
 if(change?.id!=='card-3a33e1cdc54b492a8d1294b9')return;
 const sid='dcsbjingmou',entry=change.skills[sid];
 if(!entry||entry.current.deleted||entry.current.code?.trim())return;
 const {jingmouCode}=await import('./rule-personal-data.js');
 const replacement='rule_personal_jingmou';
 const pack=Function('lib','game','ui','get','ai','_status',`return ({${jingmouCode}});`)(env.lib,env.game,env.ui,env.get,env.ai,env._status);
 if(!lib.config.characters.includes('play_rule_alignment'))lib.config.characters.push('play_rule_alignment');
 loadCharacter({name:'play_rule_alignment',character:{},skill:pack,translate:{[replacement]:entry.current.name,[replacement+'_info']:entry.current.description}});
 lib.character.dc_sb_zhugeliang.skills=lib.character.dc_sb_zhugeliang.skills.map(id=>id===sid?replacement:id);
 change.aliases[sid]=replacement;change.skills[replacement]=entry;
 record('rule-alignment',{version:change.version,skill:sid,revision:change.id});
}
