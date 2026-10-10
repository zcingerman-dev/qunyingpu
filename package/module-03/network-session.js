import {PROTOCOL_VERSION,iceConfiguration} from './network-options.js';
import {Transport} from './network-transport.js';
import {buildPlayerPacket} from './network-view.js';
import {WebRTCTransport,validateAction,DEFAULT_STUN} from './network-rtc.js';

// Only the Host owns authority DTOs. Every outgoing state packet uses the same
// allowlist, including rejected ACTIONs and fresh reconnect snapshots.
export class HostAuthorityTransport extends Transport {
  constructor({humanSeats=[0,1]}={}){super();this.humanSeats=humanSeats;this.peers=new Map();this.actions=[];this.seen=new Map();this.seq=0;this.revision=0;this.eventSeq=0;this.phase='lobby';this.ack=0;this.resync=false;}
  localClient(){const t=new Transport();t.connect=async()=>{t.closed=false;return t;};t.send=async p=>this.queue('host',0,p);t.close=()=>{t.closed=true;};this.peers.set('host',{seat:0,online:true,transport:{send:p=>t.listener?.(structuredClone(p))}});return t;}
  addClient(id,transport,epoch=1,seat=1){
    if(!this.humanSeats.includes(seat)||seat===0)throw Error('Client座位不属于真人');const peer={seat,transport,epoch,online:true,awaitingSnapshot:this.phase==='running'};this.peers.set(id,peer);this.resync=true;
    transport.onMessage(async packet=>{
      if(this.peers.get(id)!==peer||!peer.online)return;
      try{this.queue(id,seat,packet);}catch(error){
        if(!this.lastSnapshot)return;
        const events=[{type:'EVENT',seq:++this.eventSeq,revision:this.revision,data:{kind:'ACTION_REJECTED',id:packet?.action?.id,seat,reason:error.message}}];
        await transport.send(this.packet(id,peer,events));
      }
    });
  }
  removeClient(id,epoch){const p=this.peers.get(id);if(p&&(!epoch||p.epoch===epoch)){p.online=false;p.transport=null;p.awaitingSnapshot=true;}}
  get suspended(){return this.phase==='running'&&this.humanSeats.some(seat=>![...this.peers.values()].some(p=>p.seat===seat&&p.online));}
  packet(id,peer,events=[],resync=false){return buildPlayerPacket({snapshot:this.lastSnapshot,events},{playerId:id,seat:peer.seat,phase:this.phase,members:this.peers.size,revision:this.revision,resync,suspended:this.suspended});}
  queue(member,seat,packet){
    if(this.closed||this.phase!=='running')throw Error('房间尚未开局或已关闭');
    if(this.suspended||[...this.peers.values()].some(p=>p.awaitingSnapshot))throw Error('等待玩家重连，暂不能操作');
    const action=validateAction(packet),key=member+':'+action.id;
    if(this.seen.has(key))return {queued:this.seen.get(key),duplicate:true};if(this.actions.some(p=>p.member===member&&p.action.prompt===action.prompt&&p.action.revision===action.revision&&p.action.op===action.op&&p.action.ref===action.ref))throw Error('该操作正在处理，请勿重复提交');if(this.actions.length>=128)throw Error('Host尚未处理操作，请稍后重试');
    const seq=++this.seq;this.actions.push({type:'ACTION',seq,member,seat,action:structuredClone(action)});this.seen.set(key,seq);
    if(this.seen.size>4096)this.seen.delete(this.seen.keys().next().value);return {queued:seq,duplicate:false};
  }
  async connect(){this.closed=false;const tick=async()=>{if(this.closed)return;try{await this.listener?.({phase:this.phase,actions:this.suspended?[]:structuredClone(this.actions),suspended:this.suspended,resync:this.resync});}catch(e){this.errorListener?.(e);}if(!this.closed)this.timer=setTimeout(tick,100);};await tick();return this;}
  async send(packet){
    if(this.closed||this.phase!=='running'||packet.type!=='PUBLISH')throw Error('只有Host引擎可以发布状态');const {snapshot,events,ack}=packet.data;
    if(!snapshot||!Array.isArray(events)||events.length>256||!Number.isSafeInteger(ack)||ack<this.ack||ack>this.seq)throw Error('Host发布字段无效');
    this.ack=ack;this.actions=this.actions.filter(a=>a.seq>ack);this.revision++;this.lastSnapshot=snapshot;
    const emitted=events.map(data=>({type:'EVENT',seq:++this.eventSeq,revision:this.revision,data}));
    await Promise.all([...this.peers.entries()].filter(([,p])=>p.online&&p.transport).map(async([id,p])=>{
      try{await p.transport.send(this.packet(id,p,emitted,!!p.awaitingSnapshot));if(this.peers.get(id)===p)p.awaitingSnapshot=false;}
      catch(e){if(p.seat>0)this.removeClient(id,p.epoch);else this.errorListener?.(e);}
    }));this.resync=false;return {revision:this.revision};
  }
  close(){this.phase='closed';super.close();this.actions=[];this.lastSnapshot=null;}
}

