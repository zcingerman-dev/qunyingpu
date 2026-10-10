import {NetworkTable} from './network-table.js';
import {ActionGate} from './network-options.js';
import {HttpTransport, ClientReplica} from './network-transport.js';
const $ = id => document.getElementById(id), replica = new ClientReplica();
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let credentials, transport, token, logs = [], submitting = false, currentPrompt, starting = false, lastActionId = null;
const gate=new ActionGate(),table=new NetworkTable($('network-table'),submitAction);
async function api(path, body, roomToken) {
  const response = await fetch('./api/network/' + path, {method: 'POST', headers: {'Content-Type':'application/json','X-Play-Token':token, ...(roomToken ? {'X-Room-Token':roomToken} : {})}, body:JSON.stringify(body)});
  const data = await response.json(); if (!response.ok) throw Error(data.error || '操作失败'); return data;
}
function notice(text) { $('connection-status').textContent = text; }
function hash(state) { let n = 2166136261; for (const ch of JSON.stringify(state)) n = Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0; return n.toString(16).padStart(8,'0'); }
function paint(packet) {
  $('role-label').textContent = `${credentials.member === 'host' ? 'Host' : 'Client'} · ${credentials.seat + 1}号位 · 会话码 ${credentials.code}`;
  $('session-status').textContent = packet.phase === 'lobby' ? `${packet.members}/2 位玩家已加入，等待Host开局` : packet.phase === 'closed' ? '本机会话已结束' : packet.hostOnline ? 'Host在线 · 操作由Host规则引擎验证' : 'Host连接中断 · 等待恢复';
  $('start-network').hidden = credentials.member !== 'host' || packet.phase !== 'lobby';
  $('start-network').disabled = packet.members !== 2 || starting;
  $('close-network').hidden = credentials.member !== 'host' || packet.phase === 'closed';
  $('new-network').hidden = packet.phase !== 'closed';
  if (packet.phase === 'closed') { transport.close(); currentPrompt=null; table.close('本机会话已结束'); return; }
  gate.receive(packet);submitting=gate.locked;
  const s = replica.read(); if (!s) return;
  const pub = s.public;
  document.body.classList.add('network-playing');currentPrompt=s.prompt;table.render(s,{seat:credentials.seat,locked:submitting,online:packet.hostOnline});
  $('state-proof').textContent = `玩家视图已过滤 · 公开状态 ${hash(pub)} · 版本 ${packet.revision}`;
  $('network-events').textContent = logs.slice(-35).join('\n');
}
async function attach(data) {
  credentials = data; sessionStorage.setItem('play-network-client', JSON.stringify(data));
  $('lobby').hidden = true; $('session').hidden = false;
  transport = new HttpTransport({...data, playToken: token});
  transport.onMessage(packet => {
    replica.apply(packet);
    for (const e of packet.events || []) {
      const d = e.data; logs.push(`#${e.seq} ${d.kind} ${d.event || d.op || ''}${d.reason ? '：' + d.reason : ''}`);
      if (d.kind === 'ACTION_ACCEPTED' && d.id === lastActionId) notice('Host已接受操作');
      if (d.kind === 'ACTION_REJECTED' && d.seat === credentials.seat) notice('Host拒绝操作：' + d.reason);
    }
    paint(packet);
  }).onError(error => notice('本机连接异常：' + error.message));
  notice('已建立本机连接'); await transport.connect();
}
$('create-host').onclick = async () => { try { await attach(await api('create', {generals:[$('host-general').value,$('client-general').value]})); } catch(e) {notice(e.message);} };
$('join-client').onclick = async () => { try { await attach(await api('join', {code:$('room-code').value})); } catch(e) {notice(e.message);} };
$('start-network').onclick = async () => {
  if (starting) return; starting = true; $('start-network').disabled = true;
  try {
    const result = await api(credentials.room + '/start', {}, credentials.token);
    sessionStorage.setItem('play-network-engine:' + credentials.room, JSON.stringify(result));
    $('network-engine').src = './arena.html?network=' + credentials.room;
    notice('Host正在加载原生引擎…');
  } catch(e) { starting = false; notice(e.message); }
};
$('close-network').onclick = async () => { try { await api(credentials.room + '/close', {}, credentials.token); $('network-engine').src='about:blank'; } catch(e) {notice(e.message);} };
$('new-network').onclick = () => { transport?.close(); sessionStorage.removeItem('play-network-client'); location.reload(); };
async function submitAction(op,ref){
 if(!currentPrompt||submitting||!transport)return;
 const action=replica.action(currentPrompt,op,ref);if(!gate.begin(action))return;
 submitting=true;table.setLocked(true);
 try{lastActionId=action.action.id;const result=await transport.send(action);notice(`ACTION #${result.queued} 已提交，等待Host验证`);}
 catch(e){gate.reset();submitting=false;notice(e.message);table.render(replica.read(),{seat:credentials.seat,locked:false,online:true});}
}
window.addEventListener('message', async event => {
  if (event.origin !== location.origin || event.source !== $('network-engine').contentWindow) return;
  const data = event.data;
  if (data.type === 'play-error') notice('Host引擎异常：' + data.message);
  if (data.type === 'play-response' && data.error) notice('Host操作失败：' + data.error);
  if (data.type === 'play-ready') notice('Host引擎已启动');
  if (data.type === 'play-roster') {
    const roomGenerals = [$('host-general').value,$('client-general').value];
    const picks = roomGenerals.map(id => data.pool.find(p=>p.id === id)?.key);
    if (picks.some(x=>!x)) { notice('选将挂载失败；请关闭会话'); return; }
    $('network-engine').contentWindow.postMessage({type:'play-roster-apply', roster:{humanSeat:0,revealAI:false,seats:picks.map(p=>({picks:[p],method:'manual',locked:true}))}}, location.origin);
  }
});
try {
  const state = await (await fetch('./api/state')).json(); token = state.token;
  const catalog = await (await fetch('./play-catalog.json')).json();
  const pool = [...new Map(catalog.versions.filter(v=>v.scope==='character/standard').map(v=>[v.id,v])).values()];
  for (const id of ['host-general','client-general']) $(id).innerHTML = pool.map(v=>`<option value="${escape(v.id)}">${escape(v.name)}</option>`).join('');
  $('host-general').value='guanyu'; $('client-general').value='caocao';
  const saved = sessionStorage.getItem('play-network-client');
  if (saved) await attach(JSON.parse(saved)); else notice('本机服务在线 · 请建立Host或加入Client');
} catch(e) {notice(e.message); $('new-network').hidden=false;}
