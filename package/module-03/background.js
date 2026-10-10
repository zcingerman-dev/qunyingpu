// Keep the background above the opaque body and below game controls.
export async function applyArenaBackground({ui}, settings, url) {
 const node=ui.background;if(!node)return;
 const chosen=url||(settings.background==='default'?'':`/play/image/background/${settings.background==='custom'?'ol_bg':settings.background}.jpg`);
 node.style.backgroundSize='cover';node.style.backgroundPosition='center';
 if(!chosen){node.style.backgroundImage='none';return;}
 if(!/^(?:\/play\/|data:image\/|blob:)/.test(chosen))throw Error('背景图片地址无效');
 await new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(Error('背景图片加载失败，请重新选择图片'));img.src=chosen;});
 node.style.backgroundImage=`url(${JSON.stringify(chosen)})`;
}
