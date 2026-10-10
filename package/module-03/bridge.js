import {installPrivateCardTags} from './private-card-tags.js';
import {loadCharacter,loadCard} from './noname/init/loading.js';
import {installRoster} from './roster-engine.js';
import {loadPersonal} from './personal-engine.js';
import {installModelController} from './model-controller.js';
import {createTestMetrics} from './test-metrics.js';
import {installAppearance} from './appearance.js';
import {installCardImprovements} from './card-improvements.js';
import {installRuleDescriptions,installPersonalRuleAlignment} from './rule-alignment.js';
import {installLocalController} from './local-controller.js';
import {applyArenaBackground} from './background.js';
import {installIdentitySuccession} from './identity-succession.js';
import {installNetworkHost} from './network-host.js';
export function makeBridge(env,launch){
 const {lib,game,ui,get,_status}=env,s=launch.settings;
 let seq=launch.events.length,pending=[],paused=false,modified=launch.modified,saving=false,lastSignature='',ready=false,finalStatus=null,redraws=0;
 const replay=launch.replay;
 let rosterEngine=null;const drawStats={},hpStats={},flowStats=replay&&!launch.checkpoint?.flowStats?null:{};if(replay){Object.assign(drawStats,launch.checkpoint?.drawStats||{});Object.assign(hpStats,launch.checkpoint?.hpStats||{});if(flowStats)Object.assign(flowStats,launch.checkpoint.flowStats);}
 let testMetrics=null,testSent=false,appearance=null,succession=null,network=null;
 launch.hpStats=hpStats;
 const send=(type,data={})=>{if(type==='play-roster'&&network&&launch.network.humanSeats){network.selectRoster(data,roster=>rosterEngine.apply({roster}));return;}parent.postMessage({type,...data},location.origin);};
 const safe=value=>JSON.parse(JSON.stringify(value,(_key,v)=>{if(v?.nodeType)return v.dataset?.position??v.name??null;if(typeof v==='function')return undefined;return v;}));
 function record(type,data={}){if(replay)return;testMetrics?.record(type,data);if(type==='redraw')redraws=data.count;const e={seq:seq++,at:new Date().toISOString(),type,data:safe(data)};pending.push(e);send('play-event',{event:e});}
 launch.testRecord=record;
 function players(){return game.players.concat(game.dead||[]).map((p,i)=>{const hidden1=p!==game.me&&s.mode==='guozhan'&&p.isUnseen?.(0),hidden2=p!==game.me&&s.mode==='guozhan'&&p.isUnseen?.(1);return{seat:p.dataset.position,playSeat:p.playSeat,index:i,name:hidden1?'未亮主将':get.translation(p.name1||p.name)||'选将中',name2:hidden2?'未亮副将':p.name2?get.translation(p.name2):'',id:hidden1?null:p.name1||p.name,readyGeneral:!!p.name,hp:p.hp,maxHp:p.maxHp,hand:p.countCards('h'),identity:p.identityShown||p===game.me||s.mode==='doudizhu'||s.mode==='single'?get.translation(p.identity):'未知身份',group:p.group==='unknown'?'未亮将':get.translation(p.group),alive:p.isAlive(),controlled:p===game.me};});}
 function status(){return{players:players(),phase:game.phaseNumber||0,round:game.roundNumber||0,auto:!!_status.auto,paused:paused||!!appearance?.isOpen(),over:!!_status.over,modified,replay,redraws,selectingRoster:rosterEngine?.isSelecting()||false,outcome:finalStatus,identityRules:succession?.snapshot()||null,drawStats,hpStats,flowStats,pile:ui.cardPile?.childNodes.length||0,discard:ui.discardPile?.childNodes.length||0,event:_status.event?.name||'',selecting:!!_status.imchoosing,videoCount:lib.video?.length||0,loadedGenerals:Object.keys(lib.character).length};}
 async function flush(force=false){
  if(replay||!ready)return true;
  if(saving){if(force){await new Promise(resolve=>{const timer=setInterval(()=>{if(!saving){clearInterval(timer);resolve();}},20);});return flush(true);}return true;}
  if(!force&&!pending.length)return true;
  saving=true;const batch=pending.splice(0,2000);
  let success=true;
  try{const res=await fetch('./api/match/'+launch.id,{method:'POST',headers:{'Content-Type':'application/json','X-Play-Token':launch.token},body:JSON.stringify({events:batch,status:finalStatus||(_status.over?'已结束':rosterEngine?.isSelecting()?'选将中':'进行中'),modified,checkpoint:{mode:s.mode,video:safe(lib.video||[]),players:players(),identityRules:succession?{...succession.state}:null,drawStats,hpStats,flowStats,outcome:finalStatus,round:game.roundNumber||0,phase:game.phaseNumber||0}})});if(!res.ok)throw Error((await res.json()).error);send('play-saved',{count:seq});}
  catch(e){success=false;pending.unshift(...batch);send('play-save-error',{message:e.message});}finally{saving=false;}
  return success&&force&&pending.length?flush(true):success;
 }
 function configure(c){
  c.mode=s.mode;c.show_splash='off';c.show_version=false;c.show_version_description=false;c.extensions=[];c.extension_auto_import=false;c.plays=[];c.characters=s.packs.slice();c.cards=['standard','extra','guozhan','yingbian','yongjian','sp','zhulu','huodong','xianxia'];
  c.hiddenModePack=['connect','versus','boss','brawl','chess','stone','tafang'];c.hiddenPlayPack=['boss','cardpile','coin'];c.all.stockmode=['identity','guozhan','doudizhu','single'];c.all.sgsmodes=c.all.stockmode.slice();
  c.layout='long2';c.phonelayout=false;c.touchscreen=false;c.totouched=true;c.toscrolled=true;c.theme='woodden';c.image_background=s.background==='custom'?'ol_bg':s.background;c.image_background_random=false;
  c.background_music='music_off';c.show_volumn=false;c.compatible=true;c.debug=true;c.dev=false;c.check_version=false;c.check_update=false;c.video='100';c.auto_confirm=true;c.choose_all_button=true;c.cheat=false;c.coin=0;c.show_time=false;c.fold_mode=false;c.fold_card=false;
  c.version=lib.version;c.new_tutorial=true;c.game_speed=s.speed;c.video_default_play_speed={slow:'0.5x',normal:'1x',fast:'2x',vfast:'4x',vvfast:'8x'}[s.speed];c.mode_config[s.mode]??={};
  Object.assign(c.mode_config[s.mode],{player_number:s.players,free_choose:true,change_choice:true,change_identity:true,change_card:s.redraw==='0'?'disabled':'unlimited',continue_game:true,show_replay:true,revive:false,swap:true,double_character:s.mode==='single'?(s.doubleGeneral?'double':'single'):s.doubleGeneral,double_hp:'pingjun',auto_identity:'off',identity_mode:'normal',double_nei:s.doubleNei,special_identity:false,enhance_zhu:'off',guozhan_mode:s.guozhanDeck==='custom'?'free':s.guozhanDeck,guozhanpile:s.guozhanDeck==='custom'?'free':s.guozhanDeck,aozhan:s.aozhan,separatism:s.separatism,onlyguozhan:true,initshow_draw:'mark',junzhu:true,zhenzhu:true,doudizhu_mode:'normal',enhance_dizhu:'disabled',enhance_nongmin:s.inheritance,feiyang_version:s.feiyang,choice_zhu:'8',choice_fan:'5',single_mode:'dianjiang',enable_jin:true});
  c.mode_config[s.mode].choice_zhu=s.mode==='doudizhu'?8:7;
  c.mode_config[s.mode].choice_fan=5;
  if(s.mode==='guozhan')c.mode_config.guozhan.double_character=true;
  _status.auto=s.control==='auto'||replay;
  if(s.studioRuntime?.test)c.auto_confirm=false;
  if(s.studioRuntime?.test){c.background_audio=false;c.background_speak=false;c.volumn_audio=0;c.volumn_background=0;}
 }
 async function setAuto(value){
  if(replay||_status.over)throw Error('回放或已结束的对局不能切换控制');
  if(_status.auto&&!value&&!replay)modified=true;
  if(_status.paused2){game.resume2();await new Promise(resolve=>setTimeout(resolve,0));}
  if(!!_status.auto!==value){if(ui.auto)ui.click.auto('forced');else _status.auto=value;}
  if(paused)game.pause2();record('control',{auto:value});send('play-status',{status:status()});
 }
 async function consoleCommand(text){
  const words=text.trim().split(/\s+/),cmd=words.shift();
  if(cmd==='help')return 'state | pause | resume | auto on/off | take 座位 | draw 座位 数量 | hp 座位 数值 | give 座位 卡牌ID [花色 点数 属性] | skill 座位 技能ID | js JavaScript。写入会标记对局并保存操作记录。';
  if(cmd==='state')return status();
  if(cmd==='pause'){paused=true;game.pause2();return'已暂停';}
  if(cmd==='resume'){paused=false;game.resume2();return'已继续';}
  if(cmd==='auto'){await setAuto(words[0]!=='off');return _status.auto?'全 AI 托管':'玩家控制';}
  if(cmd==='take'){await take(words[0]);return'已接管所选座位';}
  if(!ready||replay||_status.over)throw Error('当前没有可修改的活动对局');
  modified=true;record('console',{command:text});
  const p=game.players.concat(game.dead||[]).find(p=>p.dataset.position===words[0]);
  if(['draw','hp','give','skill'].includes(cmd)&&!p)throw Error('座位不存在，使用 state 查看座位编号');
  if(cmd==='draw'){const n=Number(words[1]);if(!Number.isInteger(n)||n<1||n>100)throw Error('摸牌数量须为 1～100');p.draw(n);return'已安排摸牌';}
  if(cmd==='hp'){const n=Number(words[1]);if(!Number.isInteger(n)||n<1||n>999)throw Error('体力须为 1～999');p.maxHp=Math.max(p.maxHp,n);p.hp=n;p.update();game.addVideo('update',p,[p.countCards('h'),p.hp,p.maxHp,p.hujia]);return'体力已修改';}
  if(cmd==='give'){if(!lib.card[words[1]])throw Error('卡牌 ID 不存在');const suit=words[2]||'spade',num=Number(words[3]||1);if(!['spade','heart','club','diamond'].includes(suit)||!Number.isInteger(num)||num<1||num>13)throw Error('花色或点数不正确');p.gain(game.createCard(words[1],suit,num,words[4]),'gain2');return'已安排获得卡牌';}
  if(cmd==='skill'){if(!lib.skill[words[1]])throw Error('技能 ID 不存在');p.addSkill(words[1]);return'已添加技能';}
  if(cmd==='js'){return safe(await Function('lib','game','ui','get','ai','_status',text.slice(3))(lib,game,ui,get,env.ai,_status)??'已执行');}
  throw Error('未知命令，输入 help 查看帮助');
 }
 async function take(seat){
  if(replay||_status.over)throw Error('回放或已结束的对局不能接管');
  const p=game.players.find(p=>p.dataset.position===String(seat));if(!p||!p.name)throw Error('请选择一个已选将且存活的座位');
  if(_status.imchoosing&&_status.event?.isMine?.()&&p!==game.me)throw Error('请先完成当前操作，或交回 AI 后接管另一个座位');
  if(_status.paused2){game.resume2();await new Promise(resolve=>setTimeout(resolve,0));}game.swapPlayer(p);await setAuto(false);modified=true;record('takeover',{seat:String(seat),general:p.name});if(paused)game.pause2();send('play-status',{status:status(),selectControlled:true});
 }
 async function beforeArena(){
  window.playBootStage?.('准备牌桌背景');
  await applyArenaBackground(env,s).catch(error=>send('play-notice',{message:error.message}));
  lib.config.version=lib.version;
  lib.help['关于游戏']='<div style="margin:10px">群英谱 · 基础实战</div><p>使用说明、来源与鸣谢请查看 <a href="/app/readme.html" target="_blank" rel="noopener">readme.md</a>。</p>';
  Object.assign(lib.translate,{empty_equip1:'武器栏',empty_equip2:'防具栏',empty_equip3:'防御马',empty_equip4:'进攻马',empty_equip5:'宝物栏'});
  loadPersonal(env,s,record);
  window.playBootStage?.('加载武将改良');
  await installRuleDescriptions(env,launch);
  await installCardImprovements(env,launch,record);
  await installPersonalRuleAlignment(env,launch,record);
  installPrivateCardTags(env);
  if(launch.cardPreflight){lib.init.start=async()=>{};return;}
  window.playBootStage?.('加载皮肤与语音索引');
  if(!launch.network)appearance=await installAppearance(env,launch,{isPaused:()=>paused});
  window.playBootStage?.(replay?'准备历史回放':'准备开局');
  if(s.customCode.trim()){
   const pack=Function('lib','game','ui','get','ai','_status',s.customCode)(lib,game,ui,get,env.ai,_status);
   if(!pack||typeof pack!=='object')throw Error('扩展需要返回一个含 character、skill、card 或 translate 的对象');
   if(pack.character||pack.skill){cEnable('play_custom');loadCharacter({name:'play_custom',character:pack.character||{},skill:pack.skill||{},translate:pack.translate||{}});}
   if(pack.card){lib.config.cards.push('play_custom');loadCard({name:'play_custom',card:pack.card,skill:pack.skill||{},translate:pack.translate||{},list:[]});}
   modified=true;record('extension',{characters:Object.keys(pack.character||{}),skills:Object.keys(pack.skill||{}),cards:Object.keys(pack.card||{})});
  }
  const missing=[...new Set(s.deck.map(c=>c[2]))].filter(id=>!lib.card[id]);if(missing.length)throw Error('牌堆含未加载卡牌：'+missing.join('、'));
  lib.card.list=structuredClone(s.deck);game.fixedPile=true;
  const oldAddVideo=game.addVideo.bind(game);game.addVideo=function(type,player,content){const r=oldAddVideo(type,player,content);if(_status.videoInited)record('engine:'+type,{seat:player?.dataset?.position??player??null,content});return r;};
  const oldOver=game.over.bind(game);game.over=function(...args){if(typeof args[0]==='string'&&args[0].includes('和局'))finalStatus=args[0];record('result',{result:args[0]});const r=oldOver(...args);setTimeout(async()=>{const saved=await flush(true);if(testMetrics&&!testSent){testSent=true;const result=testMetrics.finish(args[0]);if(!saved){result.fault='原始日志保存失败';result.outcome='fault';}send('test-finished',{game:result});}},500);return r;};
  const oldReload=game.reload.bind(game);game.reload=function(){if(replay)return oldReload();record('leave',{});flush(true);send('play-restart');};
  if(s.identityRole!=='random'&&s.mode==='identity'){
   lib.config.mode_config.identity.change_identity=true;
   const oldChoose=game.chooseCharacter;game.chooseCharacter=function(){const event=oldChoose.apply(this,arguments);if(event)event.identity=s.identityRole;return event;};
  }
  if(!replay)rosterEngine=await installRoster(env,s,{send,record,safe,network:launch.network,onSelected(){
   const test=s.studioRuntime?.test;if(!test)return;
   const seat=test.targetSeat??s.rosters[s.mode]?.humanSeat,role=test.role||s.identityRole;
   const target=game.players.find(p=>p.playSeat===seat);
   if(!target||role&&role!=='random'&&target.identity!==role)throw Error('测试将实际身份或座位与锁定配置不一致，已停止本局');
   record('test-assignment',{seat:target.playSeat,role:target.identity,general:target.name1||target.name,seed:s.studioRuntime.test.seed||launch.id});
  },onHp(data){
   const r=hpStats[data.seat]??={lost:0,recovered:0,enemyDrop:0,rounds:{}};data.delta<0?r.lost-=data.delta:r.recovered+=data.delta;
   if(data.enemyDrop){const source=hpStats[data.sourceSeat]??={lost:0,recovered:0,enemyDrop:0,rounds:{}};source.enemyDrop-=data.delta;source.rounds[data.round]=(source.rounds[data.round]||0)-data.delta;}
   record('hp-metrics',data);
  },onDraw(p,round,draw){
   const seat=p.playSeat??Number(p.dataset.position),r=drawStats[seat]??={name:get.translation(p.name1||p.name),total:0,value:0,opening:0,byCard:{},byType:{},rounds:{}};
   for(const target of [r,r.rounds[round]??={total:0,value:0,byCard:{},byType:{}}]){target.total+=draw.total;target.value=Math.round((target.value+draw.value)*10)/10;for(const[field,counts]of Object.entries({byCard:draw.byCard,byType:draw.byType}))for(const[key,n]of Object.entries(counts))target[field][key]=(target[field][key]||0)+n;}
   if(draw.opening)r.opening+=draw.total;record('draw-metrics',{seat,round,...draw});
  },onFlow(p,round,flow){
   const seat=p.playSeat??Number(p.dataset.position),r=flowStats[seat]??={total:0,draw:0,gain:0,byCard:{},rounds:{}};
   for(const target of [r,r.rounds[round]??={total:0,draw:0,gain:0,byCard:{}}]){target.total+=flow.total;target[flow.source]+=flow.total;for(const[name,n]of Object.entries(flow.byCard))target.byCard[name]=(target.byCard[name]||0)+n;}
   record('flow-metrics',{seat,round,...flow});
  }});
  succession=installIdentitySuccession(env,s,{record,replay});
  network=installNetworkHost(env,launch,{record,send,transport:launch.authorityTransport});
  if(ready)network?.start();
  if(!replay&&s.studioRuntime?.test){testMetrics=createTestMetrics(env,launch);if(s.studioRuntime.test.driver==='batch-local')installLocalController(env,launch,{record,send});else installModelController(env,launch,{record,send,onFault:message=>testMetrics.fault(message)});}
  if(replay){
   if(!launch.checkpoint?.video?.length)throw Error('该对局尚无回放数据');
   const videoOver=game.videoContent.over;
   game.videoContent.over=function(html){
    const box=document.createElement('div');box.innerHTML=html;
    for(const table of box.querySelectorAll('table')){
     for(const row of table.querySelectorAll('tr')){
      if(row.children.length!==7||row.lastElementChild.textContent==='手牌')continue;
      const p=launch.checkpoint.players.find(p=>p.name===row.firstElementChild?.textContent);
      row.lastElementChild.textContent=p?String(p.hand):'—';
     }
    }
    return videoOver.call(this,box.innerHTML);
   };
   lib.init.start=async function(){
    ui.create.me();_status.mode=s.mode==='single'?'dianjiang':s.mode==='guozhan'?'free':'normal';
    ui.system.hide();ui.arena.hide();ui.historybar.style.display='none';
    ui.window.classList.remove('leftbar','rightbar');
    _status.video=true;_status.over=false;_status.paused=false;_status.paused2=false;
    clearTimeout(_status.timeout);clearTimeout(window.resetGameTimeout);delete window.resetGameTimeout;
    for(const pack of Object.values(lib.characterPack))for(const[id,data]of Object.entries(pack))lib.character[id]??=data;
    const video=game.createEvent('video',false);video.video=structuredClone(launch.checkpoint.video);
    video.setContent('playVideoContent');await video;
   };
  }
 }
 function cEnable(name){if(!lib.config.characters.includes(name))lib.config.characters.push(name);}
 window.addEventListener('message',async event=>{
  if(event.origin!==location.origin||event.source!==parent||!event.data?.type?.startsWith('play-'))return;
  const {type,requestId}=event.data;
  try{
   let result;
   if(type==='play-auto')await setAuto(!!event.data.value);
   else if(type==='play-roster-apply'){
    if(event.data.test){s.identityRole=event.data.test.role||'random';record('test-target',{seat:Number(event.data.test.seat)});}
    rosterEngine.apply(event.data);
   }
   else if(type==='play-roster-human')rosterEngine.changeHuman(Number(event.data.seat));
   else if(type==='play-test-target')record('test-target',{seat:Number(event.data.seat)});
   else if(type==='play-test-role'){s.identityRole=event.data.role;rosterEngine.changeHuman(Number(event.data.seat));}
   else if(type==='play-resize'){ui.updated();game.documentZoom=game.deviceZoom||1;ui.updatez();ui.updatex();}
   else if(type==='play-pause'){paused=!paused;paused?game.pause2():game.resume2();record('pause',{paused});}
   else if(type==='play-step'){if(!paused)throw Error('请先暂停');if(!_status.auto&&_status.imchoosing)throw Error('当前等待玩家操作，请先操作或交回 AI');const phase=game.phaseNumber;game.resume2();const handle=setInterval(()=>{if(game.phaseNumber!==phase||_status.over){clearInterval(handle);game.pause2();}},25);setTimeout(()=>{clearInterval(handle);if(paused)game.pause2();},10000);record('step',{});}
   else if(type==='play-take')await take(event.data.seat);
   else if(type==='play-speed'){if(!['slow','normal','fast','vfast','vvfast'].includes(event.data.value))throw Error('速度无效');lib.config.game_speed=event.data.value;if(replay)_status.videoDuration={slow:2,normal:1,fast:.5,vfast:.25,vvfast:.125}[event.data.value];record('speed',{value:event.data.value});}
   else if(type==='play-command')result=await consoleCommand(event.data.command);
   else if(type==='play-save'){if(!await flush(true))throw Error('记录未能保存，请重试');}
   else if(type==='play-stop'){if(!replay){finalStatus??=_status.over?'已结束':'已离开（未结束）';record('leave',{});if(!await flush(true))throw Error('离开前保存失败，请重试');}}
   else if(type==='play-abort-test'){if(!testMetrics)throw Error('当前不是测试对局');testMetrics.fault('用户跳过故障局');record('test-fault',{message:'用户跳过故障局'});game.over('故障局');}
   else if(type==='play-test-pause'){launch.localController?.setPaused(!!event.data.paused);}
   else if(type==='play-background'){await applyArenaBackground(env,s,event.data.url);}
   else if(type==='play-identity-action'){
    if(!ready||replay||_status.over||_status.auto||!succession)throw Error('请先在立储与择途对局中接管一个存活座位');
    if(event.data.action==='appoint')result=succession.appoint(game.me,game.players.find(p=>p.dataset.position===String(event.data.target)));
    else if(event.data.action==='choose')result=succession.choose(game.me,event.data.route);
    else if(event.data.action==='wild-benefit')result=succession.requestWildBenefit(game.me,event.data.effect);
    else throw Error('身份规则操作无效');
    send('play-status',{status:status()});
   }
   send('play-response',{requestId,result:result??'完成'});
  }catch(e){send('play-response',{requestId,error:e.message});}
 });
 window.addEventListener('pagehide',()=>{if(ready&&!replay)fetch('./api/match/'+launch.id,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','X-Play-Token':launch.token},body:JSON.stringify({events:[],status:finalStatus||(_status.over?'已结束':'已离开（未结束）'),modified})}).catch(()=>{});});
 return{configure,beforeArena,record,network:()=>network,ready(){ready=true;appearance?.ready();network?.start();record('start',{mode:s.mode,deck:s.deck.length,control:s.control});setInterval(()=>{const snapshot=status(),sig=JSON.stringify(snapshot);if(sig!==lastSignature){lastSignature=sig;send('play-status',{status:snapshot});}appearance?.paint();},300);setInterval(()=>flush(),3000);send('play-ready');}};
}
