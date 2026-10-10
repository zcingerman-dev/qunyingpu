import {inLowerThird} from './portrait-input.js';
// Match-local artwork and voice choices. Never write collections, rules or video.
export function visibleGeneral(p, slot, mode) {
 const id=slot?p.name2:p.name1||p.name;
 return !!id&&id!=='unknown'&&!(mode==='guozhan'&&p.isUnseen?.(slot));
}
export function voiceGroup(skill, details, chosen, groups) {
 if(chosen&&Object.hasOwn(chosen,skill))return groups.find(g=>g.id===chosen[skill])||null;
 const name=details.find(s=>s.id===skill)?.name;
 return name?groups.find(g=>g.name===name)||null:null;
}
export function generalVersion(lib,get,settings,catalog,p,slot){
 const id=slot?p.name2:p.name1||p.name,personal=lib.studioVersions?.[id];
 const pack=Object.keys(lib.characterPack||{}).find(k=>lib.characterPack[k]?.[id]&&settings.packs.includes(k));
 const found=personal?{...personal,key:personal.id}:catalog.versions.find(v=>v.id===id&&(settings.mode==='guozhan'?v.scope?.startsWith('mode/guozhan'):v.scope==='character/'+pack))||catalog.versions.find(v=>v.id===id)||(settings.mode==='guozhan'?catalog.versions.find(v=>v.id===id.replace(/^gz_/,'')):null)||{};
 const skills=lib.character?.[id]?.skills;
 return{...found,id,name:get.translation(id),skillDetails:skills?skills.map(id=>({id,name:get.translation(id),description:get.translation(id+'_info')})):found.skillDetails||[]};
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const resource=p=>p?.startsWith('/')||p?.startsWith('data:')?p:'/play/resource/'+String(p||'').split('/').map(encodeURIComponent).join('/');

export async function installAppearance(env,launch,{isPaused}) {
 const {lib,game,ui,get,_status}=env,mode=launch.settings.mode;
 const host=window.frameElement?parent:window,doc=host.document,frame=window.frameElement;
 const [catalog,assets]=await Promise.all(['./play-catalog.json','./asset-map.json'].map(async u=>(await fetch(u)).json()));
 const choices=new WeakMap(),baseImages=new WeakMap();let open=false,gate=null,release=null,header=null,previewAudio=null,resumeRequested=false;
 const nativeResume=game.resume2.bind(game);
 game.resume2=function(){if(open){resumeRequested=true;return;}return nativeResume();};
 if(!doc.querySelector('link[data-appearance-style]')){const link=doc.createElement('link');link.rel='stylesheet';link.href='/play/appearance.css';link.dataset.appearanceStyle='';doc.head.append(link);}
 const localStyle=document.createElement('link');localStyle.rel='stylesheet';localStyle.href='/play/appearance.css';document.head.append(localStyle);
 let skinReady;
 async function skinLibrary(){
  if(host.SkinLibrary)return host.SkinLibrary;
  skinReady??=new Promise((resolve,reject)=>{const script=doc.createElement('script');script.src='/app/skin-library.js';script.onload=()=>resolve(host.SkinLibrary);script.onerror=()=>reject(Error('皮肤库加载失败，请使用统一入口'));doc.head.append(script);});
  return skinReady;
 }
 function version(p,slot){return generalVersion(lib,get,launch.settings,catalog,p,slot);}
 function rows(){return [...game.players,...(game.dead||[])].flatMap(p=>[0,1].filter(slot=>visibleGeneral(p,slot,mode)).map(slot=>({p,slot,v:version(p,slot)})));}
 function state(p,slot){let pair=choices.get(p);if(!pair){pair=[{},{}];choices.set(p,pair);}return pair[slot];}
 function imageNode(p,slot){return slot?p.node.avatar2:p.node.avatar;}
 // A native conversion may redraw the avatar; an explicitly chosen skin stays
 // on top without changing skin.name or the conversion skill's state.
 const nativeChangeSkin=lib.element.Player.prototype.changeSkin;
 lib.element.Player.prototype.changeSkin=function(...args){const result=nativeChangeSkin.apply(this,args);for(const slot of [0,1]){const chosen=choices.get(this)?.[slot]?.image;if(chosen)imageNode(this,slot).style.backgroundImage=`url("${chosen.replaceAll('"','%22')}")`;}return result;};
 function baseline(p,slot,v){const skin=p.skin?.[slot?'name2':'name'],shape=skin&&skin!==v.id?assets[`image/character/${skin}.jpg`]:null;const portrait=shape||(lib.studioVersions?.[v.id]?launch.settings.studioRuntime?.portraits?.[v.portrait]:v.portraitPath);
  if(portrait)return resource(portrait);
  const node=imageNode(p,slot);if(!baseImages.has(node))baseImages.set(node,node.style.backgroundImage);const url=baseImages.get(node)?.match(/url\(["']?(.*?)["']?\)/)?.[1];return url?new URL(url,location.href).href:'';
 }
 async function held(task){
  if(open)return;
  const wasPaused=!!_status.paused2;resumeRequested=false;open=true;gate=new Promise(r=>release=r);game.pause2();paintHeader();
  try{return await task();}catch(e){message(e.message);}finally{
   previewAudio?.pause();previewAudio=null;open=false;release?.();gate=null;release=null;
   if((!wasPaused||resumeRequested)&&!isPaused()&&!document.querySelector('.appearance-card')&&!_status.over)game.resume2();paintHeader();
  }
 }
 launch.waitForAppearance=async()=>{while(gate)await gate;};
 const nativeWait=_status.pauseManager.waitPause.bind(_status.pauseManager);
 _status.pauseManager.waitPause=async()=>{await launch.waitForAppearance();await nativeWait();await launch.waitForAppearance();};
 function message(text){const d=doc.createElement('dialog');d.className='appearance-dialog';d.innerHTML=`<p>${esc(text)}</p><button>关闭</button>`;d.querySelector('button').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());doc.body.append(d);d.showModal();}
 function modal(title,body){const d=doc.createElement('dialog');d.className='appearance-dialog';d.innerHTML=`<div class="appearance-tools"><h2>${esc(title)}</h2><button data-close>关闭</button></div>${body}`;doc.body.append(d);d.showModal();d.querySelector('[data-close]').onclick=()=>d.close();return d;}
 function closed(d){return new Promise(resolve=>d.addEventListener('close',()=>{d.remove();resolve();},{once:true}));}
 async function extras(library,v){
  const shared=await library.forVersion(v.versionId||v.key||v.id,get.translation(v.id)),ids=new Set(shared.characterIds||[v.id]);
  const original=[...new Set(Object.entries(assets).filter(([k])=>[...ids].some(id=>k.startsWith('image/skin/'+id+'/')||k.startsWith('image/character/'+id+'.'))).map(([,p])=>p))].map(path=>({key:resource(path),image:resource(path),name:path.split('/').at(-1),folder:'原包素材'}));
  const response=await fetch('/studio/api/state');if(!response.ok)throw Error('自选皮肤读取失败，请关闭窗口后重试');const personal=await response.json();
  return [...original,...(personal.assets||[]).map(a=>({key:a.image,image:a.image,name:a.name,folder:'我的素材',custom:true}))];
 }
 async function pickSkin(p,slot,alreadyHeld=false){if(!visibleGeneral(p,slot,mode))return;const task=async()=>{
  const v=version(p,slot),library=await skinLibrary(),start=baseline(p,slot,v);
  const selected=await library.gallery({key:v.versionId||v.key||v.id,name:get.translation(v.id),title:`${get.translation(v.id)} · 本局皮肤`,defaultImage:start,extras:await extras(library,v)});
  if(selected===null||!visibleGeneral(p,slot,mode))return;
  const url=selected||start;if(url){const background=`url("${url.replaceAll('"','%22')}")`;imageNode(p,slot).style.backgroundImage=background;state(p,slot).image=selected?url:undefined;for(const card of document.querySelectorAll('.appearance-card'))if(card.dataset.appearanceSeat===p.dataset.position&&card.dataset.appearanceSlot===String(slot))card.querySelector('.ava>.avatar').style.backgroundImage=background;}
 };return alreadyHeld?task():held(task);}
 async function showSkills(p,slot,alreadyHeld=false){if(!visibleGeneral(p,slot,mode))return;const task=async()=>{
  const v=version(p,slot),plain=s=>String(s||'').replace(/<[^>]*>/g,''),d=modal(`${get.translation(v.id)} · 技能`,`${(v.skillDetails||[]).map((s,i)=>`<section class="appearance-skill"><h3>技能${i+1} · ${esc(plain(s.name))}</h3><p>${esc(plain(s.description)||'此版本未提供技能说明')}</p></section>`).join('')||'<p>此武将没有已公开的技能说明。</p>'}<div><button data-skin>选择皮肤</button><button data-voice>选择语音</button></div>`);
  let action;d.querySelector('[data-skin]').onclick=()=>{action='skin';d.close();};d.querySelector('[data-voice]').onclick=()=>{action='voice';d.close();};await closed(d);
  if(action==='skin')return pickSkin(p,slot,true);if(action==='voice')return pickVoice(p,slot,true);
 };return alreadyHeld?task():held(task);}
 async function pickVoice(p,slot,alreadyHeld=false){if(!visibleGeneral(p,slot,mode))return;const task=async()=>{
  const v=version(p,slot),key=v.versionId||v.key||v.id,current=state(p,slot);
  const response=await fetch('/api/voices?version='+encodeURIComponent(key)+'&name='+encodeURIComponent(get.translation(v.id)));if(!response.ok)throw Error('语音库暂时不可用');const info=await response.json();
  const d=modal(`${get.translation(v.id)} · 本局语音`,`<p>只在当前局生效，不改变技能。相同技能名自动对应；缺失语音保留原音，也可手动选择语音组。语音选择独立于皮肤。</p><label>语音版本<select class="voice-version"><option value="">当前版本默认语音</option>${info.versions.map(v=>`<option value="${esc(v.key)}">${esc(v.name)} · ${esc(v.scope)}</option>`).join('')}</select></label><div class="voice-groups"></div><audio class="voice-preview" controls hidden></audio><button class="voice-save">使用本局语音</button><p class="appearance-note">试听语音仅在此窗口播放；测试任务的自动语音仍遵守原有静音设置。</p>`);
  const select=d.querySelector('.voice-version');select.value=current.voice?.key||'';
  function render(){const selected=info.versions.find(v=>v.key===select.value),groups=selected?.skills||[];
   d.querySelector('.voice-groups').innerHTML=selected?`<h3>技能语音对应</h3>${(v.skillDetails||[]).map(skill=>{const mapped=voiceGroup(skill.id,v.skillDetails,current.voice?.key===selected.key?current.voice.map:null,groups);return`<label>${esc(skill.name)}<select data-skill="${esc(skill.id)}"><option value="">保持原音</option>${groups.map(g=>`<option value="${esc(g.id)}"${g===mapped?' selected':''}>${esc(g.name)} · ${g.files.length} 段语音</option>`).join('')}</select></label>`;}).join('')}<h3>试听已有语音</h3>${groups.map(g=>`<details><summary>${esc(g.name)}</summary>${g.files.map((f,i)=>`<button data-audio="${esc(f.url)}">试听 ${i+1} · ${esc(f.source)}</button>`).join('')}</details>`).join('')}${selected.death.length?`<p>阵亡语音：${selected.death.map((f,i)=>`<button data-audio="${esc(f.url)}">试听 ${i+1} · ${esc(f.source)}</button>`).join('')}</p>`:'<p>该版本没有本地阵亡语音，保持当前原音。</p>'}`:'<p>恢复当前武将版本的默认语音。</p>';
  }
  select.onchange=()=>{previewAudio?.pause();render();};render();d.onclick=e=>{const b=e.target.closest('[data-audio]');if(!b)return;previewAudio?.pause();previewAudio=d.querySelector('.voice-preview');previewAudio.hidden=false;previewAudio.src=b.dataset.audio;previewAudio.volume=Math.min(1,Math.max(0,(lib.config.volumn_audio??4)/8));previewAudio.play().catch(()=>message('浏览器暂未允许播放，请再点一次试听'));};
  d.querySelector('.voice-save').onclick=()=>{const selected=info.versions.find(v=>v.key===select.value);current.voice=selected?{...selected,map:Object.fromEntries([...d.querySelectorAll('[data-skill]')].map(el=>[el.dataset.skill,el.value]))}:null;d.close();};await closed(d);
 };return alreadyHeld?task():held(task);}
 async function chooseTarget(){return held(async()=>{
  const list=rows(),d=modal('本局皮肤与语音',`<p>只修改本局显示与语音；国战暗置武将明置后才能选择。</p><div class="appearance-seats">${list.map((r,i)=>`<article><strong>${Number(r.p.playSeat??r.p.dataset.position)+1}号位 · ${esc(get.translation(r.v.id))}${r.p.name2?r.slot?' · 副将':' · 主将':''}${game.dead?.includes(r.p)?' · 已阵亡':''}</strong><div><button data-skin="${i}">皮肤</button><button data-voice="${i}">语音</button><button data-detail="${i}">武将资料</button></div></article>`).join('')||'<p>尚无已明置的武将。</p>'}</div>`);
  let action;d.onclick=e=>{const b=e.target.closest('[data-skin],[data-voice],[data-detail]');if(!b)return;const type=b.dataset.skin!==undefined?'skin':b.dataset.voice!==undefined?'voice':'detail';action={...list[Number(b.dataset[type])],type};d.close();};await closed(d);if(!action)return;if(action.type==='skin')return pickSkin(action.p,action.slot,true);if(action.type==='voice')return pickVoice(action.p,action.slot,true);return showSkills(action.p,action.slot,true);
 });}
 const originalCard=ui.click.charactercard;
 ui.click.charactercard=function(name,source,noedit,resume,avatar,...args){
  const result=originalCard.call(this,name,source,noedit,resume&&!isPaused(),avatar,...args);
  const cards=[...document.querySelectorAll('.menubg.charactercard')],card=cards.at(-1);if(!card||card.classList.contains('appearance-card'))return result;
  const match=rows().find(r=>avatar===imageNode(r.p,r.slot))||rows().find(r=>r.v.id===name);if(!match)return result;
  card.classList.add('appearance-card');
  card.setAttribute('role','dialog');card.setAttribute('aria-label','武将资料');
  card.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();card.parentNode.click();}});
  card.dataset.appearanceSeat=match.p.dataset.position;card.dataset.appearanceSlot=match.slot;
  card.querySelector('.ava>.avatar').addEventListener('click',e=>{e.stopImmediatePropagation();pickSkin(match.p,match.slot);},true);
  if(state(match.p,match.slot).image)card.querySelector('.ava>.avatar').style.backgroundImage=imageNode(match.p,match.slot).style.backgroundImage;
  for(const[type,title]of[['skin','皮肤'],['voice','语音']]){const button=ui.create.div('.menubutton.large.appearance-'+type,card,title,()=>type==='skin'?pickSkin(match.p,match.slot):pickVoice(match.p,match.slot));button.setAttribute('role','button');button.setAttribute('tabindex','0');button.onkeydown=e=>{if(e.key==='Enter')button.click();};}
  return result;
 };
 const clickTimers=new Set();
 for(const[handler,slot]of[['avatar',0],['avatar2',1]])ui.click[handler]=function(e){const p=this.parentNode;if(!visibleGeneral(p,slot,mode)||!game.players.includes(p)&&!game.dead.includes(p))return;
  // A portrait remains a target button while the player is choosing a target.
  if(_status.imchoosing&&(p.classList.contains('selectable')||p.classList.contains('selected')))return;
  const show=inLowerThird(p.getBoundingClientRect(),e?.clientY);
  if(show)e?.stopPropagation();if(this._appearanceTimer){clearTimeout(this._appearanceTimer);clickTimers.delete(this._appearanceTimer);this._appearanceTimer=null;pickSkin(p,slot);return;}
  const node=this,timer=setTimeout(()=>{clickTimers.delete(timer);node._appearanceTimer=null;if(show)showSkills(p,slot);},350);this._appearanceTimer=timer;clickTimers.add(timer);
 };
 function paintSkillButtons(){for(const p of [...game.players,...(game.dead||[])])for(const slot of [0,1]){
  let button=p.querySelector(`.appearance-skill-button[data-slot="${slot}"]`);const visible=visibleGeneral(p,slot,mode);
  if(!visible){button?.remove();continue;}if(!button){button=document.createElement('button');button.type='button';button.className='appearance-skill-button';button.dataset.slot=slot;button.textContent=slot?'副将技能':'技能';button.onclick=e=>{e.stopPropagation();showSkills(p,slot);};p.append(button);}
  button.setAttribute('aria-label',get.translation(slot?p.name2:p.name1||p.name)+'的技能');
 }}
 const oldSkill=game.trySkillAudio.bind(game),oldDie=game.tryDieAudio.bind(game);
 function replaceAudio(audio,files){
  if(!audio||!files?.length)return audio;
  // Let the native player consume its original random choice and record the
  // original audio event; appearance must not alter the game's seeded RNG.
  const random=crypto.getRandomValues(new Uint32Array(1))[0];
  queueMicrotask(()=>{const originalURL=audio.src,originalError=audio.onerror;audio.onerror=()=>{audio.onerror=originalError;audio.src=originalURL;};audio.src=files[random%files.length].url;});return audio;
 }
 game.trySkillAudio=function(skill,p,direct,...args){
  const audio=oldSkill(skill,p,direct,...args);if(typeof p!=='object'||!p)return audio;
  for(const slot of [0,1]){const voice=choices.get(p)?.[slot]?.voice;if(!voice)continue;const v=version(p,slot);if(!v.skillDetails?.some(s=>s.id===skill))continue;const group=voice.skills.find(g=>g.id===voice.map[skill]);if(group)return replaceAudio(audio,group.files);}
  return audio;
 };
 game.tryDieAudio=function(p){const audio=oldDie(p),voice=typeof p==='object'&&(choices.get(p)?.[0]?.voice||choices.get(p)?.[1]?.voice);return replaceAudio(audio,voice?.death);};
 if(launch.replay&&game.videoContent?.playAudio){
  // Replay audio events do not carry a seat. Substitute only when the original
  // file identifies one visible owner; ambiguous events keep their recorded audio.
  game.videoContent.playAudio=function(path){
   const owners=new Map(),visible=rows();
   for(const {p,slot,v}of visible)for(const skill of v.skillDetails||[]){
    let files=[];try{files=game.parseSkillAudio(skill.id,p);}catch{}
    if(!files.includes(path))continue;
    const voice=choices.get(p)?.[slot]?.voice,group=voice?.skills.find(g=>g.id===voice.map[skill.id]);
    if(!owners.has(p)||group)owners.set(p,group?.files||null);
   }
   for(const p of new Set(visible.map(r=>r.p))){
    let files=[];try{files=get.Audio.die({player:p}).fileList;}catch{}
    if(files.includes(path)){const voice=choices.get(p)?.[0]?.voice||choices.get(p)?.[1]?.voice;owners.set(p,voice?.death||null);}
   }
   return replaceAudio(game.playAudio({path,video:true}),owners.size===1?[...owners.values()][0]:null);
  };
 }
 function paintHeader(){paintSkillButtons();if(!header)return;header.hidden=!!frame&&(frame.classList.contains('arena-stream')||frame.getAttribute('aria-hidden')==='true');header.querySelector('span').textContent=(launch.replay?'历史回放':_status.auto?'全 AI 托管 · 可从上方接管座位':'玩家控制 · 其余座位为 AI')+' · 点击角色下三分之一或技能按钮查看技能，双击立绘换肤';header.querySelector('button').disabled=open;}
 function ready(){header=doc.createElement('div');header.className='arena-appearance-header';header.innerHTML='<span></span><button>皮肤 / 语音</button>';header.querySelector('button').onclick=chooseTarget;if(frame)frame.before(header);else{document.body.classList.add('appearance-standalone');document.body.prepend(header);}paintHeader();}
 function destroy(){header?.remove();previewAudio?.pause();for(const timer of clickTimers)clearTimeout(timer);clickTimers.clear();}
 window.addEventListener('pagehide',destroy);
 return{ready,paint:paintHeader,isOpen:()=>open};
}
