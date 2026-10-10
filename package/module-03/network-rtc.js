import {Transport} from './network-transport.js';
import {PROTOCOL_VERSION} from './network-options.js';

export const DEFAULT_STUN='stun:stun.l.google.com:19302';
export function validateAction(packet){
  const a=packet?.action;
  if(!packet||Object.keys(packet).sort().join(',')!=='action,type'||packet.type!=='ACTION'||!a||Object.keys(a).sort().join(',')!=='id,op,prompt,ref,revision')throw Error('ACTION字段无效，不允许写入GameState');
  if(typeof a.id!=='string'||!a.id.length||a.id.length>80||typeof a.prompt!=='string'||a.prompt.length>80||!Number.isSafeInteger(a.revision)||a.revision<0||!['card','target','button','control'].includes(a.op)||typeof a.ref!=='string'||a.ref.length>120)throw Error('ACTION类型或引用无效');
  return a;
}

// Reliable ordered DataChannel. Small frames avoid negotiated SCTP size limits.
export class WebRTCTransport extends Transport {
  constructor(channel,onWire=()=>{}){super();this.channel=channel;this.onWire=onWire;this.pending=[];this.parts=[];this.size=0;this.sendChain=Promise.resolve();}
  async connect(){
    this.closed=false;const c=this.channel;c.binaryType='arraybuffer';
    c.onmessage=e=>{try{
      this.onWire(e.data);
      if(typeof e.data!=='string'||e.data.length>16000)throw Error('DataChannel帧无效');
      const frame=JSON.parse(e.data);if(typeof frame.s!=='string'||typeof frame.end!=='boolean'||frame.s.length>4000)throw Error('DataChannel分片无效');
      this.parts.push(frame.s);this.size+=frame.s.length;if(this.size>2*1024*1024)throw Error('DataChannel消息过大');
      if(frame.end){const wire=JSON.parse(this.parts.join(''));this.parts=[];this.size=0;if(wire.protocolVersion!==PROTOCOL_VERSION||!wire.payload)throw Error('protocolVersion不匹配，请双方更新同一包体');const packet=wire.payload;if(this.listener)Promise.resolve(this.listener(packet)).catch(error=>this.errorListener?.(error));else{if(this.pending.length>=32)throw Error('消息队列过大');this.pending.push(packet);}}
    }catch(error){this.parts=[];this.size=0;this.errorListener?.(error);this.close();}};
    c.onclose=()=>{this.closed=true;this.errorListener?.(Error('直连已断开，等待恢复'));};c.onerror=()=>this.errorListener?.(Error('DataChannel连接失败'));
    if(c.readyState!=='open')await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('直连连接超时，请检查STUN或网络；请检查TURN配置与凭据')),25000);c.onopen=()=>{clearTimeout(timer);resolve();};c.addEventListener('close',()=>{clearTimeout(timer);reject(Error('DataChannel已关闭'));},{once:true});});
    this.opened=true;for(const p of this.pending.splice(0))await this.listener?.(p);return this;
  }
  onMessage(fn){super.onMessage(fn);if(this.opened)for(const p of this.pending.splice(0))Promise.resolve(fn(p)).catch(e=>this.errorListener?.(e));return this;}
  async send(packet){
    const text=JSON.stringify({protocolVersion:PROTOCOL_VERSION,payload:packet});if(text.length>2*1024*1024)throw Error('游戏消息过大');
    const task=async()=>{if(this.closed||this.channel.readyState!=='open')throw Error('DataChannel尚未连接');
      for(let i=0;i<text.length;i+=4000){const end=i+4000>=text.length;
        const deadline=Date.now()+10000;while(this.channel.bufferedAmount>256*1024){if(Date.now()>deadline)throw Error('网络发送超时，请检查连接');if(this.closed||this.channel.readyState!=='open')throw Error('DataChannel已断开');await new Promise(r=>setTimeout(r,20));}
        this.channel.send(JSON.stringify({s:text.slice(i,i+4000),end}));
      }
    };
    const result=this.sendChain.then(task);this.sendChain=result.catch(()=>{});await result;
  }
  close(){super.close();this.channel.close();}
}

export {HostAuthorityTransport,InternetRoom} from './network-session.js';
