// Shared rules for roster selection. Ratings are estimates, never measured probabilities.
export const labels={extreme:'极强',strong:'强',weak:'弱',unknown:'未评级'};
export const ratingRoles={landlord:'地主',farmer:'农民',duel:'单挑',identity:'身份场'};
export const ratingCriteria={version:2,roundCards:20,roundEnemyHp:4,roundAttacks:10,cardScope:'draw-and-gain',openingIncluded:false};
export const ratingCriteriaText=`极强满足任一：每轮稳定过${ratingCriteria.roundCards}牌；每轮稳定造成敌方至少${ratingCriteria.roundEnemyHp}点实际掉血；每轮大概率至少${ratingCriteria.roundAttacks}次攻击行为。均须可重复。过牌包括摸牌与其他实际获得牌，包含额外回合和回合外，不含开局手牌。`;
export const groupNames={wei:'魏',shu:'蜀',wu:'吴',qun:'群',jin:'晋',shen:'神',ye:'野心家',key:'Key',western:'西域'};
export function lockRoleAtSeat(roles,mode,role,seat){
 if(!['identity','doudizhu'].includes(mode)||!role||role==='random')return roles;
 if(!Number.isInteger(seat)||seat<0||seat>=roles.length)throw Error('锁定身份的座位无效');
 const at=roles.indexOf(role);if(at<0)throw Error('该人数的身份配置中没有所选身份，请返回修改');
 [roles[at],roles[seat]]=[roles[seat],roles[at]];return roles;
}
const cn={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
const number=s=>{if(/^\d+$/.test(s))return Number(s);let total=0,digit=0;for(const ch of s){if(ch==='十'||ch==='百'){total+=(digit||1)*(ch==='十'?10:100);digit=0;}else if(ch==='零'||ch==='〇')digit=0;else if(cn[ch])digit=cn[ch];else return 0;}return total+digit;};
export function roughRating(v,role){
 const reasons=[];let best='unknown',score=-1;
 for(const skill of v.skillDetails||[]){
  const t=(skill.description||'').replace(/<[^>]*>/g,'').replace(/\s+/g,'');
  if(!t)continue;
  if(/主公技/.test(t)&&role!=='identity')continue;
  const recurring=!/限定技|觉醒技|使命技|游戏开始时|每局游戏限|(?:每局|每场|本局|整局|一局)(?:游戏)?(?:仅|只|只能)?(?:限|有)?(?:一次|1次)/.test(t);
  const cost=t.match(/(?:弃置|交给|使用|打出)([一二两三四五六七八九十\d]+)张(?:[^。；]{0,12}牌)/);
  const draw=t.match(/(?:摸取|摸)([一二两三四五六七八九十百零〇\d]+)张(?:手牌|牌)/);
  if(cost&&draw){
   const n=number(draw[1]),spent=number(cost[1]),ratio=n/spent;
   if(n&&spent){const conditional=/若|如果|当|判定|随机|拼点|最多|至多|或/.test(t);const level=ratio>1?'strong':'weak';
    // Conditional text alone cannot establish the agreed 70% probability.
    if(!conditional){const rank={weak:0,strong:1}[level];if(rank>score){score=rank;best=level;}reasons.push(`${skill.name||skill.id}：技能文字含投入${spent}张牌、摸${n}张牌，平均用1摸${Number(ratio.toFixed(2))}；牌效本身不再触发极强，仍需核对发动条件。`);}
   }
  }
  if(recurring&&/(?:每轮|每个回合|你的回合|出牌阶段|摸牌阶段|准备阶段|结束阶段|回合开始时|回合结束时)/.test(t)&&!/(?:若|如果|判定|随机|拼点|最多|至多|或)/.test(t)){
   const damage=t.match(/造成([一二两三四五六七八九十百零〇\d]+)点(?:[^。；]{0,4})伤害/),attacks=t.match(/(?:使用|打出)([一二两三四五六七八九十百零〇\d]+)张【杀】/);
   const flow=t.match(/(?:摸取|摸|获得|过)([一二两三四五六七八九十百零〇\d]+)张?(?:手牌|牌)/);
   const cardThreshold=flow&&number(flow[1])>=ratingCriteria.roundCards&&(!cost||number(cost[1])<=2)&&!/(?:每当|当你)/.test(t);
   if(cardThreshold){best='extreme';score=2;reasons.push(`${skill.name||skill.id}：文字含每轮可重复获得至少20张牌的条件；过牌按实际摸牌及其他获得牌计数，开局不计，仍需核对启动及次数限制。`);}
   if(damage&&number(damage[1])>=ratingCriteria.roundEnemyHp||attacks&&number(attacks[1])>=ratingCriteria.roundAttacks){best='extreme';score=2;reasons.push(`${skill.name||skill.id}：文字含可重复的${damage&&number(damage[1])>=ratingCriteria.roundEnemyHp?'至少4点伤害':'至少10次攻击'}条件；目标、次数限制需按技能说明核对。`);}
  }
 }
 if(!v.skillDetails?.some(x=>x.description)){best='unknown';}
 return{label:best,reason:reasons.join('\n')||'技能文字不足以可靠确定收益与重复条件，保留未评级；可由玩家补充粗评。',kind:'规则粗评',probability:null};
}
export function ratingOf(v,role,overrides={}){return overrides[v.key]?.[role]?{...overrides[v.key][role],kind:'玩家修改',probability:null}:roughRating(v,role);}
export function roleFor(mode,identity){return mode==='single'?'duel':mode==='doudizhu'?(identity==='zhu'?'landlord':'farmer'):mode==='identity'?'identity':null;}
export function emptySeat(){return{method:'random',picks:[],locked:false,filters:{pools:[],groups:[],strengths:[],collections:[]}};}
export function defaultRoster(n){return{humanSeat:0,revealAI:false,seats:Array.from({length:n},emptySeat)};}
export function candidates(pool,seat,role,ratings){const f=seat.filters;return pool.filter(v=>(!f.pools.length||f.pools.includes(v.pool))&&(!f.groups.length||v.groups.some(g=>f.groups.includes(g)))&&(!f.collections?.length||f.collections.some(id=>v.folders?.includes(id)))&&(!role||!f.strengths.length||f.strengths.includes(ratingOf(v,role,ratings).label)));}
export function legalPair(a,b,separatism=false){
 if(!a||!b||b.isJun)return false;if(separatism)return true;
 const ga=a.groups,gb=b.groups,flex=g=>['shen'].includes(g);
 if(ga.length>1)return gb.length>1?ga.some(g=>gb.includes(g)):ga.includes(gb[0])||flex(gb[0]);
 if(ga[0]==='ye'||flex(ga[0]))return gb[0]!=='ye';
 return gb.includes(ga[0])||flex(gb[0]);
}
export function validateRoster(pool,roster,{mode,double=false,separatism=false,roles=[],ratings={}}={}){
 const map=new Map(pool.map(v=>[v.key,v])),used=new Map(),errors=[];
 for(const[seat,s]of roster.seats.entries()){
  if(s.picks.length!==(double?2:1))errors.push(`${seat+1}号位尚未选齐武将`);
  for(const key of s.picks){const v=map.get(key);if(!v){errors.push(`${seat+1}号位版本不在当前合法将池`);continue;}
   if(s.method==='random'&&!candidates([v],s,roleFor(mode,roles[seat]),ratings).length)errors.push(`${seat+1}号位选择不符合筛选`);
   const previous=used.get(v.id);if(previous!==undefined&&(s.method!=='manual'||roster.seats[previous].method!=='manual'))errors.push(`重复版本 ${v.name} 需双方手动选择`);used.set(v.id,seat);
  }
  if(mode==='guozhan'&&s.picks.length===2&&!legalPair(map.get(s.picks[0]),map.get(s.picks[1]),separatism))errors.push(`${seat+1}号位主副将不符合国战配队规则`);
 }
 return[...new Set(errors)];
}
export function randomizeRoster(pool,roster,options={},random=Math.random,onlySeat=null){
 const next=structuredClone(roster),map=new Map(pool.map(v=>[v.key,v])),used=new Set(),slots=[],double=!!options.double;
 for(const[i,s]of next.seats.entries()){
  if(s.method==='manual'||s.locked||onlySeat!==null&&i!==onlySeat){for(const key of s.picks){const v=map.get(key);if(v)used.add(v.id);}continue;}
  s.picks=[];const list=candidates(pool,s,roleFor(options.mode,options.roles?.[i]),options.ratings||{});
  if(!list.length)throw Error(`${i+1}号位没有符合筛选的候选，请调整将池、势力或强度。`);
  slots.push({i,list});
 }
 const shuffle=list=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 slots.sort((a,b)=>a.list.length-b.list.length);let budget=30000;
 function solve(k){if(k===slots.length)return true;if(--budget<0)return false;const{ i,list}=slots[k];
  for(const a of shuffle(list)){if(used.has(a.id))continue;const partners=double?shuffle(list.filter(b=>b.id!==a.id&&!used.has(b.id)&&(options.mode!=='guozhan'||legalPair(a,b,options.separatism)))):[null];
   for(const b of partners){next.seats[i].picks=b?[a.key,b.key]:[a.key];used.add(a.id);if(b)used.add(b.id);if(solve(k+1))return true;used.delete(a.id);if(b)used.delete(b.id);if(--budget<0)return false;}
  }next.seats[i].picks=[];return false;
 }
 if(!solve(0))throw Error('候选不足或无法组成合法阵容；已保留原选择，请调整筛选或手选。');return next;
}
export function cardWeight(type){return type==='trick'||type==='delay'?1.7:type==='equip'?1.3:1;}
export function summarizeDraw(cards){const byCard={},byType={},total=cards.length;let value=0;for(const c of cards){const type=c.type||'other',name=c.name||'未知牌';byCard[name]=(byCard[name]||0)+1;byType[type]=(byType[type]||0)+1;value+=cardWeight(type);}return{total,value:Math.round(value*10)/10,byCard,byType};}
// Preserve one unit for a virtual card even when the native gain event unwraps it.
// Count only cards actually received, once per acquisition event.
export function receivedUnits(requested,actual){const available=new Set(actual),covered=new Set(),units=[];for(const c of new Set(requested)){const members=c.cards?.length?c.cards:[c];if(members.some(x=>available.has(x)&&!covered.has(x))){units.push(c);for(const x of members)covered.add(x);}}for(const c of available)if(!covered.has(c)){units.push(c);covered.add(c);}return units;}
export class LoopGuard{
 constructor(){this.reset();}reset(){this.phase=null;this.count=0;this.seen=new Map();}
 observe(phase,signature){if(phase!==this.phase){this.reset();this.phase=phase;}this.count++;const hits=(this.seen.get(signature)||0)+1;this.seen.set(signature,hits);if(this.seen.size>2000)this.seen.delete(this.seen.keys().next().value);return hits>=16?'重复状态循环':this.count>=20000?'超长技能链运行保护':null;}
}
export function stateFingerprint(text){let a=2166136261,b=0x9e3779b9;for(let i=0;i<text.length;i++){const n=text.charCodeAt(i);a=Math.imul(a^n,16777619)>>>0;b=Math.imul(b+n,2246822519)>>>0;}return`${text.length}:${a.toString(16)}:${b.toString(16)}`;}
