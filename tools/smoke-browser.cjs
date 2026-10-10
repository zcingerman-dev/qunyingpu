// Test harness only. The HTTP backend, signaling server and all game files belong to the isolated release.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.RELEASE_PLAYWRIGHT);
// Chromium writes debug.log to its working directory. Keep that generated output in the disposable copy.
process.chdir(process.env.RELEASE_ROOT);
const origin=process.env.RELEASE_URL,base=origin+'/play/',signal=process.env.RELEASE_SIGNAL,rows=[],errors=[],missing=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const originalOptionalAudio=r=>r.status===404&&/^\/play\/audio\/card\/(male|female)\/tao\.mp3$/.test(new URL(r.url).pathname);
async function check(name,fn){try{await fn();rows.push({name,status:'PASS'});console.log('PASS '+name);}catch(e){rows.push({name,status:'ERROR',message:e.stack});throw e;}}
(async()=>{
 // Same-computer regression: bypass this test host's broken mDNS resolution.
 // This affects only the disposable browser, never the shipped game or its ICE configuration.
 const browser=await chromium.launch({executablePath:process.env.RELEASE_BROWSER,headless:true,args:['--no-sandbox','--disable-background-networking','--disable-features=WebRtcHideLocalIpsWithMdns']});
 const contexts=await Promise.all([browser.newContext({viewport:{width:1600,height:1000}}),browser.newContext({viewport:{width:1600,height:1000}})]),[a,b]=await Promise.all(contexts.map(c=>c.newPage()));
 for(const p of [a,b]){p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push({url:r.url(),status:r.status()});});p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
 const view=p=>p.evaluate(()=>window.networkAudit.currentView());
 const wait=(p,fn)=>p.waitForFunction(fn,null,{timeout:60000});
 async function control(p,kind,predicate){await p.waitForFunction(k=>!document.querySelector(`[data-table-tool="${k}"]`)?.disabled,kind);await p.locator(`[data-table-tool="${kind}"]`).click();await wait(p,predicate);}
 try{
  if(!process.env.RELEASE_NETWORK_ONLY){
  await check('首页资料及实战统计正常，发行记录为空',async()=>{await a.goto(origin+'/index.html');await a.waitForFunction(()=>document.querySelector('#people-count')?.textContent!=='—');const info=await a.evaluate(async()=>await(await fetch('/api/overview')).json());assert(info.people>500&&info.versions>1000);assert.equal(info.matches,0);});
  for(const route of ['/wiki/index.html','/personal/index.html','/ai/index.html','/play/index.html'])await check(route+'及其本机资料正常载入',async()=>{await a.goto(origin+route);await delay(1200);assert((await a.locator('body').textContent()).length>100);});
  await check('当前修改、四个已发布DIY、素材与技能改良保留',async()=>{
   const runtime=await a.evaluate(async()=>await(await fetch('/studio/api/runtime')).json());const manifest=JSON.parse(fs.readFileSync(path.join(process.env.RELEASE_ROOT,'release-runtime-manifest.json'),'utf8'));assert.deepEqual(runtime.generals.map(x=>x.id).sort(),manifest.data.diy.filter(x=>x.published).map(x=>x.id).sort());assert(runtime.generals.some(x=>x.id==='diy-8e4ce906a0e4403d9d97912fecb2d20e'));assert(runtime.generals.some(x=>x.id==='diy-67ce61e8ac6a4b45b320a0f6800314c7'));assert.equal(Object.keys(runtime.cardImprovements).length,manifest.data.personalTables.card_active);assert(Object.keys(runtime.portraits).length>=2);
  });
  await check('原README字节保护和所有资源引用文件存在',async()=>{
   const release=process.env.RELEASE_ROOT;const manifest=JSON.parse(fs.readFileSync(path.join(release,'release-runtime-manifest.json'),'utf8'));assert(manifest.items.every(i=>fs.existsSync(path.join(release,i.path))));assert(fs.existsSync(path.join(release,'readme.md')));
  });
  await check('抽样静皮原图、缩略图、转换形态与当前自选素材可显示',async()=>{
   const catalog=JSON.parse(fs.readFileSync(path.join(process.env.RELEASE_ROOT,'module-01/skin-library/catalog.json'),'utf8'));
   const paths=[catalog.skins[0].image,catalog.skins[0].thumbnail,'/play/resource/project-art/dc_sb_zhugeliang_shadow.png'];
   const result=await a.evaluate(async paths=>{const runtime=await(await fetch('/studio/api/runtime')).json();const paths2=[...paths,...Object.values(runtime.portraits)];return await Promise.all(paths2.map(async p=>{const img=new Image();img.src=p;await img.decode();return img.naturalWidth;}));},paths);assert(result.every(n=>n>0));
  });
  // Use the real launcher API and native engine; only the human roster selection is supplied by this test.
  for(const mode of ['identity','guozhan','doudizhu','single']){
   await check('本地'+mode+'：选将、武将技能牌堆加载、AI真实推进',async()=>{
    await a.goto(origin+'/index.html');
    const id=await a.evaluate(async mode=>{
     const {settings,token}=await(await fetch('/play/api/state')).json();const runtime=await(await fetch('/studio/api/runtime')).json();Object.assign(settings,{mode,players:mode==='identity'?8:mode==='guozhan'?4:mode==='doudizhu'?3:2,control:'auto',redraw:'0',doubleGeneral:false,identityVariant:'standard',identityRole:'random',rosters:{},ratings:{},studioRuntime:runtime,speed:'vvfast',customCode:''});
     window.releaseMessages=[];window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type?.startsWith('play-'))window.releaseMessages.push(e.data);});
     const r=await fetch('/play/api/launch',{method:'POST',headers:{'Content-Type':'application/json','X-Play-Token':token},body:JSON.stringify({settings})});if(!r.ok)throw Error(await r.text());const match=await r.json();const arena=document.createElement('iframe');arena.id='arena';arena.style='width:1500px;height:900px';document.body.append(arena);arena.src='/play/arena.html?match='+match.id;return match.id;
    },mode);
    await a.waitForFunction(()=>window.releaseMessages.some(m=>m.type==='play-roster'),null,{timeout:90000});
    const selected=await a.evaluate(async mode=>{
     const data=window.releaseMessages.find(m=>m.type==='play-roster'),pool=data.pool;
     const {defaultRoster,randomizeRoster}=await import('/play/roster-rules.js');const r=defaultRoster(data.roles.length);
     for(const seat of r.seats)seat.filters.pools=[mode==='guozhan'?'mode_guozhan':'standard'];
     const roster=randomizeRoster(pool,r,{mode,double:data.double,roles:data.roles,ratings:{}});document.querySelector('#arena').contentWindow.postMessage({type:'play-roster-apply',roster,ratings:{}},location.origin);
     return {pool:pool.length,hasTest:pool.some(v=>v.pool==='bwiki202610test'),hasAwakened:pool.some(v=>v.id==='studio_diy_8e4ce906a0e4403d9d97912fecb2d20e'),keys:pool.filter(v=>v.pool==='play_custom').map(v=>v.id)};
    },mode);
    assert(selected.pool>10);
    await a.waitForFunction(()=>window.releaseMessages.some(m=>m.type==='play-status'&&(m.status.phase>=2||m.status.over)),null,{timeout:60000});
    assert(!await a.evaluate(()=>window.releaseMessages.some(m=>m.type==='play-error')));
    const frame=a.frames().find(f=>f.url().includes('arena.html?match='+id));assert(frame);
    const loaded=await frame.evaluate(async()=>{const {lib,game,ui,_status}=await import('./noname.js');return {generals:Object.keys(lib.character).length,skills:Object.keys(lib.skill).length,cards:Object.keys(lib.card).length,test:!!lib.characterPack.bwiki202610test,players:game.players.length+game.dead.length,phase:game.phaseNumber,over:!!_status.over,art:[...document.images].filter(x=>x.src&&!x.complete).length};});assert(loaded.skills>100&&loaded.cards>20&&(loaded.phase>=2||loaded.over));if(mode==='identity')assert(loaded.test);
    await a.locator('#arena').evaluate(e=>{e.src='about:blank';});
   });
  }
  }
  await check('四种联机模式：Host/Client、Ready、选将与真人＋AI推进',async()=>{
   for(const mode of ['identity','guozhan','doudizhu','single']){
    await a.goto(base+'internet.html');await b.goto(base+'internet.html');
    for(const p of [a,b]){await wait(p,()=>window.networkAudit);await p.locator('#signal-url').fill(signal);await p.locator('summary').filter({hasText:'连接设置'}).click();await p.locator('#stun-url').fill('');}
    await a.locator('#network-mode').selectOption(mode);await a.locator('#network-players').selectOption(String(mode==='identity'?8:mode==='guozhan'?4:mode==='doudizhu'?3:2));
    await a.locator('#create-host').click();await a.locator('#role-label').filter({hasText:'房间码'}).waitFor();const code=(await a.locator('#role-label').textContent()).match(/房间码 ([A-F0-9]+)/)[1];
    console.log('NETWORK connecting '+mode);
    await b.locator('#room-code').fill(code);await b.locator('#join-client').click();
    // The initially hidden Ready button is enabled before JOINED/ROOM has arrived.
    // Wait for both visible lobbies and Host-validated connections, not that initial state.
    for(const p of [a,b])await p.waitForFunction(()=>!document.querySelector('#session').hidden&&!document.querySelector('#ready-network').disabled&&document.querySelector('#member-list').textContent.includes('Client · 已连接'),null,{timeout:90000});
    await a.locator('#ready-network').click();await b.locator('#ready-network').click();await wait(a,()=>!document.querySelector('#start-network').disabled);await a.locator('#start-network').click();
    for(const p of [a,b]){
     await wait(p,()=>window.networkAudit.currentView()?.prompt?.event==='chooseCharacter');
     await p.locator('[data-pool-filter]').selectOption('roster-pool-'+(mode==='guozhan'?'mode_guozhan':'standard'));
     await p.waitForFunction(()=>!document.querySelector('.net-general-option')?.disabled);
     if(mode==='guozhan'){const list=(await view(p)).prompt.buttons.filter(x=>x.text.includes(' · wei · ')).slice(0,2);assert.equal(list.length,2);for(const item of list){await p.locator(`[data-ref="${item.ref}"]`).click();await wait(p,()=>!document.querySelector('[data-ref="roster-confirm"]')?.disabled);}}
     else{await p.locator('.net-general-option').filter({hasText:'曹操'}).first().click();await wait(p,()=>!document.querySelector('[data-ref="roster-confirm"]')?.disabled);}
     await p.locator('[data-ref="roster-confirm"]').click();
    }
    await wait(a,()=>window.networkAudit.currentView()?.public.controlsEnabled&&window.networkAudit.currentView()?.public.players.every(p=>p.maxHp>0));await wait(b,()=>window.networkAudit.currentView()?.public.controlsEnabled);
    await control(b,'autoplay',()=>window.networkAudit.currentView()?.public.autoplaySeats.includes(1));await control(a,'autoplay',()=>window.networkAudit.currentView()?.public.autoplaySeats.includes(0));
    await wait(a,()=>window.networkAudit.currentView()?.public.phase>=2||window.networkAudit.currentView()?.public.over);assert(!(await view(a)).fault);assert(!(await view(b)).fault);
    if(!(await view(a)).public.over){await control(a,'pause',()=>window.networkAudit.currentView()?.public.paused);await wait(b,()=>window.networkAudit.currentView()?.public.paused);await delay(300);assert.deepEqual((await view(a)).public,(await view(b)).public);}
    if(mode==='single'){const id=await b.evaluate(()=>window.networkAudit.playerId());await b.reload();await wait(b,()=>!!window.networkAudit.currentView()?.public.players.length);assert.equal(await b.evaluate(()=>window.networkAudit.playerId()),id);assert(!(await view(b)).fault);}
    console.log('PASS network '+mode);await a.locator('#close-network').click();
   }
  });
  await check('浏览器无脚本或新增资源错误；原包缺失桃语音单列',async()=>{
   const known=missing.filter(originalOptionalAudio);assert.deepEqual(missing.filter(r=>!originalOptionalAudio(r)),[]);
   const network404='Failed to load resource: the server responded with a status of 404 (Not Found)';assert.equal(errors.filter(e=>e===network404).length,known.length);assert.deepEqual(errors.filter(e=>e!==network404),[]);
   const assets=JSON.parse(fs.readFileSync(path.join(process.env.RELEASE_ROOT,'module-03/asset-map.json'),'utf8'));for(const r of known)assert(!assets[new URL(r.url).pathname.slice('/play/'.length)]);
  });
 }catch(e){console.error(e.stack);for(const p of [a,b])console.error('LOBBY DIAGNOSTIC '+JSON.stringify(await p.evaluate(()=>({status:document.querySelector('#status')?.textContent||document.querySelector('#connection-status')?.textContent,session:document.querySelector('#session-status')?.textContent,members:document.querySelector('#member-list')?.textContent,readyDisabled:document.querySelector('#ready-network')?.disabled})).catch(()=>({}))));await a.screenshot({path:path.join(path.dirname(process.env.RELEASE_REPORT),'release-browser-failure.png'),fullPage:true}).catch(()=>{});}
 finally{await browser.close();}
 const known=missing.filter(originalOptionalAudio),network404='Failed to load resource: the server responded with a status of 404 (Not Found)';
 const report={checked:rows.length,PASS:rows.filter(r=>r.status==='PASS').length,ERROR:rows.filter(r=>r.status==='ERROR').length,consoleErrors:known.length===errors.filter(e=>e===network404).length?errors.filter(e=>e!==network404):errors,missingRequests:missing.filter(r=>!originalOptionalAudio(r)),knownOptionalAudio404:known,rawConsole:errors,results:rows};fs.writeFileSync(process.env.RELEASE_REPORT,JSON.stringify(report,null,2));console.log(JSON.stringify({checked:report.checked,PASS:report.PASS,ERROR:report.ERROR,consoleErrors:report.consoleErrors,missingRequests:report.missingRequests,knownOptionalAudio404:known}));assert.equal(report.ERROR,0);assert(report.checked>=(process.env.RELEASE_NETWORK_ONLY?2:12));
})().catch(e=>{console.error(e);process.exitCode=1;});
