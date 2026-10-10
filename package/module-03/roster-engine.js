import {validateRoster,roleFor,LoopGuard,summarizeDraw,stateFingerprint,receivedUnits,ratingCriteria,lockRoleAtSeat} from './roster-rules.js';
import {applyPersonalPortraits} from './personal-engine.js';
export async function installRoster(env,settings,{send,record,onSelected,onDraw,onFlow,onHp,safe,network}){
 const{lib,game,ui,get,_status}=env;
 const [catalog,assets]=await Promise.all(['./play-catalog.json','./asset-map.json'].map(async url=>await(await fetch(url)).json()));let pool=[],roles=[],resolveSelection=null,initial=[],selecting=false;
 const double=settings.mode==='guozhan'||settings.doubleGeneral;
 const cardDescriptor=c=>({name:(c.name==='sha'&&c.nature?get.translation(c.nature):'')+get.translation(c.name),type:get.type(c,null,false)});
 function runtimePool(){
  const rows=[];
  const allowed=network?.allowedGeneralIds?new Set(network.allowedGeneralIds):null;
  for(const[id,c]of Object.entries(lib.character)){
   if(allowed&&!allowed.has(id))continue;
   if(settings.mode==='single'?lib.filter.characterDisabled2(id,'ignoreForibidden'):lib.filter.characterDisabled(id))continue;
   if(settings.mode==='guozhan'&&(id.startsWith('gz_shibing')||get.is.jun(id)&&!id.startsWith('gz_jun_bw_')||c.hasHiddenSkill||!lib.characterGuozhanFilter.some(p=>lib.characterPack[p]?.[id])))continue;
   const packs=Object.keys(lib.characterPack).filter(p=>lib.characterPack[p][id]);
   const modePack=settings.mode==='guozhan'?'mode_guozhan':settings.mode==='single'?'mode_single':null;
   const pack=modePack&&packs.includes(modePack)?modePack:packs.find(p=>settings.packs.includes(p))||packs[0]||'play_custom';
   const matchesScope=v=>pack==='mode_guozhan'?v.scope?.startsWith('mode/guozhan'):pack==='mode_single'?v.scope==='mode/single.js':v.scope===`character/${pack}`;
   if((catalog.retiredVersions||[]).some(v=>v.id===id&&v.scope===`character/${pack}`))continue;
   const original=catalog.versions.find(v=>v.id===id&&matchesScope(v)&&JSON.stringify(v.skillDetails.map(x=>x.runtimeSkillId||x.id))===JSON.stringify(c.skills))||catalog.versions.find(v=>v.id===id&&matchesScope(v));
   const groups=get.is.double(id,true)||[c.group];
   const improvement=lib.studioCardById?.[id];
   const skillDetails=c.skills.map(skill=>({id:skill,name:improvement?.skills[skill]?.current.name||get.translation(skill),description:improvement?.skills[skill]?.current.description||lib.studioRuleById?.[id]?.skills[skill]?.description||get.translation(skill+'_info'),modification:improvement?.skills[skill]}));let hash=2166136261;for(const ch of JSON.stringify([c.hp,c.group,skillDetails]))hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;
   const personal=lib.studioVersions?.[id];
   rows.push({id,isJun:get.is.jun(id),key:improvement?.version||personal?.id||original?.versionId||`runtime:${settings.mode}:${id}:${hash.toString(16)}`,name:get.translation(id),pool:pack,groups,group:c.group,hp:c.hp,maxHp:c.maxHp,portraitPath:settings.studioRuntime?.portraits?.[personal?.portrait]||original?.portraitPath||assets[`image/character/${id}.jpg`]||assets[`image/character/${id.replace(/^gz_/,'')}.jpg`]||null,skillDetails});
  }applyPersonalPortraits(env,settings,rows);return rows;
 }
 function assignRoles(humanSeat=0){
  if(settings.mode==='guozhan')roles=initial.map(()=> 'unknown');
  else if(settings.mode==='single')roles=initial.map((_,i)=>i===0?'zhu':'fan');
  else if(!roles.length){roles=(settings.mode==='identity'?get.identityList(initial.length):['zhu','fan','fan']).slice();roles.randomSort();}
  lockRoleAtSeat(roles,settings.mode,settings.identityRole,humanSeat);
 }
 // Selection is the only replaced stage; the native start sequence still deals cards,
 // adds mode skills, starts turns and evaluates victory.
 game.chooseCharacter=function(){
  const e=game.createEvent('chooseCharacter');e.setContent(async()=>{
   initial=game.players.slice().sort((a,b)=>Number(a.dataset.position)-Number(b.dataset.position));
   initial.forEach((p,i)=>p.playSeat=i);pool=runtimePool();assignRoles(settings.rosters?.[settings.mode]?.humanSeat||0);
   _status.characterlist=pool.map(v=>v.id);if(settings.mode==='guozhan')_status.yeidentity=[];
   ui.arena.classList.add('choose-character');lib.init.onfree();selecting=true;
   const selection=new Promise(resolve=>resolveSelection=resolve);
   send('play-roster',{pool,roles,double,mode:settings.mode});
   const r=await selection;selecting=false;
   assignRoles(r.humanSeat);
   for(const[i,p]of initial.entries()){
    p.identity=roles[i];if(p.identity==='zhu'){game.zhu=p;p.isZhu=settings.mode!=='single';}
    p.identityShown=settings.mode==='doudizhu'||settings.mode==='single'||p.identity==='zhu';
    if(settings.mode!=='guozhan'){p.setIdentity(p.identityShown||i===r.humanSeat?p.identity:'cai');p.node.identity.classList.toggle('guessing',!p.identityShown&&i!==r.humanSeat);}
    const picked=r.seats[i].picks.map(key=>pool.find(v=>v.key===key).id);p.init(picked[0],picked[1],settings.mode==='guozhan'?false:undefined);
    if(settings.mode==='guozhan'){
     const a=pool.find(v=>v.id===picked[0]),b=pool.find(v=>v.id===picked[1]);
     p.trueIdentity=a.groups.find(g=>b.groups.includes(g))||(['ye','shen'].includes(a.group)?b.group:a.group);
     p.hiddenSkills=[...new Set([...lib.character[picked[0]].skills,...lib.character[picked[1]].skills])];
     p.classList.add('unseen','unseen2');p.name1=p.name;p.name='unknown';p.group=p.sex=p.identity='unknown';p.node.name.show();p.node.name2.show();
     if(i!==r.humanSeat){p.node.identity.firstChild.innerHTML='猜';p.node.identity.dataset.color='unknown';p.node.identity.classList.add('guessing');}
     p.hiddenSkills.forEach(skill=>p.addSkillTrigger(skill,true));
    }else if(p===game.zhu&&(settings.mode==='doudizhu'||settings.mode==='identity'&&initial.length>4)&&!p.isInitFilter('noZhuHp')){p.hp++;p.maxHp++;p.update();}
    _status.characterlist.removeArray(picked);
    if(picked.length===2)stackSharedSkills(p,picked[0],picked[1]);
   }
   if(initial[r.humanSeat]!==game.me)game.swapPlayer(initial[r.humanSeat]);
   if(settings.mode!=='guozhan')game.me.setIdentity();
   ui.arena.classList.remove('choose-character');
   record('roster',{mode:settings.mode,roles:roles.slice(),roster:r,ratingCriteria,versions:r.seats.map(s=>s.picks.map(key=>pool.find(v=>v.key===key)))});
   onSelected();send('play-roster-applied',{roles:roles.slice(),targetSeat:r.humanSeat,role:initial[r.humanSeat].identity});
  });return e;
 };
 // Both general skill sets remain active. Shared triggered/modifier skills receive
 // another runtime entry rather than being silently removed by addSkill's Set logic.
 function stackSharedSkills(p,a,b){
  const all=lib.character[a].skills.filter(id=>lib.character[b].skills.includes(id));
  const aliases=new Map();
  function clone(id){if(aliases.has(id))return aliases.get(id);const src=lib.skill[id];if(!src)return id;
   const alias=`play_stack_${p.playSeat}_${id}`;aliases.set(id,alias);const copy=Object.assign({},src);lib.skill[alias]=copy;
   copy.sourceSkill=id;delete copy.subSkill;delete copy.global;
   if(src.group)copy.group=(Array.isArray(src.group)?src.group:[src.group]).map(clone);
   lib.translate[alias]=get.translation(id)+'·副将';lib.translate[alias+'_info']=get.translation(id+'_info');return alias;
  }
  for(const id of all){const alias=clone(id);if(settings.mode==='guozhan'){p.hiddenSkills.add(alias);p.addSkillTrigger(alias,true);}else p.addSkill(alias);}
  if(all.length)record('dual-stack',{seat:p.playSeat,skills:all});
 }
 function apply(data){if(!resolveSelection)throw Error('当前不在选将阶段');const r=data.roster;
  if(!r||r.seats.length!==initial.length||!Number.isInteger(r.humanSeat)||r.humanSeat<0||r.humanSeat>=initial.length)throw Error('选将座位无效');
  assignRoles(r.humanSeat);const errors=validateRoster(pool,r,{mode:settings.mode,double,separatism:settings.separatism,roles,ratings:data.ratings||settings.ratings});if(errors.length)throw Error(errors.join('；'));
  settings.rosters[settings.mode]=structuredClone(r);settings.ratings=data.ratings||settings.ratings;const resolve=resolveSelection;resolveSelection=null;resolve(r);
 }
 function changeHuman(seat){if(!selecting)return;assignRoles(seat);send('play-roster-roles',{roles});}
 // Observe actual draw results. Virtual cards are one item, not their subcards.
 const openingCards=new Map(),oldDirectGain=lib.element.Player.prototype.directgain;
 lib.element.Player.prototype.directgain=function(cards,...rest){const before=new Set(this.getCards('hs')),result=oldDirectGain.call(this,cards,...rest);if(_status.event?.name==='gameDraw'&&Array.isArray(cards)){const hand=this.getCards('h');openingCards.set(this,[...new Set([...(openingCards.get(this)||[]),...cards])].filter(c=>hand.includes(c)));}else if(onFlow&&game.phaseNumber&&!selecting&&_status.event?.name!=='gain'){const gained=[...new Set(cards)].filter(c=>!before.has(c)&&this.getCards('hs').includes(c));if(gained.length)onFlow(this,game.roundNumber||0,{...summarizeDraw(gained.map(cardDescriptor)),source:'gain'});}return result;};
 const oldDirectGains=lib.element.Player.prototype.directgains;
 lib.element.Player.prototype.directgains=function(cards,...rest){const before=new Set(this.getCards('hs')),result=oldDirectGains.call(this,cards,...rest);if(onFlow&&game.phaseNumber&&!selecting&&_status.event?.name!=='gain'){const hand=this.getCards('hs'),gained=[...new Set(cards)].filter(c=>!before.has(c)&&hand.includes(c));if(gained.length)onFlow(this,game.roundNumber||0,{...summarizeDraw(gained.map(cardDescriptor)),source:'gain'});}return result;};
 const oldDraw=lib.element.Player.prototype.draw;
 lib.element.Player.prototype.draw=function(...args){const e=oldDraw.apply(this,args);const p=this;
  const after=game.createEvent('play_draw_stat',false);after.setContent(async()=>{const cards=e.result?.cards||e.cards||(Array.isArray(e.result)?e.result:[]);if(Array.isArray(cards)&&cards.length)onDraw(p,game.roundNumber||0,summarizeDraw(cards.map(cardDescriptor)));});
  if(after.parent?.next)after.parent.next.remove(after);e.after.push(after);return e;};
 // Repeated full resource state in one turn signals a closed skill loop. The long
 // chain limit is a separate fail-safe and is reported as such in the match record.
 const guard=new LoopGuard(),started=new WeakSet(),prototype=lib.element.GameEvent.prototype,oldStart=prototype.start;
 prototype.start=function(...args){
  const firstStart=!started.has(this);started.add(this);
  const gainUnits=firstStart&&this.name==='gain'&&Array.isArray(this.cards)?this.cards.slice():null;
  if(_status.over&&this.name!=='over'){this.finish();return Promise.resolve();}
  if(firstStart&&double&&!selecting&&game.phaseNumber&&['trigger','arrangeTrigger','draw','gain','useSkill'].includes(this.name)){
   const chain=[];for(let e=this,n=0;e&&n<12;e=e.parent,n++)chain.push([e.name,e.skill,e.step,e.num,e.player?.playSeat]);
   let signature;
   try{const resources=initial.map(p=>[p.hp,p.maxHp,p.hujia,p.getCards('hejxs').map(c=>c.cardid||c.name),safe(p.storage),safe(p.getStat()),p.awakenedSkills]);signature=JSON.stringify([chain,resources,[...ui.cardPile.childNodes].map(c=>c.cardid),[...ui.discardPile.childNodes].map(c=>c.cardid)]);}
   catch{signature='unserializable:'+guard.count;}
   const reason=guard.observe(game.phaseNumber,stateFingerprint(signature));if(reason){record('loop-draw',{reason,phase:game.phaseNumber,events:guard.count});send('play-loop-draw',{reason});game.over('双将循环 · 和局');this.finish();return Promise.resolve();}
  }const result=oldStart.apply(this,args);
  if(firstStart&&this.name==='gameDraw')return result.then(value=>{for(const[p,cards]of openingCards)onDraw(p,0,{...summarizeDraw(cards.map(cardDescriptor)),opening:true});openingCards.clear();return value;});
  if(gainUnits&&onFlow&&game.phaseNumber&&!selecting)return result.then(value=>{const cards=receivedUnits(gainUnits,this.cards||[]);if(cards.length&&this.player?.getHistory('gain').includes(this))onFlow(this.player,game.roundNumber||0,{...summarizeDraw(cards.map(cardDescriptor)),source:this.parent?.name==='draw'?'draw':'gain'});return value;});
  if(firstStart&&this.name==='changeHp'&&onHp)return result.then(value=>{
   const target=this.player,delta=Number(this.changedHp??this.num);let source=null;const cause=this.parent;
   if(cause?.name==='damage')source=cause.source;
   else for(let e=cause,n=0;e&&n<8;e=e.parent,n++){if(e.source&&e.source!==target){source=e.source;break;}if((e.name==='useSkill'||e.name==='useCard'||e.skill)&&e.player&&e.player!==target){source=e.player;break;}}
   const allied=(a,b)=>{if(a===b)return true;if(settings.mode==='single')return false;if(settings.mode==='doudizhu')return(a.identity==='zhu')===(b.identity==='zhu');if(settings.mode==='identity'){const side=x=>x.identity==='zhu'||x.identity==='zhong'?'lord':x.identity==='fan'?'rebel':'nei:'+x.playSeat;return side(a)===side(b);}const group=p=>p.identity==='unknown'?p.trueIdentity:p.getGuozhanGroup?.()||p.trueIdentity||p.identity;return !!group(a)&&group(a)!=='ye'&&group(a)===group(b);};
   if(Number.isFinite(delta)&&delta!==0)onHp({seat:target.playSeat,sourceSeat:source?.playSeat??null,round:game.roundNumber||0,delta,cause:cause?.name||'',enemyDrop:delta<0&&!!source&&!allied(source,target)});return value;
  });return result;
 };
 return{apply,changeHuman,isSelecting:()=>selecting};
}
