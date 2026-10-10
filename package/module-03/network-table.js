import {inLowerThird} from './portrait-input.js';
import {safePortrait} from './network-roster.js';
// The unified app supplies readable names. A standalone play service can still
// render/operate without that optional preview module.
let packNames={play_custom:'我的DIY',mode_guozhan:'国战包',standard:'标准包',bingshi:'势包'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={zhu:'主公',zhong:'忠臣',fan:'反贼',nei:'内奸',unknown:'未公开',ye:'野心家',shu:'蜀',wei:'魏',wu:'吴',qun:'群',jin:'晋',undefined:'未公开'};
const suits={spade:'♠',heart:'♥',club:'♣',diamond:'♦'};
const rank=n=>({1:'A',11:'J',12:'Q',13:'K'}[n]||n||'');
// A DOM renderer of PlayerView only. It has no native engine, authority DTO or RNG.
export class NetworkTable {
 constructor(root,onAction,options={}){
  this.root=root;this.onAction=onAction;this.assets={};this.catalog=[];
  this.options=options;this.internet=!!options.internet;if(this.internet)root.classList.add('internet-table');
  import('../app/general-packs.js').then(()=>{packNames=window.GeneralPacks?.names||packNames;this.signature='';if(this.view)this.render(this.view,this.context);}).catch(()=>{});
  root.classList.add('network-table');
  root.innerHTML='<div id="table-summary" class="network-table-summary" role="status"></div><div id="network-board" class="network-seat-row"></div><div class="network-self-row"><div id="own-general-card"></div><section class="network-hand-area" aria-label="我的手牌"><strong>我的手牌</strong><div id="own-hand" class="network-hand"></div><div id="own-piles"></div></section></div><section id="choice-panel" class="network-choice"><h2 id="choice-title">等待开局</h2><p id="choice-text"></p><div id="choices" class="network-choices"></div></section>';
  root.onclick=e=>{
   const tool=e.target.closest('[data-table-tool]');if(tool){this.tool(tool.dataset.tableTool);return;}
   const detail=e.target.closest('[data-skill-seat]');if(detail){this.showSkills(Number(detail.dataset.skillSeat));return;}
   const action=e.target.closest('[data-op]');if(action){if(!action.disabled)this.onAction(action.dataset.op,action.dataset.ref);return;}
   const player=e.target.closest('.net-player');if(!player)return;
   const target=this.view?.prompt?.targets.find(t=>t.seat===Number(player.dataset.seat));
   if(target){if(!this.locked)this.onAction('target',target.ref);return;}
   if(inLowerThird(player.getBoundingClientRect(),e.clientY))this.showSkills(Number(player.dataset.seat));
  };
  root.onchange=e=>{if(e.target.matches('[data-pool-filter]')&&!this.locked)this.onAction('control',e.target.value);};
  root.onkeydown=e=>{const p=e.target.closest('.net-player');if(!p||e.target!==p||!['Enter',' '].includes(e.key))return;e.preventDefault();const t=this.view?.prompt?.targets.find(t=>t.seat===Number(p.dataset.seat));if(t&&!this.locked)this.onAction('target',t.ref);};
  this.ready=Promise.all(['./asset-map.json','./play-catalog.json'].map(u=>fetch(u).then(r=>{if(!r.ok)throw Error('显示素材读取失败');return r.json();}))).then(([a,c])=>{this.assets=a;this.catalog=c.versions||[];this.signature='';if(this.view)this.render(this.view,this.context);}).catch(()=>{this.assets={};});
  if(this.internet)root.insertAdjacentHTML('afterbegin','<nav class="net-toolbar net-toolbar-left" aria-label="牌桌操作"><button data-table-tool="options">选项</button><button data-table-tool="pause">暂停</button><button data-table-tool="autoplay">托管</button></nav><nav class="net-toolbar net-toolbar-right" aria-label="公开资料"><button data-table-tool="recorder">记牌器</button><button data-table-tool="pile">牌堆</button><button data-table-tool="zones">公共区域</button><button data-table-tool="identity">显示身份</button></nav><div class="net-center-plays" aria-label="公开出牌"></div><div class="net-center-log" aria-live="polite"></div>');
  if(this.internet){this.resizeObserver=new ResizeObserver(()=>this.placeSeats());this.resizeObserver.observe(root);}
 }
 node(id){return this.root.querySelector('#'+id);}
 resource(path){return new URL('./resource/'+path.split('/').map(encodeURIComponent).join('/'),import.meta.url).href;}
 portrait(id,provided,skinId){
  if(safePortrait(provided))return provided;
  if(typeof id!=='string'||!id)return '';
  if(skinId&&skinId!==id&&this.assets[`image/character/${skinId}.jpg`])return this.resource(this.assets[`image/character/${skinId}.jpg`]);
  const v=this.catalog.find(v=>v.id===id)||this.catalog.find(v=>v.id===id.replace(/^gz_/,''));
  return v?.portraitPath?this.resource(v.portraitPath):'';
 }
 cardImage(c){const path=this.assets['image/card/'+c.name+'.png'];return path?this.resource(path):'';}
 image(url,name){return url?`<img src="${esc(url)}" alt="${esc(name)}" loading="lazy">`:`<span class="net-art-placeholder">${esc(name?.slice(0,2)||'暗将')}</span>`;}
 actionAttrs(op,ref){return `data-op="${op}" data-ref="${esc(ref)}" ${this.locked?'disabled':''}`;}
 card(c,action){
  const url=c.hidden?'':this.cardImage(c),title=c.hidden?'背面牌':c.text||c.name||'卡牌';
  return `<button type="button" class="net-card ${['heart','diamond'].includes(c.suit)?'red':''} ${action?.selected?'selected':''} ${action?'actionable':''}" ${action?this.actionAttrs(action.op,action.ref):'disabled'} aria-label="${esc(title)}" title="${esc(title)}">${this.image(url,c.hidden?'背面':c.name)}<span class="net-card-rank">${esc(suits[c.suit]||'')} ${esc(rank(c.number))}</span><span class="net-card-name">${esc(c.hidden?'背面':c.text?.split('【')[0]||c.name)}</span>${c.nature?`<span class="net-card-nature">${esc(c.nature)}</span>`:''}${c.privateTags?.length?`<span class="net-private-tag">${c.privateTags.map(esc).join(' · ')}</span>`:''}${action?.selected?'<span class="net-selected">已选</span>':''}</button>`;
 }
 player(p,own=false){
  const gens=own&&this.view.own.generals.length?this.view.own.generals:p.generals||[],name=gens.length?gens.map(g=>g.name).join(' / '):p.name||'选将中';
  const identity=own?this.view.own.identity:p.identity;
  const t=this.view.prompt?.targets.find(t=>t.seat===p.seat),active=this.view.public.currentSeat===p.seat;
  const extra=this.internet?`<div class="net-jades" aria-label="${p.hp}/${p.maxHp}体力">${p.maxHp<=6?Array.from({length:Math.max(0,p.maxHp)},(_,i)=>`<i class="${i<p.hp?'full':'empty'}"></i>`).join(''):`<b>${p.hp}/${p.maxHp}</b>`}</div><span class="net-hand-count" title="手牌数">${p.hand||0}</span>${this.view.public.autoplaySeats?.includes(p.seat)?'<span class="net-auto-badge">托管</span>':''}`:'';
  const ident=this.internet?({zhu:'主',zhong:'忠',fan:'反',nei:'内',ye:'野',unknown:'猜'}[identity]||labels[identity]||'猜'):(labels[identity]||identity||'未公开');
  return `<article class="net-player ${own?'own':''} ${p.alive?'':'dead'} ${t?'actionable':''} ${t?.selected?'selected':''} ${active?'current-turn':''}" data-seat="${p.seat}" tabindex="${t?'0':'-1'}" ${t?'role="button"':''} aria-label="${p.seat+1}号 · ${esc(name)}${t?' · 选择目标':''}"><div class="net-portraits">${(gens.length?gens:[{name,id:''}]).map(g=>`<div>${this.image(g.visible===false?'':this.portrait(g.id,g.portrait,g.skinId),g.name)}</div>`).join('')}</div><span class="net-seat">${p.seat+1}号${own?' · 我':''}</span><span class="net-identity" title="${esc(labels[identity]||identity)}">${esc(ident)}</span><div class="net-player-name">${esc(name)}</div><div class="net-health" aria-label="${p.hp}/${p.maxHp}体力">${p.maxHp>0?`${p.hp}/${p.maxHp} 血`:'选将中'} · 手牌${p.hand||0}</div>${extra}${!p.alive?'<span class="net-dead">阵亡</span>':''}<button type="button" class="net-skill-button" data-skill-seat="${p.seat}" aria-label="${esc(name)}的技能">技能</button>${t?.selected?'<span class="net-selected">已选目标</span>':''}<div class="net-zones" title="${esc('装备：'+p.equip.map(c=>c.text).join('、')+'；判定：'+p.judges.map(c=>c.text).join('、'))}">${this.internet?p.equip.map(c=>`<span>${esc(c.text)}</span>`).join('')+p.judges.map(c=>`<span class="net-judge">${esc(c.text)}</span>`).join(''):`<span>装备 ${p.equip.length}</span><span>判定 ${p.judges.length}</span>`}</div></article>`;
 }
 render(view,{seat=0,locked=false,online=true,ended=false}={}){
  if(this.closed)return;
  this.view=view;this.context={seat,locked,online,ended};this.locked=locked||!online||ended||view.public.paused||view.public.autoplaySeats?.includes(seat);
  const signature=JSON.stringify([view,this.context]);if(signature===this.signature)return;this.signature=signature;
  const pub=view.public,me=pub.players.find(p=>p.seat===seat);
  this.node('table-summary').textContent=`第${pub.round||0}轮 · 牌堆${pub.pile||0}张 · 弃牌${pub.discard||0}张${Number.isInteger(pub.currentSeat)?' · '+(pub.currentSeat+1)+'号回合':''}${!online?' · 连接中断，等待恢复':''}`;
  this.node('network-board').innerHTML=pub.players.filter(p=>p.seat!==seat).map(p=>this.player(p)).join('');
  if(this.internet){this.root.dataset.players=pub.players.length;this.placeSeats();this.paintTools();}
  this.node('own-general-card').innerHTML=me?this.player(me,true):'';
  const prompt=view.prompt,cardActions=prompt?.cards||[];
  this.node('own-hand').innerHTML=view.own.hand.map(c=>this.card(c,cardActions.find(a=>a.id===c.id)&&{...cardActions.find(a=>a.id===c.id),op:'card'})).join('')||'<p class="net-empty">暂无手牌</p>';
  this.node('own-piles').innerHTML=view.own.piles.map(p=>`<details><summary>${esc(p.name)}</summary><div class="network-hand">${p.cards.map(c=>this.card(c)).join('')}</div></details>`).join('');
  const result={win:'你获胜',lose:'你落败',draw:'和局'}[view.own.result];
  this.node('choice-title').textContent=ended?'房间已关闭':pub.over?`对局已结束 · ${result||'已结算'}`:pub.paused?'Host已暂停对局':pub.autoplaySeats?.includes(seat)?'AI托管中 · 可随时取消':prompt?.event==='chooseCharacter'?'轮到你选将':prompt?'轮到你选择':'等待其他玩家或AI操作';
  this.node('choice-panel').classList.toggle('choosing-generals',prompt?.event==='chooseCharacter');
  this.node('choice-panel').classList.toggle('idle-choice',!prompt&&!view.fault);
  this.node('choice-text').textContent=view.fault||(prompt?.unsupported?'当前选择尚未接通，等待Host处理':prompt?.text||'');
  const extras=cardActions.filter(c=>!view.own.hand.some(h=>h.id===c.id));
  this.node('choices').innerHTML=prompt?[
   prompt.filters?.length?`<label class="net-pool-filter">将包筛选<select data-pool-filter ${this.locked?'disabled':''}>${prompt.filters.map(f=>`<option value="${esc(f.ref)}" ${f.selected?'selected':''}>${esc(packNames[f.text]||f.text)}</option>`).join('')}</select></label>`:'',
   extras.length?`<div class="network-hand">${extras.map(c=>this.card(c,{...c,op:'card'})).join('')}</div>`:'',
   prompt.targets.length?`<div class="net-targets">${prompt.targets.map(t=>`<button ${this.actionAttrs('target',t.ref)} class="${t.selected?'selected':''}">目标 · ${t.seat+1}号 · ${esc(t.text)}</button>`).join('')}</div>`:'',
   prompt.buttons.length?`<div class="net-options ${prompt.event==='chooseCharacter'?'net-general-options':''}">${prompt.buttons.map(b=>b.generalId?`<button class="net-general-option ${b.selected?'selected':''}" ${this.actionAttrs('button',b.ref)} aria-label="${esc(b.text)}">${this.image(this.portrait(b.generalId,b.portrait),b.text)}<span>${esc(b.text)}</span>${b.selected?'<b class="net-selected">已选</b>':''}</button>`:b.card?this.card(b.card,{...b,op:'button'}):`<button ${this.actionAttrs('button',b.ref)} class="${b.selected?'selected':''}">${esc(b.text)}</button>`).join('')}</div>`:'',
   `<div class="net-controls">${prompt.controls.map(c=>`<button ${this.actionAttrs('control',c.ref)} class="${['ok','roster-confirm','confirm'].includes(c.link)?'primary':''}">${esc(c.text)}</button>`).join('')}</div>`
  ].join(''):'';
 }
 placeSeats(){
  if(!this.view)return;const pub=this.view.public,seat=this.context.seat,others=pub.players.filter(p=>p.seat!==seat).sort((a,b)=>(a.seat-seat+pub.players.length)%pub.players.length-(b.seat-seat+pub.players.length)%pub.players.length);
  const nominal=this.root.clientWidth<=1150?(pub.players.length>=10?88:108):132;
  const width=Math.min(nominal,others.length<=1?nominal:Math.max(60,Math.floor(this.root.clientWidth*.84/(others.length-1))-6));
  for(const[i,p]of others.entries()){const n=this.root.querySelector(`#network-board [data-seat="${p.seat}"]`);if(!n)continue;const ratio=others.length===1?.5:i/(others.length-1);n.style.setProperty('--seat-x',`${8+84*ratio}%`);n.style.setProperty('--seat-y',`${28+88*Math.pow((ratio-.5)*2,2)}px`);n.style.setProperty('--seat-width',width+'px');n.style.setProperty('--seat-height',Math.round(width*216/132)+'px');n.style.setProperty('--seat-name-size',Math.round(21*width/132)+'px');}
  const columns=Math.max(1,Math.floor((this.root.clientWidth-20)/110));this.root.style.setProperty('--mobile-board-height',`${Math.ceil(others.length/columns)*184}px`);
 }
 paintTools(){
  const {public:p}=this.view,{seat,online,locked,ended}=this.context,disabled=locked||!online||ended||!p.controlsEnabled||p.over;
  const auto=this.root.querySelector('[data-table-tool="autoplay"]'),pause=this.root.querySelector('[data-table-tool="pause"]');
  auto.textContent=p.autoplaySeats?.includes(seat)?'取消托管':'托管';auto.classList.toggle('selected',!!p.autoplaySeats?.includes(seat));auto.disabled=disabled;
  pause.textContent=p.paused?'继续':'暂停';pause.disabled=disabled||seat!==0;pause.title=seat===0?'暂停或恢复整局':'由Host暂停或恢复整局';
  const plays=p.recentPlays||[],last=plays.slice(-2);this.root.querySelector('.net-center-plays').innerHTML=last.map(v=>this.card(v.card)).join('');
  this.root.querySelector('.net-center-log').innerHTML=plays.slice(-7).reverse().map(v=>`<p>${esc(p.players.find(g=>g.seat===v.seat)?.name||`${v.seat+1}号`)}${v.event==='respond'?'打出':'使用'}了 ${esc(v.card.text||v.card.name)}</p>`).join('');
 }
 dialog(title,body){const d=document.createElement('dialog');d.className='appearance-dialog net-tool-dialog';d.innerHTML=`<div class="appearance-tools"><h2>${esc(title)}</h2><button data-close>关闭</button></div>${body}`;d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();return d;}
 tool(kind){
  if(!this.internet||!this.view)return;const p=this.view.public;
  if(kind==='autoplay'||kind==='pause'){const b=this.root.querySelector(`[data-table-tool="${kind}"]`);if(b.disabled)return;this.options.onControl?.(kind==='autoplay'?(p.autoplaySeats?.includes(this.context.seat)?'autoplay-off':'autoplay-on'):(p.paused?'pause-off':'pause-on'));return;}
  if(kind==='identity'){this.root.classList.toggle('net-hide-identities');return;}
  if(kind==='pile'){this.dialog('牌堆',`<p>剩余牌：${p.pile} 张 · 弃牌：${p.discard} 张</p>`);return;}
  if(kind==='recorder'){this.dialog('记牌器 · 最近96次公开出牌',`<div class="net-record-list">${(p.recentPlays||[]).map(v=>`<p>${v.seat+1}号 · ${esc(v.card.text||v.card.name)} ${esc(suits[v.card.suit])}${esc(rank(v.card.number))}</p>`).join('')||'<p>暂无公开出牌</p>'}</div>`);return;}
  if(kind==='zones'){this.dialog('公共区域',p.players.map(g=>`<section><h3>${g.seat+1}号 · ${esc(g.name)}</h3><p>装备：${esc(g.equip.map(c=>c.text).join('、')||'无')}</p><p>判定：${esc(g.judges.map(c=>c.text).join('、')||'无')}</p></section>`).join(''));return;}
  if(kind==='options'){const backs=Object.keys(this.assets).filter(k=>/^image\/background\/[^/]+\.jpg$/.test(k));const d=this.dialog('牌桌选项',`<button data-fullscreen>切换全屏</button><label>背景<select data-background>${backs.map(k=>`<option value="${esc(k)}">${esc(k.split('/').at(-1).replace('_bg.jpg',''))}</option>`).join('')}</select></label>`);d.querySelector('[data-fullscreen]').onclick=()=>{d.close();(document.fullscreenElement?document.exitFullscreen():this.root.requestFullscreen()).catch(()=>{});};d.querySelector('[data-background]').onchange=e=>{const path=this.assets[e.target.value];if(path)this.root.style.backgroundImage=`linear-gradient(#07141012,#06111240),url("${this.resource(path)}")`;};}
 }
 setLocked(locked=true){this.locked=locked;this.signature='';for(const b of this.root.querySelectorAll('[data-op], [data-pool-filter]'))b.disabled=locked;for(const p of this.root.querySelectorAll('.net-player.actionable'))p.setAttribute('aria-disabled',String(locked));if(this.internet)for(const b of this.root.querySelectorAll('[data-table-tool="autoplay"], [data-table-tool="pause"]'))b.disabled=true;}
 close(reason){this.closed=true;this.setLocked(true);this.node('choice-title').textContent='房间已关闭';this.node('choice-text').textContent=reason;this.node('choices').replaceChildren();}
 showSkills(seat){
  const p=this.view?.public.players.find(p=>p.seat===seat);if(!p)return;
  const own=seat===this.context.seat,gens=own?this.view.own.generals:p.generals||[],name=gens.length?gens.map(g=>g.name).join(' / '):p.name;
  const skills=own?this.view.own.skills:p.skills;
  const d=document.createElement('dialog');d.className='appearance-dialog net-skill-dialog';
  d.innerHTML=`<div class="appearance-tools"><h2>${esc(name)} · 技能</h2><button data-close>关闭</button></div>${skills.length?skills.map((s,i)=>`<section class="appearance-skill"><h3>技能${i+1} · ${esc(s.name)}</h3><p>${esc(s.text)}</p></section>`).join(''):'<p>暂无已公开技能。</p>'}<p class="hint">装备：${esc(p.equip.map(c=>c.text).join('、')||'无')} · 判定：${esc(p.judges.map(c=>c.text).join('、')||'无')}</p>`;
  d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();
 }
}
