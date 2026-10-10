import {loadCharacter} from './noname/init/loading.js';
export function personalSkinURL(path,pictures={}){
 return pictures[path]||(path?.startsWith('/')||path?.startsWith('data:')?path:'/play/resource/'+String(path||'').split('/').map(encodeURIComponent).join('/'));
}
export function personalCode(general){
 // Repair only the confirmed v6 dialog type when loading an immutable snapshot.
 // Historical source and other DIY versions retain their original definitions.
 if(general.id==='diy-252ed7da0c7140ebbb0cfd83081c203b')return general.code.replace("[options,'text']],X)","[options,'textbutton']],X)");
 return general.code;
}
export function loadPersonal(env,settings,record){
 const {lib,game,ui,get,ai,_status}=env,runtime=settings.studioRuntime||{};lib.studioVersions={};
 for(const general of runtime.generals||[]){
  const prefix='studio_'+general.id.replaceAll('-','_')+'_';
  const code=personalCode(general),pack=Function('lib','game','ui','get','ai','_status','prefix',code)(lib,game,ui,get,ai,_status,prefix);
  if(!pack||typeof pack!=='object'||Object.keys(pack.character||{}).length!==1)throw Error(general.name+'：DIY 版本需返回且仅返回一个武将');
  for(const id of Object.keys(pack.skill||{}))if(lib.skill[id])throw Error(general.name+'：技能 ID 冲突，请使用 prefix 命名空间');
  const picture=runtime.portraits?.[general.portrait];
  const source=Object.values(pack.character)[0],id=prefix+'general';const character=Array.isArray(source)?source.slice():{...source};
  if(Array.isArray(character)){character[0]=general.sex;character[1]=general.group;character[2]=general.hp;character[4]=[...(character[4]||[]),'img:'+(picture||'')];}else{character.sex=general.sex;character.group=general.group;character.hp=character.maxHp=general.hp;character.img=picture||'';}
  if(!lib.config.characters.includes('play_custom'))lib.config.characters.push('play_custom');
  loadCharacter({name:'play_custom',character:{[id]:character},skill:pack.skill||{},translate:{...pack.translate,[id]:general.name}});
  lib.studioVersions[id]=general;
  if(code!==general.code)record('personal-compatibility',{id:general.id,fix:'juejin-textbutton-v6'});
  lib.characterGuozhanFilter.add('play_custom');
  record('personal-general',{id:general.id,version:general.version,engineId:id});
 }
 lib.studioRecord=record;
}
export function applyPersonalPortraits(env,settings,pool){
 const {lib,game,ui,get,ai,_status}=env,runtime=settings.studioRuntime||{};
 const pictures=runtime.portraits||{},skinByKey={};
 for(const folder of runtime.collections||[])for(const item of folder.items)if(item.skin&&!skinByKey[item.version])skinByKey[item.version]=personalSkinURL(item.skin,pictures);
 for(const v of pool){v.folders=(runtime.collections||[]).filter(f=>f.items.some(x=>x.version===v.key)).map(f=>f.id);if(skinByKey[v.key])v.portraitPath=skinByKey[v.key];}
 // AI metadata is scoped to the acting general version. Shared skill rules stay intact.
 const aiChanges={...(runtime.aiOverrides||{})};
 if(runtime.test?.driver==='batch-local'&&runtime.test.localAI?.trim()){
  aiChanges['test-local']={version:runtime.test.targetVersion,mode:settings.mode,code:runtime.test.localAI,partner:runtime.test.partnerVersion,test:true};
 }
 for(const [key,change]of Object.entries(aiChanges)){
  const version=pool.find(v=>v.key===(change.version||key));if(!version||change.mode!==settings.mode||!change.code?.trim())continue;
  const patch=Function('lib','game','ui','get','ai','_status',change.code)(lib,game,ui,get,ai,_status);
  if(!patch||typeof patch!=='object')throw Error('AI 草案需要返回技能 AI 对象');
  for(const [sourceId,value]of Object.entries(patch)){
   const partner=change.partner&&pool.find(v=>v.key===change.partner);const id=lib.studioCardById?.[version.id]?.aliases?.[sourceId]||lib.studioCardById?.[partner?.id]?.aliases?.[sourceId]||lib.studioRuleById?.[version.id]?.aliases?.[sourceId]||lib.studioRuleById?.[partner?.id]?.aliases?.[sourceId]||sourceId;
   if(![version,partner].filter(Boolean).some(v=>v.skillDetails.some(s=>(s.id===sourceId||lib.studioRuleById?.[v.id]?.aliases?.[sourceId]===s.id)&&!s.deleted)||!!lib.studioCardById?.[v.id]?.skills[sourceId]&&!lib.studioCardById[v.id].skills[sourceId].current.deleted)||!lib.skill[id]||!value||typeof value!=='object')throw Error('AI 草案只能更新所选版本已有技能的 AI 字段');
   const base=lib.skill[id].ai||{};
   lib.skill[id].ai=new Proxy(base,{get(object,field){const p=_status.event?.player;return p&&(!change.test||p.playSeat===runtime.test.targetSeat)&&[p.name1||p.name,p.name2].some(name=>!!name&&(name===version.id||name===partner?.id))&&field in value?value[field]:Reflect.get(object,field);}});
  }lib.studioRecord('adopted-ai',{version:key,job:change.job,mode:change.mode});
 }
 const old=lib.element.Player.prototype.init;
 lib.element.Player.prototype.init=function(a,b,...args){const result=old.call(this,a,b,...args);for(const [id,node]of [[a,this.node.avatar],[b,this.node.avatar2]]){const v=pool.find(v=>v.id===id),g=lib.studioVersions[id],selected=settings.rosters?.[settings.mode]?.seats?.[this.playSeat]?.filters?.collections||[],chosen=(runtime.collections||[]).filter(f=>selected.includes(f.id)).flatMap(f=>f.items).find(x=>x.version===v?.key&&x.skin),chosenImage=chosen?personalSkinURL(chosen.skin,pictures):null,image=chosenImage||(v?.portraitPath?.startsWith('data:')||v?.portraitPath?.startsWith('/')?v.portraitPath:g?pictures[g.portrait]:null);if(image&&node)node.style.backgroundImage=`url("${image}")`;}return result;};
}
