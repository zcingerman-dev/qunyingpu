import {buildLocalViewEnvelope} from './network-view.js';
// Transport boundary: clients send ACTION only; the authority publishes state.
export class Transport {
  onMessage(fn) { this.listener = fn; return this; }
  onError(fn) { this.errorListener = fn; return this; }
  async connect() { throw Error('Transport.connect not implemented'); }
  async send() { throw Error('Transport.send not implemented'); }
  close() { this.closed = true; clearTimeout(this.timer); }
}

export class HttpTransport extends Transport {
  constructor({room, token, role = 'client', base = './api/network/', playToken, interval = 150}) {
    super(); Object.assign(this, {room, token, role, base, playToken, interval}); this.cursor = 0;
  }
  async request(endpoint, body) {
    const response = await fetch(this.base + this.room + '/' + endpoint, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {'X-Room-Token': this.token, ...(body === undefined ? {} : {'Content-Type': 'application/json', 'X-Play-Token': this.playToken})},
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await response.json(); if (!response.ok) throw Error(data.error || '本机通信失败'); return data;
  }
  async connect() {
    this.closed = false;
    const tick = async () => {
      if (this.closed) return;
      try {
        const packet = await this.request((this.role === 'engine' ? 'inbox' : 'poll') + '?after=' + this.cursor);
        if (this.closed) return;
        await this.listener?.(packet);
        if (this.role !== 'engine') for (const e of packet.events || []) this.cursor = Math.max(this.cursor, e.seq);
      } catch (error) { this.errorListener?.(error); }
      if (!this.closed) this.timer = setTimeout(tick, this.interval);
    };
    await tick(); return this;
  }
  async send(packet) {
    if (this.closed) throw Error('通信已关闭');
    if (packet.type === 'ACTION' && this.role === 'client') return this.request('action', packet.action);
    if (packet.type === 'PUBLISH' && this.role === 'engine') {const {snapshot,events,ack}=packet.data;return this.request('publish',{snapshot:buildLocalViewEnvelope(snapshot,events),events:[],ack});}
    throw Error('角色无权发送此消息');
  }
}

// Same boundary for deterministic unit tests; this never runs the game engine.
export function memoryPair() {
  class Memory extends Transport {
    async connect() { this.closed = false; return this; }
    async send(packet) { if (this.closed || this.peer.closed) throw Error('通信已关闭'); await this.peer.listener?.(structuredClone(packet)); }
  }
  const a = new Memory(), b = new Memory(); a.peer = b; b.peer = a; return [a, b];
}

export class ClientReplica {
  #value = null;
  revision = 0;
  apply(packet) {
    if (packet.revision < this.revision) return false;
    this.revision = packet.revision; this.#value = structuredClone(packet.snapshot); return true;
  }
  read() { return structuredClone(this.#value); }
  action(prompt, op, ref, id = crypto.randomUUID()) {
    return {type: 'ACTION', action: {id, prompt: prompt.id, revision: prompt.revision, op, ref}};
  }
}
