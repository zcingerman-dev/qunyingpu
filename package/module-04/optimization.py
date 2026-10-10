"""Versioned champion/challenger workflow. Legacy jobs keep their original rules."""
import copy
import hashlib
import json
import math
import secrets
import statistics
import random
from pathlib import Path

THRESHOLDS={'single':.05,'identity':.20,'doudizhu':.10,'guozhan':.25}
WEIGHTS={'result':20,'survival':15,'output':15,'control':15,'resources':15,'support':10,'stability':10}

def enabled(job):return job.get('workflow')=='outer-v2'
def limit(job):return {'sample':job['config']['sampleGames'],'train':job['config']['trainGames'],'test':job['config']['validationPairs']*2}[job['stage']]
def quality(games):
    valid=[g for g in games if not g.get('fault')]
    graded=sum(g.get('quality',{}).get('graded',0) for g in valid)
    ungraded=sum(g.get('quality',{}).get('ungraded',0) for g in valid)
    loss=sum(g.get('quality',{}).get('lossSum',0) for g in valid)
    return dict(graded=graded,ungraded=ungraded,coverage=graded/(graded+ungraded) if graded+ungraded else 0,loss=loss/graded if graded else None,
        note='仅比较行动发生时可见信息内的短程近似收益。无法估值的独有技能与隐藏候选单列，不算最优；胜率不参与操作损失校准。')
def create(studio,value):
    if (Path(__file__).parent/'development-paused.flag').exists():raise ValueError('新优化流程制作已暂停，尚待验收；恢复开发后再启动新任务')
    c=copy.deepcopy(value['config']);c['driver']='batch-local'
    for key,default,maximum in [('sampleGames',20,10000),('trainGames',100,10000),('validationPairs',20,5000),('batchSize',10,1000),('outerRounds',1,100),('historyRounds',5,10)]:
        c.setdefault(key,default)
        if type(c[key]) is not int or not 1<=c[key]<=maximum:raise ValueError(key+' 数量无效')
    c['testGames']=c['validationPairs']*2
    job=studio.create_job({'config':c,'settings':value['settings']})
    current=studio.read()[1]['aiOverrides'].get(c['target']+'|'+c['mode'],{})
    champion=dict(policy=current.get('policy','原生内置AI'),aiCode=current.get('code',''),revision='initial',source=current.get('job','原包'))
    job.update(workflow='outer-v2',stage='sample',champion=champion,challenger=copy.deepcopy(champion),policy=champion['policy'],aiCode=champion['aiCode'],loop=1,
        batchTraining=dict(branch='batches',checkpoint=min(c['trainGames'],c['batchSize']*5),pendingCoach=False,lastCoachAt=0,timeline=[],audits=[],batchSize=c['batchSize']),validation=[],live={},runner=dict(status='pending'),background=True)
    job['config']['operationLossThreshold']=THRESHOLDS[c['mode']]
    studio.job_save(job);return job

def report(studio,job,games,stage):
    m=studio.summarize(games);m['operationQuality']=quality(games)
    return dict(stage=stage,cycle=job['cycle'],loop=job['loop'],at=studio.now(),metrics=m,policy=job['policy'],rulesVersion='outer-v2')

