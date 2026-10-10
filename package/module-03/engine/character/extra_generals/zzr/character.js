// Original engine IDs retained. No extension entry point is executed.
const characters={
'zzr_caocao':{//崭峥嵘 曹操
        sex:'male',
        group:'qun',
        hp:4,
        skills:['djcjingmeng','djcchixiao','djcjuesi'],
        names:'曹|操',
    },
'zzr_zhonghui':{//崭峥嵘 钟会
        sex:'male',
        group:'wei',
        hp:2,
        maxHp:4,
        hujia:2,
        skills:['djcdengquan','djcxiemou'],
        names:'钟|会',
    },
'zzr_jiangwei':{//崭峥嵘 姜维
        sex:'male',
        group:'shu',
        hp:3,
        skills:['djcsuhan','djcqiongzhi'],
        names:'姜|维',
    },
'zzr_zhouyu':{//崭峥嵘 周瑜
        sex:'male',
        group:'wu',
        hp:3,
        skills:['djczhibei','djcjianshi'],
        names:'周|瑜',
    },
'zzr_liuxie':{//崭峥嵘 刘协
        sex:'male',
        group:'qun',
        hp:3,
        skills:['djcfenbeng','djcjufen','djcboyun'],
        names:'刘|协',
        isZhugong:true,
    }
};
const portraits={
  "zzr_caocao": "/play/resource/package/extension/%E7%82%B9%E7%BB%9B%E5%94%87/image/character/bigbg/zzr_caocao.jpg",
  "zzr_zhonghui": "/play/resource/package/extension/%E7%82%B9%E7%BB%9B%E5%94%87/image/character/bigbg/zzr_zhonghui.jpg",
  "zzr_jiangwei": "/play/resource/package/extension/%E7%82%B9%E7%BB%9B%E5%94%87/image/character/bigbg/zzr_jiangwei.jpg",
  "zzr_zhouyu": "/play/resource/package/extension/%E7%82%B9%E7%BB%9B%E5%94%87/image/character/bigbg/zzr_zhouyu.jpg",
  "zzr_liuxie": "/play/resource/package/extension/%E7%82%B9%E7%BB%9B%E5%94%87/image/character/bigbg/zzr_liuxie.jpg"
};
for(const [id,img] of Object.entries(portraits)){if(Array.isArray(characters[id]))characters[id][4]=[...(characters[id][4]||[]),"img:"+img];else characters[id].img=img;}
export default characters;
