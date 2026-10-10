// Original engine IDs retained. No extension entry point is executed.
const characters={
wdb_feishi: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["nsshuaiyan", "moshou"],
	},
wdb_liufu: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["zhucheng", "duoqi"],
	},
wdb_xizhenxihong: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["fuchou", "jinyan"],
		names: "习|珍-习|宏",
	},
wdb_zaozhirenjun: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["liangce", "jianbi", "diyjuntun"],
		names: "枣|祗-任|峻",
	}
};
const portraits={
  "wdb_feishi": "/play/resource/package/extension/%E7%8E%A9%E7%82%B9%E8%AE%BA%E6%9D%80/image/character/wdb_feishi.jpg",
  "wdb_liufu": "/play/resource/package/extension/%E7%8E%A9%E7%82%B9%E8%AE%BA%E6%9D%80/image/character/wdb_liufu.jpg",
  "wdb_xizhenxihong": "/play/resource/package/extension/%E7%8E%A9%E7%82%B9%E8%AE%BA%E6%9D%80/image/character/wdb_xizhenxihong.jpg",
  "wdb_zaozhirenjun": "/play/resource/package/extension/%E7%8E%A9%E7%82%B9%E8%AE%BA%E6%9D%80/image/character/wdb_zaozhirenjun.jpg"
};
for(const [id,img] of Object.entries(portraits)){if(Array.isArray(characters[id]))characters[id][4]=[...(characters[id][4]||[]),"img:"+img];else characters[id].img=img;}
export default characters;
