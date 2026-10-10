const errorBox=document.getElementById('play-error');
let loadingStage='读取对局记录';
window.playBootStage=text=>{loadingStage=text;const box=document.getElementById('boot-message');if(box)box.textContent=text+'…';};
function report(error){errorBox.hidden=false;errorBox.textContent='对局加载出现问题：'+(error?.stack||String(error));document.getElementById('boot-message')?.remove();window.playBridge?.network?.()?.fault(error);parent.postMessage({type:'play-error',message:errorBox.textContent},location.origin);}
window.addEventListener('error',e=>report(e.error||e.message));window.addEventListener('unhandledrejection',e=>report(e.reason));
try {
 const params=new URL(location.href).searchParams,room=params.get('network'),id=params.get('match'),authority=params.get('authority');
 window.playBootStage('读取对局记录');
 const auth=room?JSON.parse(sessionStorage.getItem('play-network-engine:'+room)||'null'):null;
 if(room&&!auth)throw Error('Host引擎凭据不存在');
 const response=await fetch(room?'./api/network/'+encodeURIComponent(room)+'/launch':'./api/match/'+encodeURIComponent(id),room?{headers:{'X-Room-Token':auth.engineToken}}:undefined);if(!response.ok)throw Error((await response.json()).error||'对局配置不存在');
 window.playLaunch=await response.json();
 if(authority){const {bindAuthority}=await import('./network-port.js');const bound=await bindAuthority(authority);window.playLaunch.network=bound.network;window.playLaunch.authorityTransport=bound.transport;}
 const replay=new URL(location.href).searchParams.get('replay')==='1';window.playLaunch.replay=replay;
 const s=await(await fetch('./api/state')).json();window.playLaunch.token=s.token;
 if(room || authority){const {createHostRandom}=await import('./network-random.js');window.playLaunch.hostRandom=createHostRandom(window.playLaunch.network.seed);Math.random=()=>window.playLaunch.hostRandom.next();}
 else{let seed=2166136261;for(const ch of window.playLaunch.settings.studioRuntime?.test?.seed||id)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 Math.random=()=>{seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 window.playBootStage('加载武将与规则资源');
 await import('./_virtual/index.js');
 const {lib,game,get,ui,ai,_status}=await import('./noname.js');
 lib.configprefix=replay?'sanguosha_play_replay_':'sanguosha_play_';
 // The upstream watchdog offers a destructive localStorage/IndexedDB reset.
 // Keep this app's data and surface a recoverable diagnostic instead.
 lib.init.reset=()=>report(Error('启动等待超时（'+loadingStage+'）。请关闭本页后重新打开；无需重置游戏或清除资料。'));
 localStorage.setItem(lib.configprefix+'disable_extension','true');
 const {makeBridge}=await import('./bridge.js');window.playBridge=makeBridge({lib,game,get,ui,ai,_status},window.playLaunch);
 const {default:preload}=await import('./preload.js');await preload({lib,game,get,ui,ai,_status});
 window.playBootStage('启动规则引擎');
 const {boot}=await import('./noname/init/index.js');await boot();
 clearTimeout(window.resetGameTimeout);delete window.resetGameTimeout;
 errorBox.hidden=true;document.getElementById('boot-message')?.remove();window.playBridge.ready();
}catch(error){report(error);}
