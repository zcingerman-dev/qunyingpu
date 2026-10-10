// Capture only this application's own managed worker, never the user's browser.
const http=require('http'),WebSocket=require('../module-03/engine/node_modules/ws');
const [port,key]=process.argv.slice(2);
http.get(`http://127.0.0.1:${port}/json/list`,r=>{let raw='';r.on('data',c=>raw+=c);r.on('end',()=>{
 const target=JSON.parse(raw).find(x=>x.type==='page'&&x.url.includes('/ai/runner.html?job='+key));if(!target){process.stderr.write('牌桌尚未载入');process.exit(1);}
 const ws=new WebSocket(target.webSocketDebuggerUrl,{origin:'http://127.0.0.1'}),timer=setTimeout(()=>process.exit(1),8000);
 ws.on('open',()=>ws.send(JSON.stringify({id:1,method:'Page.captureScreenshot',params:{format:'jpeg',quality:65,captureBeyondViewport:false}})));
 ws.on('message',raw=>{const msg=JSON.parse(raw);if(msg.id===1){clearTimeout(timer);if(msg.error){process.stderr.write(msg.error.message);process.exit(1);}process.stdout.write(JSON.stringify({data:msg.result.data}));ws.close();}});
 ws.on('error',e=>{process.stderr.write(e.message);process.exit(1);});
 });}).on('error',e=>{process.stderr.write(e.message);process.exit(1);});