export class InternetRoom {
  constructor({url,stun=DEFAULT_STUN,turn='',username='',credential='',relay=false,capacity=2,name,onRoom=()=>{},onStatus=()=>{},onStart=()=>{},onClose=()=>{},onPeer=()=>{},onDisconnect=()=>{},onCredentials=()=>{},onProtocol=()=>{}}){
    Object.assign(this,{url,stun,turn,username,credential,relay,capacity,name,onRoom,onStatus,onStart,onClose,onPeer,onDisconnect,onCredentials,onProtocol});this.requests=new Map();this.peers=new Map();this.auth=new Map();this.failedEpochs=new Map();this.counter=0;this.chain=Promise.resolve();
  }
  async connect(){
    const url=new URL(this.url,location.href);if(!['ws:','wss:'].includes(url.protocol)||url.username||url.password)throw Error('请填写ws://或wss://信令地址');
    if(location.protocol==='https:'&&url.protocol!=='wss:')throw Error('HTTPS页面需要wss://信令地址');
    this.ice=iceConfiguration(this);
    const ws=new WebSocket(url);this.ws=ws;
    ws.onmessage=e=>{if(this.ws!==ws||this.closed)return;this.onProtocol('signaling',e.data);this.chain=this.chain.then(()=>this.message(JSON.parse(e.data))).catch(error=>this.fail(error));};
    ws.onclose=()=>{if(this.ws!==ws||this.closed)return;this.rejectRequests();if(this.seat>0&&this.reconnectToken)this.recover();else this.fail(Error('Host信令连接中断，房间关闭'));};
    ws.onerror=()=>this.onStatus('信令连接失败，请检查地址、证书及服务是否在线');
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.close();reject(Error('信令连接超时'));},10000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.addEventListener('close',()=>{clearTimeout(timer);reject(Error('无法连接信令服务'));},{once:true});});return this;
  }
  request(type,body={}){if(this.closed||this.ws?.readyState!==1)return Promise.reject(Error('信令连接已关闭'));const request=String(++this.counter);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.requests.delete(request);reject(Error('信令请求超时'));},8000);this.requests.set(request,{resolve,reject,timer});this.ws.send(JSON.stringify({type,request,protocolVersion:PROTOCOL_VERSION,...body}));});}
  create(){return this.request('CREATE',{name:this.name,...(this.capacity!==2?{capacity:this.capacity}:{})});}join(code){return this.request('JOIN',{name:this.name,code:code.trim().toUpperCase()});}
  async resume(credentials){Object.assign(this,{id:credentials.id,code:credentials.code,seat:credentials.seat??1,reconnectToken:credentials.reconnectToken});return this.request('RESUME',{code:this.code,id:this.id,reconnectToken:this.reconnectToken});}
  restore(credentials){Object.assign(this,{id:credentials.id,code:credentials.code,seat:credentials.seat??1,reconnectToken:credentials.reconnectToken});this.resumed=true;this.recover();}
  credentials(){return {id:this.id,seat:this.seat,code:this.code,reconnectToken:this.reconnectToken,url:this.url,stun:this.stun,turn:this.turn,username:this.username,credential:this.credential,relay:this.relay,name:this.name};}
  ready(value,revision=this.room?.configRevision||0){return this.request('READY',{ready:value,revision});}start(){return this.request('START',{revision:this.room?.configRevision||0});}
  resetReady(){return this.request('CONFIGURE',{revision:this.room?.configRevision||0});}
  signal(to,kind,data,epoch){if(!this.closed&&this.ws?.readyState===1)this.ws.send(JSON.stringify({type:'SIGNAL',protocolVersion:PROTOCOL_VERSION,to,kind,data,epoch}));}
  async message(data){
    if(data.protocolVersion!==PROTOCOL_VERSION)throw Error('protocolVersion不匹配，请双方更新同一包体');
    if(data.type==='JOINED'){
      Object.assign(this,{id:data.id,seat:data.seat,code:data.code,epoch:data.epoch,connectionToken:data.connectionToken});if(data.reconnectToken)this.reconnectToken=data.reconnectToken;
      if(this.seat>0)this.onCredentials(this.credentials());this.resumed=!!data.resumed;
    }
    const req=this.requests.get(data.request);if(req){clearTimeout(req.timer);this.requests.delete(data.request);data.type==='ERROR'?req.reject(Error(data.message)):req.resolve(data);}
    if(data.type==='ERROR'&&!req)this.onStatus(data.message);
    if(['CLOSED','REPLACED'].includes(data.type)){this.closeLocal();this.onClose(data.reason);return;}
    if(data.type==='RECONNECT'){this.recover();return;}
    if(data.type==='PEER_AUTH'){if(this.seat!==0)return;this.auth.set(data.peer,{epoch:data.epoch,token:data.connectionToken});return;}
    if(data.type==='STARTED'){await this.onStart();return;}
    if(data.type==='ROOM'){
      this.room=data;this.grace=data.reconnectGrace;this.onRoom(data);
      for(const [id,p]of this.peers){const m=data.members.find(m=>m.id===id);if(!m||!m.online||(this.seat===0?m.epoch:this.epoch)!==p.epoch)this.dispose(id);}
      if(this.seat===0)for(const m of data.members)if(m.seat>0&&m.online&&!this.peers.has(m.id)&&this.auth.get(m.id)?.epoch===m.epoch&&this.failedEpochs.get(m.id)!==m.epoch){
        const p=this.peer(m.id,m.epoch),channel=p.pc.createDataChannel('game-v1',{ordered:true});this.channel(m.id,channel,p);
        const offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);this.signal(m.id,'offer',{type:'offer',sdp:offer.sdp},p.epoch);
      }
    }
    if(data.type==='SIGNAL'){
      const member=this.room?.members.find(m=>m.id===data.from);if(!member||(this.seat===0?member.seat===0:member.seat!==0))return;
      const expected=this.seat===0?member.epoch:this.epoch;if(data.epoch!==expected)return;
      const p=this.peer(data.from,data.epoch);
      if(data.kind==='ice'){if(p.pc.remoteDescription)await p.pc.addIceCandidate(data.data);else p.ice.push(data.data);return;}
      await p.pc.setRemoteDescription(data.data);for(const ice of p.ice.splice(0))await p.pc.addIceCandidate(ice);
      if(data.kind==='offer'){const answer=await p.pc.createAnswer();await p.pc.setLocalDescription(answer);this.signal(data.from,'answer',{type:'answer',sdp:answer.sdp},p.epoch);}
    }
  }
  peer(id,epoch){
    if(this.peers.has(id)){const p=this.peers.get(id);if(p.epoch===epoch)return p;this.dispose(id);}
    const pc=new RTCPeerConnection(this.ice||iceConfiguration(this)),p={pc,epoch,ice:[]};this.peers.set(id,p);
    p.timer=setTimeout(()=>this.peerLost(id,p,Error('连接超时：请检查信令、防火墙及TURN地址/凭据；复杂网络需要可用TURN中继')),30000);
    pc.onicecandidate=e=>{if(this.peers.get(id)===p)this.signal(id,'ice',e.candidate?.toJSON()||null,epoch);};
    pc.onconnectionstatechange=()=>{if(this.peers.get(id)!==p)return;if(pc.connectionState==='connected'){clearTimeout(p.timer);pc.getStats().then(stats=>{let relay=false;for(const r of stats.values())if(r.type==='candidate-pair'&&r.state==='succeeded'&&r.nominated){const c=stats.get(r.localCandidateId);relay ||= c?.candidateType==='relay';}this.onStatus(relay?'TURN中继已连接':'WebRTC直连已连接');}).catch(()=>{});}else if(['failed','disconnected'].includes(pc.connectionState))this.peerLost(id,p,Error('直连已断开，正在恢复…'));};
    pc.onicecandidateerror=e=>{if(pc.connectionState!=='connected')this.onStatus(`ICE服务器连接异常（${e.errorCode}），正在尝试其他直连或TURN候选`);};pc.ondatachannel=e=>this.channel(id,e.channel,p);this.onStatus('正在建立WebRTC直连…');return p;
  }
  async channel(id,channel,p){
    const transport=new WebRTCTransport(channel,frame=>this.onProtocol('datachannel-frame',frame));p.transport=transport;
    transport.onError(error=>this.peerLost(id,p,error));
    const authorize=async packet=>{
      if(this.peers.get(id)!==p||this.closed)return;
      if(this.seat===0){
        const a=this.auth.get(id);
        if(Object.keys(packet||{}).sort().join(',')!=='connectionToken,epoch,playerId,type'||packet.type!=='AUTH'||packet.playerId!==id||packet.epoch!==p.epoch||a?.epoch!==p.epoch||packet.connectionToken!==a.token){this.peerLost(id,p,Error('连接认证失败'));return;}
        p.authorized=true;clearTimeout(p.authTimer);await transport.send({type:'AUTH_OK',playerId:id,epoch:p.epoch});
        await this.onPeer(id,transport,p.epoch);await this.request('LINK',{peer:id,epoch:p.epoch,connected:true});this.onStatus(this.room?.phase==='running'?'玩家直连已恢复':'WebRTC直连已验证 · 可以Ready');
      }else{
        if(packet.type!=='AUTH_OK'||packet.playerId!==this.id||packet.epoch!==p.epoch){this.peerLost(id,p,Error('Host连接认证失败'));return;}
        p.authorized=true;clearTimeout(p.authTimer);this.recovering=false;this.recoveryDeadline=null;clearTimeout(this.retryTimer);await this.onPeer(id,transport,p.epoch);this.onStatus(this.resumed?'已重连 · 正在接收新的玩家快照':'WebRTC直连已验证 · 可以Ready');
      }
    };
    transport.onMessage(authorize);
    try{await transport.connect();if(this.closed||this.peers.get(id)!==p){transport.onError(()=>{});transport.close();return;}
      if(!p.authorized)p.authTimer=setTimeout(()=>this.peerLost(id,p,Error('连接认证超时')),8000);
      if(this.seat>0)await transport.send({type:'AUTH',playerId:this.id,epoch:p.epoch,connectionToken:this.connectionToken});
    }catch(e){this.peerLost(id,p,e);}
  }
  dispose(id){const p=this.peers.get(id);if(!p)return;this.peers.delete(id);clearTimeout(p.timer);clearTimeout(p.authTimer);p.pc.onconnectionstatechange=p.pc.onicecandidate=p.pc.ondatachannel=null;p.transport?.onError(()=>{});p.transport?.close();p.pc.close();this.onDisconnect(id,p.epoch);}
  peerLost(id,p,error){if(this.closed||this.peers.get(id)!==p)return;this.failedEpochs.set(id,p.epoch);this.dispose(id);this.onStatus(error.message);
    if(this.seat>0)this.recover();else this.request('LINK',{peer:id,epoch:p.epoch,connected:false}).catch(()=>{});
  }
  rejectRequests(){for(const r of this.requests.values()){clearTimeout(r.timer);r.reject(Error('连接中断'));}this.requests.clear();}
  retireSocket(){const ws=this.ws;this.ws=null;this.rejectRequests();ws?.close();}
  recover(){
    if(this.closed||this.recovering||!(this.seat>0)||!this.reconnectToken)return;this.recovering=true;this.recoveryDeadline ||= Date.now()+(this.grace||120000);this.retryCount=0;
    for(const id of [...this.peers.keys()])this.dispose(id);this.retireSocket();this.onStatus('连接中断，正在恢复原座位…');
    const retry=async()=>{if(this.closed)return;
      if(Date.now()>this.recoveryDeadline){this.fail(Error('重连等待超时，请重新创建房间'));return;}
      try{await this.connect();await this.resume(this.credentials());
        // A failed connection/handshake must permit a later RESUME attempt.
        this.retryTimer=setTimeout(()=>{if(this.recovering&&!this.closed){this.recovering=false;this.recover();}},32000);
      }catch(e){if(this.closed)return;this.retireSocket();if(/无效|过期|不存在/.test(e.message)){this.fail(e);return;}this.onStatus('正在重连，请等待…');this.retryTimer=setTimeout(retry,Math.min(5000,1000*++this.retryCount));}
    };this.retryTimer=setTimeout(retry,400);
  }
  fail(error){if(this.closed)return;this.onStatus(error.message);this.closeLocal();this.onClose(error.message);}
  closeLocal(){this.closed=true;clearTimeout(this.retryTimer);this.rejectRequests();for(const id of [...this.peers.keys()])this.dispose(id);this.retireSocket();}
  suspend(){this.closeLocal();} // Page refresh preserves the saved reconnect token.
  async leave(){try{if(!this.closed)await this.request('LEAVE');}finally{this.closeLocal();}}
}
