import {lib,game,ui,get,ai,_status} from "../../../noname.js";
import translate from "./translate.js";
const skills = {
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:3; original skill nsshuaiyan
nsshuaiyan: {
		trigger: { global: "recoverAfter" },
		filter(event, player) {
			return event.player !== player && _status.currentPhase !== player;
		},
		logTarget: "player",
		content() {
			"step 0";
			var att = get.attitude(trigger.player, player);
			var bool = 0;
			if (att < 0) {
				if (trigger.player.countCards("e") === 0 && trigger.player.countCards("h") > 2) {
					bool = 1;
				} else if (trigger.player.countCards("he") === 0) {
					bool = 1;
				}
			} else if (att === 0 && trigger.player.countCards("he") === 0) {
				bool = 1;
			}
			trigger.player
				.chooseControl(function () {
					return _status.event.bool;
				})
				.set("prompt", "率言")
				.set("bool", bool)
				.set("choiceList", ["令" + get.translation(player) + "摸一张牌", "令" + get.translation(player) + "弃置你一张牌"]);
			"step 1";
			if (result.control === "选项一") {
				player.draw();
				event.finish();
			} else if (trigger.player.countCards("he")) {
				player.discardPlayerCard(trigger.player, true, "he");
			} else {
				event.finish();
			}
		},
		ai: {
			threaten: 1.2,
		},
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:43; original skill moshou
moshou: {
		mod: {
			targetEnabled(card, player, target, now) {
				if (card.name === "bingliang" || card.name === "lebu") {
					return false;
				}
			},
		},
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:160; original skill zhucheng
zhucheng: {
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			return !player.storage.zhucheng || !player.storage.zhucheng.length;
		},
		check(event, player) {
			if (player.storage.zhucheng && player.storage.zhucheng.length) {
				if (!player.hasShan()) {
					return false;
				}
				if (player.storage.zhucheng.length >= 2) {
					return false;
				}
			}
			return true;
		},
		intro: {
			content: "cards",
		},
		content() {
			if (player.storage.zhucheng && player.storage.zhucheng.length) {
				player.gain(player.storage.zhucheng, "gain2");
				delete player.storage.zhucheng;
				player.unmarkSkill("zhucheng");
			} else {
				var cards = get.cards(Math.max(1, player.maxHp - player.hp));
				player.$gain2(cards);
				player.storage.zhucheng = cards;
				player.markSkill("zhucheng");
			}
		},
		ai: {
			target(card, player, target, current) {
				if (card.name === "sha" && player.storage.zhucheng && player.storage.zhucheng.length) {
					if (player.storage.zhucheng.length >= 2) {
						if (!player.hasFriend() && player.countCards("he") - 2 < player.storage.zhucheng.length) {
							return "zeroplayertarget";
						}
						return 0.1;
					} else {
						var he = player.getCards("he");
						var sha = false;
						for (var i = 0; i < he.length; i++) {
							if (he[i] === "sha" && !sha) {
								sha = true;
							} else {
								if (get.value(he[i]) <= 6) {
									return [1, 0, 1, -0.5];
								}
							}
						}
						return "zeroplayertarget";
					}
				}
			},
		},
		group: "zhucheng2",
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:218; original skill zhucheng2
zhucheng2: {
		trigger: { target: "shaBefore" },
		sourceSkill: "zhucheng",
		check(event, player) {
			if (get.attitude(event.player, player) <= 0) {
				return true;
			}
			return get.effect(player, event.card, event.player, player) <= 0;
		},
		filter(event, player) {
			return player.storage.zhucheng && player.storage.zhucheng.length > 0;
		},
		content() {
			"step 0";
			var bool = false;
			if (get.effect(player, trigger.card, trigger.player, trigger.player) >= 0) {
				bool = true;
			}
			var num = player.storage.zhucheng.length;
			trigger.player
				.chooseToDiscard("弃置" + get.cnNumber(num) + "张牌，或令杀无效", "he", num)
				.set("ai", function (card) {
					if (_status.event.bool) {
						return 10 - get.value(card);
					}
					return 0;
				})
				.set("bool", bool);
			"step 1";
			if (!result.bool) {
				trigger.cancel();
			}
		},
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:109; original skill duoqi
duoqi: {
		trigger: { global: "discardAfter" },
		filter(event, player) {
			if (_status.currentPhase === player) {
				return false;
			}
			if (!player.storage.zhucheng || !player.storage.zhucheng.length) {
				return false;
			}
			var evt = event.getParent("phaseUse");
			if (evt && evt.name === "phaseUse") {
				return true;
			}
			return false;
		},
		direct: true,
		content() {
			"step 0";
			var bool = false;
			if (get.attitude(player, trigger.player) < 0 && trigger.player.needsToDiscard()) {
				bool = true;
			}
			player
				.chooseCardButton(get.prompt("zhucheng", _status.currentPhase), player.storage.zhucheng)
				.set("ai", function (button) {
					return _status.event.bool ? 1 : 0;
				})
				.set("bool", bool);
			"step 1";
			if (result.bool) {
				player.logSkill("zhucheng", _status.currentPhase);
				player.$throw(result.links[0]);
				player.storage.zhucheng.remove(result.links[0]);
				result.links[0].discard();
				player.syncStorage("zhucheng");
				if (player.storage.zhucheng.length === 0) {
					player.unmarkSkill("zhucheng");
				} else {
					player.updateMarks();
				}
				var evt = trigger.getParent("phaseUse");
				if (evt && evt.name === "phaseUse") {
					evt.skipped = true;
				}
			}
		},
		ai: {
			expose: 0.2,
			combo: "zhucheng",
		},
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:508; original skill fuchou
fuchou: {
		trigger: { target: "shaBefore" },
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		direct: true,
		content() {
			"step 0";
			var bool = false;
			if (!player.hasShan() && get.effect(player, trigger.card, trigger.player, player) < 0) {
				bool = true;
			}
			player.chooseCard("he", get.prompt("fuchou", trigger.player)).set("ai", function (card) {
				var player = _status.event.player;
				if (bool) {
					if (player.hp <= 1) {
						if (get.tag(card, "save")) {
							return 0;
						}
						return 8 - get.value(card);
					}
					return 6 - get.value(card);
				}
				return -get.value(card);
			});
			"step 1";
			if (result.bool) {
				trigger.cancel();
				player.logSkill("fuchou", trigger.player);
				trigger.player.gain(result.cards, player);
				if (get.position(result.cards[0]) === "h") {
					player.$give(1, trigger.player);
				} else {
					player.$give(result.cards, trigger.player);
				}
				player.storage.fuchou2.add(trigger.player);
			}
		},
		group: "fuchou2",
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:548; original skill fuchou2
fuchou2: {
		init(player) {
			player.storage.fuchou2 = [];
		},
		forced: true,
		trigger: { global: "phaseAfter" },
		sourceSkill: "fuchou",
		filter(event, player) {
			for (var i = 0; i < player.storage.fuchou2.length; i++) {
				if (player.storage.fuchou2[i].isAlive()) {
					return true;
				}
			}
			return false;
		},
		content() {
			"step 0";
			if (player.storage.fuchou2.length) {
				var target = player.storage.fuchou2.shift();
				if (target.isAlive()) {
					player.draw();
					if (player.canUse("sha", target, false) && player.hasSha()) {
						player.chooseToUse({ name: "sha" }, target, -1, "对" + get.translation(target) + "使用一张杀，或失去1点体力");
					} else {
						player.loseHp();
						event.redo();
					}
				}
			} else {
				event.finish();
			}
			"step 1";
			if (!result.bool) {
				player.loseHp();
			}
			event.goto(0);
		},
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:448; original skill jinyan
jinyan: {
		mod: {
			cardEnabled(card, player) {
				if (_status.event.skill !== "jinyan" && player.hp <= 2 && get.type(card, "trick") === "trick" && get.color(card) === "black") {
					return false;
				}
			},
			cardUsable(card, player) {
				if (_status.event.skill !== "jinyan" && player.hp <= 2 && get.type(card, "trick") === "trick" && get.color(card) === "black") {
					return false;
				}
			},
			cardRespondable(card, player) {
				if (_status.event.skill !== "jinyan" && player.hp <= 2 && get.type(card, "trick") === "trick" && get.color(card) === "black") {
					return false;
				}
			},
			cardSavable(card, player) {
				if (_status.event.skill !== "jinyan" && player.hp <= 2 && get.type(card, "trick") === "trick" && get.color(card) === "black") {
					return false;
				}
			},
		},
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard(card) {
			return get.type(card, "trick") === "trick" && get.color(card) === "black";
		},
		viewAsFilter(player) {
			if (player.hp > 2) {
				return false;
			}
			if (
				!player.hasCard(function (card) {
					return get.type(card, "trick") === "trick" && get.color(card) === "black";
				})
			) {
				return false;
			}
		},
		viewAs: { name: "sha" },
		prompt: "将一张黑色锦囊牌当作杀使用或打出",
		check() {
			return 1;
		},
		ai: {
			respondSha: true,
			skillTagFilter(player) {
				if (player.hp > 2) {
					return false;
				}
				if (
					!player.hasCard(function (card) {
						return get.type(card, "trick") === "trick" && get.color(card) === "black";
					})
				) {
					return false;
				}
			},
		},
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:685; original skill liangce
liangce: {
		enable: "phaseUse",
		viewAs: { name: "wugu" },
		usable: 1,
		filterCard: { type: "basic" },
		position: "hs",
		filter(event, player) {
			return player.countCards("hs", { type: "basic" }) > 0;
		},
		check(card) {
			return 6 - get.value(card);
		},
		group: "liangce_effect",
		subSkill: {
			effect: {
				trigger: { global: "wuguRemained" },
				filter(event) {
					return event.remained.someInD();
				},
				async cost(event, trigger, player) {
					const du = trigger.remained.filter(card => card.name === "du" && get.position(card, true) === "o").length;
					event.result = await player
						.chooseTarget(get.prompt(event.skill), `令一名角色获得${get.translation(trigger.remained.filterInD())}`)
						.set("ai", target => {
							const trigger = _status.event.getTrigger();
							const { player, du } = get.event();
							const att = get.attitude(player, target);
							if (du >= trigger.remained.length / 2) {
								return -att;
							}
							return att;
						})
						.set("du", du)
						.forResult();
				},
				async content(event, trigger, player) {
					await event.targets[0].gain(trigger.remained.filterInD(), "gain2", "log");
				},
			},
		},
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:726; original skill jianbi
jianbi: {
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			if (get.type(event.card) !== "trick") {
				return false;
			}
			if (get.info(event.card).multitarget) {
				return false;
			}
			if (event.targets.length < 2) {
				return false;
			}
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return get.event().getTrigger().targets.includes(target);
				})
				.set("ai", target => {
					const trigger = get.event().getTrigger();
					const player = get.player();
					const eff = -get.effect(target, trigger.card, trigger.player, player);
					if (trigger.card.name === "wugu" && eff === 0 && get.attitude(player, target) < 0) {
						return 0.01;
					}
					return eff;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.getParent().excluded.add(event.targets[0]);
			await game.delay();
		},
		ai: {
			effect: {
				target_use(card, player, target) {
					if (get.tag(card, "multineg")) {
						return "zeroplayertarget";
					}
					if (get.tag(card, "multitarget")) {
						var info = get.info(card);
						if (info.selectTarget === -1 && !info.multitarget) {
							return [1, Math.min(3, 1 + target.maxHp - target.hp)];
						}
					}
				},
			},
		},
	},
// Source: outputs/module-01/package/extension/玩点论杀/character/skill.js:776; original skill diyjuntun
diyjuntun: {
		enable: "phaseUse",
		filter: (event, player) => player.hasCard(card => lib.skill.diyjuntun.filterCard(card, player), "he"),
		position: "he",
		filterCard: (card, player) => get.type(card) === "equip" && player.canRecast(card),
		check(card) {
			var player = _status.event.player;
			var he = player.getCards("he");
			var subtype = get.subtype(card);
			var value = get.equipValue(card);
			for (var i = 0; i < he.length; i++) {
				if (he[i] !== card && get.subtype(he[i]) === subtype && get.equipValue(he[i]) >= value) {
					return 10;
				}
			}
			if (!player.needsToDiscard()) {
				return 4 - get.equipValue(card);
			}
			return 0;
		},
		content() {
			player.recast(cards);
		},
		discard: false,
		lose: false,
		delay: false,
		prompt: "将一张装备牌置入弃牌堆并摸一张牌",
		ai: {
			basic: {
				order: 8.5,
			},
			result: {
				player: 1,
			},
		},
	},
};
const block=skills;
export default skills;
