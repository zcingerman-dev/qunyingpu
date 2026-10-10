import {portedSkills} from './ports.js';
import {updatedSkills} from './manual.js';
import {testingSkills} from './testing.js';
import {guozhanSkills} from './guozhan.js';
import {manifest} from './manifest.js';

export function makePack(env, name) {
 const {lib}=env;
 const skill=updatedSkills(env,portedSkills(env));
 Object.assign(skill,testingSkills(env));
 const gz=guozhanSkills(env);Object.assign(skill,gz.skills);
 skill.bw_wuyi_names={charlotte:true,marktext:'翊',intro:{content:'已从手牌使用或打出过：$'}};
 const card=name==='bwiki202610gz'?gz.cards:{};
 if(name==='bwiki202610')for(let n=1;n<=5;n++)card['bw_slot'+n]={type:'equip',subtype:'equip'+n,skills:[],ai:{basic:{equipValue:1}}};
 const character={},translate={},characterFilter={};
 for(const row of manifest.filter(r=>r.pack===name&&!r.contentMissing)){
  character[row.engineId]={sex:row.sex,group:row.group,hp:row.hp,skills:row.skills.slice(),...(row.name==='族荀灌'?{clans:['颍川荀氏']}:{}),...(row.mode==='国战'?{forbid:['identity','doudizhu','single']}: {})};
  translate[row.engineId]=row.displayName;
  row.currentSkills.forEach((s,i)=>{const id=row.skills[i]|| (row.name==='星王允'?'bw_mouji':null);if(id){translate[id]=s.name.replace(/^☆\s*/, '');translate[id+'_info']=s.description;}});
  if(row.mode==='国战')characterFilter[row.engineId]=mode=>mode==='guozhan';
 }
 if(name==='bwiki202610gz'){
  lib.characterGuozhanFilter??=[];
  if(!lib.characterGuozhanFilter.includes(name))lib.characterGuozhanFilter.push(name);
 }
 const equipmentInfo={
  bw_chushibiao:['出师表','准备阶段，你获得牌堆中的一张普通锦囊牌。此牌离开装备区后销毁。'],
  bw_panlong:['盘龙双震','攻击范围2。你使用杀结算后，若最后一个目标响应过此杀，你对首个目标造成1点伤害。此牌离开装备区后销毁。'],
  bw_zhenchao:['镇朝睚眦','你成为杀的目标后，若使用者武将牌的叠置状态与你不同，其弃置一张牌。此牌离开装备区后销毁。'],
  bw_bawang:['霸王凶刀','攻击范围2。你对其他角色造成伤害后，废除其一个装备栏直到其下个回合开始。此牌离开装备区后销毁。'],
 };
 for(const[id,[label,info]]of Object.entries(equipmentInfo)){translate[id]=label;translate[id+'_info']=info;translate[id+'_skill']=label;translate[id+'_skill_info']=info;}
 for(let n=1;n<=5;n++){translate['bw_slot'+n]='踞峙·'+['武器','防具','防御马','进攻马','宝物'][n-1];translate['bw_slot'+n+'_info']='踞峙将一张实体牌置入此装备栏；这张牌仅占据装备栏，不获得原卡牌效果。';}
 translate.bw_type_basic='基本牌';translate.bw_type_trick='锦囊牌';translate.bw_type_equip='装备牌';
 translate.bw_dcdichou_eff='涤仇';translate.bw_mouji='谋济';
 const needed=new Set(Object.values(character).flatMap(c=>c.skills));
 for(const c of Object.values(card))for(const s of c.skills||[])needed.add(s);
 if(name==='bwiki202610')needed.add('bw_wuyi_names');
 if(name==='bwiki202610test')needed.add('bw_mouji');
 if(name==='bwiki202610gz')needed.add('bw_junwei_death');
 return {name,connect:true,character,characterFilter,skill:Object.fromEntries([...needed].map(s=>[s,skill[s]])),card,translate};
}
