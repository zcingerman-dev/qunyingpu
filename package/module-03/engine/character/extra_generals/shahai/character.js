// Original engine IDs retained. No extension entry point is executed.
const characters={
swd_zhaoyun: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["extra_generals_shahai_longdan", "pozhen", "tanlin"],
	},
diy_caocao: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["xicai", "diyjianxiong", "extra_generals_shahai_hujia"],
		names: "曹|操",
	},
diy_weiyan: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["diykuanggu"],
		names: "魏|延",
	},
diy_sp_zhouyu: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["xiongzi", "yaliang"],
		names: "周|瑜",
		img: "extension/杀海拾遗/image/character/diy_zhouyu.jpg",
	},
diy_luxun: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["shaoying", "zonghuo"],
		names: "陆|逊",
	},
diy_zhouyu: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["jieyan", "honglian"],
		names: "周|瑜",
	},
diy_caiwenji: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["extra_generals_shahai_beige", "guihan"],
		names: "蔡|琰",
	},
old_majun: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["xinfu_jingxie", "xinfu_qiaosi"],
	}
};
const portraits={
  "swd_zhaoyun": "/play/resource/package/extension/%E6%9D%80%E6%B5%B7%E6%8B%BE%E9%81%97/image/character/swd_zhaoyun.jpg",
  "diy_caocao": "/play/resource/package/extension/%E6%9D%80%E6%B5%B7%E6%8B%BE%E9%81%97/image/character/diy_caocao.jpg",
  "diy_weiyan": "/play/resource/package/extension/%E6%9D%80%E6%B5%B7%E6%8B%BE%E9%81%97/image/character/diy_weiyan.jpg",
  "diy_sp_zhouyu": "/play/resource/package/extension/%E6%9D%80%E6%B5%B7%E6%8B%BE%E9%81%97/image/character/diy_zhouyu.jpg",
  "diy_luxun": "/play/resource/package/extension/%E6%9D%80%E6%B5%B7%E6%8B%BE%E9%81%97/image/character/diy_luxun.jpg",
  "diy_zhouyu": "/play/resource/package/extension/%E6%9D%80%E6%B5%B7%E6%8B%BE%E9%81%97/image/character/diy_zhouyu.jpg",
  "diy_caiwenji": "/play/resource/package/extension/%E6%9D%80%E6%B5%B7%E6%8B%BE%E9%81%97/image/character/diy_caiwenji.jpg",
  "old_majun": "/play/resource/package/extension/%E6%9D%80%E6%B5%B7%E6%8B%BE%E9%81%97/image/character/old_majun.jpg"
};
for(const [id,img] of Object.entries(portraits)){if(Array.isArray(characters[id]))characters[id][4]=[...(characters[id][4]||[]),"img:"+img];else characters[id].img=img;}
export default characters;
