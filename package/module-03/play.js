'use strict';
const $=id=>document.getElementById(id),modes={identity:'身份场',guozhan:'国战',doudizhu:'斗地主',single:'单挑'},packNames=GeneralPacks.names,suits={spade:'♠ 黑桃',heart:'♥ 红桃',club:'♣ 梅花',diamond:'♦ 方块'},natures={'':'普通',fire:'火',thunder:'雷',ice:'冰',kami:'神',stab:'刺'};
let settings,revision,token,catalog,decks,activeMatch=null,activeStatus=null,page='setup',dirty=false,saving=false,saveTimer,toastTimer,more=36,bgURL=null,requestNumber=0;
const requests=new Map();
let rosterUI,preferredVersion=null,identityActionPending=false;
const playBase=location.pathname.startsWith('/play/')?'/play':'';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
async function api(path,method='GET',body){const r=await fetch(playBase+path,{method,headers:body?{'Content-Type':'application/json','X-Play-Token':token}:undefined,body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'保存失败');return data;}
function changed(){dirty=true;$('save-state').textContent='正在保存…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>save().catch(e=>toast(e.message)),500);}
async function save(){
 if(saving){await new Promise(resolve=>{const id=setInterval(()=>{if(!saving){clearInterval(id);resolve();}},40);});}
 if(!dirty)return;saving=true;dirty=false;
 try{const r=await api('/api/state','PUT',{settings:structuredClone(settings),revision});revision=r.revision;$('save-state').textContent='已保存到本机';}
 catch(e){dirty=true;$('save-state').textContent='保存失败，请刷新或导出备份';throw e;}
 finally{saving=false;}if(dirty)return save();
}
function showPage(name){
 if(name==='game'&&!activeMatch){toast('请先开始一场对局');return;}
 if(page!==name)window.scrollTo({top:0});page=name;document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!=='page-'+name);document.querySelectorAll('nav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));document.body.classList.toggle('playing',name==='game');
 if(name==='deck')renderDeck();if(name==='generals')renderGenerals();if(name==='history')renderHistory();if(name==='game'&&activeStatus)send('play-resize').catch(()=>{});
}
function paintForm(){
 settings.identityVariant??='standard';const succession=IdentityOptions.active(settings);
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===settings.mode));
 const names={identity:'标准身份场',guozhan:'国战 · 双将暗置',doudizhu:'休闲斗地主',single:'点将单挑'};
 $('mode-title').textContent=succession?'立储与内奸择途':names[settings.mode];$('double-general').disabled=settings.mode==='guozhan'||succession;
 const nums=settings.mode==='identity'?(succession?[8,9,10]:Array.from({length:9},(_,i)=>i+2)):settings.mode==='guozhan'?Array.from({length:11},(_,i)=>i+2):[settings.mode==='single'?2:3];
 $('players').innerHTML=nums.map(n=>`<option value="${n}">${n} 人</option>`).join('');$('players').value=settings.players;$('players').disabled=nums.length===1;$('mode-count').textContent=settings.players+' 人';
 for(const[id,key]of[['control','control'],['speed','speed'],['background','background'],['identity-role','identityRole'],['guozhan-deck','guozhanDeck'],['feiyang','feiyang'],['inheritance','inheritance']])$(id).value=settings[key];
 for(const[id,key]of[['double-nei','doubleNei'],['double-general','doubleGeneral'],['aozhan','aozhan'],['separatism','separatism']])$(id).checked=settings[key];
 $('identity-variant').value=settings.identityVariant;
 $('identity-rule-note').hidden=!succession;
 $('double-nei').disabled=succession&&settings.players===10;
 if(succession&&settings.players===10)$('double-nei').checked=true;
 if(succession){const counts=IdentityOptions.roles(settings.players,settings.doubleNei).reduce((r,k)=>(r[k]=(r[k]||0)+1,r),{});$('identity-distribution').textContent=`${counts.zhu}主公 · ${counts.zhong}忠臣 · ${counts.fan}反贼 · ${counts.nei}内奸${settings.players===10?'（十人固定双内奸）':''}`;}
 const known=['unlimited','0','1','2','3','5'].includes(settings.redraw);$('redraw').value=known?settings.redraw:'custom';$('redraw-number').hidden=known;$('redraw-number').value=known?'':settings.redraw;
 $('background-file').hidden=settings.background!=='custom';$('deck-count').textContent=settings.deck.length+' 张';
 document.querySelectorAll('[data-for]').forEach(p=>p.hidden=p.dataset.for!==settings.mode);
}
function bindForm(){
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{settings.mode=b.dataset.mode;settings.players={identity:8,guozhan:8,doudizhu:3,single:2}[settings.mode];settings.doubleGeneral=false;paintForm();changed();});
 for(const[id,key]of[['players','players'],['control','control'],['speed','speed'],['background','background'],['identity-role','identityRole'],['guozhan-deck','guozhanDeck'],['feiyang','feiyang'],['inheritance','inheritance']])$(id).onchange=()=>{settings[key]=id==='players'?Number($(id).value):$(id).value;if(IdentityOptions.active(settings)&&settings.players===10)settings.doubleNei=true;paintForm();changed();};
 for(const[id,key]of[['double-nei','doubleNei'],['double-general','doubleGeneral'],['aozhan','aozhan'],['separatism','separatism']])$(id).onchange=()=>{settings[key]=$(id).checked;paintForm();changed();};
 $('identity-variant').onchange=()=>{settings.identityVariant=$('identity-variant').value;if(IdentityOptions.active(settings)){settings.players=Math.max(8,Math.min(10,settings.players));settings.doubleGeneral=false;if(settings.players===10)settings.doubleNei=true;toast('立储与择途使用八至十人、单将；规则可在下方查看');}paintForm();changed();};
 $('redraw').onchange=()=>{if($('redraw').value==='custom'){$('redraw-number').hidden=false;$('redraw-number').value=4;settings.redraw='4';}else{settings.redraw=$('redraw').value;$('redraw-number').hidden=true;}changed();};
 $('redraw-number').onchange=()=>{const n=Number($('redraw-number').value);if(!Number.isInteger(n)||n<0||n>999){toast('手气次数为 0～999');return;}settings.redraw=String(n);changed();};
 $('background-file').onchange=async()=>{try{const f=$('background-file').files[0];if(!f)return;const {pickImage}=await import('/studio/image-picker.js');const result=await pickImage(f);if(!result)return;bgURL=result.image;if(activeMatch)send('play-background',{url:bgURL});toast('已选取背景内容，本次页面会话中使用');}catch(e){toast(e.message);}};
 $('setup-form').onsubmit=async e=>{e.preventDefault();try{await launch();}catch(error){toast(error.message);}};
}
async function launch(override=null){
 $('start-game').disabled=true;
 try{const config=structuredClone(override||settings);IdentityOptions.validate(config);if(IdentityOptions.active(config)){const rules=await api('/api/identity-rules');if(rules.status!=='ready')throw Error('立储与择途入口已准备，完整规则条款待确认后开放开局');}await save();if(activeMatch&&activeStatus)await send('play-stop');config.rosters??={};config.ratings??={};if(playBase){config.studioRuntime=await(await fetch('/studio/api/runtime')).json();settings.studioRuntime=config.studioRuntime;}if(override){settings.rosters[config.mode]=structuredClone(config.rosters[config.mode]||settings.rosters[config.mode]||{humanSeat:0,revealAI:false,seats:[]});}const match=await api('/api/launch','POST',{settings:config});activeMatch=match.id;activeStatus=null;$('game-label').textContent=IdentityOptions.name(config)||modes[config.mode];$('game-speed').value=config.speed;rosterUI.loading(config);$('arena').src=playBase+'/arena.html?match='+match.id;$('game-status').textContent='正在载入规则与武将…';}
 finally{$('start-game').disabled=false;}
}
function send(type,data={}){if(!activeMatch)throw Error('请先开始对局');const requestId=++requestNumber;return new Promise((resolve,reject)=>{requests.set(requestId,{resolve,reject});$('arena').contentWindow.postMessage({type,requestId,...data},location.origin);setTimeout(()=>{if(requests.has(requestId)){requests.delete(requestId);reject(Error('对局尚未响应，请稍后重试'));}},15000);});}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==$('arena').contentWindow)return;const data=event.data;if(!data?.type?.startsWith('play-'))return;
 if(data.type==='play-response'){const r=requests.get(data.requestId);if(r){requests.delete(data.requestId);data.error?r.reject(Error(data.error)):r.resolve(data.result);}}
 else if(data.type==='play-status'){activeStatus=data.status;paintStatus();if(data.selectControlled)$('take-seat').value=activeStatus.players.find(p=>p.controlled)?.seat||'0';}
 else if(data.type==='play-error'){toast('对局出现错误，牌桌中显示详情');$('game-status').textContent=data.message;}
 else if(data.type==='play-save-error'){$('save-state').textContent='对局保存失败';toast(data.message);}
 else if(data.type==='play-saved')$('save-state').textContent='对局记录已保存';
 else if(data.type==='play-notice'){toast(data.message);}
 else if(data.type==='play-ready'){if(bgURL&&settings.background==='custom')send('play-background',{url:bgURL}).catch(e=>toast(e.message));}
 else if(data.type==='play-roster')rosterUI.receive(data);
 else if(data.type==='play-roster-roles')rosterUI.roles(data);
 else if(data.type==='play-roster-applied')showPage('game');
 else if(data.type==='play-loop-draw')toast(data.reason+'，本局按和局结束');
 else if(data.type==='play-restart')launch().catch(e=>toast(e.message));
});
function paintStatus(){
 if(activeStatus.drawStats)rosterUI.renderStats(activeStatus.drawStats,activeStatus.hpStats,activeStatus.flowStats);
 const s=activeStatus;paintIdentityActions(s);$('toggle-pause').textContent=s.paused?'继续':'暂停';$('toggle-auto').textContent=s.auto?'转为玩家操作':'交回 AI';$('toggle-auto').disabled=s.replay||s.over;$('take-seat-button').disabled=s.replay||s.over;$('step-turn').disabled=s.replay||s.over||!s.paused;
 const selection=$('take-seat').value;$('take-seat').innerHTML=s.players.filter(p=>p.alive&&p.readyGeneral).map(p=>`<option value="${escapeHTML(p.seat)}">${Number(p.seat)+1} 号 · ${escapeHTML(p.name)}</option>`).join('');if([...$('take-seat').options].some(o=>o.value===selection))$('take-seat').value=selection;
 $('game-status').textContent=s.replay?`历史回放 · ${s.over?'播放完成':s.paused?'已暂停':'播放中'} · 使用保存的对局记录`:`${s.over?s.outcome||'对局已结束':s.paused?'已暂停':s.selecting?'等待操作':'正在进行'} · 第 ${s.round} 轮 / ${s.phase} 回合 · 牌堆 ${s.pile} 张 · ${s.auto?'全 AI 托管':'玩家控制'}${s.redraws?' · 手气重抽 '+s.redraws+' 次':''}${s.modified?' · 含接管 / 写入 / 扩展操作':''}`;
}
function paintIdentityActions(s){
 const r=s.identityRules;$('identity-actions').hidden=!r?.active||s.replay;
 if(!r?.active)return;
 const heir=s.players.find(p=>p.seat===r.heirSeat);
 $('identity-action-state').textContent=`${r.inherited?'储君已继位':r.disqualified?'储君资格已失效（不可改立）':r.appointed?'储君：'+(heir?.name||'已离场'):'尚未立储'} · ${s.auto?'接管对应座位后可操作':r.canChoose?'当前可择途':'择途须从第二轮开始且存活主忠不足半数'} · 击杀奖惩沿用标准身份场`;
 const selected=$('heir-target').value;$('heir-target').innerHTML=(r.targets||[]).map(p=>`<option value="${escapeHTML(p.seat)}">${Number(p.seat)+1}号 · ${escapeHTML(p.name)}</option>`).join('');
 if((r.targets||[]).some(p=>p.seat===selected))$('heir-target').value=selected;
 $('heir-target').hidden=$('appoint-heir').hidden=!r.canAppoint;
 $('appoint-heir').disabled=s.auto||s.over||identityActionPending;
 $('route-loyal').hidden=$('route-wild').hidden=!r.canChoose;
 $('route-loyal').disabled=$('route-wild').disabled=s.auto||s.over||identityActionPending;
 $('wild-mark-state').hidden=$('wild-draw').hidden=$('wild-recover').hidden=!r.isWild;
 $('wild-mark-state').textContent=`野心家标记：${r.wildMark||0}枚 · 仅自己的回合内可用（包括濒死），可跨回合保留，不补充`;
 $('wild-draw').disabled=s.auto||s.over||identityActionPending||!r.canUseWild;
 $('wild-recover').disabled=s.auto||s.over||identityActionPending||!r.canRecoverWild;
}
for(const[id,data]of [['appoint-heir',{action:'appoint'}],['route-loyal',{action:'choose',route:'loyal'}],['route-wild',{action:'choose',route:'wild'}],['wild-draw',{action:'wild-benefit',effect:'draw'}],['wild-recover',{action:'wild-benefit',effect:'recover'}]]){
 $(id).onclick=async()=>{if(identityActionPending)return;identityActionPending=true;paintIdentityActions(activeStatus);try{const result=await send('play-identity-action',{...data,target:$('heir-target').value});toast(result);}catch(e){toast(e.message);}finally{identityActionPending=false;if(activeStatus)paintIdentityActions(activeStatus);}};
}
function deckOptions(cardId){return Object.values(decks.definitions).sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')).map(c=>`<option value="${escapeHTML(c.id)}"${c.id===cardId?' selected':''}>${escapeHTML(c.name)} · ${escapeHTML(c.id)}</option>`).join('')+(decks.definitions[cardId]?'':`<option value="${escapeHTML(cardId)}" selected>${escapeHTML(cardId)}（自定义）</option>`);}
function renderDeck(){
 const q=$('deck-search').value.trim().toLowerCase();$('deck-editor-count').textContent=settings.deck.length+' 张';$('deck-json').value=JSON.stringify(settings.deck,null,2);$('deck-count').textContent=settings.deck.length+' 张';
 $('deck-rows').innerHTML=settings.deck.map((c,i)=>({c,i})).filter(({c})=>!q||(c[2]+' '+(decks.definitions[c[2]]?.name||'')).toLowerCase().includes(q)).map(({c,i})=>`<tr data-index="${i}"><td>${i+1}</td><td><select data-col="0">${Object.entries(suits).map(([k,v])=>`<option value="${k}"${c[0]===k?' selected':''}>${v}</option>`).join('')}</select></td><td><input type="number" min="1" max="13" value="${c[1]}" data-col="1"></td><td><select data-col="2">${deckOptions(c[2])}</select></td><td><select data-col="3">${Object.entries(natures).map(([k,v])=>`<option value="${k}"${(c[3]||'')===k?' selected':''}>${v}</option>`).join('')}</select></td><td><button data-copy="${i}">复制</button> <button data-remove="${i}">删除</button></td></tr>`).join('');
}
function validateDeck(d){if(!Array.isArray(d)||d.length<20||d.length>10000)throw Error('牌堆须为 20～10000 张');for(const c of d){if(!Array.isArray(c)||c.length<3||c.length>4||!suits[c[0]]||!Number.isInteger(c[1])||c[1]<1||c[1]>13||typeof c[2]!=='string'||!c[2]||c.length===4&&!natures[c[3]])throw Error('卡牌格式错误');}return d;}
function bindDeck(){
 $('deck-rows').onchange=e=>{const row=e.target.closest('[data-index]');if(!row||!e.target.dataset.col)return;const i=Number(row.dataset.index),col=Number(e.target.dataset.col),v=col===1?Number(e.target.value):e.target.value;if(col===1&&(!Number.isInteger(v)||v<1||v>13)){toast('点数为 1～13');renderDeck();return;}if(col===3&&!v)settings.deck[i].splice(3);else settings.deck[i][col]=v;changed();$('deck-json').value=JSON.stringify(settings.deck,null,2);};
 $('deck-rows').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.copy!==undefined)settings.deck.splice(Number(b.dataset.copy)+1,0,structuredClone(settings.deck[Number(b.dataset.copy)]));else if(b.dataset.remove!==undefined){if(settings.deck.length<=20){toast('至少保留 20 张');return;}settings.deck.splice(Number(b.dataset.remove),1);}renderDeck();changed();};
 $('deck-search').oninput=renderDeck;
 $('reset-deck').onclick=()=>{settings.deck=structuredClone([...decks.packs.standard,...decks.packs.extra]);renderDeck();changed();toast('已恢复标准＋军争，共 '+settings.deck.length+' 张');};
 $('add-pack').onclick=()=>{settings.deck.push(...structuredClone(decks.packs[$('deck-pack').value]));renderDeck();changed();};
 $('add-card').onclick=()=>{settings.deck.push(['spade',1,'sha']);renderDeck();changed();};
 $('apply-deck-json').onclick=()=>{try{settings.deck=validateDeck(JSON.parse($('deck-json').value));renderDeck();changed();toast('牌堆已应用');}catch(e){toast(e.message);}};
 $('export-deck').onclick=()=>download({format:'sanguosha-deck-v1',deck:settings.deck},'自定义牌堆.json');
 $('import-deck').onchange=async()=>{try{const d=JSON.parse(await $('import-deck').files[0].text());settings.deck=validateDeck(d.deck||d);renderDeck();changed();toast('牌堆已导入');}catch(e){toast(e.message);}finally{$('import-deck').value='';}};
}
function loadedVersion(v){return v.scope?.startsWith('character/')&&catalog.enginePacks.includes(v.scope.split('/')[1])||v.scope?.startsWith('mode/guozhan');}
function imageURL(path){if(path?.startsWith('data:')||path?.startsWith('/')||path?.startsWith('blob:'))return path;return path?playBase+'/resource/'+path.split('/').map(encodeURIComponent).join('/'):'';}
function renderGenerals(){
 const q=$('general-search').value.trim().toLowerCase(),scope=$('general-scope').value;
 const list=catalog.versions.filter(v=>(!scope||scope==='core'&&loadedVersion(v)||scope==='extension'&&!loadedVersion(v))&&(!q||CharacterSearch.matches(q,[v.name],[v.id,...v.skillDetails.map(x=>x.name+' '+x.id+' '+x.description)].join(' '))));
 $('general-count').textContent=list.length+' 个版本';$('more-generals').hidden=more>=list.length;
 $('general-list').innerHTML=list.slice(0,more).map(v=>`<button class="general-card" data-version="${escapeHTML(v.versionId||v.id+'|'+v.source)}">${v.portraitPath?`<img src="${escapeHTML(imageURL(v.portraitPath))}" alt="" loading="lazy">`:''}<span><strong>${escapeHTML(v.name)}</strong><small>${escapeHTML(v.id)}</small><small>${escapeHTML(packNames[v.scope?.split('/')[1]]||v.scope)} · ${escapeHTML(v.hp)} 体力</small><span class="tag ${loadedVersion(v)?'':'pending'}">${loadedVersion(v)?'原规则已接通':'资料已导入 · 待接通扩展'}</span></span></button>`).join('');
}
function showGeneral(ident){const v=catalog.versions.find(v=>(v.versionId||v.id+'|'+v.source)===ident);if(!v)return;$('general-detail').innerHTML=`<div class="general-detail-head">${v.portraitPath?`<img src="${escapeHTML(imageURL(v.portraitPath))}" alt="">`:''}<div><h1>${escapeHTML(v.name)}</h1><code>${escapeHTML(v.id)}</code><p>${escapeHTML(v.hp)} 体力 · ${escapeHTML(v.group)} · ${escapeHTML(v.scope)}</p></div></div><p>${loadedVersion(v)?'本体或国战规则已接通，具体将池仍受模式及启用包设置影响。':'这是已导入的扩展资料，其可执行扩展尚待接通，当前不会将此版本当作无技能武将用于对局。'}</p>${v.skillDetails.map(x=>`<h3>${escapeHTML(x.name||x.id)} <small>${escapeHTML(x.id)}</small></h3><p>${escapeHTML(x.description||'暂无说明')}</p>`).join('')}<div class="buttons"><button id="modify-general-rating">修改强度评价</button><button id="prefer-general">将此版本带入选将</button><a class="button" href="/personal/index.html?favorite=${encodeURIComponent(v.versionId)}" target="_blank" rel="noopener">收藏此版本</a><a href="/wiki/index.html?playVersion=${encodeURIComponent(v.versionId)}" target="_blank" rel="noopener">查看人物资料 ↗</a></div><p class="hint">包内来源：${escapeHTML(v.source)}</p>`;$('general-dialog').showModal();$('prefer-general').disabled=!loadedVersion(v);$('prefer-general').onclick=()=>{preferredVersion=v.versionId;$('general-dialog').close();showPage('setup');toast('下次选将将优先选此版本，具体仍须符合当前模式及启用将池。');};$('modify-general-rating').onclick=()=>{$('general-dialog').close();rosterUI.editRating(v);};}
function bindGenerals(){
 $('pack-switches').onclick=e=>{const b=e.target.closest('[data-preview-pack]');if(b)GeneralPacks.preview({rows:catalog.versions,pack:b.dataset.previewPack,imageURL:v=>v.portraitPath?imageURL(v.portraitPath):'',onDetails:v=>showGeneral(v.versionId)}).catch(e=>toast(e.message));};
 $('pack-switches').innerHTML=catalog.enginePacks.map(p=>`<div class="pack-switch-row"><label class="check"><input type="checkbox" value="${p}"${settings.packs.includes(p)?' checked':''}>${escapeHTML(packNames[p]||p)}</label><button type="button" data-preview-pack="${escapeHTML(p)}">预览</button></div>`).join('');
 $('pack-switches').onchange=()=>{const values=[...$('pack-switches').querySelectorAll(':checked')].map(c=>c.value);if(!values.length){toast('至少启用一个将包');bindGenerals();return;}settings.packs=values;changed();};
 $('general-search').oninput=()=>{more=36;renderGenerals();};$('general-scope').onchange=()=>{more=36;renderGenerals();};$('more-generals').onclick=()=>{more+=36;renderGenerals();};$('general-list').onclick=e=>{const b=e.target.closest('[data-version]');if(b)showGeneral(b.dataset.version);};$('general-dialog').querySelector('button').onclick=()=>$('general-dialog').close();
}
const example=`// 返回一个本地扩展对象；此技能沿用包内真实的触发接口。
return {
  character: { local_shishi: ["male", "shu", 4, ["local_shishi_draw"]] },
  skill: {
    local_shishi_draw: {
      trigger: { player: "phaseDrawBegin2" }, forced: true,
      filter(event) { return !event.numFixed; },
      content(event, trigger) { trigger.num++; }
    }
  },
  translate: {
    local_shishi: "试弈者",
    local_shishi_draw: "习战",
    local_shishi_draw_info: "锁定技，你的摸牌阶段额外摸一张牌。"
  }
};`;
function bindExtension(){
 $('extension-code').value=settings.customCode;$('extension-code').oninput=()=>{settings.customCode=$('extension-code').value;changed();};
 $('extension-example').onclick=()=>{$('extension-code').value=settings.customCode=example;changed();};
 $('clear-extension').onclick=()=>{$('extension-code').value=settings.customCode='';changed();$('extension-result').textContent='扩展已清空，下次开局生效';};
 $('check-extension').onclick=()=>{try{Function('lib','game','ui','get','ai','_status',$('extension-code').value);$('extension-result').textContent='语法检查通过；技能效果需在对局中验证。';}catch(e){$('extension-result').textContent=e.message;}};
 $('export-settings').onclick=()=>download({format:'sanguosha-play-settings-v1',settings},'基础实战设置.json');
 $('import-settings').onchange=async()=>{try{const v=JSON.parse(await $('import-settings').files[0].text());if(v.format!=='sanguosha-play-settings-v1')throw Error('设置格式不支持');const r=await api('/api/state','PUT',{settings:v.settings,revision});settings=r.settings;revision=r.revision;dirty=false;paintForm();bindGenerals();$('extension-code').value=settings.customCode;toast('设置已导入并保存');}catch(e){toast(e.message);}finally{$('import-settings').value='';}};
}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
async function renderHistory(){try{const data=await api('/api/matches');$('history-list').innerHTML=data.matches.length?data.matches.map(m=>`<div class="panel history-item"><div><strong>${escapeHTML(IdentityOptions.name(m.settings)||modes[m.settings.mode])} · ${m.settings.players} 人</strong><small>${escapeHTML(new Date(m.at).toLocaleString())} · ${escapeHTML(m.status)}${m.modified?' · 含接管 / 写入 / 扩展操作':''}</small><small>牌堆 ${m.settings.deck.length} 张 · 手气 ${m.settings.redraw==='unlimited'?'无限':m.settings.redraw+' 次'}</small></div><div class="buttons"><button data-replay="${m.id}">回放</button><button data-export-match="${m.id}">导出</button><button data-again="${m.id}">按原设置再战</button></div></div>`).join(''):'<div class="panel">暂无对局。开始一场实战，操作记录会自动保存在本机。</div>';}catch(e){toast(e.message);}}
function bindGame(){
 const action=(id,fn)=>$(id).onclick=()=>Promise.resolve().then(fn).catch(e=>toast(e.message));
 action('toggle-auto',()=>send('play-auto',{value:!activeStatus?.auto}));action('toggle-pause',()=>send('play-pause'));action('step-turn',()=>send('play-step'));action('take-seat-button',()=>send('play-take',{seat:$('take-seat').value}));action('save-match',async()=>{await send('play-save');toast('对局记录已保存');});action('restart-game',()=>launch());
 $('game-speed').onchange=()=>send('play-speed',{value:$('game-speed').value}).catch(e=>toast(e.message));$('back-setup').onclick=()=>{if(activeMatch)send('play-save').catch(()=>{});showPage('setup');};$('return-game').onclick=()=>showPage('game');
 $('history-list').onclick=async e=>{const b=e.target.closest('button');if(!b)return;try{const id=b.dataset.replay||b.dataset.exportMatch||b.dataset.again,m=await api('/api/match/'+id);if(b.dataset.exportMatch)download({format:'sanguosha-play-match-v1',...m},'实战记录-'+id+'.json');else if(b.dataset.again)await launch(m.settings);else{if(!m.checkpoint?.video?.length)throw Error('该对局尚未生成回放，先完成选将与开局');if(activeMatch&&activeStatus)await send('play-stop');activeMatch=id;activeStatus=null;$('game-speed').value=m.settings.speed;$('arena').src=playBase+'/arena.html?match='+id+'&replay=1';$('game-label').textContent=(IdentityOptions.name(m.settings)||modes[m.settings.mode])+' · 回放';showPage('game');}}catch(e){toast(e.message);}};
 $('refresh-history').onclick=renderHistory;
 $('console-form').onsubmit=async e=>{e.preventDefault();const command=$('console-input').value.trim();if(!command)return;const output=$('console-output');output.textContent+='\n> '+command;try{const r=await send('play-command',{command});output.textContent+='\n'+(typeof r==='string'?r:JSON.stringify(r,null,2));}catch(e){output.textContent+='\n错误：'+e.message;}output.scrollTop=output.scrollHeight;$('console-input').value='';};
}
async function init(){try{const [state,data,deck,roster]=await Promise.all([api('/api/state'),api('/play-catalog.json'),api('/deck-catalog.json'),import('./roster-ui.js')]);settings=state.settings;revision=state.revision;token=state.token;catalog=data;decks=deck;rosterUI=roster.makeRosterUI({getSettings:()=>settings,getMatch:()=>activeMatch,changed,toast,showPage,send,api,save,imageURL,escapeHTML,packNames,getPreferredVersion:()=>{const v=preferredVersion;preferredVersion=null;return v;}});paintForm();bindForm();bindDeck();bindGenerals();bindExtension();bindGame();document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));$('save-state').textContent='设置已从本机读取';const wikiVersion=new URL(location.href).searchParams.get('wikiVersion');if(wikiVersion&&playBase){const link=await(await fetch('/api/version-link?wiki='+encodeURIComponent(wikiVersion))).json();if(link.playVersion){showPage('generals');showGeneral(link.playVersion);}else toast('该资料版本未接通实战规则，请在本地扩展中补充。');}}catch(e){toast(e.message);$('save-state').textContent='读取失败，请通过启动入口打开';}}
init();
