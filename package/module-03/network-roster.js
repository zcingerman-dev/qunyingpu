export const diyEngineId=id=>'studio_'+id.replaceAll('-','_')+'_general';
export function safePortrait(value){
 return typeof value==='string'&&value.length<=24000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';
}
const frozen=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))frozen(item);}return value;};
export function publishedChoices(runtime){
 return (runtime?.generals||[]).filter(g=>g.published===true).map(g=>{
  let error='';
  if(typeof g.id!=='string'||!/^diy-[a-zA-Z0-9-]{1,100}$/.test(g.id))error='武将版本ID无效';
  else if(typeof g.code!=='string'||!g.code.trim())error='缺少技能实现';
  else try{new Function('lib','game','ui','get','ai','_status','prefix',g.code);}catch(e){error='技能语法错误：'+e.message;}
  return {id:g.id,name:g.name,version:g.version,group:g.group,hp:g.hp,error};
 });
}
// Only this room's explicitly selected, published versions enter its Host engine.
// Collections, AI overrides, unrelated images and model settings are never copied.
export class NetworkRoster{
 constructor(index,catalog,runtime={}){this.index=index;this.catalog=catalog;this.runtime=runtime;this.selected=[];this.enabled=false;this.frozen=false;}
 configure(enabled,ids){
  if(this.frozen)throw Error('开局后将池已冻结');
  const choices=new Map(publishedChoices(this.runtime).map(g=>[g.id,g]));
  if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('DIY版本选择无效');
  for(const id of ids){const g=choices.get(id);if(!g||g.error)throw Error(g?.error||'DIY版本未发布或不存在');}
  this.enabled=!!enabled;this.selected=[...ids];
 }
 prepare(mode,pictures={}){
  const rows=this.index.versions.filter(v=>v.allowedModes.includes(mode));
  const ids=[...new Set(rows.map(v=>v.id))];
  const packs=[...new Set(rows.filter(v=>v.pack!=='mode_guozhan').map(v=>v.pack))];
  const chosen=this.enabled?this.selected:[];
  const generals=chosen.map(id=>this.runtime.generals.find(g=>g.id===id&&g.published===true));
  if(generals.some(g=>!g))throw Error('所选DIY版本已不可用，请重新选择');
  const portraits={};for(const g of generals){const pic=safePortrait(pictures[g.portrait]);if(pic)portraits[g.portrait]=pic;}
  const studioRuntime={generals:structuredClone(generals),portraits};
  return {packs,studioRuntime,allowedGeneralIds:ids.concat(generals.map(g=>diyEngineId(g.id))),builtinVersions:rows.map(v=>v.versionId),diy:generals.map(g=>({id:g.id,name:g.name,version:g.version}))};
 }
 freeze(mode,pictures){if(!this.prepared)this.prepared=frozen(this.prepare(mode,pictures));this.frozen=true;return this.prepared;}
 summary(mode){const p=this.prepared||this.prepare(mode);return {builtin:p.builtinVersions.length,diy:p.diy.map(g=>({...g}))};}
}
export function filterNetworkPool(pool,config){
 if(!config?.allowedGeneralIds)return pool;
 const ids=new Set(config.allowedGeneralIds);return pool.filter(v=>ids.has(v.id));
}
