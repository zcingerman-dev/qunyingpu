"""Unified local Wiki/play host; retain the two existing databases and asset tree."""
import argparse
import importlib.util
import json
import mimetypes
import webbrowser
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse, unquote, parse_qs

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

play = load('unified_play', ROOT/'module-03/play_server.py')
wiki = load('unified_wiki', ROOT/'module-02/wiki_server.py')
studio = load('unified_studio', ROOT/'module-04/studio_server.py')
skin_module = load('unified_skins', HERE/'skin_library.py')
voice_module = load('unified_voices', HERE/'voice_library.py')
CATALOG = json.loads((ROOT/'module-03/play-catalog.json').read_text(encoding='utf-8'))
SKINS = skin_module.Library(CATALOG,wiki.BASE)
VOICES = voice_module.Voices(CATALOG,SKINS)
studio.SKINS = SKINS
VERSION_LINKS = {}
REVERSE_LINKS = {}
for version in wiki.BASE['versions']:
    candidates = [v for v in CATALOG['versions'] if (v['id'],v['scope'],v.get('source')) ==
        (version['id'],version['scope'],version.get('source')) and
        [s['id'] for s in v['skillDetails']] == [s['id'] for s in version['skillDetails']]]
    if len(candidates) == 1:
        VERSION_LINKS[version['versionId']] = candidates[0]['versionId']
        REVERSE_LINKS.setdefault(candidates[0]['versionId'], version['versionId'])

