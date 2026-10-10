// Host-owned, seat-scoped controls use the existing ACTION envelope.
export const CONTROL_PROMPT='network-control';
export class NetworkControls {
 constructor(humans){this.humans=new Set(humans);this.autoplay=new Set();this.revision=1;this.paused=false;}
 apply(packet,started,over){
  const a=packet.action;
  if(a.prompt!==CONTROL_PROMPT||a.op!=='control')throw Error('ACTION类型或引用无效');
  if(!started||over)throw Error('托管仅在选将完成后的对局中使用');
  if(!this.humans.has(packet.seat))throw Error('该座位不是真人玩家');
  if(a.revision!==this.revision)throw Error('选择已经变化，请使用最新提示');
  if(a.ref==='autoplay-on')this.autoplay.add(packet.seat);
  else if(a.ref==='autoplay-off')this.autoplay.delete(packet.seat);
  else if(['pause-on','pause-off'].includes(a.ref)){
   if(packet.seat!==0)throw Error('只有Host可以暂停或恢复对局');
   this.paused=a.ref==='pause-on';
  }else throw Error('ACTION类型或引用无效');
  this.revision++;
 }
 snapshot(started,over){return {controlRevision:this.revision,controlsEnabled:!!started&&!over,paused:this.paused,autoplaySeats:over?[]:[...this.autoplay].sort((a,b)=>a-b)};}
}
