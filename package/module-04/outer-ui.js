import {$,h,api,toast} from './common.js';
import {statusDiagram} from './status-view.js';
import {reportHTML} from './report.js';
import {eventLine,roleName} from './test-stream.js';
let poll=null,current=null,preview=false,previewAt=0,previewBusy=false,reportKey='',pollBusy=false;
const labels={running:'本地AI运行中',paused:'已暂停',cloning:'正在生成候选策略',summarizing:'正在整局分析',reporting:'正在汇总独立验证',review:'优化完成，等待开始验证',complete:'本轮已完成'};
export function outerLimit(job){return job.stage==='sample'?job.config.sampleGames:job.stage==='train'?job.config.trainGames:job.config.validationPairs*2;}
export function paintOuter(job){
 current=job;
 const host=$('active-test');if(!host)return;host.hidden=false;
 if(host.dataset.outerJob!==job.id){preview=false;reportKey='';host.dataset.outerJob=job.id;
 host.innerHTML=`<section class="panel"><h2>后台优化任务</h2><div class="outer-layout"><div><p id="outer-progress"></p><div class="progress"><span id="outer-bar"></span></div><p id="outer-reason" class="muted"></p><p id="outer-usage"></p><div class="buttons"><button data-outer="pause">暂停</button><button data-outer="resume">继续 / 续跑</button><button data-outer="abort-game" class="danger">结束中断局</button><button data-outer="evaluate" class="primary">开始独立验证</button><button data-outer="optimize">再优化一轮</button><button id="outer-adopt">查看并采用最佳AI</button><a class="button" href="/personal/index.html?tab=reports&job=${h(job.id)}">在“我的”查看记录</a></div><p id="outer-quality"></p><h3>本局数据流</h3><p id="outer-summary" class="stream-summary"></p><pre id="outer-log" class="test-data-log" role="log" aria-label="本局数据流"></pre><details><summary>测试控制台</summary><input id="outer-command" placeholder="state / pause / resume / draw 座位 数量 / js …"><button id="outer-send">执行</button><pre id="outer-result"></pre><p class="muted">手动写入或接管记为干预局，排除强度统计。</p></details></div><aside class="status-aside"><h3>运行状态 · 只读</h3><div id="outer-diagram"></div><p id="outer-stage-note"></p><button id="outer-toggle">展开当前牌桌预览</button><img id="outer-preview" class="runner-preview" alt="后台牌桌只读预览" hidden><p id="outer-preview-note" class="muted"></p><p class="muted">关闭网页仍继续。本机服务和电脑需保持运行。预览不会接管武将或新开对局。</p></aside></div></section><div id="outer-reports"></div>`;
 host.querySelectorAll('[data-outer]').forEach(b=>b.onclick=async()=>{const action=b.dataset.outer;if(action==='abort-game'&&!confirm('结束当前局并记为故障？续跑时补足有效局数。'))return;try{paintOuter(await api('/job/'+current.id+'/control',{action}));}catch(e){toast(e.message);}});
 $('outer-toggle').onclick=()=>{preview=!preview;paintOuter(current);};
 $('outer-preview').onclick=()=>{const d=document.createElement('dialog');d.innerHTML='<button class="close">关闭</button><h3>当前牌桌 · 只读快照</h3><img class="full-art" alt="牌桌预览">';d.querySelector('img').src=$('outer-preview').src;document.body.append(d);d.querySelector('button').onclick=()=>d.close();d.onclose=()=>d.remove();d.showModal();};
 $('outer-send').onclick=async()=>{try{await api('/job/'+current.id+'/command',{command:$('outer-command').value});$('outer-result').textContent='已提交，等待后台返回';}catch(e){toast(e.message);}};
 $('outer-adopt').onclick=()=>adopt(current);
 }
 const stage={sample:'当前策略采样',train:'候选策略优化',test:'独立验证'}[job.stage];
 $('outer-progress').textContent=`${labels[job.status]||job.status} · 外循环 ${job.loop}/${job.config.outerRounds} · ${stage} ${job.next}/${outerLimit(job)} 有效局`;
 $('outer-bar').style.width=Math.min(100,job.next/outerLimit(job)*100)+'%';
 $('outer-reason').textContent=job.pauseReason||'本地AI操作；模型在批次或整局结束后分析。运行中使用启动时的技能版本。';$('outer-reason').classList.toggle('warn',job.status==='paused');
 $('outer-usage').textContent=`累计 ${job.calls} 次模型调用 · 输入 ${job.inputTokens||0} / 输出 ${job.outputTokens||0} token · 用量未知 ${job.usageUnknown||0} 次`;
 const audit=job.batchTraining.audits.at(-1);$('outer-quality').textContent=`操作损失阈值 ${job.config.operationLossThreshold*100}% · ${audit?`校准损失 ${audit.loss==null?'无法评价':(audit.loss*100).toFixed(2)+'%'}，覆盖率 ${(audit.coverage*100).toFixed(1)}%`:'等待前五批校准'} · 分支：${({batches:'分批优化',individual:'超过阈值，逐局分析',frozen:'低于或等于阈值，固定策略',unrated:'覆盖不足，继续分批分析'})[job.batchTraining.branch]}`;
 host.querySelector('[data-outer="pause"]').disabled=!['running','cloning','summarizing','reporting'].includes(job.status);host.querySelector('[data-outer="resume"]').disabled=job.status!=='paused';host.querySelector('[data-outer="abort-game"]').hidden=!job.active||job.status!=='paused';host.querySelector('[data-outer="evaluate"]').hidden=job.status!=='review';host.querySelector('[data-outer="optimize"]').hidden=!['review','complete'].includes(job.status);
 $('outer-adopt').hidden=!(job.status==='complete'&&['identity','doudizhu'].includes(job.config.mode)&&job.validation.at(-1)?.verdict==='PASS'&&job.champion.aiCode?.trim());
 $('outer-diagram').innerHTML=statusDiagram(['当前策略采样','复制为候选并优化','等待你开始验证','独立验证、晋级或保留'],job.status==='review'?2:job.stage==='test'?3:job.stage==='train'?1:0);$('outer-stage-note').textContent=job.status==='review'?'候选已固定。开始独立验证后才决定晋级，当前最佳策略仍保留。':labels[job.status]||stage;
 const live=job.live||{},s=live.status,a=live.assignment,t=s?.players?.find(p=>Number(p.playSeat??p.seat)===a?.seat);
 $('outer-summary').textContent=s?`第 ${s.round||0} 轮 · ${a?.seat+1}号位 ${t?.name||''} · ${roleName(a?.role,job.config.mode)} · ${t?.hp??'—'}/${t?.maxHp??'—'}血 · 累计过牌 ${s.flowStats?.[a?.seat]?.total||0} · ${job.active?'当前局':'最后记录'}`:'正在准备；开局后核对座位与身份';
 const log=$('outer-log'),follow=log.scrollHeight-log.scrollTop-log.clientHeight<50;log.textContent=(live.lines||[]).map(eventLine).join('\n');if(follow)log.scrollTop=log.scrollHeight;
 if(job.commandResult)$('outer-result').textContent=JSON.stringify(job.commandResult.result,null,2);
 if(job.stage!=='test')preview=false;$('outer-toggle').hidden=job.stage!=='test';$('outer-toggle').textContent=preview?'收起牌桌预览':'展开当前牌桌预览';$('outer-preview').hidden=!preview;
 if(preview&&job.active&&!previewBusy&&Date.now()-previewAt>4500){previewBusy=true;previewAt=Date.now();api('/job/'+job.id+'/preview').then(p=>{if(current.id!==job.id)return;if(p.image){$('outer-preview').src=p.image;$('outer-preview-note').textContent='快照更新于 '+new Date().toLocaleTimeString();}else $('outer-preview-note').textContent=p.error;}).catch(e=>{$('outer-preview-note').textContent=e.message;}).finally(()=>previewBusy=false);}
 if(preview&&!job.active)$('outer-preview-note').textContent='当前局结束，可在“我的”按原记录回放。';
 const signature=JSON.stringify([job.reports,job.batchTraining.audits,job.analysis]);if(signature!==reportKey){reportKey=signature;$('outer-reports').innerHTML=reportHTML(job)+(job.skillFixDraft?`<section class="panel"><h3>技能实现待确认建议</h3><p>${h(job.skillFixDraft)}</p><p>尚未应用，请在武将卡改良中审核。</p></section>`:'');}
}
async function adopt(j){const d=document.createElement('dialog');d.innerHTML=`<button class="close">取消</button><h2>采用已验证的最佳策略</h2><p>${h(j.champion.policy)}</p><pre>${h(j.champion.aiCode)}</pre><button class="primary">确认采用</button>`;document.body.append(d);d.querySelector('.close').onclick=()=>d.close();d.onclose=()=>d.remove();d.querySelector('.primary').onclick=async()=>{try{await api('/job/'+j.id+'/adopt',{});toast('已采用；同模式的新对局生效');d.close();}catch(e){toast(e.message);}};d.showModal();}
let watchedKey='';
export function watchOuter(key,onChange){watchedKey=key;clearInterval(poll);const tick=async()=>{if(pollBusy||watchedKey!==key)return;pollBusy=true;try{const {job}=await api('/job/'+key+'/status');if(watchedKey!==key)return;onChange?.(job);paintOuter(job);}catch(e){if(watchedKey===key){clearInterval(poll);toast(e.message);}}finally{pollBusy=false;}};tick();poll=setInterval(tick,2500);}
