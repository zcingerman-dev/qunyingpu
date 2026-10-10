// Original engine IDs retained. No extension entry point is executed.
const characters={
'sp_zq_sunquan': ['male', 'wei', 4, ['zqchengchen', 'zqwuwang'], ['gzgroup:wei']],
'sp_zq_caocao': ['male', 'wei', 4, ['zqjiamei', 'zqyixin', 'zqbaoqi'], ['gzgroup:wei']],
'sp_zq_liushan': ['male', 'shu', 1, ['zqzhengtong', 'zqanle', 'zqguixiang', 'zqtuiwei'], ['gzgroup:shu', 'zhu']],
'zq_shencaozhi': ['male', 'shen', '2/3', ['zqqibu', 'zqchengshi'], ['gzgroup:wei']],
'zq_shenxusheng': ['male', 'shen', 4, ['zqxushi', 'zqpodi', 'zqyicheng'], ['gzgroup:wu']],
'sp_zq_zhoutai': ['male', 'wu', 2, ['zqdouhun', 'zqboming', 'zqjiuzhu'], ['gzgroup:wu']],
'zq_shenzuoci': ['male', 'shen', 3, ['zqhuanhua', 'zqjinye', 'zqjiuding'], ['gzgroup:qun']]
};
const portraits={
  "sp_zq_sunquan": "/play/resource/desktop-package/extension/%E5%A4%A9%E5%BA%AD/character/sp_zq_sunquan.jpg",
  "sp_zq_caocao": "/play/resource/desktop-package/extension/%E5%A4%A9%E5%BA%AD/character/sp_zq_caocao.jpg",
  "sp_zq_liushan": "/play/resource/desktop-package/extension/%E5%A4%A9%E5%BA%AD/character/sp_zq_liushan.jpg",
  "zq_shencaozhi": "/play/resource/desktop-package/extension/%E5%A4%A9%E5%BA%AD/character/zq_shencaozhi.jpg",
  "zq_shenxusheng": "/play/resource/desktop-package/extension/%E5%A4%A9%E5%BA%AD/character/zq_shenxusheng.jpg",
  "sp_zq_zhoutai": "/play/resource/desktop-package/extension/%E5%A4%A9%E5%BA%AD/character/sp_zq_zhoutai.jpg",
  "zq_shenzuoci": "/play/resource/desktop-package/extension/%E5%A4%A9%E5%BA%AD/character/zq_shenzuoci.jpg"
};
for(const [id,img] of Object.entries(portraits)){if(Array.isArray(characters[id]))characters[id][4]=[...(characters[id][4]||[]),"img:"+img];else characters[id].img=img;}
export default characters;
