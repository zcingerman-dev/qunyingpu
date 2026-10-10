import {NetworkTable} from './network-table.js';
import {ClientReplica} from './network-transport.js';
import {InternetRoom,HostAuthorityTransport} from './network-rtc.js';
import {PortTransport} from './network-port.js';
import {ActionGate,roomOptions,MODE_NAMES} from './network-options.js';
import {RoomRosterPanel} from './network-roster-ui.js';
import {CONTROL_PROMPT} from './network-controls.js';
const gate=new ActionGate();let options;
const $=id=>document.getElementById(id),replica=new ClientReplica();
const identities={zhu:'主公',zhong:'忠臣',fan:'反贼/农民',nei:'内奸',unknown:'未公开',shu:'蜀',wei:'魏',wu:'吴',qun:'群',ye:'野心家',jin:'晋'};
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=text=>$('connection-status').textContent=text;
let room,router,clientTransport,enginePort,engineKey,networkConfig,state,starting=false,bound=false,currentPrompt,submitting=false,logs=[],lastActionId,closed=false,joining=false,receivedState=false;
const table=new NetworkTable($('network-table'),submitAction,{internet:true,onControl:submitControl});
let setupRevision=null,poolBusy=false;
const rosterPanel=new RoomRosterPanel($('room-roster-manager'),{mode:()=>options.mode,notice,onChange:changeRoomRoster});
function rosterSummary(summary){$('room-roster-summary').textContent=`三国将池：${Number(summary.builtin)||0}个目录版本（实际可选受模式规则限制） · DIY：${summary.diy.length?summary.diy.map(g=>g.name+' v'+g.version).join('、'):'未添加'}`;}
function setupPacket(){return {type:'ROOM_SETUP',settings:options,revision:room.room?.configRevision||0,roster:rosterPanel.roster.summary(options.mode)};}
async function changeRoomRoster(summary){
 if(!summary){if(room?.room)lobby(room.room);return;}
 if(room?.seat!==0||room.room?.phase!=='lobby')throw Error('仅Host可在开局前调整将池');
 poolBusy=true;lobby(room.room);
 try{await room.resetReady();setupRevision=room.room.configRevision;rosterSummary(summary);await Promise.all([...router.peers.entries()].filter(([id,p])=>id!=='host'&&p.online&&p.transport).map(([,p])=>p.transport.send(setupPacket())));}
 finally{poolBusy=false;if(room?.room)lobby(room.room);}
}
const credentialKey='play-internet-reconnect-v1',protocol=[];
let online=false;
const capture=(channel,data)=>{protocol.push({channel,data});if(protocol.length>2000)protocol.shift();};
// Copies of received player data only; this does not expose the Host engine.
Object.defineProperty(window,'networkAudit',{value:Object.freeze({currentView:()=>replica.read(),receivedPackets:()=>structuredClone(protocol),playerId:()=>room?.id,revision:()=>replica.revision}),writable:false});
function disconnected(id,epoch){if(room?.seat===0)router?.removeClient(id,epoch);else clientTransport=null;online=false;submitting=false;gate.reset();table.setLocked(true);notice('连接中断，等待恢复原座位…');}
const hash=v=>{let n=2166136261;for(const c of JSON.stringify(v))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n.toString(16).padStart(8,'0');};
function receive(packet){if(packet.type==='ROOM_SETUP'){options=roomOptions(packet.settings);setupRevision=packet.revision??0;if(packet.roster)rosterSummary(packet.roster);$('mode-label').textContent=`${MODE_NAMES[options.mode]} · ${options.players}人 · ${options.humans}真人＋${options.players-options.humans}AI`;if(room?.room)lobby(room.room);return;}paint(packet);}
function paint(packet){
  if(closed||!packet.snapshot||!replica.apply(packet))return;gate.receive(packet);submitting=gate.locked;
  capture('player-packet',structuredClone(packet));
  if(packet.resync){submitting=false;gate.reset();notice('已恢复原座位 · 玩家快照同步完成');}
  online=!packet.suspended;
  for(const e of packet.events||[]){const d=e.data;logs.push(`#${e.seq} ${d.kind} ${d.event||d.op||''}${d.reason?'：'+d.reason:''}`);if(d.id===lastActionId&&d.kind==='ACTION_ACCEPTED')notice('Host已接受操作');if(d.kind==='ACTION_REJECTED'&&d.seat===room.seat)notice('Host拒绝操作：'+d.reason);}
  const s=replica.read();if(!s)return;const pub=s.public;if(!receivedState){receivedState=true;if(!packet.resync)notice('WebRTC直连同步中 · 操作由Host验证');}
  if(!document.body.classList.contains('internet-playing'))$('room-details').open=false;
  document.body.classList.add('network-playing','internet-playing');currentPrompt=s.prompt;table.render(s,{seat:room.seat,locked:submitting,online});
  $('state-proof').textContent=`WebRTC DataChannel · 玩家视图已过滤 · 公开状态 ${hash(pub)} · 版本 ${packet.revision}`;$('network-events').textContent=logs.slice(-35).join('\n');
}
function lobby(data){
  if(closed)return;$('lobby').hidden=true;$('session').hidden=false;
  $('role-label').textContent=`${room.seat===0?'Host':'Client'} · ${room.seat+1}号位 · 房间码 ${data.code}`;
  $('session-status').textContent=data.phase==='lobby'?`等待${data.capacity||2}位真人连接并Ready，由Host开始`:data.members.some(m=>!m.online||!m.linked)?'对局暂停 · 等待玩家恢复原座位':'对局进行中 · 由Host执行规则';
  $('member-list').innerHTML=data.members.map(m=>`<li>${escape(m.name)} · ${m.role==='host'?'Host':'Client'} · ${!m.online?'断线，等待重连':m.linked?'已连接':'连接中'} · ${m.ready?'Ready':'未准备'}</li>`).join('')+(options?Array.from({length:options.players-options.humans},(_,i)=>`<li>${options.humans+i+1}号位 · AI · 由Host执行</li>`).join(''):'');
  const rosterPending=poolBusy||setupRevision!==(data.configRevision||0)||room.seat===0&&rosterPanel.dirty;
  const me=data.members.find(m=>m.id===room.id);$('ready-network').textContent=me?.ready?'取消Ready':'Ready · 准备';$('ready-network').hidden=data.phase!=='lobby';$('ready-network').disabled=rosterPending||data.members.length!==(data.capacity||2)||!data.members.every(m=>m.linked)||!clientTransport;
  $('start-network').hidden=room.seat!==0||data.phase!=='lobby';$('start-network').disabled=starting||rosterPending||data.members.length!==(data.capacity||2)||!data.members.every(m=>m.ready&&m.linked);
  $('room-roster-manager').hidden=room.seat!==0||data.phase!=='lobby';
  if(router)for(const id of router.peers.keys())if(id!=='host'&&!data.members.some(m=>m.id===id)){if(data.phase==='lobby')router.peers.delete(id);else router.removeClient(id);}
}
function end(reason){if(closed)return;closed=true;sessionStorage.removeItem(credentialKey);notice(reason);router?.close();enginePort?.close();$('network-engine').src='about:blank';currentPrompt=null;table.close(reason);$('session-status').textContent='房间已关闭 · 请重新创建或加入';$('member-list').textContent='双方已离开该房间';$('ready-network').hidden=true;$('start-network').hidden=true;$('close-network').hidden=true;$('new-network').hidden=false;}
async function connect(host,credentials){
  if(joining||room)return;joining=true;closed=false;$('create-host').disabled=$('join-client').disabled=true;
  try{
    if(host){options=roomOptions({mode:$('network-mode').value,players:$('network-players').value,humans:$('network-humans').value});await rosterPanel.load();setupRevision=0;rosterSummary(rosterPanel.roster.summary(options.mode));$('mode-label').textContent=`${MODE_NAMES[options.mode]} · ${options.players}人 · ${options.humans}真人＋${options.players-options.humans}AI`;}
    localStorage.setItem('play-signal-url',$('signal-url').value);localStorage.setItem('play-stun-url',$('stun-url').value);
    room=new InternetRoom({url:$('signal-url').value,stun:$('stun-url').value,turn:$('turn-url').value,username:$('turn-user').value,credential:$('turn-password').value,relay:$('force-relay').checked,capacity:options?.humans||2,name:$('player-name').value,onRoom:lobby,onStatus:notice,onDisconnect:disconnected,onProtocol:capture,onCredentials:c=>sessionStorage.setItem(credentialKey,JSON.stringify(c)),onClose:reason=>{if(room?.id)end(reason);else notice(reason);},onPeer:async(id,t,epoch)=>{
      if(room.seat===0){const seat=room.room.members.find(m=>m.id===id)?.seat;router.addClient(id,t,epoch,seat);await t.send(setupPacket());}else{clientTransport=t;clientTransport.onMessage(receive);}online=true;lobby(room.room);
    },onStart:async()=>{if(room.seat===0)await startEngine();else notice('所有真人Ready · 等待Host加载规则引擎…');}});
    if(host){router=new HostAuthorityTransport({humanSeats:Array.from({length:options.humans},(_,i)=>i)});clientTransport=router.localClient().onMessage(receive);await clientTransport.connect();}
    notice(credentials?'正在恢复原座位…':'正在连接信令服务…');if(credentials)room.restore(credentials);else{await room.connect();if(host)await room.create();else await room.join($('room-code').value);notice('已进入房间，等待WebRTC直连');}
  }catch(e){const hadRoom=!!room?.id;room?.closeLocal();if(hadRoom)end(e.message);else{room=null;router?.close();router=null;clientTransport=null;notice(e.message);$('create-host').disabled=$('join-client').disabled=false;}}
  finally{joining=false;}
}
async function startEngine(){
  if(starting)return;starting=true;router.phase='running';notice('Host正在加载原生规则引擎…');
  try{
    const pool=rosterPanel.freeze();
    const decks=await(await fetch('./deck-catalog.json')).json();const settings=structuredClone(state.settings);
    Object.assign(settings,{mode:options.mode,singleMode:'dianjiang',players:options.players,packs:pool.packs,identityVariant:'standard',identityRole:'random',control:'human',redraw:'0',speed:'vfast',doubleGeneral:false,deck:[...decks.packs.standard,...decks.packs.extra],rosters:{},studioRuntime:pool.studioRuntime,customCode:''});
    const response=await fetch('./api/launch',{method:'POST',headers:{'Content-Type':'application/json','X-Play-Token':state.token},body:JSON.stringify({settings})});const launch=await response.json();if(!response.ok)throw Error(launch.error);
    engineKey=crypto.randomUUID();networkConfig={room:room.code,seed:crypto.randomUUID(),humanSeats:Array.from({length:options.humans},(_,i)=>i),allowedGeneralIds:pool.allowedGeneralIds};
    $('network-engine').src='./arena.html?match='+encodeURIComponent(launch.id)+'&authority='+encodeURIComponent(engineKey);
  }catch(e){end('Host加载失败：'+e.message);await room.leave().catch(()=>{});}
}
$('create-host').onclick=()=>connect(true);$('join-client').onclick=()=>connect(false);
$('ready-network').onclick=async()=>{if($('ready-network').disabled)return;try{await room.ready(!room.room.members.find(m=>m.id===room.id).ready,setupRevision);}catch(e){notice(e.message);}};
$('start-network').onclick=async()=>{if($('start-network').disabled)return;$('start-network').disabled=true;rosterPanel.lock(true);try{await room.start();}catch(e){if(room.room.phase==='lobby')rosterPanel.lock(false);notice(e.message);lobby(room.room);}};
$('close-network').onclick=async()=>{try{await room.leave();}finally{end('你已离开房间');}};
$('new-network').onclick=()=>location.reload();
async function submitAction(op,ref){
 if(!currentPrompt||submitting||!online||!clientTransport||closed)return;
 const action=replica.action(currentPrompt,op,ref);if(!gate.begin(action))return;
 submitting=true;table.setLocked(true);
 try{lastActionId=action.action.id;await clientTransport.send(action);notice('ACTION已提交，等待Host验证');}
 catch(e){notice('操作提交失败：'+e.message);if(room.seat>0){online=false;room.recover();}else{gate.reset();submitting=false;table.render(replica.read(),{seat:room.seat,locked:false,online});}}
}
async function submitControl(ref){
 const s=replica.read();if(!s?.public.controlsEnabled||submitting||!online||!clientTransport||closed)return;
 const action=replica.action({id:CONTROL_PROMPT,revision:s.public.controlRevision},'control',ref);if(!gate.begin(action))return;
 submitting=true;table.setLocked(true);
 try{lastActionId=action.action.id;await clientTransport.send(action);notice('牌桌操作已提交，等待Host确认');}
 catch(e){notice('牌桌操作提交失败：'+e.message);if(room.seat>0){online=false;room.recover();}else{gate.reset();submitting=false;table.render(replica.read(),{seat:room.seat,locked:false,online});}}
}
setInterval(()=>{if(gate.expired)notice('操作确认超时，已停止重复提交；Client请刷新恢复最新快照，Host请检查连接。');},1000);
window.addEventListener('message',async event=>{
  if(event.origin!==location.origin||event.source!==$('network-engine').contentWindow||room?.seat!==0||closed)return;const data=event.data;
  if(data.type==='network-bind'){
    if(bound||data.key!==engineKey||!event.ports[0])return;bound=true;enginePort=new PortTransport(event.ports[0]);
    await enginePort.connect();enginePort.onMessage(p=>router.send(p)).onError(e=>{notice(e.message);room.fail(e);});
    await enginePort.send({type:'AUTHORITY_CONFIG',network:networkConfig});router.onMessage(p=>enginePort.send(p)).onError(e=>room.fail(e));await router.connect();
  }
  if(data.type==='play-error'){notice('Host引擎异常：'+data.message);}
  if(data.type==='play-ready')notice('Host引擎已启动 · 游戏状态通过DataChannel同步');
  if(data.type==='play-roster'&&!networkConfig.humanSeats){
    const picks=networkConfig.generals.map(id=>data.pool.find(p=>p.id===id)?.key);if(picks.some(x=>!x)){room.fail(Error('Host选将挂载失败'));return;}
    $('network-engine').contentWindow.postMessage({type:'play-roster-apply',roster:{humanSeat:0,revealAI:false,seats:picks.map(p=>({picks:[p],method:'manual',locked:true}))}},location.origin);
  }
});
window.addEventListener('pagehide',()=>{if(room?.seat>0)room.suspend();else room?.closeLocal();router?.close();enginePort?.close();});
function changePlayers(){const n=Number($('network-players').value);$('network-humans').innerHTML=Array.from({length:n-1},(_,i)=>`<option value="${i+2}">${i+2}真人＋${n-i-2}AI</option>`).join('');}
function changeMode(){const m=$('network-mode').value,counts=m==='single'?[2]:m==='doudizhu'?[3]:Array.from({length:m==='identity'?9:11},(_,i)=>i+2);$('network-players').innerHTML=counts.map(n=>`<option value="${n}">${n}人</option>`).join('');$('network-players').value=m==='single'?'2':m==='doudizhu'?'3':'8';changePlayers();}
$('network-mode').onchange=changeMode;$('network-players').onchange=changePlayers;changeMode();
try{
  state=await(await fetch('./api/state')).json();const catalog=await(await fetch('./play-catalog.json')).json();const pool=[...new Map(catalog.versions.filter(v=>v.scope==='character/standard').map(v=>[v.id,v])).values()];
  for(const id of ['host-general','client-general'])$(id).innerHTML=pool.map(v=>`<option value="${escape(v.id)}">${escape(v.name)}</option>`).join('');$('host-general').value='guanyu';$('client-general').value='caocao';
  $('signal-url').value=localStorage.getItem('play-signal-url')||$('signal-url').value;$('stun-url').value=localStorage.getItem('play-stun-url')||$('stun-url').value;notice('本机服务在线 · 创建或加入临时房间');
  const saved=JSON.parse(sessionStorage.getItem(credentialKey)||'null');if(saved?.reconnectToken){$('signal-url').value=saved.url;$('stun-url').value=saved.stun;$('player-name').value=saved.name;$('turn-url').value=saved.turn||'';$('turn-user').value=saved.username||'';$('turn-password').value=saved.credential||'';$('force-relay').checked=!!saved.relay;await connect(false,saved);}
}catch(e){notice(e.message);}
