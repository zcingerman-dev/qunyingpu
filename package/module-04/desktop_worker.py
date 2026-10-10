"""Run this helper in the desktop client's local work environment. No provider API keys."""
import argparse
import json
import time
from pathlib import Path
from urllib.request import Request,urlopen

def main():
    p=argparse.ArgumentParser();p.add_argument('--connection',required=True,type=Path);p.add_argument('action',choices=['watch','claim','answer','disconnect']);p.add_argument('--file',type=Path);a=p.parse_args()
    c=json.loads(a.connection.read_text(encoding='utf8'));folder=a.connection.parent
    inbox=folder/('inbox-'+a.connection.stem+'.json');answer=folder/('answer-'+a.connection.stem+'.json')
    def call(action,data=None):
        r=Request(c['url']+'/studio/worker/'+action,data=json.dumps(data or {}).encode(),headers={'Content-Type':'application/json','X-Desktop-Token':c['token']},method='POST')
        with urlopen(r,timeout=20) as response:return json.load(response)
    if a.action=='answer':print(json.dumps(call('answer',json.loads(a.file.read_text(encoding='utf8'))),ensure_ascii=False));return
    if a.action!='watch':print(json.dumps(call(a.action),ensure_ascii=False));return
    print('本机任务通道已启动；读取 '+str(inbox)+'，回答写入 '+str(answer),flush=True)
    last=None
    try:
        while True:
            call('heartbeat')
            if answer.exists():
                try:
                    result=json.loads(answer.read_text(encoding='utf8'));call('answer',result);answer.unlink();last=None
                except (ValueError,OSError) as e:print('回答未提交：'+str(e),flush=True)
            task=call('claim')['task']
            if task and task['lease']!=last:
                inbox.write_text(json.dumps(task,ensure_ascii=False,indent=2),encoding='utf8');last=task['lease'];print('新任务：'+task['purpose'],flush=True)
            if not task and inbox.exists():inbox.unlink()
            time.sleep(3)
    except KeyboardInterrupt:pass
    finally:
        try:call('disconnect')
        except OSError:pass
        if inbox.exists():inbox.unlink()
if __name__=='__main__':main()
