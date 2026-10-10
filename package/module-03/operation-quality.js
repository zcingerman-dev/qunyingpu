// An independent, visible-information, short-horizon evaluator. Unsupported
// skills remain ungraded; they are never silently counted as optimal actions.
const number=x=>Number.isFinite(x)?x:0;
export function normalizedLoss(values,chosen){
 const known=values.filter(v=>Number.isFinite(v.value)),pick=known.find(v=>v.id===chosen);
 if(!pick||known.length<2)return null;
 const best=Math.max(...known.map(v=>v.value)),worst=Math.min(...known.map(v=>v.value));
 return {loss:best===worst?0:(best-pick.value)/(best-worst),best:known.filter(v=>Math.abs(v.value-best)<1e-8).map(v=>v.id),chosen,values:known};
}
export function cardValue(c,self){
 if(!c)return null;
 if(c.name==='tao')return self.hp<self.maxHp?7:4;
 if(c.name==='shan')return 4;
 if(c.name==='jiu')return self.hp<=1?5:3;
 if(c.name==='sha')return 3;
 if(c.name==='wuzhong')return 8;
 if(c.type==='equip')return 3.9;
 if(c.type==='trick'||c.type==='delay')return 5.1;
 if(c.type==='basic')return 3;
 return null;
}
export function candidateValue(kind,c,context){
 const {self,event,card,players}=context;
 if(kind==='cards'||kind==='buttons'){
  const value=cardValue(c,self);if(value===null)return null;
  if(/Discard|Compare/.test(event))return event.includes('Discard')?-value:number(c.number);
  if(/Respond/.test(event))return ['shan','sha','wuxie','tao','jiu'].includes(c.name)?7-value/5:null;
  if(/ToUse|CardTarget/.test(event)){
   if(c.name==='tao')return self.hp<self.maxHp?8-value/5:0;
   if(c.name==='shan')return 0;
   if(c.name==='jiu')return self.hp<=1?7:2;
   if(c.name==='sha')return players.some(p=>p.relation==='enemy'&&p.alive)?4-value/5:0;
   if(['wuzhong','shunshou','guohe','juedou','nanman','wanjian','huogong','tiesuo'].includes(c.name))return 5-value/5;
   if(c.type==='equip')return self.equips.some(x=>x.subtype===c.subtype)?1:4;
   return null;
  }
  if(/Card|Button/.test(event))return value;
  return null;
 }
 if(kind==='targets'){
  const p=players.find(p=>p.seat===c);if(!p||p.relation==='unknown')return null;
  const relation=p.relation==='enemy'?-1:1,n=card?.name;
  if(['sha','juedou','huogong','nanman','wanjian'].includes(n))return -relation*(4+3/Math.max(1,p.hp));
  if(['guohe','shunshou'].includes(n))return -relation*Math.min(6,p.hand+p.equips.length);
  if(['tao','wugu','taoyuan'].includes(n))return relation*(n==='tao'?Math.max(0,p.maxHp-p.hp)*3:3);
  return null;
 }
 return null;
}
export function installOperationQuality(env,launch,record){
 const {game,get,ai,ui,_status}=env,test=launch.settings.studioRuntime.test;let active=null,serial=0;
 const describe=c=>c&&typeof c==='object'?{id:String(c.cardid||c.link?.cardid||''),name:c.name,type:get.type(c,null,false),subtype:get.subtype(c),number:c.number}:null;
 function context(e){
  const self=e.player,mode=launch.settings.mode;
  const knownRole=p=>p===self||p.identityShown||['single','doudizhu'].includes(mode)?p.identity:'unknown';
  function relation(p){if(p===self)return 'ally';if(mode==='single')return 'enemy';const a=knownRole(self),b=knownRole(p);if(mode==='guozhan'){if(self.isUnseen?.(2)||p.isUnseen?.(2)||self.group==='unknown'||p.group==='unknown')return 'unknown';return self.group===p.group&&self.identity!=='ye'&&p.identity!=='ye'?'ally':'enemy';}if(b==='unknown')return 'unknown';if(mode==='doudizhu')return (a==='zhu')===(b==='zhu')?'ally':'enemy';return a===b&&a!=='nei'||['zhu','zhong'].includes(a)&&['zhu','zhong'].includes(b)?'ally':'enemy';}
  return {event:e.name,card:e.card||ui.selected.cards[0],self:{hp:self.hp,maxHp:self.maxHp,equips:self.getCards('e').map(describe)},players:game.players.map(p=>({seat:p.playSeat,hp:p.hp,maxHp:p.maxHp,hand:p.countCards('h'),equips:p.getCards('e').map(describe),alive:p.isAlive(),relation:relation(p)}))};
 }
 const selection=kind=>(kind==='cards'?ui.selected.cards:kind==='targets'?ui.selected.targets:ui.selected.buttons).map(x=>kind==='targets'?x.playSeat:String((kind==='buttons'?x.link:x)?.cardid||''));
 for(const [method,kind]of [['selectableCards','cards'],['selectableTargets','targets'],['selectableButtons','buttons']]){
  const native=get[method];if(!native)continue;
  get[method]=function(...args){const candidates=native.apply(this,args),e=_status.event;
   if(active&&active.kind===kind&&e?.player?.playSeat===test.targetSeat){const ctx=context(e);active.frames.push({event:e.name,skill:e.skill||'',selected:selection(kind),values:candidates.map(x=>{
    const hidden=kind==='buttons'&&(x.classList?.contains('blank')||x.classList?.contains('hidden'));
    const c=kind==='targets'?x.playSeat:describe(kind==='buttons'?x.link:x),id=kind==='targets'?x.playSeat:c?.id;
    return {id,label:hidden?'未知':kind==='targets'?String(id):c?.name||'特殊技能',value:hidden||c==null?null:candidateValue(kind,c,ctx)};
   }),forced:!!e.forced});}
   return candidates;};
 }
 for(const [method,kind]of [['chooseCard','cards'],['chooseTarget','targets'],['chooseButton','buttons']]){
  const native=ai.basic[method];if(!native)continue;
  ai.basic[method]=function(...args){const e=_status.event;if(e?.player?.playSeat!==test.targetSeat)return native.apply(this,args);
   const previous=active,session={kind,frames:[]};active=session;let result;
   try{result=native.apply(this,args);return result;}finally{
    const final=selection(kind);active=previous;
    for(let i=0;i<session.frames.length;i++){
     const f=session.frames[i],after=session.frames[i+1]?.selected||final,pick=after.find(id=>!f.selected.includes(id));
     const values=f.values.slice();if(!f.forced)values.push({id:'decline',label:'不选择',value:0});
     const chosen=pick??'decline',grade=normalizedLoss(values,chosen);
     const unsupported=!!f.skill||f.values.some(v=>v.value===null)||chosen==='decline'&&f.forced;
     record('operation-quality',{decision:++serial,seat:test.targetSeat,event:f.event,skill:f.skill,kind,round:game.roundNumber||0,method:'visible-short-horizon-v1',scope:'当前合法选择步的近似收益；不保证组合技能或整局最优',...(!unsupported&&grade?{graded:true,...grade}:{graded:false,reason:'特殊技能、隐藏信息或候选价值不足，待整局分析',chosen,values})});
    }
   }
  };
 }
 return {ungraded(e){if(e?.player?.playSeat===test.targetSeat&&!['chooseCard','chooseTarget','chooseButton','chooseToUse','chooseToRespond','chooseToDiscard','chooseCardTarget'].includes(e.name))record('operation-quality',{decision:++serial,seat:test.targetSeat,event:e.name,skill:e.skill||'',graded:false,method:'visible-short-horizon-v1',reason:'独有控制、排序或结束回合选择暂无法可靠估值，已保留原始决策'});}};
}
