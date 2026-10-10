"""Loopback-only relay. Game rules and state execution belong to the Host engine."""
import copy
import secrets
import threading
import time


class LocalRooms:
    def __init__(self):
        self.rooms = {}
        self.lock = threading.RLock()

    def create(self, generals):
        with self.lock:
            self._expire()
            if len(self.rooms) >= 32:
                raise ValueError('本机会话已满，请关闭旧会话')
            ident = secrets.token_hex(4)
            room = dict(id=ident, code=ident.upper(), phase='lobby', generals=generals,
                        members={'host': dict(seat=0, token=secrets.token_urlsafe(24))},
                        engineToken=None, actions=[], seen={}, events=[], revision=0,
                        snapshot=None, actionSeq=0, engineAck=0, created=time.monotonic(),
                        hostSeen=time.monotonic(), seed=secrets.token_hex(16))
            self.rooms[ident] = room
            return self.credentials(room, 'host')

    def _expire(self):
        for ident, room in list(self.rooms.items()):
            if room['phase'] == 'closed' or time.monotonic() - room['created'] > 12 * 3600:
                del self.rooms[ident]

    def credentials(self, room, member):
        return dict(room=room['id'], code=room['code'], member=member,
                    seat=room['members'][member]['seat'], token=room['members'][member]['token'])

    def join(self, code):
        with self.lock:
            room = self.rooms.get(str(code).strip().lower())
            if not room or room['phase'] != 'lobby':
                raise ValueError('会话不存在或已经开局')
            if 'client' in room['members']:
                raise ValueError('第一阶段仅支持两个真人客户端')
            room['members']['client'] = dict(seat=1, token=secrets.token_urlsafe(24))
            return self.credentials(room, 'client')

    def auth(self, ident, token, engine=False):
        room = self.rooms.get(ident)
        if not room:
            raise ValueError('本机会话不存在；服务重启后需要重新创建')
        if engine and room['engineToken'] and secrets.compare_digest(str(token), room['engineToken']):
            return room, 'engine'
        for member, data in room['members'].items():
            if secrets.compare_digest(str(token), data['token']):
                return room, member
        raise PermissionError('会话凭据无效')

    def start(self, ident, token, match):
        with self.lock:
            room, member = self.auth(ident, token)
            if member != 'host' or room['phase'] != 'lobby' or 'client' not in room['members']:
                raise ValueError('需由Host在Client加入后开始')
            room.update(phase='running', match=match, engineToken=secrets.token_urlsafe(32))
            return dict(match=match, engineToken=room['engineToken'], seed=room['seed'])

    def launch(self, ident, token):
        with self.lock:
            room, member = self.auth(ident, token, True)
            if member != 'engine' or room['phase'] != 'running':
                raise PermissionError('只有Host引擎可以启动正式GameState')
            # A one-use boot lease prevents accidentally opening a second authority.
            if room.get('booted'):
                raise ValueError('Host引擎已经启动，不能创建第二份正式状态')
            room['booted'] = True
            room['hostSeen'] = time.monotonic()
            return dict(match=room['match'], seed=room['seed'], generals=room['generals'])

    def action(self, ident, token, value):
        with self.lock:
            room, member = self.auth(ident, token)
            if room['phase'] != 'running':
                raise ValueError('会话尚未开局或已经关闭')
            if time.monotonic() - room['hostSeen'] > 8:
                raise ValueError('Host连接中断，请等待Host恢复；未接管为AI')
            if not isinstance(value, dict) or set(value) != {'id', 'prompt', 'revision', 'op', 'ref'}:
                raise ValueError('ACTION字段无效，不允许写入GameState')
            if not isinstance(value['id'], str) or not 1 <= len(value['id']) <= 80:
                raise ValueError('ACTION ID无效')
            if not isinstance(value['prompt'], str) or len(value['prompt']) > 80 or type(value['revision']) is not int:
                raise ValueError('选择版本无效')
            if value['op'] not in {'card', 'target', 'button', 'control'} or not isinstance(value['ref'], str) or len(value['ref']) > 120:
                raise ValueError('操作类型或引用无效')
            key = (member, value['id'])
            if key in room['seen']:
                return dict(queued=room['seen'][key], duplicate=True)
            if len(room['actions']) >= 128:
                raise ValueError('Host尚未处理操作，请稍后重试')
            room['actionSeq'] += 1
            packet = dict(type='ACTION', seq=room['actionSeq'], member=member,
                          seat=room['members'][member]['seat'], action=copy.deepcopy(value))
            room['actions'].append(packet)
            room['seen'][key] = packet['seq']
            if len(room['seen']) > 4096:
                room['seen'].pop(next(iter(room['seen'])))
            return dict(queued=packet['seq'], duplicate=False)

    def publish(self, ident, token, value):
        with self.lock:
            room, member = self.auth(ident, token, True)
            if member != 'engine' or room['phase'] != 'running':
                raise PermissionError('只有Host引擎可以发布EVENT/SNAPSHOT')
            if set(value) != {'snapshot', 'events', 'ack'} or not isinstance(value['snapshot'], dict) or not isinstance(value['events'], list):
                raise ValueError('Host发布字段无效')
            ack = value['ack']
            envelope=value['snapshot']
            if set(envelope)!={'viewSchema','playerViews'} or envelope['viewSchema']!=1 or set(envelope['playerViews'])!={'0','1'} or value['events']:
                raise ValueError('只接受玩家视图，不接受完整Host状态')
            for view in envelope['playerViews'].values():
                if set(view)!={'snapshot','events'} or view['snapshot'].get('viewSchema')!=1 or 'private' in view['snapshot'] or not isinstance(view['events'],list):
                    raise ValueError('玩家视图格式无效')
            if type(ack) is not int or not room['engineAck'] <= ack <= room['actionSeq'] or len(value['events']) > 256:
                raise ValueError('Host确认序号无效')
            room['hostSeen'] = time.monotonic()
            room['revision'] += 1
            room['snapshot'] = copy.deepcopy(value['snapshot'])
            room['engineAck'] = ack
            room['actions'] = [a for a in room['actions'] if a['seq'] > ack]
            for player_seat,view in envelope['playerViews'].items():
                for event in view['events']:
                    room['events'].append(dict(type='EVENT', seq=len(room['events']) + room.get('eventBase', 0) + 1,
                                           recipient=int(player_seat),revision=room['revision'], data=copy.deepcopy(event)))
            if len(room['events']) > 2048:
                removed = len(room['events']) - 2048
                room['events'] = room['events'][removed:]
                room['eventBase'] = room.get('eventBase', 0) + removed
            return dict(revision=room['revision'])

    def poll(self, ident, token, after=0, engine=False):
        with self.lock:
            room, member = self.auth(ident, token, engine)
            if member == 'engine':
                room['hostSeen'] = time.monotonic()
                return dict(phase=room['phase'], actions=copy.deepcopy(room['actions']))
            player_seat=room['members'][member]['seat']
            snapshot=copy.deepcopy(room['snapshot']['playerViews'][str(player_seat)]['snapshot']) if room['snapshot'] else None
            return dict(phase=room['phase'], members=len(room['members']),
                        hostOnline=time.monotonic() - room['hostSeen'] <= 8,
                        revision=room['revision'], snapshot=snapshot,
                        events=[{k:copy.deepcopy(v) for k,v in e.items() if k!='recipient'} for e in room['events'] if e['seq']>after and e['recipient']==player_seat][-256:])

    def close(self, ident, token):
        with self.lock:
            room, member = self.auth(ident, token)
            if member != 'host':
                raise PermissionError('只有Host可以结束本机会话')
            room['phase'] = 'closed'
            return dict(closed=True)
