import doudizhu from './mode/doudizhu.js';
import {ruleIds,mayChooseRoute,identitySide,identityWinner,successionActive} from './identity-rules-core.js';

export function installIdentitySuccession(env,settings,{record=()=>{},replay=false}={}){
 if(!successionActive(settings))return null;
 const {lib,game,ui,get,_status}=env;
 const state=game.playSuccession={appointed:false,heirSeat:null,inherited:false,disqualified:false,lordSeat:null,winner:null,wildMarks:{}};
 const queuedWild=new Set();
 const all=()=>game.players.concat(game.dead||[]);
 const seat=p=>String(p.dataset.position);
 const bySeat=id=>all().find(p=>seat(p)===String(id));
 const rows=()=>all().map(p=>({seat:seat(p),identity:p.identity,alive:p.isAlive()}));
 const ensureLord=()=>{if(state.lordSeat===null&&game.zhu)state.lordSeat=seat(game.zhu);};
 const inPlay=()=>!replay&&game.phaseNumber>0&&!_status.over;
 const eligible=p=>inPlay()&&mayChooseRoute(game.roundNumber||0,rows(),p&&{seat:seat(p),identity:p.identity,alive:p.isAlive()});
 const mayAppoint=p=>inPlay()&&p===game.zhu&&p?.isAlive()&&!state.appointed;
 function reveal(p){p.identityShown=true;p.ai.shown=1;p.isZhu=p.identity==='zhu';p.setIdentity(p.identity);p.node.identity.classList.remove('guessing');}
 function write(action,actor,changes={}){
  ensureLord();const data={action,...state,wildMarks:{...state.wildMarks},...changes};
  game.addVideo('playIdentityState',actor,data);record('identity-rule',{seat:seat(actor),...data});
 }
 function appoint(actor,target){
  if(!mayAppoint(actor))throw Error('当前不能立储：仅存活主公可指定一次');
  if(!target?.isAlive()||target===actor)throw Error('储君须为其他存活角色');
  ensureLord();state.appointed=true;state.heirSeat=seat(target);target.addSkill(ruleIds.heir);
  game.log(actor,'立',target,'为储君');write('appoint',actor,{target:seat(target)});
  return '已立储，不能改立；储君不分担伤害';
 }
 function disqualify(reason){
  if(!state.appointed||state.inherited||state.disqualified||!game.zhu?.isAlive())return null;
  state.disqualified=true;bySeat(state.heirSeat)?.removeSkill(ruleIds.heir);
  const lord=game.zhu;write('disqualify',lord,{target:state.heirSeat,reason});
  const event=game.createEvent('play_heir_penalty',false);event.player=lord;
  event.setContent(async()=>{
   if(!lord.isAlive())return;
   game.log(lord,'因储君资格失效扣减1点体力上限并流失1点体力');
   await lord.loseMaxHp(1);if(lord.isAlive())await lord.loseHp(1);
  });return event;
 }
 function choose(actor,route){
  if(!eligible(actor))throw Error('当前不能择途：须从第二轮开始，且存活主忠人数少于存活人数的一半');
  if(!['loyal','wild'].includes(route))throw Error('择途路线无效');
  actor.identity=route==='loyal'?'zhong':'ye';reveal(actor);
  const skills=route==='wild'?[ruleIds.feiyang,ruleIds.bahu,ruleIds.wild]:[];
  if(skills.length)actor.addSkill(skills);
  if(route==='wild'){state.wildMarks[seat(actor)]=1;actor.setMark(ruleIds.wild,1,false);}
  game.log(actor,route==='loyal'?'侍奉明主，成为忠臣':'自立为野心家');
  write('choose',actor,{target:seat(actor),identity:actor.identity,skills});
  if(route==='wild'&&seat(actor)===state.heirSeat)disqualify('储君自立为野心家');
  game.checkResult();return route==='loyal'?'已成为忠臣':'已成为独立野心家';
 }
 function hasWildMark(p){
  if(!p)return false;
  if(state.wildMarks[seat(p)]===1&&(p.identity!=='ye'||!p.isAlive()||!p.hasSkill(ruleIds.wild))){clearWild(p);return false;}
  return p.identity==='ye'&&p.isAlive()&&p.hasSkill(ruleIds.wild)&&state.wildMarks[seat(p)]===1&&p.countMark(ruleIds.wild)===1;
 }
 function mayUseWild(p){return inPlay()&&hasWildMark(p)&&_status.currentPhase===p;}
 function wildInput(p){
  const e=_status.event;
  if(_status.paused2)return null;
  if(e?.player===p&&e.isMine?.()){
   if(e.playWildChoice&&e.choosing&&!e.playWildSubmitted)return 'control';
   if(_status.imchoosing&&e.name==='chooseToUse'&&['phase','dying'].includes(e.type)&&!e.skill&&!e.playWildRequested&&!ui.selected.cards.length&&!ui.selected.targets.length&&lib.filter.filterEnable(e,p,ruleIds.wild))return 'skill';
  }
  if(_status.imchoosing||e?.choosing||_status.paused)return null;
  return 'queue';
 }
 function canUseWild(p){return mayUseWild(p)&&!queuedWild.has(p)&&!!wildInput(p);}
 function clearWild(p){
  const had=state.wildMarks[seat(p)]===1;
  state.wildMarks[seat(p)]=0;p.storage[ruleIds.wild]=0;p.unmarkSkill(ruleIds.wild);queuedWild.delete(p);
  if(had&&!replay)write('wild-clear',p,{target:seat(p)});
 }
 async function useWildBenefit(p,effect){
  if(!['draw','recover'].includes(effect))throw Error('野心家标记选项无效');
  if(!mayUseWild(p))throw Error('仅存活野心家可在自己的回合内消耗未使用的标记；回合外濒死也不可使用');
  if(effect==='recover'&&p.hp>=p.maxHp)throw Error('体力已满，不能选择回复');
  // Reserve the one-shot resource before any native event yields. Both UI
  // routes and AI use this same commit point, including own-turn dying.
  state.wildMarks[seat(p)]=0;p.removeMark(ruleIds.wild,1,false);p.unmarkSkill(ruleIds.wild);
  write('wild-spend',p,{target:seat(p),effect});
  game.log(p,'消耗野心家标记',effect==='draw'?'摸两张牌':'回复1点体力');
  if(effect==='draw')await p.draw(2);else await p.recover(1);
 }
 function requestWildBenefit(p,effect){
  if(!['draw','recover'].includes(effect))throw Error('野心家标记选项无效');
  if(!canUseWild(p))throw Error('当前不能使用标记：须在自己的回合内，请先完成其他选择或继续对局');
  if(effect==='recover'&&p.hp>=p.maxHp)throw Error('体力已满，不能选择回复');
  const input=wildInput(p),e=_status.event;
  if(input==='control'){
   const label=effect==='draw'?'摸两张牌':'回复1点体力';
   const bars=e.controlbar?[e.controlbar]:e.controlbars||[];
   const button=bars.flatMap(bar=>Array.from(bar.children)).find(n=>n.link===label);
   if(!button)throw Error('当前标记选择已变化，请重试');
   e.playWildSubmitted=true;ui.click.control.call(button);
  }else if(input==='skill'){
   e.playWildRequested=effect;ui.click.skill(ruleIds.wild);if(e.skill===ruleIds.wild)ui.click.ok();
  }else{
   queuedWild.add(p);
   const next=game.createEvent('play_wild_benefit',false);next.player=p;
   next.setContent(async()=>{try{if(mayUseWild(p)&&(effect!=='recover'||p.hp<p.maxHp))await useWildBenefit(p,effect);}finally{queuedWild.delete(p);}});
  }
  return effect==='draw'?'已选择消耗标记摸两张牌':'已选择消耗标记回复1点体力';
 }
 const nativeMode=doudizhu(),native=nativeMode.skill;
 lib.skill[ruleIds.feiyang]={...native.mbfeiyang,filter(_event,p){return p.identity==='ye'&&p.countCards('j')>0&&p.countCards('h')>1;}};
 lib.skill[ruleIds.bahu]={...native.bahu,filter(_event,p){return p.identity==='ye';},mod:{cardUsable(card,p,num){if(p.identity==='ye'&&card.name==='sha')return num+1;}}};
 lib.skill[ruleIds.heir]={charlotte:true,mark:true,marktext:'储',intro:{content:'已被立为储君；主公死亡时，若你存活且为忠臣，则继位。立储不分担伤害。'}};
 lib.skill[ruleIds.wild]={
  charlotte:true,marktext:'野',intro:{name:'野心家标记',content:'剩余#枚。仅你的回合内可消耗1枚，摸两张牌或回复1点体力；自己的回合内濒死也可使用。跨回合保留，不自动补充。'},
  enable:'chooseToUse',manualConfirm:true,notarget:true,selectCard:-1,filterCard:()=>false,selectTarget:-1,filterTarget:()=>false,
  trigger:{player:'dying'},forced:true,popup:false,filter(event,p){return mayUseWild(p)&&(event.name==='dying'||['phase','dying'].includes(event.type));},
  async content(event,_trigger,p){
   if(!mayUseWild(p))return;
   const use=event.getParent('chooseToUse');let effect=use?.playWildRequested;
   if(!effect){
    const options=['摸两张牌'];if(p.hp<p.maxHp)options.push('回复1点体力');options.push('cancel2');
    const choice=p.chooseControl(options).set('prompt','野心家标记：消耗1枚，或取消并保留').set('playWildChoice',true).set('ai',()=>p.hp<=2&&p.hp<p.maxHp?'回复1点体力':'摸两张牌');
    const result=await choice.forResult();effect=result.control==='摸两张牌'?'draw':result.control==='回复1点体力'?'recover':null;
   }
   if(effect)await useWildBenefit(p,effect);
  },
  onremove:clearWild,
  ai:{order:9,save:true,skillTagFilter(p){return mayUseWild(p);},result:{player(p){return p.hp<=0?10:p.hp<=2?3:1;}}}
 };
 Object.assign(lib.translate,{[ruleIds.wild]:'野心家标记',[ruleIds.wild+'_info']:'首次选择成为野心家时获得1枚野心家标记。仅你的回合内，你可以消耗此标记摸两张牌或回复1点体力（濒死时也可使用）。未使用则跨回合保留，消耗后不再补充。'});
 Object.assign(lib.translate,{ye:'野心家',ye2:'野心家',play_lichu_heir:'储君',play_lichu_heir_info:'主公死亡且你存活并为忠臣时，继位：体力上限+1，回复1点体力，获得原主公所有牌和主公技。',play_lichu_feiyang:'飞扬',play_lichu_feiyang_info:nativeMode.translate.mbfeiyang_info,play_lichu_bahu:'跋扈',play_lichu_bahu_info:nativeMode.translate.bahu_info});
 // Replay restores identities and rule state only. Native videos restore cards/HP;
 // this handler never performs inheritance or a second draw/recovery.
 game.videoContent.playIdentityState=function(_player,data){
  Object.assign(state,{appointed:data.appointed,heirSeat:data.heirSeat,inherited:data.inherited,disqualified:!!data.disqualified,lordSeat:data.lordSeat,winner:data.winner});
  if(data.wildMarks){
   state.wildMarks={...data.wildMarks};
   for(const [id,count]of Object.entries(state.wildMarks)){
    const p=bySeat(id);if(!p)continue;
    if(count===1)p.addSkill(ruleIds.wild);
    p.storage[ruleIds.wild]=count===1?1:0;p[count===1?'markSkill':'unmarkSkill'](ruleIds.wild);
   }
  }
  if(data.action==='appoint')bySeat(data.target)?.addSkill(ruleIds.heir);
  if(data.action==='disqualify')bySeat(data.target)?.removeSkill(ruleIds.heir);
  if(['choose','inherit'].includes(data.action)){
   const p=bySeat(data.target);if(p){p.identity=data.identity;reveal(p);p.addSkill(data.skills||[]);}
   if(data.action==='inherit'){const old=bySeat(data.oldLord);if(old)old.isZhu=false;game.zhu=p;p?.removeSkill(ruleIds.heir);}
  }
 };
 if(replay)return {state,snapshot:()=>({active:true,heirSeat:state.heirSeat,inherited:state.inherited})};
 const oldCheck=game.checkResult;
 game.checkResult=function(){
  if(!game.zhu||_status.over)return;
  ensureLord();const winner=identityWinner(rows(),state.lordSeat);if(!winner)return;
  state.winner=winner;game.showIdentity();const me=game.me._trueMe||game.me;
  write('result',me);game.over(identitySide({identity:me.identity,seat:seat(me)})===winner);
 };
 game.checkOnlineResult=p=>identitySide({identity:p.identity,seat:seat(p)})===state.winner;
 const proto=lib.element.Player.prototype,oldDie=proto.dieAfter;
 if(typeof oldDie!=='function'){game.checkResult=oldCheck;throw Error('身份模式死亡接口未加载');}
 proto.dieAfter=async function(source){
  if(this.hasSkill(ruleIds.wild))this.removeSkill(ruleIds.wild);
  ensureLord();const heir=bySeat(state.heirSeat);
  if(this===game.zhu&&state.appointed&&!state.inherited&&!state.disqualified&&heir?.isAlive()&&heir.identity==='zhong'){
   const cards=this.getCards('hejsx'),skills=this.getSkills(null,false,false).filter(id=>lib.skill[id]?.zhuSkill);
   state.inherited=true;state.lordSeat=seat(heir);this.isZhu=false;heir.identity='zhu';game.zhu=heir;reveal(heir);heir.removeSkill(ruleIds.heir);
   // Switch lord before native death result evaluation, and gain before the
   // native death cleanup discards the old lord's cards.
   write('inherit',heir,{oldLord:seat(this),target:seat(heir),identity:'zhu',skills});
   await heir.gainMaxHp(1);await heir.recover(1);
   if(cards.length)await heir.gain(cards,this,'giveAuto');
   if(skills.length)await heir.addSkills(skills);
   game.log(heir,'继位为主公');
  }
  else if(seat(this)===state.heirSeat){const penalty=disqualify('储君死亡');if(penalty)await penalty;}
  return oldDie.call(this,source);
 };
 const oldRaw=get.rawAttitude,oldReal=get.realAttitude;
 function wildAttitude(from,to){
  if(from===to)return 10;
  if(from.identity==='ye')return to===game.zhu&&game.players.length>2?-1:-6;
  if(to.identity==='ye')return -6;
 }
 get.rawAttitude=function(from,to){return wildAttitude(from,to)??oldRaw.call(this,from,to);};
 get.realAttitude=function(from,to){return wildAttitude(from,to)??oldReal.call(this,from,to);};
 lib.skill[ruleIds.ai]={charlotte:true,trigger:{player:'phaseBegin'},forced:true,popup:false,filter(_event,p){return (_status.auto||p!==game.me)&&(mayAppoint(p)||eligible(p));},async content(event,_trigger,p){
  if(mayAppoint(p)){
   // Only native public/inferred attitudes select a candidate; never inspect
   // the candidate's hidden identity to choose the loyalist.
   const candidates=game.players.filter(t=>t!==p&&t.isAlive());
   candidates.sort((a,b)=>get.rawAttitude(p,b)-get.rawAttitude(p,a));
   if(candidates.length)appoint(p,candidates[0]);
  }else if(eligible(p))choose(p,game.zhu?.isAlive()&&game.zhu.hp>=2?'loyal':'wild');
 }};
 game.addGlobalSkill(ruleIds.ai);
 return {state,appoint,choose,eligible,mayAppoint,mayUseWild,canUseWild,useWildBenefit,requestWildBenefit,snapshot(){
  ensureLord();const p=game.me,canAppoint=mayAppoint(p),canChoose=eligible(p);
  return {active:true,appointed:state.appointed,heirSeat:state.heirSeat,inherited:state.inherited,disqualified:state.disqualified,canAppoint,canChoose,wildMark:hasWildMark(p)?1:0,isWild:p?.identity==='ye',canUseWild:canUseWild(p),canRecoverWild:canUseWild(p)&&p.hp<p.maxHp,targets:canAppoint?game.players.filter(t=>t!==p&&t.isAlive()).map(t=>({seat:seat(t),name:get.translation(t.name1||t.name)})):[]};
 }};
}
