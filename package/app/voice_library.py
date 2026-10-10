"""Existing local voice assets, grouped by stripped character name and version."""
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent

class Voices:
    def __init__(self, catalog, skins):
        self.skins = skins
        self.by_name = defaultdict(list)
        self.files = defaultdict(list)
        rows = json.loads((ROOT / 'module-01/resource-index.json').read_text(encoding='utf-8'))
        for row in rows:
            if row.get('kind') != 'audio':
                continue
            file = {'url': '/play/resource/' + quote(row['path'], safe='/'),
                    'hash': row.get('sha256', row['path']),
                    'label': Path(row['path']).name,
                    'source': ' / '.join(row.get('sourceLabels', []) or [row.get('origin', '原包')])}
            paths = [row['path']] + [a.get('logicalPath', '') for a in row.get('aliases', [])]
            for path in set(paths):
                kind = 'die' if '/die/' in path else 'skill' if '/skill/' in path else None
                if kind:
                    stem = Path(path).stem
                    self.files[(kind, stem)].append(file)
                    bare = re.sub(r'\d+$', '', stem)
                    if bare != stem:
                        self.files[(kind, bare)].append(file)
        for v in catalog['versions']:
            name = skins.version_names.get(v['versionId'])
            if not name:
                continue
            skills = []
            for skill in v.get('skillDetails', []):
                audio = self.unique(self.files[('skill', skill['id'] + '_' + v['id'])] or
                                    self.files[('skill', skill['id'])])
                if audio:
                    skills.append({'id': skill['id'], 'name': skill.get('name') or skill['id'], 'files': audio})
            death = self.unique(self.files[('die', v['id'])])
            if skills or death:
                self.by_name[name].append({'key': v['versionId'], 'id': v['id'], 'name': v['name'],
                                          'scope': v['scope'], 'skills': skills, 'death': death})

    @staticmethod
    def unique(files):
        return list({f['hash']: f for f in files}.values())

    def get(self, key, binding='', name=''):
        name = binding or self.skins.version_names.get(key, '') or name
        return {'name': name, 'versions': self.by_name.get(name, [])}
