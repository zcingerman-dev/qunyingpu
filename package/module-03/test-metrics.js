// Loss attribution uses actual departed hand/equipment cards, never judgement cards.
export function lossAttribution(chain,targetSeat,victimSeat){
 const targetCause=chain.find(e=>e.seat===targetSeat&&['useCard','useSkill','respond'].includes(e.name));
 if(!targetCause)return null;
 if(targetCause.skill||targetCause.name==='useSkill'||chain.some(e=>e.seat===targetSeat&&e.skill))return 'skillLoss';
 if(chain.some(e=>e.seat===victimSeat&&(e.name==='respond'||e.name==='chooseToRespond'||e.name==='useCard'&&e.card==='wuxie'||e.responseTo===targetSeat)))return 'responseLoss';
 return 'otherLoss';
}
export function testOutcome(mode,target,players,nativeResult){
 if(!target||typeof nativeResult!=='boolean'&&typeof nativeResult!=='string')return 'fault';
 if(typeof nativeResult==='string')return 'draw';
 const living=players.filter(p=>p.alive);
 if(mode==='single')return target.alive?'win':'loss';
 if(mode==='doudizhu'){const lord=players.find(p=>p.identity==='zhu');return (target.identity==='zhu')===!!lord?.alive?'win':'loss';}
 if(mode==='identity'){
  const lord=players.find(p=>p.identity==='zhu'&&p.alive);
  const winner=lord?'lord':living.length===1&&['nei','ye'].includes(living[0].identity)?'nei:'+living[0].seat:'rebel';
  const side=['zhu','zhong'].includes(target.identity)?'lord':target.identity==='fan'?'rebel':'nei:'+target.seat;
  return winner===side?'win':'loss';
 }
 if(mode==='guozhan'){const factions=new Set(living.map(p=>p.side));if(factions.size!==1)return 'fault';return factions.has(target.side)?'win':'loss';}
 return 'fault';
}
export function createTestMetrics(env,launch){
 const {lib,game,get,_status}=env,s=launch.settings;let targetSeat=null,fault='',lastRound=0;
 const rows=new Map(),roundSet=new Set(),seen=new WeakSet();
 const quality={graded:0,ungraded:0,lossSum:0};
 const all=()=>game.players.concat(game.dead||[]);
 const row=seat=>{if(!rows.has(seat))rows.set(seat,{flow:0,flowValue:0,firstRoundFlow:0,damage:0,maxDamage:0,maxRoundDamage:0,enemyLoss:0,responseLoss:0,skillLoss:0,otherLoss:0,allyDraw:0,enemyHpDrop:0,keyCards:{},gainedCards:{},damageRounds:{}});return rows.get(seat);};
 const player=seat=>all().find(p=>p.playSeat===seat);
 function side(p){if(s.mode==='single')return 'seat:'+p.playSeat;if(s.mode==='doudizhu')return p.identity==='zhu'?'landlord':'farmers';if(s.mode==='identity')return ['zhu','zhong'].includes(p.identity)?'lord':p.identity==='fan'?'rebel':'nei:'+p.playSeat;const g=p.identity==='unknown'?p.trueIdentity:p.getGuozhanGroup?.()||p.trueIdentity||p.identity;return g==='ye'?'ye:'+p.playSeat:g;}
 const allied=(a,b)=>a&&b&&side(a)===side(b);
 const chain=e=>{const result=[];for(let n=0;e&&n<30;n++,e=e.parent)result.push({name:e.name,skill:e.skill,card:e.card?.name,seat:e.player?.playSeat,responseTo:e.respondTo?.[0]?.playSeat});return result;};
 const proto=lib.element.GameEvent.prototype,oldStart=proto.start;
 proto.start=function(...args){
  const first=!seen.has(this);seen.add(this);let lost=null;
  if(first&&this.name==='phase'){const p=player(targetSeat);if(p?.isAlive()){lastRound=game.roundNumber||1;roundSet.add(lastRound);}}
  if(first&&this.name==='lose'&&this.player&&game.phaseNumber){const hand=new Set(this.player.getCards('h')),equip=new Set(this.player.getCards('e'));lost=(this.cards||[]).filter(c=>hand.has(c)||equip.has(c));}
  const result=oldStart.apply(this,args);
  return Promise.resolve(result).then(value=>{
   if(first&&['useCard','respond'].includes(this.name)&&this.player&&this.card){const r=row(this.player.playSeat),key=get.translation(this.card.name);const entry=r.keyCards[key]??={used:0,gained:0};entry.used++;}
   if(lost?.length){const victim=this.player,test=player(targetSeat),actual=lost.filter(c=>!victim.getCards('he').includes(c));if(test&&!allied(test,victim)&&actual.length){const field=lossAttribution(chain(this.parent),targetSeat,victim.playSeat);if(field){const r=row(targetSeat);r[field]+=new Set(actual).size;r.enemyLoss+=new Set(actual).size;launch.testRecord?.('test-loss',{seat:victim.playSeat,sourceSeat:targetSeat,kind:field,cards:actual.map(c=>get.translation(c.name)),round:game.roundNumber});}}}
   if(first&&this.name==='draw'&&this.player&&game.phaseNumber){const test=player(targetSeat),recipient=this.player,causes=chain(this.parent);if(test&&recipient!==test&&allied(test,recipient)&&causes.some(e=>e.seat===targetSeat&&(e.name==='useSkill'||e.name==='useCard'||e.skill))){const cards=this.result?.cards||this.cards||[];row(targetSeat).allyDraw+=cards.length;}}
   return value;
  });
 };
 function record(type,data){
  if(type==='operation-quality'&&data.seat===targetSeat){if(data.graded){quality.graded++;quality.lossSum+=data.loss;}else quality.ungraded++;}
  if(type==='test-target')targetSeat=data.seat;
  if(type==='test-fault')fault=data.message;
  if(type==='console'||type==='takeover')fault='用户写入或手动接管的干预局';
  if((type==='flow-metrics'&&data.seat===targetSeat||type==='hp-metrics'&&(data.seat===targetSeat||data.sourceSeat===targetSeat))&&data.round>0)roundSet.add(data.round);
  if(type==='flow-metrics'){
   const r=row(data.seat);r.flow+=data.total;r.flowValue+=data.value||0;if(data.round===1)r.firstRoundFlow+=data.total;
   for(const [key,n]of Object.entries(data.byCard||{})){r.gainedCards[key]=(r.gainedCards[key]||0)+n;const c=r.keyCards[key]??={used:0,gained:0};c.gained+=n;}
  }
  if(type==='hp-metrics'&&data.enemyDrop)row(data.sourceSeat).enemyHpDrop-=data.delta;
  if(type==='hp-metrics'&&data.enemyDrop&&data.cause==='damage'){const r=row(data.sourceSeat),n=-data.delta;r.damage+=n;r.maxDamage=Math.max(r.maxDamage,n);r.damageRounds[data.round]=(r.damageRounds[data.round]||0)+n;r.maxRoundDamage=Math.max(r.maxRoundDamage,r.damageRounds[data.round]);}
 }
 function finish(result){
  const target=player(targetSeat);if(!target)fault||='未确定测试将座位';
  const finalPlayers=all().map(p=>({seat:p.playSeat,identity:p.identity,side:side(p),alive:p.isAlive()}));
  const outcome=fault?'fault':testOutcome(s.mode,finalPlayers.find(p=>p.seat===targetSeat),finalPlayers,result);
  const ids=[...new Set([target?.name1||target?.name,target?.name2].flatMap(id=>lib.character[id]?.skills||[]))];
  const skillSpecs=ids.map(id=>({id,name:get.translation(id),description:get.skillInfoTranslation(id,target),content:String(lib.skill[id]?.content||'').slice(0,24000),ai:JSON.stringify(lib.skill[id]?.ai||{},(_key,v)=>typeof v==='function'?v.toString():v)}));
  const r=row(targetSeat);if(target?.isAlive()&&game.roundNumber)roundSet.add(game.roundNumber);
  return{match:launch.id,mode:s.mode,targetSeat,role:target?.identity||'未知',rounds:roundSet.size,roundNumbers:[...roundSet],skillSpecs,partialFinalRound:true,...r,quality,survived:!!target?.isAlive(),finalHp:Math.max(0,target?.hp||0),maxHp:target?.maxHp||0,hpLost:launch.hpStats?.[targetSeat]?.lost||0,
   outcome,fault:outcome==='fault'?(fault||'引擎结果无法判定'):'',opponents:all().filter(p=>p!==target).map(p=>({seat:p.playSeat,name:p.name1||p.name,name2:p.name2,identity:p.identity,hp:p.hp,alive:p.isAlive()}))};
 }
 return{record,finish,fault:message=>fault=message};
}
