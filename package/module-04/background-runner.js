import {defaultRoster,randomizeRoster,validateRoster} from '/play/roster-rules.js';
const key=new URL(location.href).searchParams.get('job'),owner='background:'+key;
let token='',job=null,frame=null,match='',finishing=false,assign=null,snapshot=null,lines=[],lastLive=0,running=false,serial=0;
async function api(path,body){if(!token)token=(await(await fetch('/studio/api/state')).json()).token;
 const r=await fetch('/studio/api/job/'+key+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-Play-Token':token}:undefined,body:body?JSON.stringify(body):undefined}),data=await r.json();if(!r.ok)throw Error(data.error);return data;}
const send=(type,extra={})=>frame?.contentWindow.postMessage({type,...extra},location.origin);
function seeded(seed){let n=2166136261;for(const ch of seed)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
async function roster(payload){
 const c=job.config,a=job.active,n=c.players,seat=a.targetSeat,shift=(seat-c.targetSeat+n)%n,r=defaultRoster(n);r.humanSeat=seat;r.revealAI=true;
 for(const [k,picks]of Object.entries(c.manual||{})){const at=(Number(k)+shift)%n;if(at!==seat){Object.assign(r.seats[at],{picks,method:'manual',locked:true});}}
 Object.assign(r.seats[seat],{picks:c.mode==='guozhan'?[c.target,c.partner]:[c.target],method:'manual',locked:true});
 if(c.mode==='single')Object.assign(r.seats[1-seat],{picks:[c.opponent],method:'manual',locked:true});
 for(const s of r.seats){s.filters.collections=c.folders||[];s.filters.pools=c.pools?.length?c.pools:c.folders?.length?[]:[...new Set(payload.pool.map(v=>v.pool))].filter(k=>k!=='bwiki202610test');}
 const opts={mode:c.mode,double:c.mode==='guozhan',separatism:job.settings.separatism,roles:payload.roles,ratings:job.settings.ratings};
 const old=Math.random;Math.random=seeded(a.seed);let picks;try{picks=randomizeRoster(payload.pool,r,opts);}finally{Math.random=old;}
 const errors=validateRoster(payload.pool,picks,opts);if(errors.length)throw Error(errors.join('；'));
 assign={seat,role:a.role||''};send('play-roster-apply',{roster:picks,ratings:job.settings.ratings,test:{seat,role:a.role}});
}
async function finished(game){if(finishing||game.match!==match)return;finishing=true;
 try{await live(true);job=await api('/finish',{game});frame?.remove();frame=null;match='';}catch(e){await api('/control',{action:'diagnostic',message:e.message});}finally{finishing=false;}
}
async function live(force=false){if(!match||!force&&Date.now()-lastLive<2000)return;lastLive=Date.now();await api('/live',{match,status:snapshot,lines:lines.slice(-90),assignment:assign});}
window.addEventListener('message',async e=>{
 if(e.origin!==location.origin||e.source!==frame?.contentWindow)return;const d=e.data;
 try{
  if(d.type==='play-roster')await roster(d);
  else if(d.type==='play-roster-applied'){if(d.targetSeat!==job.active.targetSeat||job.active.role&&d.role!==job.active.role)throw Error('后台身份或座位核对失败');assign={seat:d.targetSeat,role:d.role};}
  else if(d.type==='test-finished')await finished(d.game);
  else if(d.type==='play-error')await finished({match,outcome:'fault',fault:d.message,rounds:0});
  else if(d.type==='play-event'){lines.push(d.event);if(lines.length>100)lines.shift();}
  else if(d.type==='play-status'){snapshot=d.status;await live();}
  else if(d.type==='play-response'&&d.requestId?.startsWith('runtime-'))await api('/command-result',{requestId:d.requestId,result:d.error||d.result});
 }catch(error){if(match)await finished({match,outcome:'fault',fault:error.message,rounds:0});}
});
async function tick(){if(running||finishing)return;running=true;
 try{
  job=(await api('/status')).job;
  if(['complete','review'].includes(job.status)){await live();return;}
  if(frame&&(!job.active||job.active.match!==match)){frame.remove();frame=null;match='';}
  if(frame){
   for(const command of job.runtimeCommands||[]){if(command.sent)continue;send('play-command',{requestId:command.id,command:command.command});await api('/command-sent',{requestId:command.id});}
   await live();return;
  }
  if(job.status==='paused')return;
  if(['cloning','summarizing','reporting'].includes(job.status)){job=await api(job.stage==='test'?'/evaluation':'/coach',{});return;}
  const started=await api('/begin',{owner});job=started.job;match=started.active.match;lines=[];snapshot=assign=null;
  frame=document.createElement('iframe');frame.src='/play/arena.html?match='+match;document.getElementById('engine').append(frame);lastLive=0;
 }catch(error){try{await api('/control',{action:'diagnostic',message:error.message});}catch{}}
 finally{running=false;}
}
setInterval(tick,700);tick();

setInterval(()=>api('/heartbeat',{}).catch(()=>send('play-test-pause',{paused:true})),10000);