def begin(studio,job,value):
    if job['status']!='running':raise ValueError('任务已暂停或正在等待确认')
    owner=value.get('owner','')
    if job['active']:
        if job['active'].get('owner')!=owner:raise ValueError('后台已有活动对局，请查看当前任务')
        return dict(job=job,active=job['active'])
    if job['batchTraining']['pendingCoach']:raise ValueError('等待本批分析')
    if job['next']>=limit(job):raise ValueError('当前阶段已完成')
    c=job['config'];pair=job['next']//2 if job['stage']=='test' else job['next']
    arm='champion' if job['stage']=='sample' or job['stage']=='test' and job['next']%2==0 else 'challenger'
    policy=job[arm];n=c['players'];shift=0 if c['lockSeats'] else pair%n;seat=(c['targetSeat']+shift)%n
    roles=['zhu','fan'] if c['mode']=='doudizhu' else (['zhu','fan'] if n==2 else ['zhu','fan','nei'] if n==3 else ['zhu','zhong','fan','nei'])
    role=(c['role'] if c['role']!='rotate' else roles[pair%len(roles)]) if c['mode'] in {'identity','doudizhu'} else None
    # Only duel reuses the seed in a pair. Other modes resample from the same pool.
    seed=hashlib.sha256((job['seed']+':'+str(job['loop'])+':'+job['stage']+':'+str(pair)+('' if c['mode']=='single' else ':'+arm)).encode()).hexdigest()[:24]
    mid=secrets.token_hex(12);settings=copy.deepcopy(job['settings']);settings['identityRole']=role or 'random'
    settings['studioRuntime']['test']=dict(job=job['id'],workflow='outer-v2',stage=job['stage'],cycle=job['cycle'],n=job['next'],seed=seed,targetSeat=seat,role=role,driver='batch-local',display='stream',
        targetVersion=c['target'],partnerVersion=c.get('partner',''),localAI=policy.get('aiCode',''),policyRevision=policy.get('revision','initial'),arm=arm,pair=pair)
    # A match uses its immutable revision snapshot. No changes to a running game.
    with studio.PLAY.connect() as db:db.execute('INSERT INTO matches(id,at,settings,status,modified) VALUES(?,?,?,?,?)',(mid,studio.now(),studio.dump(settings),'准备中',bool(settings['customCode'])))
    job['active']=dict(match=mid,stage=job['stage'],cycle=job['cycle'],n=job['next'],owner=owner,arm=arm,pair=pair,seed=seed,targetSeat=seat,role=role)
    studio.job_save(job);return dict(job=job,active=job['active'])

def finish(studio,job,value):
    g=value['game'];a=job['active']
    if not a or g.get('match')!=a['match']:raise ValueError('不属于当前后台对局')
    if g.get('outcome') not in {'win','loss','draw','fault'}:raise ValueError('结果无效')
    if g.get('outcome')=='fault':g.setdefault('fault','规则执行故障')
    elif g.get('targetSeat')!=a['targetSeat'] or a['role'] and g.get('role')!=a['role']:g.update(outcome='fault',fault='实际座位或身份不符合配置')
    for field in ('rounds','flow','flowValue','firstRoundFlow','damage','maxDamage','maxRoundDamage','enemyLoss','skillLoss','responseLoss','otherLoss','allyDraw','finalHp','maxHp','hpLost'):
        x=g.get(field,0)
        if type(x) not in (int,float) or not math.isfinite(x) or x<0:raise ValueError('统计无效：'+field)
    q=g.get('quality',{});graded=q.get('graded',0);ungraded=q.get('ungraded',0);loss=q.get('lossSum',0)
    if type(graded) is not int or type(ungraded) is not int or min(graded,ungraded)<0 or type(loss) not in (int,float) or not math.isfinite(loss) or not 0<=loss<=graded+1e-8:raise ValueError('操作质量统计无效')
    g.update(stage=job['stage'],cycle=job['cycle'],loop=job['loop'],n=job['next'],at=studio.now(),arm=a['arm'],pair=a['pair'],seed=a['seed'],controller='batch-local',policyRevision=job[a['arm']].get('revision','initial'))
    ordinal=sum(x['stage']==job['stage'] and x['cycle']==job['cycle'] for x in studio.job_games(job['id']))
    with studio.connect() as db:db.execute('INSERT INTO games VALUES(?,?,?,?,?,?)',(job['id'],job['stage'],job['cycle'],ordinal,g['at'],studio.dump(g)))
    job['active']=None
    if g.get('skillSpecs'):job['skillSpecs']=g['skillSpecs']
    if g.get('fault'):job.update(status='paused',pauseReason=g['fault']);studio.job_save(job);return job
    job['next']+=1;b=job['batchTraining'];games=[x for x in studio.job_games(job['id']) if x['stage']==job['stage'] and x['cycle']==job['cycle']]
    if job['stage']=='train':
        if job['next']==b['checkpoint'] and not b['audits']:
            audit=quality(games);audit.update(games=len([x for x in games if not x.get('fault')]),threshold=job['config']['operationLossThreshold'])
            b['audits'].append(audit);b['branch']='individual' if audit['loss'] is not None and audit['loss']>audit['threshold']+1e-12 else 'frozen' if audit['loss'] is not None and audit['coverage']>=.3 else 'unrated'
        b['pendingCoach']=job['next']>=limit(job) or job['next']==b['checkpoint'] or b['branch']=='individual' or b['branch'] in {'batches','unrated'} and job['next']%b['batchSize']==0
        if b['pendingCoach']:job['status']='summarizing'
    if job['next']>=limit(job):
        job['reports'].append(report(studio,job,games,job['stage']))
        job['status']='cloning' if job['stage']=='sample' else 'summarizing' if job['stage']=='train' else 'reporting'
    studio.job_save(job);return job

