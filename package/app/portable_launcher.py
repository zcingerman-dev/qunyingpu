"""Portable launcher only; game rules and network protocol stay in their modules."""
import argparse,ctypes,json,os,socket,subprocess,sys,time,urllib.request,webbrowser
from pathlib import Path
from datetime import datetime
from ctypes import wintypes

ROOT=Path(__file__).resolve().parents[1]
HTTP=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def ready(kind,port):
 try:
  with HTTP.open(f'http://127.0.0.1:{port}'+('/health' if kind=='signal' else '/index.html'),timeout=1) as r:body=r.read(512*1024).decode('utf-8')
  if kind=='signal':v=json.loads(body);return v.get('ok') is True and v.get('service')=='signaling' and v.get('protocol')==1
  return '<title>群英谱 · 人物与实战</title>' in body
 except (OSError,ValueError,UnicodeError):return False
class OwnedJob:
 def __init__(self):
  class Basic(ctypes.Structure):
   _fields_=[('PerProcessUserTimeLimit',ctypes.c_int64),('PerJobUserTimeLimit',ctypes.c_int64),('LimitFlags',wintypes.DWORD),('MinimumWorkingSetSize',ctypes.c_size_t),('MaximumWorkingSetSize',ctypes.c_size_t),('ActiveProcessLimit',wintypes.DWORD),('Affinity',ctypes.c_size_t),('PriorityClass',wintypes.DWORD),('SchedulingClass',wintypes.DWORD)]
  class IO(ctypes.Structure):_fields_=[(s,ctypes.c_uint64) for s in ['ReadOperationCount','WriteOperationCount','OtherOperationCount','ReadTransferCount','WriteTransferCount','OtherTransferCount']]
  class Limits(ctypes.Structure):_fields_=[('BasicLimitInformation',Basic),('IoInfo',IO)]+[(s,ctypes.c_size_t) for s in ['ProcessMemoryLimit','JobMemoryLimit','PeakProcessMemoryUsed','PeakJobMemoryUsed']]
  self.kernel=ctypes.WinDLL('kernel32',use_last_error=True);k=self.kernel
  k.CreateJobObjectW.argtypes=[ctypes.c_void_p,wintypes.LPCWSTR];k.CreateJobObjectW.restype=wintypes.HANDLE
  k.SetInformationJobObject.argtypes=[wintypes.HANDLE,ctypes.c_int,ctypes.c_void_p,wintypes.DWORD]
  k.AssignProcessToJobObject.argtypes=[wintypes.HANDLE,wintypes.HANDLE];k.CloseHandle.argtypes=[wintypes.HANDLE]
  self.handle=k.CreateJobObjectW(None,None);info=Limits();info.BasicLimitInformation.LimitFlags=0x2000
  if not self.handle or not k.SetInformationJobObject(self.handle,9,ctypes.byref(info),ctypes.sizeof(info)):raise OSError('无法创建本次启动的进程管理器')
 def add(self,p):
  if not self.kernel.AssignProcessToJobObject(self.handle,int(p._handle)):p.terminate();raise OSError('无法管理服务进程，已停止启动')
 def close(self):
  if self.handle:self.kernel.CloseHandle(self.handle);self.handle=None
def start(kind,port,command,logs,job,env):
 if ready(kind,port):print(f'{kind} 已启动，复用端口 {port}。',flush=True);return None
 with socket.socket() as probe:
  try:probe.bind(('127.0.0.1',port))
  except OSError:raise RuntimeError(f'端口 {port} 被其他程序占用，请关闭对应程序或更改端口；没有终止其他程序。')
 with (logs/(kind+'.log')).open('ab') as out:p=subprocess.Popen(command,cwd=ROOT,env=env,stdout=out,stderr=out,creationflags=subprocess.CREATE_NO_WINDOW)
 job.add(p);end=time.monotonic()+40
 while time.monotonic()<end:
  if p.poll() is not None:raise RuntimeError(f'{kind} 启动失败，查看 {logs}。')
  if ready(kind,port):print(f'{kind} 已就绪（端口 {port}）。',flush=True);return p
  time.sleep(.2)
 raise RuntimeError(f'{kind} 启动超时，查看 {logs}。')
def port(v):
 v=int(v)
 if not 1<=v<=65535:raise argparse.ArgumentTypeError('端口须为1～65535')
 return v
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--kind',choices=['app','signal'],default='app');ap.add_argument('--with-signal',action='store_true');ap.add_argument('--lan',action='store_true');ap.add_argument('--app-port',type=port,default=8767);ap.add_argument('--signal-port',type=port,default=8771);ap.add_argument('--no-browser',action='store_true');ap.add_argument('--run-seconds',type=float,default=0)
 for name in ['wiki','play','personal']:ap.add_argument('--'+name+'-db')
 args=ap.parse_args();python=ROOT/'.runtime/python/python.exe';node=ROOT/'.runtime/node/node.exe'
 if not python.is_file() or not node.is_file():print('包内运行环境缺失，请完整解压后重试。');return 1
 if args.app_port==args.signal_port:print('本体和信令须使用不同端口。');return 1
 logs=ROOT/'.runtime/logs'/datetime.now().strftime('%Y%m%d-%H%M%S-%f');logs.mkdir(parents=True,exist_ok=True)
 env=os.environ.copy()
 for key in ['PYTHONHOME','PYTHONPATH','NODE_PATH','NODE_OPTIONS']:env.pop(key,None)
 env['SANGUOSHA_NODE']=str(node);env['PYTHONDONTWRITEBYTECODE']='1'
 children=[];job=OwnedJob()
 try:
  if args.kind=='app':
   command=[str(python),'-I','-B','-X','utf8','-u',str(ROOT/'app/server.py'),'--port',str(args.app_port)]
   for name in ['wiki','play','personal']:
    v=getattr(args,name+'_db')
    if v:command+=['--'+name+'-db',str(Path(v).resolve())]
   child=start('app',args.app_port,command,logs,job,env)
   if child:children.append(child)
  if args.kind=='signal' or args.with_signal:
   child=start('signal',args.signal_port,[str(node),str(ROOT/'signaling/server.mjs'),'--port',str(args.signal_port),'--host','0.0.0.0' if args.lan else '127.0.0.1'],logs,job,env)
   if child:children.append(child)
  if args.kind=='app':
   url=f'http://127.0.0.1:{args.app_port}/index.html';print('游戏入口：'+url,flush=True)
   if not args.no_browser:webbrowser.open(url)
  else:print(f'信令入口：ws://'+('本机局域网IP' if args.lan else '127.0.0.1')+f':{args.signal_port}/signal',flush=True)
  if children:print('运行时保留这个窗口；关闭窗口或按Ctrl+C结束本次启动的服务。',flush=True)
  end=time.monotonic()+args.run_seconds if args.run_seconds else None
  while children:
   if end and time.monotonic()>=end:break
   if any(p.poll() is not None for p in children):raise RuntimeError('服务已停止，请查看日志：'+str(logs))
   time.sleep(.4)
  return 0
 except KeyboardInterrupt:return 0
 except (OSError,RuntimeError) as e:print('启动失败：'+str(e),flush=True);return 1
 finally:
  job.close()
  for p in children:
   try:p.wait(timeout=5)
   except subprocess.TimeoutExpired:p.terminate()
if __name__=='__main__':raise SystemExit(main())
