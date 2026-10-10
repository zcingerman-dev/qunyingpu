"""Managed headless local rule-engine workers, independent of frontend tabs."""
import json
import os
from pathlib import Path
import subprocess
import threading
import time
import ctypes
from datetime import datetime,timezone

BASE='';STUDIO=None;PROCESSES={};LOCK=threading.RLock()
HERE=Path(__file__).resolve().parent
def configure(studio,base):
    global STUDIO,BASE
    STUDIO=studio;BASE=base
def browser():
    choices=[os.environ.get('SANGUOSHA_BROWSER',''),r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',r'C:\Program Files\Google\Chrome\Application\chrome.exe',r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
    return next((p for p in choices if p and Path(p).is_file()),None)
def ensure(key):
    if not BASE:return
    with LOCK:
        old=PROCESSES.get(key)
        if old and old['process'].poll() is None:return
        job=STUDIO.job_get(key)
        if job['status'] not in {'running','cloning','summarizing','reporting'}:return
        exe=browser()
        if not exe:
            job.update(status='paused',pauseReason='未找到本机后台引擎浏览器，请安装 Edge 或配置 SANGUOSHA_BROWSER');STUDIO.job_save(job);return
        profile=STUDIO.DB.parent/'background'/key;profile.mkdir(parents=True,exist_ok=True)
        out=open(profile/'runner.log','ab')
        cmd=[exe,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-renderer-backgrounding','--remote-debugging-port=0','--remote-allow-origins=http://127.0.0.1','--window-size=1280,800','--user-data-dir='+str(profile),BASE+'/ai/runner.html?job='+key]
        # Errors belong in the task panel; a background helper must not display
        # system loader dialogs on the user's desktop. No sandbox is disabled.
        previous=ctypes.windll.kernel32.SetErrorMode(0x8003) if os.name=='nt' else None
        try:p=subprocess.Popen(cmd,stdout=out,stderr=out,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        except OSError as e:out.close();job.update(status='paused',pauseReason='后台引擎启动失败：'+str(e));STUDIO.job_save(job);return
        finally:
            if previous is not None:ctypes.windll.kernel32.SetErrorMode(previous)
        managed=dict(process=p,log=out,profile=profile,captureAt=0,image='',intentional=False,started=time.monotonic());PROCESSES[key]=managed
        job['runner']=dict(status='starting',pid=p.pid);STUDIO.job_save(job)
        threading.Thread(target=monitor,args=(key,managed),daemon=True).start()
        threading.Thread(target=watch,args=(key,managed),daemon=True).start()
def watch(key,managed):
    while managed['process'].poll() is None:
        time.sleep(10)
        if managed['intentional']:return
        try:
            with STUDIO.LOCK:
                job=STUDIO.job_get(key)
                if job['status'] in {'complete','review'}:
                    if time.monotonic()-managed.get('idleAt',time.monotonic())>30:stop(key);return
                    managed.setdefault('idleAt',time.monotonic());continue
                managed.pop('idleAt',None)
                if job['status']=='paused' or job.get('pendingCalls'):continue
                last=job.get('runner',{}).get('seenAt')
                elapsed=(datetime.now(timezone.utc)-datetime.fromisoformat(last)).total_seconds() if last else time.monotonic()-managed['started']
                live=job.get('live',{})
                progress=(live.get('status') or {}).get('events')
                signature=(live.get('match'),progress,json.dumps(live.get('lines',[])[-1:],ensure_ascii=False))
                if signature!=managed.get('progress'):managed.update(progress=signature,progressAt=time.monotonic())
                stalled=job.get('active') and time.monotonic()-managed.get('progressAt',time.monotonic())>300
                if elapsed>90 or stalled:
                    job.update(status='paused',pauseReason='后台连接失去响应' if elapsed>90 else '当前局5分钟没有新事件，请检查原始日志或结束中断局');STUDIO.job_save(job);stop(key)
                    if job.get('active'):STUDIO.optimization.finish(STUDIO,job,{'game':dict(match=job['active']['match'],outcome='fault',fault=job['pauseReason'],rounds=0)})
                    return
        except ValueError:stop(key);return
def monitor(key,managed):
    process=managed['process'];process.wait();managed['log'].close()
    try:
        with STUDIO.LOCK:
            job=STUDIO.job_get(key)
            if managed['intentional'] or job['status'] in {'complete','review'}:return
            if job.get('active'):
                STUDIO.optimization.finish(STUDIO,job,{'game':dict(match=job['active']['match'],outcome='fault',fault='后台引擎已停止，当前局中断',rounds=0)})
            else:job.update(status='paused',pauseReason='后台引擎启动失败（退出码 '+str(process.returncode)+'）。请通过项目正常启动脚本重启本机服务，再续跑；系统DLL存在时无需重装或下载DLL。');STUDIO.job_save(job)
    except ValueError:pass
def stop(key):
    with LOCK:
        item=PROCESSES.pop(key,None)
        if item:
            item['intentional']=True
            if item['process'].poll() is None:
                # This PID was created here with an isolated profile. Stop its tree,
                # never all browser processes or the user's browser session.
                if os.name=='nt':subprocess.run(['taskkill','/PID',str(item['process'].pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW,timeout=10)
                else:item['process'].terminate()
def shutdown():
    for key in list(PROCESSES):stop(key)
def capture(key):
    with LOCK:item=PROCESSES.get(key)
    if not item or item['process'].poll() is not None:return dict(error='当前没有活动牌桌，可查看逐局回放')
    if time.monotonic()-item['captureAt']<4 and item['image']:return dict(image=item['image'])
    portfile=item['profile']/'DevToolsActivePort'
    if not portfile.is_file():return dict(error='后台牌桌正在加载')
    node=HERE.parent/'.runtime/node/node.exe'
    if not node.is_file():return dict(error='预览运行环境不可用，数据流仍正常运行')
    try:
        result=subprocess.run([str(node),str(HERE/'capture.cjs'),portfile.read_text().splitlines()[0],key],capture_output=True,text=True,timeout=10,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        if result.returncode:raise ValueError(result.stderr[:300])
        image='data:image/jpeg;base64,'+json.loads(result.stdout)['data'];item.update(captureAt=time.monotonic(),image=image);return dict(image=image)
    except (OSError,ValueError,subprocess.TimeoutExpired) as e:return dict(error='预览暂不可用：'+str(e))