def analyze(studio,key):
    job=studio.job_get(key)
    if job['status']=='paused':raise ValueError('请先续跑')
    if job['stage']=='test':return evaluate(studio,key)
    if job['status'] not in {'cloning','summarizing'}:return job
    b=job['batchTraining'];stage=job['stage'];current=[g for g in studio.job_games(key) if g['stage']==stage and g['cycle']==job['cycle']]
    history=[r for r in job['reports'] if r.get('stage') in {'sample','train'} and r.get('loop',0)>=job['loop']-job['config']['historyRounds']]
    recent=[g for g in current if not g.get('fault') and (stage=='sample' or g['n']>=b['lastCoachAt'])]
    selected=recent if b['branch']=='individual' else recent[-3:];traces=[]
    for g in selected:
        with studio.PLAY.connect() as db:rows=db.execute('SELECT payload FROM events WHERE match_id=? ORDER BY seq',(g['match'],)).fetchall()
        events=[json.loads(row[0]) for row in rows]
        semantic=[e for e in events if e['type'] in {'operation-quality','local-ai-choice','test-loss','hp-metrics','flow-metrics','test-fault'}]
        traces.append(dict(match=g['match'],events=semantic))
    frozen=stage=='train' and b['branch']=='frozen' and job['next']>b['checkpoint']
    prompt=('你是本地三国杀AI教练。只优化测试将的已有技能AI字段与操作策略，不修改技能结算、体力、牌堆或全局对象。'
        '由本地AI操作；只能利用当时可见信息。优化目标是有效操作的近似收益与综合表现，不预测胜率、不用胜率误差校准。'
        '操作损失来自独立短程估值，未知操作不能当作最优。不要读取隐藏手牌或牌堆。'
        '输出JSON {"policy":"操作指导","analysis":"真实记录、操作偏差及局限","aiCode":"return {技能ID:{AI字段}}; 或空字符串","skillFixDraft":"文字与实现不符时的待确认建议"}。'
        'aiCode只含所测试版本（国战含副将）已有技能的ai对象，函数可用lib/game/ui/get/ai/_status。空代码保留当前代码，纯文字不能自动执行。'
        '报告必须覆盖首轮/平均过牌、最高及每轮伤害、敌方失牌分类、队友摸牌、key牌。'
        +('本阶段策略已经固定，仅分析，不能调整代码。' if frozen else '')+'\n'+studio.dump(dict(config=job['config'],champion=job['champion'],previous=job['challenger'],metrics=studio.summarize(current),quality=quality(current),history=history,events=traces,skillSpecs=job.get('skillSpecs',[]),guidance=job['config'].get('guidance',''))))
    kind='outer-coach:'+key+':'+str(job['loop'])+':'+stage+':'+str(job['next'])
    result=studio.report_call(key,'整局操作优化',prompt,kind,('policy','analysis'))
    with studio.LOCK:
        cur=studio.job_get(key)
        if cur['status']=='paused':return cur
        if cur['stage']!=stage or cur['next']!=job['next'] or cur['loop']!=job['loop']:return cur
        answer=result['answer'];code=answer.get('aiCode',cur['challenger']['aiCode'])
        if not isinstance(code,str):
            cur.setdefault('reportAttempts',{})[kind]=cur.get('reportAttempts',{}).get(kind,0)+1
            cur.update(status='paused',pauseReason='AI代码格式无效，请检查模型后续跑');studio.job_save(cur);raise ValueError(cur['pauseReason'])
        if not frozen:cur['challenger']=dict(policy=studio.short(answer['policy'],30000),aiCode=studio.short(code or cur['challenger']['aiCode'],200000),revision=kind)
        cur.update(policy=cur['challenger']['policy'],aiCode=cur['challenger']['aiCode'],analysis=studio.short(answer['analysis'],40000),skillFixDraft=studio.short(answer.get('skillFixDraft',''),30000))
        cur['batchTraining']['timeline'].append(dict(stage=stage,afterGames=cur['next'],**cur['challenger'],analysis=cur['analysis']))
        cur['batchTraining'].update(lastCoachAt=cur['next'],pendingCoach=False)
        if stage=='sample':cur.update(stage='train',next=0,status='running');cur['batchTraining']['lastCoachAt']=0
        elif cur['next']>=limit(cur):cur.update(status='review',frozenPolicy=cur['policy'],frozenAI=cur['aiCode'])
        else:cur['status']='running'
        if cur['reports'] and cur['reports'][-1]['stage']==stage and cur['reports'][-1]['cycle']==cur['cycle']:cur['reports'][-1].update(analysis=cur['analysis'],policy=cur['policy'])
        studio.job_save(cur);return cur

