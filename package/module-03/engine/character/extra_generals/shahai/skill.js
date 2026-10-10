import {lib,game,ui,get,ai,_status} from "../../../noname.js";
import translate from "./translate.js";
const skills = {
// Source: outputs/module-01/package/character/standard/skill.js:1274; original skill longdan
extra_generals_shahai_longdan: {
 audio:"longdan_sha",group:["extra_generals_shahai_longdan_sha","extra_generals_shahai_longdan_shan"],
 subSkill:{
  sha:{enable:["chooseToUse","chooseToRespond"],position:"hs",filterCard:{name:"shan"},viewAs:{name:"sha"},viewAsFilter(player){return player.countCards("hs","shan")>0;},prompt:"将一张闪当杀使用或打出",check:()=>1,ai:{respondSha:true,order:3,skillTagFilter(player){return player.countCards("hs","shan")>0;}}},
  shan:{enable:["chooseToUse","chooseToRespond"],position:"hs",filterCard:{name:"sha"},viewAs:{name:"shan"},viewAsFilter(player){return player.countCards("hs","sha")>0;},prompt:"将一张杀当闪使用或打出",check:()=>1,ai:{respondShan:true,order:4,skillTagFilter(player){return player.countCards("hs","sha")>0;}}}
 }
},
// Source: outputs/module-01/package/extension/杀海拾遗/character/swd/skill.js:5705; original skill pozhen
pozhen: {
		trigger: { player: "damageEnd" },
		filter(event, player) {
			if (!event.source) {
				return false;
			}
			return event.source.countCards("h") !== player.countCards("h");
		},
		direct: true,
		content() {
			"step 0";
			var num = player.countCards("h") - trigger.source.countCards("h");
			event.num = num;
			if (num > 0) {
				var next = player.chooseToDiscard(num, get.prompt("pozhen", trigger.source), "弃置" + num + "张手牌，并对" + get.translation(trigger.source) + "造成1点伤害");
				next.logSkill = ["pozhen", trigger.source];
				next.ai = function (card) {
					if (get.damageEffect(trigger.source, player, player) > 0 && num <= 2) {
						return 6 - get.value(card);
					}
					return -1;
				};
			} else if (num < 0) {
				player.chooseBool(get.prompt("pozhen", trigger.source), "弃置" + get.translation(trigger.source) + -num + "张手牌").ai = function () {
					return get.attitude(player, trigger.source) < 0;
				};
			} else {
				event.finish();
			}
			"step 1";
			if (result.bool) {
				if (event.num > 0) {
					trigger.source.damage();
				} else {
					player.logSkill("pozhen", trigger.source);
					var cards = trigger.source.getCards("h");
					cards.sort(lib.sort.random);
					trigger.source.discard(cards.slice(0, -event.num));
				}
			}
		},
		ai: {
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -1];
						}
						var num = player.countCards("h") - target.countCards("h");
						if (num > 0) {
							return [1, 0, 0, -num / 2];
						}
						if (num < 0) {
							return [1, 0, 0, -0.5];
						}
					}
				},
			},
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/swd/skill.js:5803; original skill tanlin
tanlin: {
		enable: "phaseUse",
		usable: 1,
		group: "tanlin4",
		filterTarget(card, player, target) {
			return player !== target && target.countCards("h");
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		content() {
			"step 0";
			player.chooseToCompare(target).set("preserve", "win");
			"step 1";
			if (result.bool) {
				if (target.hasSkill("tanlin2") === false) {
					target.addSkill("tanlin2");
					player.addSkill("tanlin3");
					player.gain([result.player, result.target]);
					player.$gain2([result.player, result.target]);
				}
			} else {
				player.damage(target);
			}
		},
		ai: {
			result: {
				target(player, target) {
					var cards = player.getCards("h");
					var num = target.countCards("h");
					if (num > cards.length + 3 && player.hp > 1) {
						return -2;
					}
					if (num > cards.length + 1 && player.hp > 1) {
						return -1;
					}
					if (num === cards.length - 1 && player.hp > 1) {
						return -1;
					}
					for (var i = 0; i < cards.length; i++) {
						if (cards[i].number > 9) {
							return num === 1 ? -1 : -0.5;
						}
					}
					return 0;
				},
			},
			order: 9,
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/swd/skill.js:5875; original skill tanlin4
tanlin4: {
		mod: {
			targetInRange(card, player, target, now) {
				if (target.hasSkill("tanlin2")) {
					return true;
				}
			},
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/swd/skill.js:5853; original skill tanlin2
tanlin2: {
		trigger: { global: "phaseAfter" },
		forced: true,
		content() {
			player.removeSkill("tanlin2");
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/swd/skill.js:5860; original skill tanlin3
tanlin3: {
		trigger: { global: "phaseAfter" },
		forced: true,
		popup: false,
		content() {
			player.removeSkill("tanlin3");
		},
		mod: {
			cardUsable(card, player, num) {
				if (card.name === "sha") {
					return num + 1;
				}
			},
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:5; original skill xicai
xicai: {
		preHidden: true,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return get.itemtype(event.cards) === "cards" && get.position(event.cards[0], true) === "o";
		},
		async content(event, trigger, player) {
			await player.gain(trigger.cards, "gain2");
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -1];
					}
					if (get.tag(card, "damage")) {
						return [1, 0.55];
					}
				},
			},
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:29; original skill diyjianxiong
diyjianxiong: {
		mode: ["identity", "guozhan"],
		trigger: { global: "dieBefore" },
		filter(event, player) {
			if (_status.currentPhase !== player) {
				return false;
			}
			if (get.mode() === "identity") {
				return event.player !== game.zhu;
			}
			return get.mode() === "guozhan" && event.player.isFriendOf(player);
		},
		forced: true,
		async content() {
			game.broadcastAll(
				function (target, group) {
					if (get.mode() === "identity") {
						target.identity = group;
						target.showIdentity();
					} else {
						target.trueIdentity = lib.group
							.slice(0)
							.filter(i => group !== i)
							.randomGet();
					}
				},
				trigger.player,
				get.mode() === "identity" ? "fan" : player.getGuozhanGroup()
			);
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					if (!get.tag(card, "damage") || player === target || target.hp > 1 || target === game.zhu) {
						return;
					}
					if (get.mode() === "identity") {
						if (target.identity === "fan") {
							return;
						}
						let res = 3;
						/*const pid = player.identity;
						const tid = target.identity;
						if (pid === "zhu" && tid === "zhong") res += player.countCards("h");
						else if (pid.indexOf("Zhu") === 1 && pid[0] === tid[0] && tid.indexOf("Zhong") === 1) {
							res += player.countCards("h");
						}*/
						return [1, (get.attitude(player, target) > 0 ? 0.7 : 1) * res];
					} else if (get.mode() === "guozhan") {
						if (target.isFriendOf(player)) {
							return [1, 0.7 * player.countCards("h")];
						}
					}
				},
				player(card, player, target) {
					if (!get.tag(card, "damage") || player === target || target.hp > 1 || target === game.zhu) {
						return;
					}
					if (get.mode() === "identity") {
						if (target.identity === "fan") {
							return;
						}
						let res = 3;
						/*const pid = player.identity;
						const tid = target.identity;
						if (pid === "zhu" && tid === "zhong") res += player.countCards("h");
						else if (pid.indexOf("Zhu") === 1 && pid[0] === tid[0] && tid.indexOf("Zhong") === 1) {
							res += player.countCards("h");
						}*/
						return [1, (get.attitude(player, target) > 0 ? 0.7 : 1) * res];
					} else if (get.mode() === "guozhan") {
						if (target.isFriendOf(player)) {
							return [1, 0.7 * player.countCards("h")];
						}
					}
				},
			},
		},
	},
// Source: outputs/module-01/package/character/standard/skill.js:226; original skill hujia
extra_generals_shahai_hujia: {
 audio:"hujia",zhuSkill:true,trigger:{player:["chooseToRespondBefore","chooseToUseBefore"]},
 filter(event,player){return !event.responded&&!player.storage.extra_generals_shahai_hujiaing&&player.hasZhuSkill("extra_generals_shahai_hujia")&&event.filterCard?.({name:"shan",isCard:true},player,event)&&game.hasPlayer(p=>p!==player&&p.group==="wei");},
 check(event,player){return get.damageEffect(player,event.player,player)<0;},
 async content(event,trigger,player){
  const allies=game.filterPlayer(p=>p!==player&&p.group==="wei").sortBySeat(player);
  player.storage.extra_generals_shahai_hujiaing=true;
  try{for(const ally of allies){if(!ally.isIn())continue;
   const choice=ally.chooseToRespond("是否替"+get.translation(player)+"打出一张闪？",{name:"shan"});
   choice.set("source",player).set("ai",()=>get.attitude(get.player(),get.event().source)-2);choice.autochoose=lib.filter.autoRespondShan;
   if(await choice.forResultBool()){trigger.result={bool:true,card:{name:"shan",isCard:true}};trigger.responded=true;trigger.animate=false;return;}
  }}finally{delete player.storage.extra_generals_shahai_hujiaing;}
 },ai:{respondShan:true,skillTagFilter(player){return !player.storage.extra_generals_shahai_hujiaing&&player.hasZhuSkill("extra_generals_shahai_hujia")&&game.hasPlayer(p=>p!==player&&p.group==="wei");}}
},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:108; original skill diykuanggu
diykuanggu: {
		trigger: { source: "damageEnd" },
		filter(event, player) {
			if (player.isHealthy()) {
				return get.distance(trigger.player, player, "attack") > 1;
			}
			return true;
		},
		getIndex(event, player, triggername) {
			return event.num;
		},
		forced: true,
		async content(event, trigger, player) {
			if (get.distance(trigger.player, player, "attack") > 1) {
				await player.draw();
			} else {
				await player.recover();
			}
		},
		ai: {
			effect: {
				player(card, player, target) {
					if (!target || !get.tag(card, "damage")) {
						return;
					}
					if (get.distance(target, player, "attack") > 1) {
						return [1, 0.6];
					}
					if (player.isDamaged()) {
						return [1, 1.5];
					}
				},
			},
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:143; original skill xiongzi
xiongzi: {
		trigger: { player: "phaseDrawBegin" },
		forced: true,
		content() {
			trigger.num += 1 + Math.floor(player.countCards("e") / 2);
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:150; original skill yaliang
yaliang: {
		audio: "wangxi",
		trigger: { player: "damageEnd", source: "damageSource" },
		getIndex: event => event.num,
		filter(event) {
			if (event._notrigger.includes(event.player)) {
				return false;
			}
			return event.num && event.source?.isIn() && event.player?.isIn() && event.source !== event.player;
		},
		check(event, player) {
			if (player.isPhaseUsing()) {
				return true;
			}
			if (event.player === player) {
				return get.attitude(player, event.source) > -3;
			}
			return get.attitude(player, event.player) > -3;
		},
		logTarget(event, player) {
			if (event.player === player) {
				return event.source;
			}
			return event.player;
		},
		preHidden: true,
		async content(event, trigger, player) {
			await game.asyncDraw([trigger.player, trigger.source].sortBySeat());
		},
		ai: {
			maixie: true,
			maixie_hp: true,
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:458; original skill shaoying
shaoying: {
		trigger: { source: "damageAfter" },
		direct: true,
		filter(event) {
			return event.nature === "fire";
		},
		content() {
			"step 0";
			player.chooseTarget(get.prompt("shaoying"), function (card, player, target) {
				return get.distance(trigger.player, target) <= 1 && trigger.player !== target;
			}).ai = function (target) {
				return get.damageEffect(target, player, player, "fire");
			};
			"step 1";
			if (result.bool) {
				var card = get.cards()[0];
				card.discard();
				player.showCards(card);
				event.bool = get.color(card) === "red";
				event.target = result.targets[0];
				player.logSkill("shaoying", event.target, false);
				trigger.player.line(event.target, "fire");
			} else {
				event.finish();
			}
			"step 2";
			if (event.bool) {
				event.target.damage("fire");
			}
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:429; original skill zonghuo
zonghuo: {
		trigger: { source: "damageBefore" },
		direct: true,
		priority: 10,
		filter(event) {
			return event.nature !== "fire";
		},
		content() {
			"step 0";
			player.chooseToDiscard(get.prompt("zonghuo")).ai = function (card) {
				var att = get.attitude(player, trigger.player);
				if (trigger.player.hasSkillTag("nofire")) {
					if (att > 0) {
						return 8 - get.value(card);
					}
					return -1;
				}
				if (att < 0) {
					return 7 - get.value(card);
				}
				return -1;
			};
			"step 1";
			if (result.bool) {
				player.logSkill("zonghuo", trigger.player, "fire");
				trigger.nature = "fire";
			}
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:329; original skill jieyan
jieyan: {
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCard(card => get.color(card) === "red", "h");
		},
		filterCard(card, player) {
			return get.color(card) === "red";
		},
		filterTarget: true,
		selectTarget: -1,
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const targets = event.targets.sortBySeat();
			for (const target of targets) {
				await target.damage("fire", "nocard");
			}
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:348; original skill honglian
honglian: {
		trigger: { player: "damageEnd" },
		check(event, player) {
			return get.attitude(player, event.player) < 0;
		},
		filter(event, player) {
			return event.source && event.source !== player && event.source.countCards("he", { color: "red" }) > 0;
		},
		content() {
			trigger.source.discard(trigger.source.getCards("he", { color: "red" }));
		},
		ai: {
			expose: 0.1,
			result: {
				threaten: 0.8,
				target(card, player, target) {
					if (get.tag(card, "damage") && get.attitude(target, player) < 0) {
						return [1, 0, 0, -player.countCards("he", { color: "red" })];
					}
				},
			},
		},
	},
// Source: outputs/module-01/package/character/shenhua/skill.js:4778; original skill beige
extra_generals_shahai_beige: {
 audio:"beige",trigger:{global:"damageEnd"},
 filter(event,player){return event.card?.name==="sha"&&event.player?.isIn()&&player.countCards("he")>0;},
 async cost(event,trigger,player){event.result=await player.chooseToDiscard("he",get.prompt2(event.skill,trigger.player)).set("goon",get.attitude(player,trigger.player)>0).set("ai",card=>get.event().goon?8-get.value(card):0).forResult();},
 async content(event,trigger,player){const result=await trigger.player.judge().forResult();
  if(result.suit==="heart")await trigger.player.recover(1);
  else if(result.suit==="diamond")await trigger.player.draw(2);
  else if(trigger.source?.isIn()&&result.suit==="club")await trigger.source.chooseToDiscard("he",2,true);
  else if(trigger.source?.isIn()&&result.suit==="spade")await trigger.source.turnOver();
 },ai:{expose:0.3}
},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:224; original skill guihan
guihan: {
		enable: "chooseToUse",
		skillAnimation: "epic",
		limited: true,
		filter(event, player) {
			if (event.type !== "dying") {
				return false;
			}
			if (player !== event.dying) {
				return false;
			}
			return true;
		},
		filterTarget(card, player, target) {
			return target.hasSex("male") && player !== target;
		},
		content() {
			"step 0";
			player.awakenSkill(event.name);
			player.recover();
			"step 1";
			player.draw(2);
			"step 2";
			target.recover();
			"step 3";
			target.draw(2);
		},
		ai: {
			order: 3,
			skillTagFilter(player) {
				if (player.storage.guihan) {
					return false;
				}
				if (player.hp > 0) {
					return false;
				}
			},
			save: true,
			result: {
				player: 4,
				target(player, target) {
					if (target.hp === target.maxHp) {
						return 2;
					}
					return 4;
				},
			},
			threaten(player, target) {
				if (!target.storage.guihan) {
					return 0.8;
				}
			},
		},
	},
// Source: outputs/module-01/package/extension/杀海拾遗/character/yunchou/skill.js:489; original skill xinfu_qiaosi
xinfu_qiaosi: {
		audio: "qiaosi",
		enable: "phaseUse",
		usable: 1,
		content() {
			"step 0";
			if (get.isLuckyStar(player)) {
				event.num = 6;
				player.throwDice(6);
			} else {
				player.throwDice();
			}
			"step 1";
			event.cards = get.cards(event.num);
			player.showCards(event.cards);
			"step 2";
			player.gain(event.cards, "gain2");
			player
				.chooseControl()
				.set("choiceList", ["将" + get.cnNumber(event.num) + "张牌交给一名其他角色", "弃置" + get.cnNumber(event.num) + "张牌"])
				.set("ai", function () {
					if (
						game.hasPlayer(function (current) {
							return current !== player && get.attitude(player, current) > 2;
						})
					) {
						return 0;
					}
					return 1;
				});
			"step 3";
			if (result.index === 0) {
				player.chooseCardTarget({
					position: "he",
					filterCard: true,
					selectCard: event.num,
					filterTarget(card, player, target) {
						return player !== target;
					},
					ai1(card) {
						return 1;
					},
					ai2(target) {
						var att = get.attitude(_status.event.player, target);
						return att;
					},
					prompt: "请选择要送人的卡牌",
					forced: true,
				});
			} else {
				player.chooseToDiscard(event.num, true, "he");
				event.finish();
			}
			"step 4";
			if (result.bool) {
				var target = result.targets[0];
				player.give(result.cards, target);
			}
		},
		ai: {
			order: 7.5,
			result: {
				player: 1,
			},
		},
	},
};
const block=skills;
export default skills;
