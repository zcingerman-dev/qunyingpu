export const PROTOCOL_VERSION=1;
export const MODE_NAMES={identity:'身份',guozhan:'国战',doudizhu:'斗地主',single:'单挑'};
export function roomOptions(value={}){
  const mode=value.mode||'single',players=Number(value.players??(mode==='doudizhu'?3:mode==='single'?2:8)),humans=Number(value.humans??2);
  if(!MODE_NAMES[mode]||!Number.isInteger(players)||players<2||players>12||mode==='identity'&&players>10||mode==='single'&&players!==2||mode==='doudizhu'&&players!==3)throw Error('模式或总人数无效');
  if(!Number.isInteger(humans)||humans<2||humans>players)throw Error('真人人数须为2至总人数，其余座位由Host的AI控制');
  return {mode,players,humans};
}
export function iceConfiguration({stun='',turn='',username='',credential='',relay=false}={}){
  if(stun&&!/^stuns?:[^\s]+$/.test(stun))throw Error('STUN地址格式无效');
  const urls=turn.split(/[\s,]+/).filter(Boolean);
  if(urls.some(u=>!/^turns?:[^\s]+$/.test(u))||urls.length>8)throw Error('TURN地址需以turn:或turns:开头');
  if(urls.length&&(!username||!credential))throw Error('请填写TURN用户名及凭据');
  if(relay&&!urls.length)throw Error('强制中继需要配置TURN服务');
  return {iceServers:[...(stun?[{urls:stun}]:[]),...(urls.length?[{urls,username,credential}]:[])],iceTransportPolicy:relay?'relay':'all'};
}
// One outstanding click until Host acknowledges it. DOM replacement cannot
// unlock the gate. Timeout does not silently retry a possibly executed action.
export class ActionGate{
  constructor(timeout=12000){this.timeout=timeout;}
  begin(action){if(this.pending)return false;this.pending={id:action.action.id,at:Date.now()};return true;}
  receive(packet){if(packet.resync||(packet.events||[]).some(e=>['ACTION_ACCEPTED','ACTION_REJECTED'].includes(e.data?.kind)&&e.data.id===this.pending?.id))this.pending=null;}
  get locked(){return !!this.pending;}
  get expired(){return !!this.pending&&Date.now()-this.pending.at>this.timeout;}
  reset(){this.pending=null;}
}