def score(games,mode):
    valid=[g for g in games if not g.get('fault')]
    weights=WEIGHTS.copy()
    if mode=='single':weights.pop('support')
    def raw(g):
        rounds=max(1,g.get('rounds',0))
        return dict(result=100 if g['outcome']=='win' else 50 if g['outcome']=='draw' else 0,
            survival=100*((.6 if g.get('survived') else 0)+.4*min(1,g.get('finalHp',0)/max(1,g.get('maxHp',0)))),
            output=g.get('damage',0)/rounds,control=g.get('enemyLoss',0)/rounds,
            resources=g.get('flowValue',g.get('flow',0))/rounds,support=g.get('allyDraw',0)/rounds)
    raw_rows=[raw(g) for g in valid]
    bounds={k:(min((r[k] for r in raw_rows),default=0),max((r[k] for r in raw_rows),default=0)) for k in weights if k!='stability'}
    def row_score(r):
        return {k:r[k] if k in {'result','survival'} else 50 if bounds[k][0]==bounds[k][1] else (r[k]-bounds[k][0])/(bounds[k][1]-bounds[k][0])*100 for k in bounds}
    def aggregate(rows):
        if not rows:return None,{}
        dims={k:statistics.mean(r[k] for r in rows) for k in bounds}
        base=sorted(sum(r[k]*weights[k] for k in bounds)/(sum(weights.values())-weights['stability']) for r in rows)
        dims['stability']=statistics.mean(base[:max(1,math.ceil(len(base)*.1))])
        return sum(dims[k]*weights[k] for k in dims)/sum(weights.values()),dims
    rows=[(g,row_score(r)) for g,r in zip(valid,raw_rows)];arms={};arm_rows={}
    for arm in ('champion','challenger'):
        arm_rows[arm]=[r for g,r in rows if g['arm']==arm];value,dims=aggregate(arm_rows[arm])
        arms[arm]=dict(score=value,dimensions=dims,quality=quality([g for g,_ in rows if g['arm']==arm]),faults=sum(bool(g.get('fault')) for g in games if g['arm']==arm),count=len(arm_rows[arm]))
    a,b=arms['champion'],arms['challenger'];gain=None if a['score'] is None or b['score'] is None else b['score']-a['score']
    rng=random.Random(20261005);deltas=[]
    paired={}
    if mode=='single':
        for g,r in rows:paired.setdefault((g.get('seed'),g['pair']),{})[g['arm']]=r
        pairs=[p for p in paired.values() if len(p)==2]
    else:pairs=[]
    if min(a['count'],b['count'])>=2 and (mode!='single' or len(pairs)>=2):
        for _ in range(1000):
            if mode=='single':
                sample=rng.choices(pairs,k=len(pairs));old=[p['champion'] for p in sample];new=[p['challenger'] for p in sample]
            else:
                old=rng.choices(arm_rows['champion'],k=a['count']);new=rng.choices(arm_rows['challenger'],k=b['count'])
            deltas.append(aggregate(new)[0]-aggregate(old)[0])
    deltas.sort();lower=deltas[24] if deltas else None;upper=deltas[974] if deltas else None
    qa,qb=a['quality']['loss'],b['quality']['loss']
    sufficient=min(a['count'],b['count'])>=10 and all(x['quality']['graded']>=20 and x['quality']['coverage']>=.3 for x in (a,b))
    regress=b['faults']>a['faults'] or qa is not None and qb is not None and qb>qa+1e-12
    verdict='FAIL' if regress or upper is not None and upper<0 and gain<-3 else 'PASS' if sufficient and gain>=3 and lower is not None and lower>0 and not regress else 'DRAW'
    return dict(arms=arms,gain=gain,lowerBound=lower,upperBound=upper,verdict=verdict,weights=weights,sufficient=sufficient,
        note='输出/控制/资源按旧新共同样本范围归一化；控制以实际失牌、辅助以促成摸牌代理。稳定性取最差10%局的平均分。区间为含稳定性在内的1000次自助抽样近似95%区间（单挑按相同种子配对，其余独立抽样）。每侧至少10局、20个可评价选择且覆盖率至少30%，综合增分至少3分、区间下界高于0、操作损失及故障不增加才晋级。覆盖不足保留旧策略，不保证跨将池泛化。')

