import {safePortrait} from './network-roster.js';
// The only game-state disclosure boundary. Build new allowlisted objects; never
// spread/clone the authority DTO into a recipient packet. Unknown fields fail closed.
const list=v=>Array.isArray(v)?v:[];
const text=(v,max=4000)=>typeof v==='string'?v.slice(0,max):'';
const number=v=>Number.isFinite(v)?v:0;
const seat=v=>Number.isSafeInteger(v)&&v>=0&&v<12?v:null;
const ref=v=>text(v,120);
function card(c,hidden=false,privateVisible=false){if(hidden||c?.hidden)return {hidden:true,text:'背面牌'};const value={id:text(c?.id,100),name:text(c?.name,100),text:text(c?.text,300),suit:text(c?.suit,20),number:number(c?.number),nature:text(c?.nature,30)};if(privateVisible&&list(c?.privateTags).length)value.privateTags=list(c.privateTags).slice(0,8).map(v=>text(v,120));return value;}
function general(g){return g.visible!==true?{visible:false,name:'未明置武将'}:{id:text(g.id,150),skinId:text(g.skinId||g.id,150),visible:true,name:text(g.name,100),skills:skills(g.skills),...(safePortrait(g.portrait)?{portrait:safePortrait(g.portrait)}:{})};}
function outcome(v){return v?{winner:seat(v.winner),winners:list(v.winners).filter(s=>seat(s)!==null),draw:!!v.draw,text:'对局结束'}:null;}
function skills(v){return list(v).map(s=>({id:text(s.id,150),name:text(s.name,100),text:text(s.text)}));}
export function buildPlayerView(source,playerId,playerSeat){
  if(typeof playerId!=='string'||seat(playerSeat)===null)throw Error('玩家视图身份无效');
  const pub=source?.public||{},own=source?.private?.[String(playerSeat)]||{};
  const players=list(pub.players).map(p=>({seat:seat(p.seat),name:list(p.generals).length?list(p.generals).map(g=>g.visible?text(g.name,100):'未明置武将').join(' / '):p.nameVisible===false?'未明置武将':text(p.name,100),hp:number(p.hp),maxHp:number(p.maxHp),alive:!!p.alive,hand:number(p.hand),generals:list(p.generals).map(general),
    identity:p.identityVisible===true?text(p.identity,30):'unknown',equip:list(p.equip).map(c=>card(c)),judges:list(p.judges).map(c=>card(c)),skills:list(p.generals).length?list(p.generals).flatMap(g=>g.visible?skills(g.skills):[]):p.nameVisible===false?[]:skills(p.printedSkills)}));
  const view={viewSchema:1,playerId,public:{currentSeat:seat(pub.currentSeat),round:number(pub.round),phase:number(pub.phase),over:!!pub.over,outcome:outcome(pub.outcome),pile:number(pub.pile),discard:number(pub.discard),players,
    controlRevision:number(pub.controlRevision),controlsEnabled:!!pub.controlsEnabled,paused:!!pub.paused,autoplaySeats:list(pub.autoplaySeats).filter(s=>seat(s)!==null),
    recentPlays:list(pub.recentPlays).slice(-96).filter(p=>['useCard','respond'].includes(p.event)&&seat(p.seat)!==null).map(p=>({seat:seat(p.seat),event:p.event,card:card(p.card)}))},
    own:{result:pub.over?(pub.outcome?.draw?'draw':list(pub.outcome?.winners).includes(playerSeat)?'win':'lose'):null,generals:list(own.generals).map(g=>general({...g,visible:true})),hand:list(own.hand).map(c=>card(c,false,true)),identity:text(list(pub.players).find(p=>p.seat===playerSeat)?.identity,30),piles:list(own.piles).map(p=>({name:text(p.name,100),cards:list(p.cards).map(c=>card(c))})),skills:skills(own.skills)},prompt:null,fault:source?.fault?'Host规则执行异常，等待处理':null};
  const q=source?.prompt;
  if(q&&q.seat===playerSeat){
    const ownSkill=skills(own.skills).concat(players.find(p=>p.seat===playerSeat)?.skills||[]).some(s=>s.id===q.skill);
    view.prompt={id:ref(q.id),revision:number(q.revision),seat:playerSeat,event:text(q.event,100),text:text(q.text),skill:ownSkill?text(q.skill,150):'',unsupported:!!q.unsupported,
      cards:list(q.cards).map(c=>({...card(c,false,c.privateOwner===playerSeat),ref:ref(c.ref),selected:!!c.selected})),
      targets:list(q.targets).map(t=>({ref:ref(t.ref),seat:seat(t.seat),text:players.find(p=>p.seat===t.seat)?.name||'角色',selected:!!t.selected})),
      buttons:list(q.buttons).map(b=>({ref:ref(b.ref),text:b.hidden?'背面牌':text(b.text,600),selected:!!b.selected,...(!b.hidden&&b.generalId?{generalId:text(b.generalId,150),...(safePortrait(b.portrait)?{portrait:safePortrait(b.portrait)}:{})}:{}),...(!b.hidden&&b.card?{card:card(b.card,false,b.card.privateOwner===playerSeat)}:{})})),
      controls:list(q.controls).map(c=>({ref:ref(c.ref),text:text(c.text,300),link:text(c.link,150)})),
      ...(q.event==='chooseCharacter'?{filters:list(q.filters).map(f=>({ref:ref(f.ref),text:text(f.text,100),selected:!!f.selected}))}:{})};
  }
  return view;
}
const reasons=new Set(['当前没有可操作选择','该选择属于其他玩家','选择已经变化，请使用最新提示','引用不属于当前合法候选','卡牌或目标不合法','操作按钮已失效','牌、目标或数量不符合引擎规则','ACTION字段无效，不允许写入GameState','ACTION类型或引用无效','房间尚未开局或已关闭','等待玩家重连，暂不能操作','旧连接已失效','该操作正在处理，请勿重复提交','托管仅在选将完成后的对局中使用','该座位不是真人玩家','只有Host可以暂停或恢复对局','对局已暂停','当前由AI托管，请先取消托管']);
const engineEvents=new Set(['update','damagepop','phaseChange','init','uiClear']);
export function buildPlayerEvents(events,playerSeat){
  return list(events).flatMap(envelope=>{
    const d=envelope.data||envelope;let safe;
    if(['ACTION_ACCEPTED','ACTION_REJECTED'].includes(d.kind)){
      if(d.seat!==playerSeat)return [];
      safe={kind:d.kind,id:text(d.id,80),seat:playerSeat};if(d.kind==='ACTION_ACCEPTED')safe.op=['card','target','button','control'].includes(d.op)?d.op:'';
      else safe.reason=reasons.has(d.reason)?d.reason:'操作未通过Host验证';
    }else if(d.kind==='ENGINE'&&engineEvents.has(d.event))safe={kind:'ENGINE',event:d.event,seat:seat(d.seat)};
    else if(d.kind==='ENGINE_RESOLVED'&&['useCard','respond','damage','draw','useSkill'].includes(d.event)){
      if(d.event==='useSkill'&&d.seat!==playerSeat)return [];
      safe={kind:d.kind,event:d.event,seat:seat(d.seat)};
      // A completed use/respond exposes the played card; draw never does.
      if(['useCard','respond'].includes(d.event))safe.card=text(d.card,100);
    }else if(d.kind==='MATCH_OVER')safe={kind:d.kind,outcome:outcome(d.outcome)};
    else if(d.kind==='ENGINE_ERROR')safe={kind:d.kind,reason:'Host规则执行异常，等待处理'};
    else return [];
    return [{type:'EVENT',seq:number(envelope.seq),revision:number(envelope.revision),data:safe}];
  });
}
export function buildPlayerPacket(source,{playerId,seat:playerSeat,phase='running',members=2,revision=0,resync=false,suspended=false}={}){
  return {phase,members,hostOnline:true,revision,playerId,resync,suspended,snapshot:buildPlayerView(source.snapshot,playerId,playerSeat),events:buildPlayerEvents(source.events,playerSeat)};
}
export function buildLocalViewEnvelope(snapshot,events){
  return {viewSchema:1,playerViews:Object.fromEntries([0,1].map(seat=>[String(seat),{snapshot:buildPlayerView(snapshot,String(seat),seat),events:buildPlayerEvents(events,seat).map(e=>e.data)}]))};
}
