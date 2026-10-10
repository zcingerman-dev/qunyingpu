export function guozhanSkills({lib,game,ui,get,ai,_status}) {
 const same=(a,b)=>a===b||a.isFriendOf(b);
 const soldier=n=>typeof n==='string'&&n.startsWith('gz_shibing');
 const yes=async(p,text)=>(await p.chooseControl('发动','取消').set('prompt',text).set('ai',()=>0).forResult()).index===0;
 const junwei=(card,suit,number)=>({enable:'phaseUse',filter:()=>!game.hasPlayer(q=>q.hasCard(c=>c.name===card,'e')),filterCard:true,position:'he',async content(e,t,p){const c=game.createCard(card,suit,number);await p.chooseUseTarget(c,true);},ai:{order:8,result:{player:1}},group:'bw_junwei_death'});
 const equip={enable:true,selectTarget:-1,filterTarget:(card,p,t)=>p===t,content:lib.element.content.equipCard,toSelf:true};
 const cards={
  bw_chushibiao:{type:'equip',subtype:'equip5',destroy:true,skills:['bw_chushibiao_skill'],ai:{basic:{equipValue:7}}},
  bw_panlong:{type:'equip',subtype:'equip1',destroy:true,distance:{attackFrom:-1},skills:['bw_panlong_skill'],ai:{basic:{equipValue:6}}},
  bw_zhenchao:{type:'equip',subtype:'equip5',destroy:true,skills:['bw_zhenchao_skill'],ai:{basic:{equipValue:5}}},
  bw_bawang:{type:'equip',subtype:'equip1',destroy:true,distance:{attackFrom:-1},skills:['bw_bawang_skill'],ai:{basic:{equipValue:7}}},
 };
 for(const c of Object.values(cards))Object.assign(c,equip);
 const skills={
  bw_huihong:{forced:true,marktext:'弘',intro:{content:'mark'},trigger:{global:'showCharacterAfter'},filter:(e,p)=>e.toShow?.some(n=>get.character(n).group==='shu'),async content(e,t,p){const own=t.player===p&&t.toShow.some(n=>get.character(n).skills.includes('bw_huihong'));const n=own?game.filterPlayer().reduce((sum,q)=>sum+[q.name1,q.name2].filter(n=>get.character(n).group==='shu').length,0):t.toShow.filter(n=>get.character(n).group==='shu').length;p.addMark('bw_huihong',n);}},
  bw_xingshi:{trigger:{player:'phaseZhunbeiBegin'},filter:(e,p)=>p.countMark('bw_huihong')>0&&game.hasPlayer(q=>q!==p&&get.distance(p,q)===1),async cost(e,t,p){e.result=await p.chooseTarget('兴师：移除一弘，令距离1角色执行军令',(c,p,q)=>q!==p&&get.distance(p,q)===1).set('ai',q=>-get.attitude(p,q)).forResult();},async content(e,t,p){p.removeMark('bw_huihong',1);const q=e.targets[0];const r=await p.chooseJunlingFor(q).forResult();await q.carryOutJunling(p,r.junling,r.targets||[]);}},
  bw_liushan_junwei:junwei('bw_chushibiao','heart',2),
  bw_sunce_junwei:junwei('bw_panlong','club',6),
  bw_caopi_junwei:junwei('bw_zhenchao','diamond',13),
  bw_dongzhuo_junwei:junwei('bw_bawang','heart',2),
  bw_junwei_death:{forceDie:true,forced:true,popup:false,trigger:{player:'dieAfter'},async content(e,t,p){for(const q of game.filterPlayer(q=>q!==p&&same(p,q)))await q.loseHp();}},
  bw_saokou:{usable:1,trigger:{player:'useCardToPlayer'},filter:(e,p)=>e.isFirstTarget&&(e.card.name==='sha'||get.type(e.card)==='trick'&&get.tag(e.card,'damage'))&&game.hasPlayer(q=>q!==p&&!e.targets.includes(q)&&q.identity===e.target.identity&&lib.filter.targetEnabled2(e.card,p,q)),async content(e,t,p){const targets=game.filterPlayer(q=>q!==p&&!t.targets.includes(q)&&q.identity===t.target.identity&&lib.filter.targetEnabled2(t.card,p,q));t.getParent().targets.addArray(targets);}},
  bw_bawei:{forced:true,popup:false,trigger:{source:'damageSource'},async content(e,t,p){p.addTempSkill('bw_bawei_targets','roundStart');p.markAuto('bw_bawei_targets',[t.player]);},group:'bw_bawei_direct',subSkill:{targets:{charlotte:true,onremove:true},direct:{forced:true,popup:false,trigger:{global:'useCard'},filter:(e,p)=>same(p,e.player)&&p.getStorage('bw_bawei_targets').length,async content(e,t,p){t.directHit.addArray(p.getStorage('bw_bawei_targets').filter(q=>q.isIn()));}}}},
  bw_powei:{trigger:{global:['turnOverBefore','linkBefore']},filter:e=>e.player.isUnseen?.(0)===false||e.player.isUnseen?.(1)===false,async cost(e,t,p){const choices=[0,1].filter(n=>!t.player.isUnseen(n)).map(n=>n===0?'暗置主将':'暗置副将');choices.push('取消');const r=await p.chooseControl(choices).set('prompt','迫威：暗置一张武将牌以替代叠置／横置／重置').set('ai',()=>choices.length-1).forResult();e.result={bool:r.control!=='取消',cost_data:r.control==='暗置主将'?0:1};},async content(e,t,p){t.cancel();const q=t.player,n=e.cost_data,name=q[n?'name2':'name1'];await q.hideCharacter(n);q.addTempSkill('bw_powei_hidden');q.markAuto('bw_powei_hidden',[name]);await p.draw();},subSkill:{hidden:{charlotte:true,onremove:true,forced:true,popup:false,firstDo:true,trigger:{player:'showCharacterBefore'},filter:(e,p)=>e.toShow?.some(n=>p.getStorage('bw_powei_hidden').includes(n)),async content(e,t){t.cancel();}}}},
  bw_pinzheng:{enable:'phaseUse',filter:(e,p)=>(p.storage.bw_pinzheng_count||0)<p.getDamagedHp()&&game.countPlayer()>=3,selectTarget:3,multitarget:true,filterTarget(c,p,q){return ui.selected.targets.length<2||ui.selected.targets.some(q=>same(p,q))||same(p,q);},async content(e,t,p){p.storage.bw_pinzheng_count=(p.storage.bw_pinzheng_count||0)+1;const options=['明置武将牌','横置武将牌','叠置武将牌'];for(const q of e.targets){const r=await q.chooseControl(options).set('prompt','品正：选择未被选择过的效果').set('ai',()=>0).forResult();options.splice(options.indexOf(r.control),1);if(r.control==='明置武将牌'){const names=[0,1].filter(n=>q.isUnseen(n));if(names.length){const c=await q.chooseControl(names.map(n=>n?'明置副将':'明置主将')).set('ai',()=>0).forResult();await q.showCharacter(c.control==='明置副将'?1:0);}}else if(r.control==='横置武将牌')await q.link(true);else await q.turnOver(true);}},ai:{order:5,result:{target:1}}},
  bw_baowei:{forced:true,trigger:{player:'useCardToPlayer'},filter:e=>e.card.name==='sha',async content(e,t,p){const q=t.target,first=q.isUnseen(0),second=q.isUnseen(1)||soldier(q.name2);if(first)t.getParent().directHit.add(q);if(second){const use=t.getParent();use.customArgs[q.playerid]||={};use.customArgs[q.playerid].extraDamage=(use.customArgs[q.playerid].extraDamage||0)+1;}if(first&&second)for(const r of game.filterPlayer(r=>same(p,r)&&soldier(r.name2)))await r.draw();}},
  bw_siling:{enable:'phaseUse',usable:1,filterTarget:(c,p,q)=>same(p,q)&&!soldier(q.name2),
  canActivate(q,s,e){const info=lib.skill[s];if(![info?.enable].flat().includes('phaseUse'))return false;try{if(info.filter&&!info.filter(e,q))return false;}catch{return false;}return true;},
  async content(e,t,p){
   const q=e.targets[0];
   const pool=[...new Set(Object.values(lib.characterPack.mode_guozhan||{}).flatMap(c=>c.skills))].filter(s=>lib.skill[s]?.limited&&!q.awakenedSkills.includes(s));
   if(!pool.length)return;const skill=pool.randomGet();
   if(!lib.skill.bw_siling.canActivate(q,skill,e)){game.log(q,'肆凌抽到',get.translation(skill),'，当前不满足发动条件，保留副将');return;}
   if(!await yes(q,'肆凌：是否发动抽到的【'+get.translation(skill)+'】？'))return;
   q.addTempSkill(skill);const use=q.chooseToUse();use.backup(skill);use.openskilldialog='肆凌：发动'+get.translation(skill);
   const r=await use.forResult();if(r.bool&&q.isIn())await q.removeCharacter(1);
  },mod:{cardUsable(c,p,n){if(c.name==='sha')return n+game.filterPlayer().reduce((sum,q)=>sum+[q.name1,q.name2].filter(soldier).length,0);}},ai:{order:5,result:{target:1}}},
  bw_chushibiao_skill:{equipSkill:true,forced:true,trigger:{player:'phaseZhunbeiBegin'},async content(e,t,p){const c=get.cardPile2(c=>get.type(c,false)==='trick');if(c)await p.gain(c,'draw');}},
  bw_panlong_skill:{equipSkill:true,forced:true,trigger:{player:'useCardAfter'},filter(e){if(e.card.name!=='sha'||!e.targets?.length)return false;const last=e.targets[e.targets.length-1];return last.hasHistory('respond',r=>r.respondTo?.[1]===e.card)||last.hasHistory('useCard',r=>r.respondTo?.[1]===e.card);},async content(e,t,p){if(t.targets[0].isIn())await t.targets[0].damage(p);}},
  bw_zhenchao_skill:{equipSkill:true,forced:true,trigger:{target:'useCardToTargeted'},filter:(e,p)=>e.card.name==='sha'&&e.player.isTurnedOver()!==p.isTurnedOver(),async content(e,t,p){await t.player.chooseToDiscard('镇朝睚眦：武将牌状态不同，弃置一张牌','he',true);}},
  bw_bawang_skill:{equipSkill:true,forced:true,trigger:{source:'damageSource'},filter:(e,p)=>e.player!==p&&e.player.hasEnabledSlot(),async content(e,t,p){const q=t.player;const slots=[1,2,3,4,5].filter(n=>q.hasEnabledSlot(n));const r=await p.chooseControl(slots.map(n=>'equip'+n)).set('prompt','霸王凶刀：临时废除一个装备栏').set('ai',()=>0).forResult();const slot=Number(r.control.slice(5));await q.disableEquip(slot);q.addSkill('bw_bawang_skill_restore');q.markAuto('bw_bawang_skill_restore',[slot]);},subSkill:{restore:{charlotte:true,forced:true,firstDo:true,trigger:{player:'phaseBegin'},async content(e,t,p){const slots=p.getStorage('bw_bawang_skill_restore').slice();p.removeSkill('bw_bawang_skill_restore');for(const s of slots)await p.enableEquip(s);},onremove:true}}},
 };
 return {skills,cards};
}
