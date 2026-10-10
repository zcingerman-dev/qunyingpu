// Signaling only: no game imports, ACTION relay, state storage, or game random.
import http from 'node:http';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {WebSocketServer, WebSocket} from './vendor/ws/wrapper.mjs';

export function createSignaling({host='127.0.0.1',port=8771,maxRooms=256,ttl=12*3600000,origins=[],heartbeat=15000,reconnectGrace=120000}={}) {
  const rooms=new Map(), sockets=new Set();
  const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({protocolVersion:1,...data}));};
  const server=http.createServer((req,res)=>{res.writeHead(req.url==='/health'?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify(req.url==='/health'?{ok:true,service:'signaling',protocol:1}:{error:'Not found'}));});
  const wss=new WebSocketServer({noServer:true,maxPayload:65536,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/signal'||(origins.length&&!origins.includes(req.headers.origin))){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  function lobby(room){return {type:'ROOM',code:room.code,phase:room.phase,configRevision:room.configRevision||0,reconnectGrace,capacity:room.capacity,members:[...room.members.values()].map(m=>({id:m.id,seat:m.seat,role:m.seat===0?'host':'client',name:m.name,ready:m.ready,online:m.online,epoch:m.epoch,linked:m.seat===0||m.linked}))};}
  const broadcast=(room,data)=>{for(const m of room.members.values())send(m.ws,data);};
  function closeRoom(room,reason){if(!rooms.has(room.code))return;room.phase='closed';broadcast(room,{type:'CLOSED',reason});rooms.delete(room.code);for(const m of room.members.values())if(m.ws){m.ws.room=null;m.ws.member=null;}}
  function leave(ws,explicit=false){const room=ws.room,m=ws.member;ws.room=null;ws.member=null;if(!room||!rooms.has(room.code)||m.ws!==ws)return;
    if(m.seat===0||(explicit&&room.phase==='running')){closeRoom(room,m.seat===0?'Host已退出，房间关闭':'Client已主动离开，对局关闭');return;}
    if(!explicit){m.online=false;m.linked=false;m.reconnecting=true;m.deadline=Date.now()+reconnectGrace;m.ws=null;if(room.phase==='lobby')for(const x of room.members.values())x.ready=false;broadcast(room,lobby(room));return;}
    room.members.delete(m.id);for(const member of room.members.values())member.ready=false;broadcast(room,lobby(room));
  }
  function exact(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.sort().join(','))throw Error('消息字段不支持');}
  function memberName(name){if(typeof name!=='string'||!name.trim()||name.length>24)throw Error('玩家名需为1～24个字符');return name.trim();}
  const digest=v=>createHash('sha256').update(v).digest();
  function announceAuth(room,m){const hostMember=[...room.members.values()].find(x=>x.seat===0);if(m.seat>0)send(hostMember.ws,{type:'PEER_AUTH',peer:m.id,epoch:m.epoch,connectionToken:m.connectionToken});}
  function bind(ws,room,m,request,reconnectToken,resumed=false){m.ws=ws;m.online=true;m.linked=false;m.reconnecting=false;m.deadline=resumed?(m.deadline||Date.now()+reconnectGrace):null;ws.room=room;ws.member=m;
    send(ws,{type:'JOINED',request,code:room.code,id:m.id,seat:m.seat,epoch:m.epoch,connectionToken:m.connectionToken,...(reconnectToken?{reconnectToken}:{}),resumed,phase:room.phase});announceAuth(room,m);broadcast(room,lobby(room));}
  function handle(ws,v){
    if(v?.protocolVersion!==1)throw Error('protocolVersion不匹配，请双方更新同一包体');v={...v};delete v.protocolVersion;
    if(v.type==='RESUME'){
      exact(v,['type','request','code','id','reconnectToken']);if(ws.room)throw Error('已在房间中');const room=rooms.get(v.code),m=room?.members.get(v.id);
      if(!m||m.seat===0||typeof v.reconnectToken!=='string'||v.reconnectToken.length!==64||!timingSafeEqual(digest(v.reconnectToken),m.reconnectHash)||(m.deadline&&Date.now()>m.deadline))throw Error('重连凭据无效或房间已过期');
      const old=m.ws;if(old){old.room=null;old.member=null;send(old,{type:'REPLACED',reason:'该玩家已在新连接恢复'});old.close();}
      m.epoch++;m.connectionToken=randomBytes(32).toString('hex');bind(ws,room,m,v.request,null,true);return;
    }
    if(v.type==='CREATE'||v.type==='JOIN'){
      exact(v,v.type==='CREATE'?['type','request','name',...(Object.hasOwn(v,'capacity')?['capacity']:[])]:['type','request','name','code']);if(ws.room)throw Error('已在房间中');
      const name=memberName(v.name);let room;
      if(v.type==='CREATE'){
        if(rooms.size>=maxRooms)throw Error('临时房间已满，请稍后再试');let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));
        const capacity=v.capacity??2;if(!Number.isInteger(capacity)||capacity<2||capacity>12)throw Error('真人人数须为2至12');room={code,capacity,phase:'lobby',created:Date.now(),members:new Map()};rooms.set(code,room);
      }else{
        if(typeof v.code!=='string'||! /^[A-F0-9]{6}$/.test(v.code.toUpperCase()))throw Error('请输入6位房间码');room=rooms.get(v.code.toUpperCase());
        if(!room)throw Error('房间不存在或Host已退出');if(room.phase!=='lobby'||room.members.size>=room.capacity)throw Error('房间已开局或已满');
      }
      const reconnectToken=randomBytes(32).toString('hex');const member={id:randomBytes(12).toString('hex'),seat:v.type==='CREATE'?0:Array.from({length:room.capacity-1},(_,i)=>i+1).find(s=>![...room.members.values()].some(m=>m.seat===s)),name,ready:false,linked:false,ws,epoch:1,connectionToken:randomBytes(32).toString('hex'),reconnectHash:digest(reconnectToken)};
      room.members.set(member.id,member);bind(ws,room,member,v.request,reconnectToken);return;
    }
    const room=ws.room,m=ws.member;if(!room||!rooms.has(room.code))throw Error('尚未加入房间');
    if(v.type==='CONFIGURE'){exact(v,['type','request','revision']);if(m.seat!==0||room.phase!=='lobby')throw Error('只有Host可在开局前调整将池');if(v.revision!==(room.configRevision||0))throw Error('将池配置已变化，请刷新');room.configRevision=(room.configRevision||0)+1;for(const member of room.members.values())member.ready=false;broadcast(room,lobby(room));}
    else if(v.type==='READY'){exact(v,['type','request','ready',...(Object.hasOwn(v,'revision')?['revision']:[])]);if(room.phase!=='lobby'||typeof v.ready!=='boolean')throw Error('Ready状态无效');if((v.revision??0)!==(room.configRevision||0))throw Error('将池配置已变化，请等待最新配置');if(v.ready&&room.members.size!==room.capacity)throw Error('等待另一位玩家加入');if(v.ready&&m.seat>0&&!m.linked)throw Error('DataChannel尚未连接');m.ready=v.ready;broadcast(room,lobby(room));}
    else if(v.type==='LINK'){exact(v,['type','request','peer','epoch','connected']);const peer=room.members.get(v.peer);if(m.seat!==0||!peer||peer.seat===0||peer.epoch!==v.epoch||typeof v.connected!=='boolean')throw Error('连接状态权限无效');peer.linked=v.connected;peer.reconnecting=!v.connected;peer.deadline=v.connected?null:(peer.deadline||Date.now()+reconnectGrace);if(!v.connected&&room.phase==='lobby'){peer.ready=false;m.ready=false;}broadcast(room,lobby(room));if(!v.connected&&peer.online)send(peer.ws,{type:'RECONNECT',reason:'Host等待直连恢复'});}
    else if(v.type==='START'){exact(v,['type','request',...(Object.hasOwn(v,'revision')?['revision']:[])]);if(m.seat!==0)throw Error('只有Host可以开始');if((v.revision??0)!==(room.configRevision||0))throw Error('将池配置已变化，请重新Ready');if(room.phase!=='lobby'||room.members.size!==room.capacity||[...room.members.values()].some(x=>!x.ready||(x.seat!==0&&!x.linked)))throw Error('双方连接并Ready后才能开始');room.phase='running';broadcast(room,lobby(room));broadcast(room,{type:'STARTED'});}
    else if(v.type==='SIGNAL'){
      exact(v,['type','to','kind','data','epoch']);const peer=room.members.get(v.to);if(!peer||!peer.online||peer===m||(m.seat>0&&peer.seat!==0)||v.epoch!==(m.seat===0?peer.epoch:m.epoch)||!['offer','answer','ice'].includes(v.kind))throw Error('信令目标或类型无效');
      if((v.kind==='offer'&&m.seat!==0)||(v.kind==='answer'&&m.seat===0))throw Error('信令角色错误');
      if(v.kind==='ice'){const d=v.data;if(d!==null){if(!d||typeof d.candidate!=='string'||d.candidate.length>4096||Object.keys(d).some(k=>!['candidate','sdpMid','sdpMLineIndex','usernameFragment'].includes(k)))throw Error('ICE格式无效');}}
      else {exact(v.data,['type','sdp']);if(v.data.type!==v.kind||typeof v.data.sdp!=='string'||v.data.sdp.length>50000||!v.data.sdp.startsWith('v=0'))throw Error('SDP格式无效');}
      send(peer.ws,{type:'SIGNAL',from:m.id,epoch:v.epoch,kind:v.kind,data:v.data});return;
    }
    else if(v.type==='LEAVE'){exact(v,['type','request']);send(ws,{type:'OK',request:v.request});leave(ws,true);return;}
    else throw Error('信令服务只接受房间和offer/answer/ICE，不接受游戏消息');
    send(ws,{type:'OK',request:v.request});
  }
  wss.on('connection',ws=>{sockets.add(ws);ws.alive=true;ws.windowStart=Date.now();ws.messages=0;ws.on('pong',()=>ws.alive=true);
    ws.on('message',(raw,binary)=>{let value;try{if(binary)throw Error('只接受JSON信令');if(Date.now()-ws.windowStart>1000){ws.messages=0;ws.windowStart=Date.now();}if(++ws.messages>80)throw Error('信令过于频繁');value=JSON.parse(raw.toString());if(typeof value.request!=='undefined'&&(typeof value.request!=='string'||value.request.length>80))throw Error('请求编号无效');handle(ws,value);}catch(e){send(ws,{type:'ERROR',request:typeof value?.request==='string'?value.request:undefined,message:e.message});}});
    ws.on('close',()=>{sockets.delete(ws);leave(ws);});ws.on('error',()=>{});
  });
  let lastPing=Date.now();const timer=setInterval(()=>{if(Date.now()-lastPing>=heartbeat){lastPing=Date.now();for(const ws of sockets){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}}for(const room of rooms.values()){if(Date.now()-room.created>ttl)closeRoom(room,'临时房间已到期');else if([...room.members.values()].some(m=>m.deadline&&Date.now()>m.deadline))closeRoom(room,'玩家重连等待超时，房间关闭');}},Math.min(heartbeat,1000));timer.unref();
  return {server,rooms,listen:()=>new Promise(resolve=>server.listen(port,host,()=>resolve(server.address()))),close:async()=>{clearInterval(timer);for(const room of [...rooms.values()])closeRoom(room,'信令服务关闭');for(const ws of sockets)ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2),arg=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
  const service=createSignaling({host:arg('--host','127.0.0.1'),port:Number(arg('--port','8771')),origins:arg('--origins','').split(',').filter(Boolean)});
  const address=await service.listen();console.log(`Signaling only: ws://${address.address}:${address.port}/signal`);
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>service.close().then(()=>process.exit()));
}
