(() => {
 const integrated=/^\/(wiki|play|app|personal|ai)\//.test(location.pathname)||location.pathname==='/index.html'||location.pathname==='/';
 if(!integrated)return;
 const section=location.pathname.startsWith('/wiki/')?'wiki':location.pathname.startsWith('/play/')?'play':location.pathname.startsWith('/personal/')?'personal':location.pathname.startsWith('/ai/')?'ai':location.pathname.startsWith('/app/readme')?'readme':'home';
 const bar=document.createElement('div');bar.className='app-shell';
 bar.innerHTML='<a class="app-brand" href="/index.html"><span>典</span><b>群英谱</b><small>人物 · 关系 · 实战</small></a><nav aria-label="统一导航"><a href="/index.html" data-section="home">首页</a><a href="/wiki/index.html" data-section="wiki">人物 Wiki</a><a href="/play/index.html" data-section="play">基础实战</a><a href="/personal/index.html" data-section="personal">我的</a><a href="/ai/index.html" data-section="ai">AI辅助</a><a href="/app/readme.html" data-section="readme">使用说明与鸣谢</a></nav>';
 bar.querySelector(`[data-section="${section}"]`)?.setAttribute('aria-current','page');
 document.body.prepend(bar);document.body.classList.add('integrated-app');
 // Keep an active table alive when the user opens the Wiki or instructions.
 if(section==='play'||section==='ai')bar.querySelectorAll(`a:not([data-section="${section}"])`).forEach(a=>{a.target='_blank';a.rel='noopener';});
})();
