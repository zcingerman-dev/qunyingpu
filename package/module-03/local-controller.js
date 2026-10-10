import {installOperationQuality} from './operation-quality.js';
// Native AI plays matches. Only batch coaching crosses the model interface.
export function installLocalController(env,launch,{record,send}){
 const {lib,game,ui,get,_status}=env,t=launch.settings.studioRuntime.test;
 const auditor=t.workflow==='outer-v2'?installOperationQuality(env,launch,record):null;
 let paused=false,done=false,lastPoll=0;const seen=new WeakSet();
 const describe=c=>c&&typeof c==='object'?({id:c.cardid||'',name:c.name,suit:c.suit,number:c.number,nature:c.nature||''}):c;
 async function gate(){
  await launch.waitForAppearance?.();
  while(paused&&!_status.over){await new Promise(r=>setTimeout(r,200));}
 }
 const timer=setInterval(async()=>{if(done||_status.over){clearInterval(timer);return;}if(Date.now()-lastPoll<450)return;lastPoll=Date.now();try{const j=await(await fetch('/studio/api/job/'+t.job+'/status')).json();paused=j.job?.status==='paused';if(paused)send('test-paused',{message:j.job.pauseReason});}catch{paused=true;send('test-paused',{message:'本地服务连接中断；当前操作已暂停'});}},500);
 const oldStart=lib.element.GameEvent.prototype.start;
 lib.element.GameEvent.prototype.start=async function(...args){
  await gate();const first=!seen.has(this);seen.add(this);
  let choice;
  if(first&&this.name?.startsWith('choose')&&this.player){choice={event:this.name,skill:this.skill||'',seat:this.player.playSeat,prompt:typeof this.prompt==='string'?this.prompt:'',hand:this.player.getCards('h').map(describe),policyRevision:t.policyRevision,controller:'native-ai'};}
  try{const result=await oldStart.apply(this,args);if(choice){auditor?.ungraded(this);const r=this.result||this._result||{};record('local-ai-choice',{...choice,result:{bool:r.bool,control:r.control,index:r.index,links:r.links?.map(x=>x?.name?describe(x):Array.isArray(x)?x:String(x)),cards:r.cards?.map(describe),targets:r.targets?.map(p=>p.playSeat),moved:Array.isArray(r.moved)?r.moved.map(a=>Array.isArray(a)?a.map(describe):a):r.moved}});}return result;}catch(error){record('test-fault',{message:error.message,event:this.name,skill:this.skill||'',seat:this.player?.playSeat});send('play-error',{message:'本地规则执行异常：'+error.message});throw error;}
 };
 const choices=new WeakSet();
 // Capture the exact native candidate lists at each selection step. They can
 // change after a card/skill is selected, so an initial DOM snapshot is not enough.
 for(const [key,kind] of [['selectableCards','cards'],['selectableTargets','targets'],['selectableButtons','buttons']]){
  const native=get[key];
  if(typeof native!=='function')continue;
  get[key]=function(...args){const candidates=native.apply(this,args),e=_status.event;
   if(e?.player&&e.name?.startsWith('choose'))record('native-choice-candidates',{event:e.name,skill:e.skill||'',seat:e.player.playSeat,source:key,kind,
    candidates:candidates.map(x=>kind==='cards'?describe(x):kind==='targets'?x.playSeat:x.classList?.contains('blank')||x.classList?.contains('hidden')?'未知手牌':x.link?.name?describe(x.link):x.textContent?.trim()),
    selected:{cards:ui.selected.cards.map(describe),targets:ui.selected.targets.map(p=>p.playSeat),buttons:ui.selected.buttons.map(b=>b.classList?.contains('blank')||b.classList?.contains('hidden')?'未知手牌':b.textContent?.trim())},
    skills:kind==='cards'&&!e.player._noSkill?get.skills():undefined});
   return candidates;};
 }
 globalThis.playAiBeforeStep=async e=>{
  await gate();
  if(!e?.player||!e.name?.startsWith('choose')||e.result!=='ai'||choices.has(e))return;
  choices.add(e);
  const selectable=nodes=>Array.from(nodes||[]).filter(n=>n.classList?.contains('selectable'));
  record('native-choice-candidates',{event:e.name,seat:e.player.playSeat,source:'initial-choice',controls:e.controls,
   cards:selectable(e.player.getCards(e.position||'h')).map(describe),
   targets:selectable(game.players).map(p=>p.playSeat),
   buttons:selectable(e.dialog?.buttons).map(b=>b.classList.contains('blank')||b.classList.contains('hidden')?'未知手牌':b.textContent?.trim()),
   moveLists:Array.isArray(e.list)?e.list.map(x=>Array.isArray(x)?{name:x[0],cards:Array.isArray(x[1])?x[1].map(describe):[]}:x):undefined});
 };
 // Redraw retains its native algorithm and records the final kept hand in video.
 delete globalThis.playAiRedraw;
 const nativeDelay=game.delay.bind(game),nativeDelayx=game.delayx.bind(game);
 game.delay=function(...args){return _status.over?nativeDelay(...args):Promise.resolve();};
 game.delayx=function(...args){return _status.over?nativeDelayx(...args):Promise.resolve();};
 lib.config.animation=false;lib.config.animation_choose_to_move=false;
 record('local-controller',{targetVersion:t.targetVersion,policyRevision:t.policyRevision,opponents:'固定原生AI',modelsDoNotChooseActions:true});
 launch.localController={stop(){done=true;clearInterval(timer);},setPaused(v){paused=v;}};
}