class Handler(play.Handler, wiki.Handler):
    def log_message(self, format, *args):
        pass

    def redirect(self, target):
        self.send_response(302)
        self.send_header('Location', target)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def file(self, path, mime_override=None):
        if not path or not path.is_file():
            return self.json({'error':'文件不存在'}, 404)
        data = path.read_bytes()
        mime = mime_override or ('text/javascript' if path.suffix == '.js' else mimetypes.guess_type(str(path))[0] or 'text/plain')
        if mime.startswith('text/'):
            mime += '; charset=utf-8'
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def dispatch(self, module, prefix, method):
        original = self.path
        self.path = self.path[len(prefix):]
        try:
            getattr(module.Handler, method)(self)
        finally:
            self.path = original

    def do_GET(self):
        if not self.host_ok():
            return self.json({'error':'仅允许本机地址'}, 403)
        path = urlparse(self.path).path
        decoded = unquote(path)
        if '\\' in decoded or any(p in {'.','..'} or ':' in p for p in PurePosixPath(decoded).parts):
            return self.json({'error':'路径无效'}, 404)
        if path in {'/wiki', '/play', '/personal', '/ai'}:
            return self.redirect(path+'/index.html')
        if path == '/api/card-improvements':
            return self.json({'changes':studio.card_improvements.read(studio.connect),'links':REVERSE_LINKS})
        if path == '/api/skin-library':
            return self.json(SKINS.overview())
        if path == '/api/skins':
            params=parse_qs(urlparse(self.path).query)
            key=params.get('version',[''])[0]
            binding=studio.skin_bindings().get(key,'')
            name=skin_module.normalize(params.get('name',[''])[0],SKINS.protected)
            return self.json(SKINS.get(key,binding,name))
        if path == '/api/voices':
            params=parse_qs(urlparse(self.path).query)
            key=params.get('version',[''])[0]
            name=skin_module.normalize(params.get('name',[''])[0],SKINS.protected)
            return self.json(VOICES.get(key,studio.skin_bindings().get(key,''),name))
        if path.startswith('/skins/'):
            rel=decoded[len('/skins/'):]
            mime=SKINS.by_hash.get(Path(rel).stem,{}).get('mime') if rel.startswith('images/') else 'image/jpeg'
            return self.file(SKINS.image(rel),mime)
        if path.startswith('/wiki/api/'):
            return self.dispatch(wiki, '/wiki', 'do_GET')
        if path.startswith('/play/'):
            return self.dispatch(play, '/play', 'do_GET')
        if path.startswith('/studio/media/'):
            try:
                mime,data=studio.media(path);self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
            except ValueError as e: return self.json({'error':str(e)},404)
        if path.startswith('/studio/api/'):
            try: return self.json(studio.api_get(path[len('/studio/api'):]))
            except (ValueError,KeyError,TypeError) as e: return self.json({'error':str(e)},400)
        if path.startswith('/personal/') or path.startswith('/ai/') or path.startswith('/studio/'):
            rel=decoded.split('/',2)[-1]
            if rel in {'index.html','studio.css','common.js','personal.js','ai.js','diy-skills.js','image-picker.js','report.js','test-stream.js','improvements.js','runner.html','background-runner.js','outer-ui.js','status-view.js'}:
                return self.file(ROOT/'module-04'/rel)
            return self.json({'error':'文件不存在'},404)
        if path.startswith('/wiki/'):
            original = self.path
            self.path = '/module-02/'+self.path[len('/wiki/'):]
            try:
                return wiki.Handler.do_GET(self)
            finally:
                self.path = original
        if path.startswith('/module-02/'):
            return self.redirect('/wiki/'+self.path[len('/module-02/'):])
        if path.startswith('/module-03/'):
            return self.redirect('/play/'+self.path[len('/module-03/'):])
        if path.startswith('/module-01/'):
            return wiki.Handler.do_GET(self)
        if path == '/api/overview':
            with wiki.connect() as db:
                row = db.execute('SELECT revision,state FROM revisions ORDER BY revision DESC LIMIT 1').fetchone()
            saved = wiki.validate_state(json.loads(row[1]))
            with play.connect() as db:
                matches = db.execute('SELECT COUNT(*) FROM matches').fetchone()[0]
            s = play.state()['settings']
            retained=set(saved['entities'])|set(saved['identityOverrides'].values())
            people=sum(e['id'] not in wiki.NETWORK.get('identityLinks',{}) or e['id'] in retained for e in wiki.BASE['entities'])+len(saved['customEntities'])
            return self.json({'people':people,
                'versions':len(wiki.BASE['versions'])+len(saved['customVersions']),
                'wikiRevision':row[0], 'matches':matches, 'mode':s['mode'], 'players':s['players']})
        if path == '/api/version-link':
            params = parse_qs(urlparse(self.path).query)
            if 'wiki' in params:
                ident = params['wiki'][0]
                return self.json({'wikiVersion':ident,'playVersion':VERSION_LINKS.get(ident)})
            if 'play' in params:
                ident = params['play'][0]
                return self.json({'playVersion':ident,'wikiVersion':REVERSE_LINKS.get(ident)})
            return self.json({'error':'缺少武将版本'}, 400)
        if path in {'/checkFile','/checkDir','/readFileAsText','/getFileList'}:
            # Native engine's browser file adapter uses these absolute, read-only routes.
            return play.Handler.do_GET(self)
        if path in {'/', '/index.html'}:
            return self.file(HERE/'index.html')
        if path in {'/readme.md', '/README.md'}:
            return self.file(ROOT/'readme.md')
        rel = unquote(path).lstrip('/')
        if '\\' in rel or any(p in {'.','..'} or ':' in p for p in PurePosixPath(rel).parts):
            return self.json({'error':'路径无效'}, 404)
        files = {'app/character-search.js','app/general-packs.js','app/general-platforms.json','app/app.css','app/app.js','app/shell.css','app/shell.js','app/readme.html','app/readme.js','app/skin-library.js','app/skin-library.css'}
        if rel in files:
            return self.file(ROOT/rel)
        return self.json({'error':'文件不存在'}, 404)

    def do_PUT(self):
        if urlparse(self.path).path.startswith('/wiki/api/'):
            return self.dispatch(wiki, '/wiki', 'do_PUT')
        if urlparse(self.path).path.startswith('/play/api/'):
            return self.dispatch(play, '/play', 'do_PUT')
        return self.json({'error':'接口不存在'}, 404)

    def do_POST(self):
        path=urlparse(self.path).path
        if path.startswith('/studio/worker/'):
            try:
                if not self.host_ok() or self.headers.get('Origin') not in {None,f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'}:raise PermissionError('仅允许本机工作客户端')
                size=int(self.headers.get('Content-Length','0'))
                if not 0<size<=4*1024*1024:raise ValueError('回答内容过大')
                value=json.loads(self.rfile.read(size))
                return self.json(studio.desktop_bridge.worker(self.headers.get('X-Desktop-Token'),path.rsplit('/',1)[-1],value))
            except PermissionError as e:return self.json({'error':str(e)},403)
            except (ValueError,KeyError,TypeError) as e:return self.json({'error':str(e)},400)
        if urlparse(self.path).path.startswith('/studio/api/'):
            try:
                value=self.read_body(limit=64*1024*1024);value['_base']=f'http://127.0.0.1:{self.server.server_port}'
                return self.json(studio.api_post(urlparse(self.path).path[len('/studio/api'):],value))
            except PermissionError as e: return self.json({'error':str(e)},403)
            except (ValueError,KeyError,TypeError,json.JSONDecodeError) as e: return self.json({'error':str(e)},400)
        if urlparse(self.path).path.startswith('/wiki/api/'):
            return self.dispatch(wiki, '/wiki', 'do_POST')
        if urlparse(self.path).path.startswith('/play/api/'):
            return self.dispatch(play, '/play', 'do_POST')
        return self.json({'error':'接口不存在'}, 404)

    def do_HEAD(self):
        # Do not fall back to SimpleHTTPRequestHandler's unrestricted filesystem root.
        self.send_response(405)
        self.send_header('Allow', 'GET, POST, PUT')
        self.send_header('Content-Length', '0')
        self.end_headers()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8767)
    parser.add_argument('--wiki-db', type=Path, default=ROOT/'module-02/data/wiki.sqlite')
    parser.add_argument('--play-db', type=Path, default=ROOT/'module-03/data/play.sqlite')
    parser.add_argument('--personal-db', type=Path, default=ROOT/'module-04/data/personal.sqlite')
    parser.add_argument('--open-browser', action='store_true')
    args = parser.parse_args()
    wiki.initialize(args.wiki_db)
    play.DB = args.play_db.resolve()
    play.initialize()
    studio.initialize(args.personal_db, play)
    try:
        server = play.PlayHTTPServer(('127.0.0.1', args.port), Handler)
    except OSError:
        print(f'端口 {args.port} 已在使用，请关闭原来的启动窗口后重试。', flush=True)
        raise SystemExit(1)
    url = f'http://127.0.0.1:{args.port}/index.html'
    studio.background_jobs.configure(studio,f'http://127.0.0.1:{args.port}')
    print(f'群英谱统一入口 {url}', flush=True)
    if args.open_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        studio.background_jobs.shutdown()
        server.server_close()

if __name__ == '__main__':
    main()