def evaluate(studio,key):
    job=studio.job_get(key)
    if job['status']=='complete':return job
    if job['stage']!='test' or job['next']<limit(job):raise ValueError('独立验证尚未完成')
    games=[g for g in studio.job_games(key) if g['stage']=='test' and g['cycle']==job['cycle']];comparison=score(games,job['config']['mode'])
    prompt='只评价真实独立验证，不修改操作策略。输出JSON {"analysis":"综合维度、操作质量、首轮与平均过牌、最高伤害、每轮伤害、敌方失牌、队友摸牌、key牌、局限；胜率低于20%明确本次测试中强度过低"}。未知操作单列，不声称全局最优。\n'+studio.dump(dict(config=job['config'],comparison=comparison,champion=studio.summarize([g for g in games if g['arm']=='champion']),challenger=studio.summarize([g for g in games if g['arm']=='challenger'])))
    ans=studio.report_call(key,'独立验证报告',prompt,'outer-evaluation:'+key+':'+str(job['loop']),('analysis',))
    with studio.LOCK:
        cur=studio.job_get(key)
        if cur['status']=='paused':return cur
        if cur['status']=='complete':return cur
        comparison.update(loop=cur['loop'],at=studio.now(),analysis=ans['answer']['analysis']);cur['validation'].append(comparison)
        if comparison['verdict']=='PASS':cur['champion']=copy.deepcopy(cur['challenger'])
        cur.update(policy=cur['champion']['policy'],aiCode=cur['champion']['aiCode'],analysis=ans['answer']['analysis'],status='complete')
        if cur['reports']:cur['reports'][-1].update(analysis=cur['analysis'],comparison=comparison)
        if cur['loop']<cur['config']['outerRounds']:next_round(cur)
        studio.job_save(cur);return cur

def next_round(job):
    job.update(loop=job['loop']+1,cycle=job['cycle']+1,stage='sample',next=0,status='running',active=None,pauseReason='',challenger=copy.deepcopy(job['champion']),policy=job['champion']['policy'],aiCode=job['champion']['aiCode'])
    job['batchTraining']=dict(branch='batches',checkpoint=min(job['config']['trainGames'],job['config']['batchSize']*5),pendingCoach=False,lastCoachAt=0,timeline=[],audits=[],batchSize=job['config']['batchSize'])

