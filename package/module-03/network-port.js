import {Transport} from './network-transport.js';

// Generic local engine boundary. It contains no WebRTC or signaling logic.
export class PortTransport extends Transport {
  constructor(port){super();this.port=port;}
  async connect(){this.closed=false;this.port.onmessage=e=>Promise.resolve(this.listener?.(e.data)).catch(error=>this.errorListener?.(error));this.port.onmessageerror=()=>this.errorListener?.(Error('引擎通道消息无效'));this.port.start();return this;}
  async send(packet){if(this.closed)throw Error('引擎通道已关闭');this.port.postMessage(packet);}
  close(){super.close();this.port.close();}
}

export async function bindAuthority(key){
  const channel=new MessageChannel();
  const config=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{channel.port1.close();reject(Error('Host引擎连接超时'));},15000);
    channel.port1.onmessage=e=>{clearTimeout(timer);if(e.data.type!=='AUTHORITY_CONFIG'){reject(Error('Host引擎配置无效'));return;}resolve(e.data.network);};channel.port1.start();
    parent.postMessage({type:'network-bind',key},location.origin,[channel.port2]);
  });
  return {network:config,transport:new PortTransport(channel.port1)};
}
