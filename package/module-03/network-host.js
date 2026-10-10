import {privateFuLabels} from './private-card-tags.js';
import {NetworkSelection} from './network-selection.js';
import {filterNetworkPool} from './network-roster.js';
import {HttpTransport} from './network-transport.js';
import {NetworkControls,CONTROL_PROMPT} from './network-controls.js';

// The native engine stays in the Host frame. No engine objects cross Transport.
export function installNetworkHost(env, launch, hooks = {}) {
  if (!launch.network) return null;
  const {game, lib, ui, get, _status} = env, config = launch.network;
  const humanSeats=new Set(config.humanSeats||[0,1]);let rosterSelection=null;
  const controls=new NetworkControls([...humanSeats]),recentPlays=[];
  const inMatch=()=>!rosterSelection||rosterSelection.done;
  const autoSeat=p=>inMatch()&&controls.autoplay.has(seat(p));
  const portraitState=(p,id,i)=>({portrait:personalPortrait(id),skinId:p.skin?.[i?'name2':'name']||id});
  let promptSerial = 0, promptVersion = 0, currentEvent, promptSignature = '', ack = 0, networkHeld=false;
  let lastState = '', stopped = false, publishing = false, outstanding = [], failure = null, fatal = false, started = false, outcome = null;
  const ids = new WeakMap(), cardIds = new WeakMap(), references = new Map(), processed = new Map();
  const ref = (node, kind) => { if (!ids.has(node)) ids.set(node, kind + '-' + crypto.randomUUID()); const id = ids.get(node); references.set(id, {node, kind}); return id; };
  const plain = html => { const box = document.createElement('div'); box.innerHTML = String(html || ''); return box.textContent.trim(); };
  const seat = p => p?.playSeat ?? Number(p?.dataset?.position);
  const personalPortrait=id=>launch.settings.studioRuntime?.portraits?.[lib.studioVersions?.[id]?.portrait]||'';
  const card = c => {if(!cardIds.has(c))cardIds.set(c,crypto.randomUUID());return {id:cardIds.get(c),name:c.name,text:plain(get.translation(c)),suit:c.suit,number:c.number,nature:c.nature||'',privateOwner:seat(get.owner(c)),privateTags:privateFuLabels(c,get)};};
  const selected = n => n.classList.contains('selected');
  const selectable = n => n.classList.contains('selectable') || selected(n);
  const visible = n => {
    if (!n?.isConnected) return false;
    for (let p = n; p && p !== ui.window; p = p.parentElement) {
      if (p.classList?.contains('hidden') || p.classList?.contains('removing') || p.classList?.contains('disabled') || p.style?.display === 'none') return false;
    }
    return true;
  };
  const nativeMine = lib.element.GameEvent.prototype.isMine;
  lib.element.GameEvent.prototype.isMine = function(...args) {
    if (this.player && this.name?.startsWith('choose') && Number.isInteger(seat(this.player)) && !this.player.isMad()) {
      if(!humanSeats.has(seat(this.player))||autoSeat(this.player))return false;
      // swapControl leaves engine seat positions stable; swapPlayer rotates them.
      if (game.me !== this.player) game.swapControl(this.player);
      return !_status.auto && !game.notMe;
    }
    return nativeMine.apply(this, args);
  };
  lib.config.auto_confirm = false;
  lib.config.seperate_control = false;
  _status.auto = false;
  // Block native pointer/keyboard shortcuts. Host humans also use ACTION.
  for (const event of ['click', 'mousedown', 'mouseup', 'touchstart', 'keydown', 'contextmenu']) {
    document.addEventListener(event, e => { if (e.isTrusted) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }

  function prompt() {
    const e = _status.event;
    references.clear();
    if (!_status.paused || _status.over || !e?.player || !e.name?.startsWith('choose') || !humanSeats.has(seat(e.player)) || autoSeat(e.player)) {
      currentEvent = null; promptSignature = ''; return null;
    }
    if (currentEvent !== e) { currentEvent = e; promptSerial++; promptVersion = 0; promptSignature = ''; ui.control?.show(); }
    const cards = e.player.getCards('hejsx').filter(selectable).map(n => ({...card(n), ref: ref(n, 'card'), selected: selected(n)}));
    const targets = game.players.concat(game.dead || []).filter(selectable).map(n => ({ref: ref(n, 'target'), seat: seat(n), text: plain(get.translation(n.name)), selected: selected(n)}));
    const moveButtons=e.buttonss?.flatMap(group=>Array.from(group.children))||[];
    const buttons = [...new Set([...(e.dialog?.buttons||[]),...moveButtons])].filter(n => visible(n) && (selectable(n)||moveButtons.includes(n))).map(n => {const hidden=n._args?.[1]==='blank'||n.classList.contains('infohidden');const copy=n.cloneNode(true);copy.querySelectorAll('.play-private-fuyue').forEach(x=>x.remove());
      const generalId=!hidden&&typeof n.link==='string'&&lib.character[n.link]?n.link:'';
      const imageCard=!hidden&&(n.link?.name&&lib.card[n.link.name]?card(n.link):Array.isArray(n.link)&&lib.card[n.link[2]]?{name:n.link[2],text:plain(get.translation(n.link[2])),nature:n.link[3]||''}:null);
      return {ref: ref(n, 'button'), text:hidden?'背面牌':plain(copy.textContent || get.translation(n.link)),hidden,generalId,card:imageCard,selected:selected(n)||n.classList.contains('glow2')};});
    const controls = [];
    for (const bar of Array.from(ui.control?.children || [])) {
      if (!visible(bar)) continue;
      for (const n of bar.children) {
        if (typeof n.link !== 'string' || !visible(n)) continue;
        controls.push({ref: ref(n, 'control'), text: plain(n.textContent || get.translation(n.link)), link: n.link});
      }
    }
    // dialogcontrol options are not normal control bars.
    if (e.dialogcontrol || e.sortcard) for (const n of e.dialog?.querySelectorAll('.pointerdiv') || []) {
      if (typeof n.link === 'string' && visible(n)) controls.push({ref: ref(n, 'control'), text: plain(n.textContent), link: n.link, dialog: true});
    }
    if(e.buttonss)for(const group of e.buttonss){const id=ref(group,'control');references.get(id).moveGroup=true;controls.push({ref:id,text:'移至'+plain(e.list[group._link]?.[0]||'区域'+group._link),link:'move'});}
    for(const n of e.dialog?.querySelectorAll('.pointerdiv')||[]){if(!visible(n)||n.classList.contains('select-all')||n.closest('.card,.button,.infohidden')||controls.some(c=>references.get(c.ref)?.node===n)||buttons.some(b=>references.get(b.ref)?.node?.contains(n)))continue;const id=ref(n,'button');references.get(id).pointer=true;buttons.push({ref:id,text:plain(n.textContent),selected:false});}
    const data = {id: 'prompt-' + promptSerial, seat: seat(e.player), event: e.name,
      text: plain([typeof e.prompt === 'string'?e.prompt:'请选择',typeof e.prompt2==='string'?e.prompt2:'',...(e.choiceList||[]).map((choice,i)=>`选项${get.cnNumber(i+1,true)}：${choice}`)].filter(Boolean).join('\n')),
      skill: e.skill || '', cards, targets, buttons, controls};
    const signature = JSON.stringify(data);
    if (signature !== promptSignature) { promptSignature = signature; promptVersion++; }
    return {...data, revision: promptVersion, unsupported: !cards.length && !targets.length && !buttons.length && !controls.length};
  }
  function snapshot() {
    if(rosterSelection&&!rosterSelection.done){const state=rosterSelection.snapshot();Object.assign(state.public,controls.snapshot(false,false));return state;}
    const players = game.players.concat(game.dead || []).slice().sort((a, b) => seat(a) - seat(b));
    const publicState = {currentSeat:seat(_status.currentPhase),round: game.roundNumber || 0, phase: game.phaseNumber || 0, over: !!_status.over, outcome,
      ...controls.snapshot(inMatch(),!!_status.over),recentPlays,
      pile: ui.cardPile?.childNodes.length || 0, discard: ui.discardPile?.childNodes.length || 0,
      players: players.map(p => ({seat: seat(p), name: plain(get.translation(p.name)), hp: p.hp, maxHp: p.maxHp,
        generals:[p.name1||p.name,p.name2].filter(Boolean).map((id,i)=>({id,...portraitState(p,id,i),name:plain(get.translation(id)),visible:!p.isUnseen?.(i),skills:(lib.character[id]?.skills||[]).map(s=>({id:s,name:plain(get.translation(s)),text:plain(lib.translate[s+'_info'])}))})),
        alive: p.isAlive(), hand: p.countCards('h'), identity: p.identity,identityVisible:['single','doudizhu'].includes(lib.config.mode)||p.identityShown===true||!!_status.over,nameVisible:!p.isUnseen?.(2),
        equip: p.getCards('e').map(card), judges: p.getCards('j').map(c=>({...card(c),hidden:!!lib.card[c.viewAs||c.name]?.blankCard})),
        printedSkills:(lib.character[p.name]?.skills||[]).map(s=>({id:s,name:plain(get.translation(s)),text:plain(lib.translate[s+'_info'])}))})),
      random: launch.hostRandom?.snapshot() || null};
    return {public: publicState, private: Object.fromEntries(players.map(p => [String(seat(p)), {hand:p.getCards('h').map(card),generals:[p.name1||p.name,p.name2].filter(Boolean).map((id,i)=>({id,...portraitState(p,id,i),name:plain(get.translation(id)),skills:(lib.character[id]?.skills||[]).map(s=>({id:s,name:plain(get.translation(s)),text:plain(lib.translate[s+'_info'])}))})),skills:[...new Set([...(lib.character[p.name1||p.name]?.skills||[]),...(lib.character[p.name2]?.skills||[])])].map(s=>({id:s,name:plain(get.translation(s)),text:plain(lib.translate[s+'_info'])}))}])), prompt: prompt(), fault: failure};
  }
  function releaseToAI(){
    const e=_status.event;
    if(networkHeld||controls.paused||_status.paused2||!_status.paused||!e?.player||!autoSeat(e.player)||!e.name?.startsWith('choose'))return;
    ui.confirm?.close();ui.control?.hide();
    if(e.switchToAuto)e.switchToAuto();
    else{game.uncheck();e.redo();if(e.skill&&!e.norestore)e.restore();}
    game.resume();
  }
  function apply(packet) {
    if(packet.action.prompt===CONTROL_PROMPT){
      controls.apply(packet,inMatch()&&game.players.some(p=>p.name),!!_status.over);
      if(controls.paused)game.pause2();else if(!networkHeld)game.resume2();
      releaseToAI();return;
    }
    if(controls.paused)throw Error('对局已暂停');
    if(controls.autoplay.has(packet.seat))throw Error('当前由AI托管，请先取消托管');
    if(rosterSelection&&!rosterSelection.done){rosterSelection.apply(packet);return;}
    const a = packet.action, p = prompt();
    if (!p || _status.over) throw Error('当前没有可操作选择');
    if (packet.seat !== p.seat) throw Error('该选择属于其他玩家');
    if (a.prompt !== p.id || a.revision !== p.revision) throw Error('选择已经变化，请使用最新提示');
    const item = references.get(a.ref);
    if (!item || item.kind !== a.op) throw Error('引用不属于当前合法候选');
    const {node, kind} = item, e = _status.event;
    if (kind !== 'control' && !item.pointer && !e.buttonss?.some(g=>g.contains(node)) && !selectable(node)) throw Error('卡牌或目标不合法');
    if (kind === 'control') {
      if (!visible(node)) throw Error('操作按钮已失效');
      if (node.link === 'ok' && !e.buttonss && e.name !== 'chooseBool' && !game.check()) throw Error('牌、目标或数量不符合引擎规则');
    }
    _status.clicked = false;
    if(item.moveGroup){moveChoice(e,null,node);}
    else if(e.buttonss?.some(g=>g.contains(node))&&ui.selected.guanxing_buttons?.length&&!ui.selected.guanxing_buttons.includes(node)){moveChoice(e,node);}
    else if(item.pointer)node.click();
    else if (kind === 'control' && (e.dialogcontrol || e.sortcard) && e.dialog?.contains(node)) ui.click.dialogcontrol.call(node);
    else ui.click[kind === 'target' ? 'player' : kind].call(node);
    _status.clicked = false;
    hooks.record?.('network-action', {id: a.id, seat: packet.seat, op: a.op, prompt: a.prompt});
  }
  function moveChoice(e,target,group){
    const chosen=ui.selected.guanxing_buttons||[],current=chosen[0];if(!current||e.isPlayingAnimation)throw Error('请先选择一张牌');
    if(!e.filterMove(target||current,target?current:group._link,e.moved))throw Error('卡牌或目标不合法');
    if(target){const marker=document.createComment('move');current.replaceWith(marker);target.replaceWith(current);marker.replaceWith(target);}else group.appendChild(current);
    for(const n of chosen)n.classList.remove('glow2');ui.selected.guanxing_buttons=[];ui.selected.guanxing_button=null;
    for(const g of e.buttonss)e.moved[g._link]=get.links(Array.from(g.children));
    if(e.filterOk(e.moved))ui.create.confirm('o');else if(!e.forced)ui.create.confirm('c');else ui.confirm?.close();
  }
  const transport = hooks.transport || new HttpTransport({room: config.room, token: config.engineToken, role: 'engine', playToken: launch.token});
  async function publish(force = false) {
    if (publishing || stopped) return;
    const state = snapshot(), signature = JSON.stringify(state);
    if (!force && signature === lastState && !outstanding.length) return;
    publishing = true;
    const events = outstanding.splice(0, 256);
    try { await transport.send({type: 'PUBLISH', data: {snapshot: state, events, ack}}); lastState = signature; }
    catch (error) { outstanding.unshift(...events); failure = error.message; throw error; }
    finally { publishing = false; }
  }
  transport.onMessage(async message => {
    if (!fatal) failure = null;
    if (message.phase === 'closed') { stopped = true; game.pause2(); transport.close(); return; }
    if(message.suspended&&!_status.paused2){networkHeld=true;game.pause2();}
    if(!message.suspended&&networkHeld){networkHeld=false;if(!controls.paused)game.resume2();releaseToAI();}
    for (const packet of message.actions || []) {
      if (packet.seq <= ack) continue;
      let result = processed.get(packet.member + ':' + packet.action.id);
      if (!result) {
        try { apply(packet); result = {kind: 'ACTION_ACCEPTED', id: packet.action.id, seat: packet.seat, op: packet.action.op}; }
        catch (error) { result = {kind: 'ACTION_REJECTED', id: packet.action.id, seat: packet.seat, reason: error.message}; }
        processed.set(packet.member + ':' + packet.action.id, result);
        if (processed.size > 4096) processed.delete(processed.keys().next().value);
      }
      outstanding.push(result); ack = packet.seq;
      await publish(true);
    }
    releaseToAI();await publish(!!message.resync);
  }).onError(error => { failure = error.message; hooks.send?.('play-error', {message: error.message}); });
  const nativeVideo = game.addVideo.bind(game);
  game.addVideo = function(type, player, content) {
    const result = nativeVideo(type, player, content);
    if (outstanding.length < 240) outstanding.push({kind: 'ENGINE', event: type, seat: player?.playSeat ?? null});
    return result;
  };
  const nativeStart = lib.element.GameEvent.prototype.start, observed = new WeakSet();
  lib.element.GameEvent.prototype.start = async function(...args) {
    const first = !observed.has(this); observed.add(this);
    try {
      const value = await nativeStart.apply(this, args);
      if (first && ['useCard','respond','useSkill','damage','draw'].includes(this.name)) {
        if(['useCard','respond'].includes(this.name)&&this.card){recentPlays.push({seat:seat(this.player),event:this.name,card:card(this.card)});if(recentPlays.length>96)recentPlays.shift();}
        outstanding.push({kind:'ENGINE_RESOLVED',event:this.name,seat:this.player?.playSeat??null,
          card:this.card?.name||null,skill:this.skill||null});
      }
      return value;
    } catch(error) { fatal=true; failure=error.message; outstanding.push({kind:'ENGINE_ERROR',event:this.name,reason:failure}); throw error; }
  };
  const nativeOver = game.over.bind(game);
  game.over = function(...args) {
    const living=game.players.filter(p=>p.isAlive());
    const all=game.players.concat(game.dead||[]),draw=typeof args[0]==='string'&&/和局|平局/.test(args[0]);
    const winners=draw?[]:all.filter(p=>{if(lib.config.mode==='guozhan'){const winner=game.playerMap?.[game.winner_id];return !!winner&&winner.isFriendOf(p);}try{return game.checkOnlineResult?.(p)===true;}catch{return false;}}).map(seat);
    outcome={winners,draw,winner:living.length===1?seat(living[0]):null,text:typeof args[0]==='string'?plain(args[0]):null};
    outstanding.push({kind:'MATCH_OVER',outcome});return nativeOver(...args);
  };
  return {start: () => { if (!started) { started = true; return transport.connect(); } }, snapshot, apply, publish,
    selectRoster(data,onApply){const pool=filterNetworkPool(data.pool,config);if(!pool.length)throw Error('当前模式没有可选武将');rosterSelection=new NetworkSelection({...data,pool},launch.settings,[...humanSeats].sort((a,b)=>a-b),onApply);publish(true).catch(e=>hooks.send?.('play-error',{message:e.message}));},
    stop() { stopped = true; transport.close(); },
    fault(error) { fatal = true; failure = error.message || String(error); outstanding.push({kind: 'ENGINE_ERROR', reason: failure}); publish(true).catch(() => {}); }};
}