def handle(studio,key,action,value):
    if action in {'coach','policy'}:return analyze(studio,key)
    if action=='evaluation':return evaluate(studio,key)
    with studio.LOCK:
        job=studio.job_get(key)
        if action=='heartbeat':
            job['runner'].update(status='online',seenAt=studio.now());studio.job_save(job);return {'saved':True}
        if action=='begin':return begin(studio,job,value)
        if action=='finish':return finish(studio,job,value)
        if action=='live':
            if not job['active'] or value.get('match')!=job['active']['match']:return {'stale':True}
            job['live']={k:value.get(k) for k in ('match','status','lines','assignment')};job['live']['at']=studio.now();job['runner']['seenAt']=studio.now();studio.job_save(job);return {'saved':True}
        if action=='command':
            if not job.get('active'):raise ValueError('当前没有活动牌桌')
            command=studio.short(value.get('command',''),200000)
            if not command.strip():raise ValueError('控制台指令不能为空')
            request='runtime-'+secrets.token_hex(8);job.setdefault('runtimeCommands',[]).append(dict(id=request,command=command,sent=False));studio.job_save(job);return {'requestId':request}
        if action in {'command-result','command-sent'}:
            commands=job.get('runtimeCommands',[]);item=next((x for x in commands if x['id']==value.get('requestId')),None)
            if item:item['sent']=True
            if action=='command-result':job['commandResult']=dict(id=value.get('requestId'),result=value.get('result'));job['runtimeCommands']=[x for x in commands if x['id']!=value.get('requestId')]
            studio.job_save(job);return {'saved':True}
        if action=='control':
            cmd=value['action']
            if cmd=='abort-game':
                if job.get('pendingCalls'):raise ValueError('模型请求尚未结束，请先等待返回')
                studio.background_jobs.stop(key)
                if job.get('active'):return finish(studio,job,{'game':dict(match=job['active']['match'],outcome='fault',fault='用户结束中断局；续跑时补足有效局数',rounds=0)})
                job.update(status='paused',pauseReason='已停止后台引擎，请续跑')
            elif cmd in {'pause','diagnostic'}:
                if job['status'] not in {'review','complete'}:job.update(status='paused',pauseReason=value.get('message','用户暂停'))
            elif cmd=='resume':
                if job['status']!='paused':raise ValueError('当前任务无需续跑')
                job['status']='cloning' if job['stage']=='sample' and job['next']>=limit(job) else 'summarizing' if job['stage']=='train' and job['batchTraining']['pendingCoach'] else 'reporting' if job['stage']=='test' and job['next']>=limit(job) else 'running';job['pauseReason']=''
            elif cmd=='evaluate':
                if job['status']!='review':raise ValueError('请先完成候选策略优化')
                job.update(stage='test',next=0,status='running',active=None,frozenPolicy=job['challenger']['policy'],frozenAI=job['challenger']['aiCode'])
            elif cmd=='optimize':
                if job['status'] not in {'review','complete'}:raise ValueError('当前轮尚未结束')
                next_round(job);job['config']['outerRounds']=max(job['config']['outerRounds'],job['loop'])
            elif cmd=='output-limit':
                n=value['maxOutput']
                if type(n) is not int or not 64<=n<=32000:raise ValueError('输出上限无效')
                job['provider']['maxOutput']=n
            elif cmd=='notes':job.update(notes=studio.short(value.get('notes',''),16000),analysis=studio.short(value.get('analysis',''),40000))
            elif cmd=='delete':
                if job.get('pendingCalls'):raise ValueError('模型请求尚未结束')
                if job['status'] not in {'paused','complete','review'}:raise ValueError('请先暂停任务再删除')
                studio.background_jobs.stop(key)
                ids=[g['match'] for g in studio.job_games(key)]
                if job['active']:ids.append(job['active']['match'])
                with studio.connect() as db:
                    for table in ('games','calls'):db.execute('DELETE FROM '+table+' WHERE job=?',(key,))
                    db.execute('DELETE FROM jobs WHERE id=?',(key,))
                with studio.PLAY.connect() as db:
                    for mid in ids:db.execute('DELETE FROM events WHERE match_id=?',(mid,));db.execute('DELETE FROM matches WHERE id=?',(mid,))
                return {'deleted':True}
            else:raise ValueError('操作无效')
            studio.job_save(job);return job
        if action=='adopt':
            if job['config']['mode'] not in {'identity','doudizhu'}:raise ValueError('单挑及国战只保存针对策略')
            if not job.get('validation') or job['validation'][-1]['verdict']!='PASS':raise ValueError('仅已通过独立验证的最佳策略可以更新通用AI')
            revision,state=studio.read();state['aiOverrides'][job['config']['target']+'|'+job['config']['mode']]=dict(version=job['config']['target'],mode=job['config']['mode'],code=job['champion']['aiCode'],policy=job['champion']['policy'],job=key,at=studio.now())
            return studio.save(dict(revision=revision,state=state))
    raise ValueError('后台任务接口不存在')
