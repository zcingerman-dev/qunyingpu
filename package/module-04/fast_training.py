"""Prospective forecasts and batch/individual coaching, independent of rendering."""
import hashlib
import json

def enabled(job):return job['config'].get('driver')=='batch-local'
def state(config):
    batch=config.get('batchSize',10)
    if type(batch) is not int or not 1<=batch<=1000:raise ValueError('每批局数须为1～1000')
    return dict(batchSize=batch,checkpoint=min(config['trainGames'],batch*5),branch='batches',forecasts=[],audits=[],timeline=[],lastCoachAt=0,pendingCoach=False,attempt=0)

def comparison(job,games):
    forecasts=job['batchTraining']['forecasts'];included=[]
    for f in forecasts:
        if f['to']>job['batchTraining']['checkpoint']:continue
        sample=[g for g in games if not g.get('fault') and f['from']<=g['n']<f['to']]
        if len(sample)!=f['to']-f['from']:continue
        included.append(dict(prediction=f['winRate'],games=len(sample),wins=sum(g['outcome']=='win' for g in sample),fromGame=f['from']+1,toGame=f['to'],policyHash=f['policyHash']))
    n=sum(x['games'] for x in included)
    if not n:return dict(games=0,prediction=None,actual=None,gap=None,batches=[],note='没有完整的事前预测批次，展示基线，不推断预测准确度。')
    predicted=sum(x['prediction']*x['games'] for x in included)/n;actual=sum(x['wins'] for x in included)/n
    return dict(games=n,prediction=predicted,actual=actual,gap=abs(predicted-actual),batches=included,note='绝对百分点偏差用于流程分支；样本有限，不代表预测已准确。和局计入分母，故障局排除。')

def after_game(job,games):
    b=job['batchTraining'];n=job['next']
    if job['stage']=='test':return
    if n==b['checkpoint'] and b['branch']=='batches':
        audit=comparison(job,games);b['audits'].append(audit)
        # Integer percentage-point boundary, with numerical tolerance.
        b['branch']='individual' if audit['gap'] is not None and audit['gap']>0.05+1e-12 else 'frozen'
    b['pendingCoach']=n>=job['config']['trainGames'] or n==b['checkpoint'] or b['branch']=='individual' or b['branch']=='batches' and n%b['batchSize']==0

def record_coach(job,answer):
    b=job['batchTraining'];n=job['next'];total=job['config']['trainGames'];code=answer.get('aiCode',job.get('aiCode',''))
    if code is not None and not isinstance(code,str):raise ValueError('AI策略代码格式无效')
    policy=answer.get('policy','');analysis=answer.get('analysis','')
    if not isinstance(policy,str) or not policy.strip() or not isinstance(analysis,str):raise ValueError('模型未提供操作策略与分析')
    if n<total and b['branch']!='frozen':
        prediction=answer.get('predictedWinRate')
        if isinstance(prediction,bool) or not isinstance(prediction,(int,float)) or not 0<=prediction<=1:raise ValueError('模型需返回0～1之间的下一批事前胜率预测')
    job['policy']=policy[:30000];job['analysis']=analysis[:40000]
    if code and code.strip():job['aiCode']=code[:200000]
    digest=hashlib.sha256((job['policy']+'\n'+job.get('aiCode','')).encode()).hexdigest()
    b['timeline'].append(dict(afterGames=n,policy=job['policy'],aiCode=job.get('aiCode',''),policyHash=digest,analysis=job['analysis']))
    if n<total and b['branch']!='frozen':
        end=min(total,n+(1 if b['branch']=='individual' else b['batchSize']))
        b['forecasts'].append({'from':n,'to':end,'winRate':answer['predictedWinRate'],'policyHash':digest,'createdBeforeGame':n+1})
    b['lastCoachAt']=n;b['pendingCoach']=False
    if n>=total:
        job['status']='review';job['frozenPolicy']=job['policy'];job['frozenAI']=job.get('aiCode','')
    else:job['status']='running'

def prompt_context(job,games,metrics,events):
    b=job['batchTraining'];after=b['lastCoachAt'];recent=[g for g in games if not g.get('fault') and g['n']>=after]
    return dict(config=job['config'],completed=job['next'],branch=b['branch'],comparison=b['audits'][-1] if b['audits'] else None,previousPolicy=job['policy'],previousAI=job.get('aiCode',''),metrics=metrics,recent=recent,events=events,skillSpecs=job.get('skillSpecs',[]),nextBatch=1 if b['branch']=='individual' else b['batchSize'],needForecast=job['next']<job['config']['trainGames'] and b['branch']!='frozen')
