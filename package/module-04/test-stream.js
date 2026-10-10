const roleNames={zhu:'主公',zhong:'忠臣',fan:'反贼',nei:'内奸',unknown:'未亮将'};
export function roleName(role,mode){return mode==='doudizhu'?({zhu:'地主',fan:'农民'})[role]||role:mode==='single'?({zhu:'先手',fan:'后手'})[role]||role:roleNames[role]||role||'未知';}
export function eventLine(e){
 const d=e.data||{},prefix=`#${e.seq} ${e.type}`;
 if(e.type==='model-choice')return `${prefix} · ${d.seat+1}号位 · ${d.event} → ${d.id} · ${d.reason||''}`;
 if(e.type==='test-assignment')return `${prefix} · ${d.seat+1}号位 · ${d.role} · ${d.general} · 随机种子 ${d.seed}`;
 if(e.type==='flow-metrics')return `${prefix} · 第${d.round}轮 · ${d.seat+1}号位获得 ${d.total} 牌 · ${JSON.stringify(d.byCard||{})}`;
 if(e.type==='hp-metrics')return `${prefix} · 第${d.round}轮 · ${d.seat+1}号位体力 ${d.delta>0?'+':''}${d.delta} · 来源 ${d.sourceSeat===null?'—':d.sourceSeat+1+'号位'}`;
 const text=JSON.stringify(d);return prefix+' · '+(text.length>650?text.slice(0,650)+'…（完整内容已留在原始记录）':text);
}
export function createStream(){
 let lines=[],assignment=null,snapshot=null,timer=null;
 function paint(){
  const log=document.getElementById('test-data-log');if(log){const follow=log.scrollHeight-log.scrollTop-log.clientHeight<50;log.textContent=lines.join('\n');if(follow)log.scrollTop=log.scrollHeight;}
  const text=document.getElementById('test-live-summary');if(!text)return;
  if(!snapshot){text.textContent=assignment?`${assignment.seat+1}号位 · ${assignment.role} · 正在准备开局`:'正在准备本局；身份与座位将在开局后核对';return;}
  const target=snapshot.players?.find(p=>Number(p.playSeat??p.seat)===assignment?.seat),flow=snapshot.flowStats?.[assignment?.seat];
  text.textContent=`第 ${snapshot.round||0} 轮 · 已执行 ${snapshot.phase||0} 个回合 · ${target?`${assignment.seat+1}号位 ${target.name} · ${assignment.role} · ${target.hp}/${target.maxHp}血 · ${target.hand}手牌`:'等待测试将'} · 本局累计过牌 ${flow?.total||0} · 牌堆 ${snapshot.pile||0} / 弃牌 ${snapshot.discard||0}`;
 }
 function schedule(){if(!timer)timer=setTimeout(()=>{timer=null;paint();},80);}
 return {reset(){lines=[];assignment=snapshot=null;paint();},assignment(d){assignment=d;schedule();},event(e){lines.push(eventLine(e));if(lines.length>160)lines.splice(0,lines.length-160);if(e.type==='test-assignment')assignment=e.data;schedule();},status(d){snapshot=d;schedule();},paint};
}
