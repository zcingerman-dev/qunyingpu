// Model chooses incremental legal inputs; native content continues to adjudicate.
export function installModelController(env,launch,{record,send,onFault}){
 const {lib,game,ui,get,_status}=env,test=launch.settings.studioRuntime?.test;if(!test)return;
 let seq=0,failed=false;const prepared=new WeakSet();
 const allPlayers=()=>game.players.concat(game.dead||[]);
 const descriptor=c=>({name:get.translation(c.name),cardId:c.name,suit:c.suit,number:c.number,nature:c.nature||'',type:get.type(c,null,false)});
 function visible(p){return{round:game.roundNumber||0,phase:game.phaseNumber||0,self:p.playSeat,hand:p.getCards('h').map(descriptor),selfSkills:p.getSkills('invisible').map(id=>({id,name:get.translation(id),text:get.translation(id+'_info')})),players:allPlayers().map(x=>({seat:x.playSeat,name:launch.settings.mode==='guozhan'&&x!==p&&x.isUnseen?.(0)?'暗置武将':get.translation(x.name1||x.name),hp:x.hp,maxHp:x.maxHp,handCount:x.countCards('h'),equips:x.getCards('e').map(descriptor),judges:x.getCards('j').map(descriptor),identity:x===p||x.identityShown||['single','doudizhu'].includes(launch.settings.mode)?x.identity:'未知',group:x.group,alive:x.isAlive()}))};}
 async function request(e,legal,extra={}){
  await launch.waitForAppearance?.();
  if(failed||_status.over)throw Error('对局已结束');
  const body={request:`${test.job}:${test.stage}:${test.cycle}:${test.n}:${launch.id}:${seq++}`,choice:{event:e.name,prompt:typeof e.prompt==='string'?e.prompt:typeof e.dialog==='string'?e.dialog:'',skill:e.skill||'',...visible(e.player),...extra,legal:legal.map(({run,...x})=>x)}};
  // Pausing stops at the next legal choice, retaining the same native event in memory.
  while(true){const state=await(await fetch('/studio/api/job/'+test.job)).json();if(state.job?.status==='running')break;if(state.job?.status!=='paused')throw Error('测试任务不处于运行状态');send('test-paused',{});await new Promise(resolve=>setTimeout(resolve,700));}
  send('test-thinking',{seat:e.player.playSeat,event:e.name});
  let answer,attempt=0;const originalRequest=body.request;
  while(true){
   const response=await fetch('/studio/api/job/'+test.job+'/decision',{method:'POST',headers:{'Content-Type':'application/json','X-Play-Token':launch.token},body:JSON.stringify(body)});answer=await response.json();if(response.ok)break;
   const state=await(await fetch('/studio/api/job/'+test.job)).json();
   if(state.job?.status!=='paused')throw Error(answer.error);
   send('test-paused',{message:answer.error});
   while(true){await new Promise(resolve=>setTimeout(resolve,700));const next=await(await fetch('/studio/api/job/'+test.job)).json();if(next.job?.status==='running')break;if(next.job?.status!=='paused')throw Error('任务已结束');}
   body.request=originalRequest+':retry:'+ ++attempt;
  }
  await launch.waitForAppearance?.();
  const selected=legal.find(x=>x.id===answer.answer.id);if(!selected)throw Error('模型返回非法候选');
  record('model-choice',{request:body.request,seat:e.player.playSeat,event:e.name,id:selected.id,reason:answer.answer.reason||'',legal:body.choice.legal,usage:answer.usage,cost:answer.cost});return selected;
 }
 function toggle(e,type,node){const list=ui.selected[type+'s'];if(list.includes(node)){list.remove(node);node.classList.remove('selected');}else{list.add(node);node.classList.add('selected');}if(typeof e.custom?.add?.[type]==='function')e.custom.add[type]();game.check();}
 async function select(e){
  const identities=new WeakMap();let next=0;const idFor=(kind,node)=>{if(!identities.has(node))identities.set(node,`${kind}:${next++}`);return identities.get(node);};
  for(let step=0;step<100;step++){
   const ok=game.check(),legal=[];
   for(const [kind,nodes]of [['card',e.filterCard?e.player.getCards(e.position||'h'):[]],['button',e.filterButton?e.dialog?.buttons||[]:[]],['target',e.filterTarget?allPlayers():[]]])for(const node of nodes){
    if(!node.classList.contains('selectable'))continue;
    let detail=kind==='card'?descriptor(node):kind==='target'?{seat:node.playSeat,name:launch.settings.mode==='guozhan'&&node!==e.player&&node.isUnseen?.(0)?'暗置武将':get.translation(node.name1||node.name)}:{label:node.textContent?.trim().slice(0,500),link:Array.isArray(node.link)?node.link:node.link?.name?descriptor(node.link):typeof node.link==='string'?get.translation(node.link):'选项'};
    // Face-down card buttons reveal no name/link to the model.
    if(kind==='button'&&(node.classList.contains('blank')||node.classList.contains('hidden')))detail={label:'未知手牌'};
    legal.push({id:idFor(kind,node),kind,selected:ui.selected[kind+'s'].includes(node),...detail,run:()=>toggle(e,kind,node)});
   }
   if(!e.skill&&get.noSelected())for(const skill of e._skillChoice||[]){if(e._aiexclude?.includes(skill))continue;legal.push({id:'skill:'+skill,kind:'skill',name:get.translation(skill),text:get.translation(skill+'_info'),run:()=>ui.click.skill(skill)});}
   if(ok)legal.push({id:'confirm',kind:'confirm',label:'确认当前选择',run:()=>ui.click.ok()});
   if(e.skill)legal.push({id:'back',kind:'back',label:'取消技能选择',run:()=>ui.click.cancel()});
   if(!e.forced)legal.push({id:'cancel',kind:'cancel',label:e.type==='phase'?'结束出牌阶段':'放弃此行动',run:()=>{if(e.skill)ui.click.cancel();ui.click.cancel();}});
   if(!legal.length)throw Error(`${e.name} 无合法候选，无法由模型操作`);
   const choice=await request(e,legal,{selection:{cards:ui.selected.cards.map(descriptor),targets:ui.selected.targets.map(p=>p.playSeat),buttons:ui.selected.buttons.map(b=>b.textContent?.trim().slice(0,300))}});choice.run();
   if(e.result!=='ai')return;
  }throw Error('模型在同一选择中反复切换超过上限');
 }
 async function move(e){
  if(!Array.isArray(e.list)||e.list.some(x=>!Array.isArray(x)||(x[1]!==undefined&&!Array.isArray(x[1]))))throw Error('此排序界面的候选格式未接通');
  let moved=e.list.map(x=>(x[1]||[]).slice());const nodes=new Map(moved.flat().map(c=>[c,{link:c}]));
  for(let n=0;n<100;n++){
   const legal=[];for(let a=0;a<moved.length;a++)for(let i=0;i<moved[a].length;i++)for(let b=0;b<moved.length;b++){
    const c=moved[a][i];if(a!==b&&(!e.filterMove||e.filterMove(nodes.get(c),b,moved)))legal.push({id:`move:${a}:${i}:${b}`,label:`${get.translation(c)} 从${e.list[a][0]}移到${e.list[b][0]}`,run:()=>{moved[a].splice(i,1);moved[b].push(c);}});
    for(let j=0;j<moved[b].length;j++){const d=moved[b][j];if(c===d)continue;if(!e.filterMove||e.filterMove(nodes.get(c),nodes.get(d),moved))legal.push({id:`swap:${a}:${i}:${b}:${j}`,label:`交换 ${get.translation(c)} 与 ${get.translation(d)}`,run:()=>{moved[a][i]=d;moved[b][j]=c;}});}
   }
   if(!e.filterOk||e.filterOk(moved))legal.push({id:'confirm',label:'确认排序'});
   if(!e.forced)legal.push({id:'cancel',label:'取消'});
   const choice=await request(e,legal,{lists:moved.map((cards,i)=>({name:e.list[i][0],cards:cards.map(descriptor)}))});
   if(choice.id==='confirm'||choice.id==='cancel'){e.processAI=()=>choice.id==='confirm'?moved:false;return;}choice.run();
  }throw Error('模型排序超过操作上限');
 }
 async function numbers(e){
  if(!Array.isArray(e.list))throw Error('数字选项格式未接通');
  e.numbers=e.list.map(x=>Array.isArray(x)?x.find(v=>typeof v==='number'):x.min||0);
  for(let turn=0;turn<100;turn++){
   const legal=[];
   for(let i=0;i<e.list.length;i++){
    const spec=e.list[i],vals=Array.isArray(spec)?spec.filter(v=>typeof v==='number'):Array.from({length:Math.floor(((spec.max??9)-(spec.min??0))/(spec.base||1))+1},(_,j)=>(spec.min||0)+j*(spec.base||1));
    if(vals.length>300)throw Error('数字范围过大');
    for(const n of vals){if(e.filterSelect&&!e.filterSelect(n,i,e))continue;legal.push({id:`number:${i}:${n}`,label:`第 ${i+1} 项选择 ${n}`,run:()=>e.numbers[i]=n});}
   }
   if(!e.filterOk||e.filterOk(e))legal.push({id:'confirm',label:'确认数值'});
   if(!e.forced)legal.push({id:'cancel',label:'取消'});
   const c=await request(e,legal,{numbers:e.numbers});
   if(c.id==='confirm'||c.id==='cancel'){const saved=e.numbers.slice();e.processAI=()=>c.id==='confirm'?saved:false;return;}c.run();
  }throw Error('模型数字选择超过上限');
 }
 const supported=new Set(['chooseToUse','chooseToRespond','chooseCard','chooseToDiscard','chooseButton','chooseButtonTarget','chooseTarget','chooseCardTarget','choosePlayerCard','discardPlayerCard','gainPlayerCard','chooseControl']);
 globalThis.playAiRedraw=async event=>{
  const cap=Number(launch.settings.redraw)||0;if(!cap)return;
  try{for(const p of game.players){for(let n=0;n<cap;n++){
   const choice=await request({name:'openingRedraw',player:p,prompt:`开局手牌：保留或重抽；已重抽 ${n} 次，上限 ${cap} 次`},[{id:'keep',label:'保留手牌'},{id:'redraw',label:'整手重抽'}]);
   if(choice.id==='keep')break;
   const cards=p.getCards('h'),next=event.otherPile?.[p.playerid]?.getCards?.(cards.length)||get.cards(cards.length);
   game.addVideo('lose',p,[get.cardsInfo(cards),[],[],[]]);for(const card of cards){card.removeGaintag(true);const discard=event.otherPile?.[p.playerid]?.discard;if(discard)discard(card);else card.discard(false);}
   p.directgain(next);p._start_cards=next;record('redraw',{seat:p.playSeat,count:n+1});
  }}}catch(error){failed=true;record('test-fault',{message:error.message});onFault(error.message);if(!_status.over)game.over('故障局');}
 };
 async function pauseSelection(e,error){
  const diagnostic={message:error.message,event:e.name,skill:e.skill||'',seat:e.player?.playSeat,match:launch.id};record('test-diagnostic',diagnostic);
  const response=await fetch('/studio/api/job/'+test.job+'/control',{method:'POST',headers:{'Content-Type':'application/json','X-Play-Token':launch.token},body:JSON.stringify({action:'diagnostic',...diagnostic})});
  if(!response.ok)throw Error('故障诊断保存失败，请保留本页');send('test-paused',{message:error.message+'；当前操作已保留，可查看诊断或跳过此局。'});
  while(!_status.over){await new Promise(r=>setTimeout(r,700));const state=await(await fetch('/studio/api/job/'+test.job)).json();if(state.job?.status==='running')return;}
 }
 globalThis.playAiBeforeStep=async e=>{
  if(failed||_status.over||!e.player||!Number.isInteger(e.player.playSeat)||e.finished)return;
  try{
   if(e.name==='chooseBool'&&!prepared.has(e)){prepared.add(e);const choice=await request(e,[{id:'yes',label:'同意 / 发动'},{id:'no',label:'拒绝 / 不发动'}]);e.ai=()=>choice.id==='yes';e.choice=choice.id==='yes';}
   else if((e.name==='chooseToMove'||e.name==='chooseToMove_new')&&!prepared.has(e)){prepared.add(e);await move(e);}
   else if(e.name==='chooseNumbers'&&!prepared.has(e)){prepared.add(e);await numbers(e);}
   else if(e.name==='chooseNumber'&&!prepared.has(e)){prepared.add(e);const range=e.range||[e.min??0,e.max??10];if(range[1]-range[0]>300)throw Error('数字选择范围过大');const legal=Array.from({length:range[1]-range[0]+1},(_,i)=>({id:String(range[0]+i),label:String(range[0]+i)}));const choice=await request(e,legal);e.processAI=()=>[Number(choice.id)];}
   else if(e.result==='ai'&&supported.has(e.name)){
    if(e.name==='chooseControl'){const choice=await request(e,e.controls.map((c,i)=>({id:'control:'+i,label:get.translation(c),description:e.choiceList?.[i]})));e.result={control:e.controls[Number(choice.id.split(':')[1])],bool:true};}
    else await select(e);
   }
   else if(e.result==='ai'&&/^choose/.test(e.name)&&!supported.has(e.name))throw Error('尚未接通模型操作的选择类型：'+e.name);
  }catch(error){await pauseSelection(e,error);if(!_status.over){prepared.delete(e);return globalThis.playAiBeforeStep(e);}}
 };
 return{fault:()=>failed};
}
