import { lib, game, ui, get, ai, _status } from "noname";
import html from "dedent";

/** @type { importCharacterConfig["skill"] } */
const skills = {
	//雁翎徐晃
	ylyg_duanliang: {
		enable: "chooseToUse",
		filterCard(card) {
			return get.type2(card) != "trick" && get.color(card) == "black";
		},
		filter(event, player) {
			return player.hasCard(card => get.type2(card) != "trick" && get.color(card) == "black", "hes");
		},
		position: "hes",
		viewAs: {
			name: "bingliang",
		},
		filterTarget(card, player, target) {
			return lib.filter.targetEnabled.call(this, card, player, target);
		},
		prompt: "将一张黑色非锦囊牌当做无距离限制的兵粮寸断使用",
		check(card) {
			return 6 - get.value(card);
		},
		onuse(result, player) {
			player.addTempSkill(`${result.skill}_draw`);
		},
		subSkill: {
			draw: {
				charlotte: true,
				forced: true,
				trigger: {
					player: "useCardAfter",
				},
				filter(event, player) {
					return event.skill == "ylyg_duanliang" && event.targets[0].countCards("h") > player.countCards("h");
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
		},
	},
	ylyg_zier: {
		trigger: {
			global: "phaseBegin",
		},
		round: 1,
		filter(event, player) {
			return event.phaseList?.length && player.getStorage("ylyg_zier").length > 0;
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			const result = await player
				.chooseButton({
					createDialog: [get.prompt2(event.skill, target), `<div class="text center">${get.translation(target)}当前回合的阶段</div>`, [trigger.phaseList.map((name, index) => [index + 1, "", `lusu_${name.split("|")[0]}`]), "vcard"], `<div class="text center">你已记录的阶段</div>`, [player.getStorage(event.skill).map(name => ["", "", `lusu_${name.split("|")[0]}`]), "vcard"]],
					filterButton(button) {
						if (!ui.selected.buttons?.length) {
							return typeof button.link[0] == "number";
						}
						return typeof button.link[0] != "number";
					},
					selectButton: 2,
					att: get.attitude(player, target),
					target,
					ai(button) {
						const { att, target } = get.event();
						const { link } = button;
						if (!ui.selected.buttons?.length) {
							if (att > 0) {
								if (link[2].includes("phaseDiscard")) {
									return 5;
								}
								if (link[2].includes("phaseJudge") && target.hasCards("j")) {
									return 4;
								}
							}
							if (att < 0) {
								if (link[2].includes("phaseUse")) {
									return 5;
								}
								if (link[2].includes("phaseDraw")) {
									return 4;
								}
							}
							return 0;
						} else {
							if (att > 0) {
								if (link[2].includes("phaseUse")) {
									return 5;
								}
								if (link[2].includes("phaseDraw")) {
									return 4 + (target.countCards("h") < 3 ? 2 : 0);
								}
							}
							if (att < 0) {
								if (!["phaseUse", "phaseDraw"].some(i => link[2].includes(i))) {
									return 5;
								}
							}
							return 0;
						}
					},
				})
				.forResult();
			if (result?.bool) {
				result.links?.forEach(i => (i[2] = i[2].slice(5)));
				event.result = {
					bool: true,
					cost_data: result.links,
				};
			}
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const {
				cost_data: [prev, cur],
			} = event;
			game.log(event.targets[0], "的", `#g${get.translation(prev[2])}`, "改为了", `#g${get.translation(cur[2])}`);
			trigger.phaseList[prev[0] - 1] = `${cur[2]}|${event.name}`;
		},
		intro: {
			content: "已记录：$",
		},
		group: "ylyg_zier_record",
		subSkill: {
			record: {
				trigger: {
					global: ["phaseAnyCancelled", "phaseAnySkipped"],
				},
				filter(event, player) {
					return !player.getStorage("ylyg_zier").includes(event.name);
				},
				prompt2(event, player) {
					return `记录${get.translation(event.name)}`;
				},
				async content(event, trigger, player) {
					player.markAuto("ylyg_zier", trigger.name);
					player.addTempSkill("ylyg_zier_clear", "roundStart");
				},
			},
			clear: {
				charlotte: true,
				onremove(player, skill) {
					player.setStorage("ylyg_zier", [], true);
				},
			},
		},
	},
	//雁翎祝融
	ylyg_lieren: {
		trigger: {
			player: "useCardToPlayered",
		},
		filter(event, player) {
			if (get.name(event.card) != "sha" || event.targets?.length != 1) {
				return false;
			}
			return player.getHistory("useCard", evt => get.name(evt.card) == "sha").indexOf(event.getParent()) == 0 && player.canCompare(event.target);
		},
		logTarget: "target",
		check(event, player) {
			const { target } = event;
			if (get.attitude(player, target) > 0) {
				return false;
			}
			let maxnum = 0;
			const cards2 = target.getCards("h");
			for (let i = 0; i < cards2.length; i++) {
				if (get.number(cards2[i]) > maxnum) {
					maxnum = get.number(cards2[i]);
				}
			}
			if (maxnum > 10) {
				maxnum = 10;
			}
			if (maxnum < 5 && cards2.length > 1) {
				maxnum = 5;
			}
			const cards = player.getCards("h");
			for (let i = 0; i < cards.length; i++) {
				if (get.number(cards[i]) < maxnum) {
					return true;
				}
			}
			return false;
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const result = await player
				.chooseToCompare(target)
				.set("small", get.attitude(player, target) < 0)
				.forResult();
			if (result.winner?.isIn()) {
				const { winner } = result;
				winner
					.when({ global: "useCardAfter" })
					.filter(evt => evt.card == trigger.card)
					.then(async (event, trigger, player) => {
						const hs = player.getCards("h");
						if (!hs.length) {
							return;
						}
						const vcard = get.autoViewAs({ name: "nanman" }, hs);
						if (player.hasUseTarget(vcard)) {
							await player.chooseUseTarget({
								card: vcard,
								cards: hs,
								forced: true,
							});
						}
					});
			}
		},
	},
	ylyg_juxiang: {
		trigger: {
			global: "useCard",
		},
		filter(event, player) {
			return event.card.name == "nanman";
		},
		async cost(event, trigger, player) {
			if (trigger.player == player) {
				event.result = await player
					.chooseBool({
						prompt: get.prompt(event.skill),
						prompt2: `令${get.translation(trigger.card)}对体力值大于你的角色造成的伤害+1`,
						choice: (() => {
							const { targets, card } = trigger;
							let eff = 0;
							for (let i = 0; i < targets.length; i++) {
								eff += get.effect(targets[i], card, player, player);
							}
							return eff > 0;
						})(),
					})
					.forResult();
			} else {
				event.result = { bool: true };
			}
		},
		async content(event, trigger, player) {
			if (trigger.player == player) {
				player.addTempSkill(event.name + "_damage");
				player.markAuto(event.name + "_damage", trigger.card);
			} else {
				trigger.excluded.add(player);
				player
					.when({ global: "useCardAfter" })
					.filter(evt => evt.card == trigger.card)
					.then(async (event, trigger, player) => {
						const { cards } = trigger;
						if (cards.someInD()) {
							await player.gain({ cards: cards.filterInD(), animate: "gain2" });
						}
					});
			}
		},
		subSkill: {
			damage: {
				charlotte: true,
				onremove: true,
				forced: true,
				popup: false,
				trigger: {
					source: "damageBegin1",
				},
				filter(event, player) {
					return player.getStorage("ylyg_juxiang_damage").includes(event.card) && event.player.getHp() > player.getHp();
				},
				async content(event, trigger, player) {
					trigger.num++;
				},
			},
		},
	},
	//雁翎庞统
	ylygxiangxing: {
		locked: true,
		derivation: ["reyingzi", "rebiyue"],
		global: ["ylygxiangxing_yingzi", "ylygxiangxing_biyue"],
	},
	ylygxiangxing_yingzi: {
		inherit: "reyingzi",
		filter(event, player) {
			return game.hasPlayer(target => target != player && target.hasSkill("ylygxiangxing")) && !event.numFixed;
		},
		mod: {
			maxHandcardBase(player, num) {
				if (game.hasPlayer(target => target != player && target.hasSkill("ylygxiangxing"))) {
					return player.maxHp;
				}
			},
		},
	},
	ylygxiangxing_biyue: {
		inherit: "rebiyue",
		frequent: false,
		filter(event, player) {
			return game.hasPlayer(target => target != player && target.hasSkill("ylygxiangxing"));
		},
	},
	ylyglianhuan: {
		enable: "phaseUse",
		filterCard: true,
		viewAsFilter(player) {
			return player.countCards("hes") > 0;
		},
		usable(skill, player) {
			return game.shuffleNumber + 1;
		},
		viewAs: {
			name: "tiesuo",
		},
		position: "hes",
		onuse(result, player) {
			player.addTempSkill(result.skill + "_effect");
		},
		subSkill: {
			effect: {
				charlotte: true,
				forced: true,
				trigger: {
					player: "useCardAfter",
				},
				filter(event, player) {
					return event.skill == "ylyglianhuan" && event.targets?.length == 2 && event.targets.some(target => target.countCards("h") > 0);
				},
				logTarget: "targets",
				async content(event, trigger, player) {
					const { targets } = event;
					const lose_list = [];
					let cards = [];
					targets.forEach(current => {
						const hs = current.getCards("h");
						if (hs.length) {
							cards.addArray(hs);
							current.$throw(hs.length, 500);
							game.log(current, "将", get.cnNumber(hs.length), "张牌置入了处理区");
							lose_list.push([current, hs]);
						}
					});
					if (lose_list.length) {
						await game
							.loseAsync({
								lose_list,
							})
							.setContent("chooseToCompareLose");
					}
					await game.delay();
					cards = cards.filterInD();
					const list = [];
					const num = Math.floor(cards.length / 2);
					targets.forEach(target => {
						const gain = cards.randomRemove(num);
						if (gain.length) {
							list.push([target, gain]);
							game.log(target, "获得了", get.cnNumber(gain.length), "张牌");
						}
					});
					await game
						.loseAsync({
							gain_list: list,
							player,
							animate: "draw",
						})
						.setContent("gaincardMultiple");
					cards = cards.filterInD();
					if (cards.length) {
						game.log(player, "获得了", get.cnNumber(cards.length), "张牌");
						await player.gain({ cards, animate: "draw" });
					}
				},
			},
		},
	},
	ylygniepan: {
		enable: "chooseToUse",
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		filter(event, player) {
			if (event.type == "dying") {
				if (player != event.dying) {
					return false;
				}
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.addSkill(event.name + "_restore");
			await player.draw({ num: 3 });
			await player.recoverTo(3);
			const result = await player
				.chooseTarget({
					prompt: "涅槃：对一名角色造成2点火焰伤害",
					filterTarget: lib.filter.all,
					ai(target) {
						return get.damageEffect(target, get.player(), get.player(), "fire");
					},
					forced: true,
				})
				.forResult();
			const { targets } = result;
			if (targets.length) {
				const [target] = targets;
				player.line(target, "fire");
				await target.damage({ num: 2, nature: "fire" });
			}
		},
		ai: {
			order: 0.5,
			skillTagFilter(player, tag, target) {
				if (player != target || player.storage.ylygniepan) {
					return false;
				}
			},
			save: true,
			result: {
				player: 10,
			},
		},
		subSkill: {
			restore: {
				forced: true,
				charlotte: true,
				trigger: {
					global: "washCard",
				},
				async content(event, trigger, player) {
					player.removeSkill(event.name);
					player.refreshSkill("ylygniepan");
				},
			},
		},
	},
	//雁翎典韦
	ylygqiangxi: {
		enable: "phaseUse",
		onChooseToUse(event) {
			if (!game.online && !event.ylygqiangxi_targets && event.type == "phase") {
				event.set(
					"ylygqiangxi_targets",
					event.player.getHistory("useSkill", evt => evt.skill == "ylygqiangxi").flatMap(evt => evt.targets)
				);
			}
		},
		filter(event, player) {
			return game.hasPlayer(target => !event.ylygqiangxi_targets.includes(target) && player.canCompare(target));
		},
		filterTarget(card, player, target) {
			return !get.event().ylygqiangxi_targets.includes(target) && player.canCompare(target);
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await player.chooseToCompare(target).forResult();
			event.getParent().set(event.name, !!result.bool);
			if (result.bool) {
				let result;
				if (!target.countDiscardableCards(player, "he")) {
					result = { index: 0 };
				} else {
					result = await player
						.chooseControl({
							choiceList: [`摸一张牌`, `弃置${get.translation(target)}一张牌`],
							choice: get.effect(target, { name: "draw" }, player, player) > get.effect(target, { name: "guohe_copy2" }, player, player) ? 0 : 1,
						})
						.forResult();
				}
				if (result.index == 0) {
					await player.draw();
				} else {
					await player.discardPlayerCard({ target, position: "he", forced: true });
				}
			} else {
				const list = player.getHistory("useSkill", evt => evt.skill == event.name && evt.event[event.name] == false);
				if (list.length == 2) {
					await player.loseHp();
					let targets = list.flatMap(evt => evt.targets).sortBySeat();
					let prevs = [targets[0]];
					let nexts = [targets[0]];
					while (prevs[0] != targets[1] || nexts[0] != targets[1]) {
						if (prevs[0] != targets[1]) {
							const prev = prevs[0].previousSeat;
							prevs.unshift(prev);
						}
						if (nexts[0] != targets[1]) {
							const next = nexts[0].nextSeat;
							nexts.unshift(next);
						}
					}
					prevs = prevs.filter(target => targets.includes(target) || target.isIn());
					nexts = nexts.filter(target => targets.includes(target) || target.isIn());
					if (prevs.length != 0 && nexts.length != 0) {
						if (prevs.length == nexts.length) {
							const getEff = targets =>
								targets
									.slice()
									.remove(player)
									.reduce((sum, target) => sum + get.damageEffect(target, player, player), 0);
							const result = await player
								.chooseControl({
									prompt: `强袭：请选择从${get.translation(targets[0])}的哪个方向向${get.translation(targets[1])}逐个肘击`,
									controls: ["顺时针", "逆时针"],
									choice: getEff(prevs) >= getEff(nexts) ? 0 : 1,
								})
								.forResult();
							if (result.index == 0) {
								targets = prevs.slice();
							} else {
								targets = nexts.slice();
							}
						} else if (prevs.length < nexts.length) {
							targets = prevs.slice();
						} else if (prevs.length > nexts.length) {
							targets = nexts.slice();
						}
						targets = targets.filter(target => target != player && target.isIn());
						if (targets.length) {
							player.line(targets);
							player.chat("狠狠肘击！");
							await game.doAsyncInOrder(targets, async target => target.damage());
						}
					}
					player.tempBanSkill(event.name);
				}
			}
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					let hs = player.getCards("h");
					if (hs.some(card => get.value(card) <= 6 && card.number > 10) || (player.getHp() < 2 && player.getHp() + player.countCards("h", { name: ["tao", "jiu"] }) > 2) || (player.getHp() > 1 && player.getHp() + player.countCards("h", { name: "tao" }) > 2)) {
						return -1;
					}
					return 0;
				},
			},
		},
	},
	//雁翎小乔
	ylygtianxiang: {
		audio: "retianxiang",
		trigger: {
			player: "damageBegin4",
		},
		filter(event, player) {
			return player.countDiscardableCards(player, "he", { suit: "heart" }) > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(get.prompt(event.skill), `弃置一张红桃牌防止${trigger.source ? get.translation(trigger.source) + "造成的" : ""}伤害`, { suit: "heart" }, "he", "chooseonly")
				.set("ai", card => {
					const { source, player, nature } = get.event().getTrigger();
					if (get.damageEffect(player, source, player, nature) < 0) {
						return 7 - get.value(card);
					}
					return 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			await player.modedDiscard(cards);
			trigger.cancel();
		},
		group: "ylygtianxiang_lose",
		subSkill: {
			lose: {
				trigger: {
					player: ["loseAfter", "compare"],
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
					target: "compare",
				},
				filter(event, player) {
					if (!["chooseToCompare", "equip"].includes(event.name) && !event.visible) {
						return false;
					}
					return get.info("ylygtianxiang_lose").getCards(event, player).length > 0;
				},
				getCards(event, player) {
					let cards;
					if (event.name == "chooseToCompare") {
						if (player == event.player) {
							if (event.iwhile > 0) {
								cards = [];
							}
							return (cards = [event.card1]);
						}
						return (cards = [event.card2]);
					} else {
						cards = event.getl?.(player)?.cards2 || [];
					}
					return cards.filter(card => get.suit(card, player) == "heart" && get.position(card) == "d");
				},
				async cost(event, trigger, player) {
					const cards = get.info(event.skill).getCards(trigger, player);
					event.result = await player
						.chooseTarget(lib.filter.notMe)
						.set("createDialog", [`###${get.prompt(event.skill)}###将这些牌交给一名其他角色，其于此回合结束时失去1点体力（不叠加）`, cards, [dialog => dialog.buttons.forEach(i => (i.style.opacity = 1)), "handle"]])
						.set("ai", target => {
							const { cardsVal, targetsList, player } = get.event();
							const att = get.attitude(player, target);
							const eff = get.effect(target, { name: "losehp" }, player, player);
							if (target.hasSkill("ylygtianxiang_loseHp") && att < 0) {
								return 0;
							}
							return att * (cardsVal - eff) * (targetsList.indexOf(target) / targetsList.length);
						})
						.set("cardsVal", get.value(cards))
						.set(
							"targetsList",
							(function () {
								return game
									.filterPlayer(current => current != player)
									.sort((a, b) => {
										return get.attitude(player, b) - get.attitude(player, a);
									});
							})()
						)
						.forResult();
				},
				async content(event, trigger, player) {
					const {
						targets: [target],
					} = event;
					const cards = get.info(event.name).getCards(trigger, player);
					const next = target.gain(cards, "gain2");
					next.giver = player;
					target.addTempSkill(`${event.name}Hp`);
					await next;
				},
			},
			loseHp: {
				charlotte: true,
				forced: true,
				popup: false,
				mark: true,
				intro: {
					content: "回合结束时失去1点体力",
				},
				trigger: { global: "phaseEnd" },
				async content(event, trigger, player) {
					await player.loseHp();
				},
			},
		},
	},
	ylyghongyan: {
		audio: "hongyan",
		mod: {
			suit(card, suit) {
				if (suit == "spade") {
					return "heart";
				}
			},
		},
		trigger: {
			player: "enterGame",
			global: "phaseBefore",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		async content(event, trigger, player) {
			const keys = ["花色", "颜色", "红色", "黑色"].concat(lib.suit.flatMap(i => [get.translation(i), get.translation(`${i}2`)]));
			const map = new Map();
			game.filterPlayer(target => target != player && target.hasSex("male")).forEach(target => {
				map.set(target, []);
				const skills = target.getSkills(null, false, false).filter(i => !get.info(i).charlotte);
				if (skills.length) {
					map.get(target).push(
						...skills.filter(i => {
							const info = get.skillInfoTranslation(i, target, true);
							return keys.some(i => info.includes(i));
						})
					);
				}
			});
			if (Array.from(map.values()).flat().length) {
				const next = player
					.chooseTarget("###红颜###选择获得其他男性角色的一个含颜色或花色的技能", true, (card, player, target) => {
						return get.event().map.get(target)?.length > 0;
					})
					.set("map", map)
					.set("ai", target => Math.random());
				next.targetprompt2.push(target => {
					const { map } = get.event();
					if (!target.classList.contains("selectable") || !map.get(target)?.length) {
						return;
					}
					return map.get(target).map(i => get.translation(i));
				});
				const result = await next.forResult();
				if (result.targets?.length) {
					const {
						targets: [target],
					} = result;
					player.line(target, "yellow");
					const skills = map.get(target);
					let result2;
					skills.length == 1
						? (result2 = { bool: true, links: skills })
						: (result2 = await player
								.chooseButton([`红颜：选择获得一个技能`, [skills, "skill"]], true)
								.set("ai", button => Math.random())
								.forResult());
					if (result2.links?.length) {
						const { links } = result2;
						await player.addSkills(links);
					}
				}
			} else {
				player.chat("你走了，我们吃什么啊");
			}
		},
	},
	//雁翎于吉
  ylygguhuo: {
    audio: 2,
    derivation: "rechanyuan",
    enable: ["chooseToUse", "chooseToRespond"],
    hiddenCard(player, name) {
      return lib.inpile.includes(name) && player.countCards("h") > 0 && !player.hasSkill("ylygguhuo_used");
    },
    filter(event, player) {
      if (!player.countCards("h") || player.hasSkill("ylygguhuo_used")) {
        return false;
      }
      for (var i of lib.inpile) {
        var type = get.type(i);
        if ((type == "basic" || type == "trick") && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
          return true;
        }
        if (i == "sha") {
          for (var j of lib.inpile_nature) {
            if (event.filterCard(get.autoViewAs({ name: i, nature: j }, "unsure"), player, event)) {
              return true;
            }
          }
        }
      }
      return false;
    },
    chooseButton: {
      dialog() {
        var list = [];
        for (var i of lib.inpile) {
          var type = get.type(i);
          if (type == "basic" || type == "trick") {
            list.push([type, "", i]);
          }
          if (i == "sha") {
            for (var j of lib.inpile_nature) {
              list.push(["基本", "", "sha", j]);
            }
          }
        }
        return ui.create.dialog("蛊惑", [list, "vcard"]);
      },
      filter(button, player) {
        var evt = _status.event.getParent();
        return evt.filterCard(get.autoViewAs({ name: button.link[2], nature: button.link[3] }, "unsure"), player, evt);
      },
      check(button) {
        var player = _status.event.player;
        var rand = _status.event.getParent().getRand("ylygguhuo");
        var hasEnemy = game.hasPlayer(function(current) {
          return current != player && !current.hasSkill("rechanyuan") && (get.realAttitude || get.attitude)(current, player) < 0;
        });
        var card = { name: button.link[2], nature: button.link[3] };
        var val = _status.event.getParent().type == "phase" ? player.getUseValue(card) : 1;
        if (val <= 0) {
          return 0;
        }
        if (hasEnemy && rand > 0.3) {
          if (!player.countCards("h", function(cardx) {
            if (card.name == cardx.name) {
              if (card.name != "sha") {
                return true;
              }
              return get.is.sameNature(card, cardx);
            }
            return false;
          })) {
            return 0;
          }
          return 3 * val;
        }
        return val;
      },
      backup(links, player) {
        return {
          viewAs: {
            name: links[0][2],
            nature: links[0][3],
            suit: "none",
            number: null
          },
          filterCard(card, player2, target) {
            var result = true;
            var suit = card.suit, number = card.number;
            card.suit = "none";
            card.number = null;
            var mod = game.checkMod(card, player2, "unchanged", "cardEnabled2", player2);
            if (mod != "unchanged") {
              result = mod;
            }
            card.suit = suit;
            card.number = number;
            return result;
          },
          position: "h",
          ignoreMod: true,
          ai1(card) {
            var player2 = _status.event.player;
            var hasEnemy = game.hasPlayer(function(current) {
              return current != player2 && !current.hasSkill("rechanyuan") && (get.realAttitude || get.attitude)(current, player2) < 0;
            });
            var rand = _status.event.getRand("ylygguhuo");
            var cardx = lib.skill.ylygguhuo_backup.viewAs;
            if (hasEnemy && rand > 0.3) {
              if (card.name == cardx.name && (card.name != "sha" || get.is.sameNature(card, cardx))) {
                return 10;
              }
              return 0;
            }
            return 6 - get.value(card);
          },
          async precontent(event, trigger, player2) {
            const { result } = event;
            player2.logSkill("ylygguhuo");
            player2.addTempSkill("ylygguhuo_guess");
            const card = result.cards[0];
            result.card.suit = get.suit(card);
            result.card.number = get.number(card);
          }
        };
      },
      prompt(links) {
        return "将一张手牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
      }
    },
    ai: {
      fireAttack: true,
      respondShan: true,
      respondSha: true,
      skillTagFilter(player) {
        if (!player.countCards("h") || player.hasSkill("ylygguhuo_used")) {
          return false;
        }
      },
      order: 10,
      result: {
        player: 1
      },
      threaten: 1.3
    },
    subSkill: {
      backup: {},
      used: { charlotte: true },
      guess: {
        trigger: {
          player: ["useCardBefore", "respondBefore"]
        },
        forced: true,
        silent: true,
        popup: false,
        charlotte: true,
        firstDo: true,
        sourceSkill: "ylygguhuo",
        filter(event, player) {
          return event.skill && event.skill.indexOf("ylygguhuo_") == 0;
        },
        async content(event, trigger, player) {
          player.addTempSkill("ylygguhuo_used");
          event.fake = false;
          const card = trigger.cards[0];
          if (card.name != trigger.card.name || card.name == "sha" && !get.is.sameNature(trigger.card, card)) {
            event.fake = true;
          }
          player.line(trigger.targets, get.nature(trigger.card));
          event.cardTranslate = get.translation(trigger.card.name);
          trigger.card.number = get.number(card);
          trigger.card.suit = get.suit(card);
          trigger.skill = "ylygguhuo_backup";
          if (trigger.card.name == "sha" && get.natureList(trigger.card).length) {
            event.cardTranslate = get.translation(trigger.card.nature) + event.cardTranslate;
          }
          player.popup(event.cardTranslate, trigger.name == "useCard" ? "metal" : "wood");
          event.prompt = "是否质疑" + get.translation(player) + "声明的" + event.cardTranslate + "？";
          game.log(player, "声明了", "#y" + event.cardTranslate);
          event.targets = game.filterPlayer(function(current) {
            return current != player && !current.hasSkill("rechanyuan");
          }).sortBySeat();
          event.targets2 = event.targets.slice(0);
          player.lose(card, ui.ordering).relatedEvent = trigger;
          if (!event.targets.length) {
            event.betrays = [];
            for (const i of event.targets2) {
              i.popup("不质疑", "wood");
              game.log(i, "#g不质疑");
            }
            game.delay();
            return;
          }
          event.betrays = [];
          let list = event.targets.map(function(target) {
            return [target, [event.prompt, [["reguhuo_ally", "reguhuo_betray"], "vcard"]], true];
          });
          const result = await player.chooseButtonOL(list).set("switchToAuto", function() {
            _status.event.result = "ai";
          }).set("processAI", function() {
            let choice = Math.random() > 0.5 ? "reguhuo_ally" : "reguhuo_betray";
            const playerx = _status.event.player;
            const evt = _status.event.getParent("ylygguhuo_guess");
            if (playerx.hp <= 1 || evt && (get.realAttitude || get.attitude)(playerx, evt.player) >= 0) {
              choice = "reguhuo_ally";
            }
            return {
              bool: true,
              links: [["", "", choice]]
            };
          }).forResult();
          for (const i in result) {
            if (result[i].links[0][2] == "reguhuo_betray") {
              const current = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
              event.betrays.push(current);
              current.addExpose(0.2);
            }
          }
          for (const i of event.targets2) {
            const b = event.betrays.includes(i);
            i.popup(b ? "质疑" : "不质疑", b ? "fire" : "wood");
            game.log(i, b ? "#y质疑" : "#g不质疑");
          }
          game.delay();
          if (event.betrays.length) {
            await player.showCards(trigger.cards);
            event.betrays.sortBySeat();
            if (event.fake) {
              game.asyncDraw(event.betrays);
              trigger.cancel();
              trigger.getParent().goto(0);
              game.log(player, "声明的", "#y" + event.cardTranslate, "作废了");
            } else {
              const next = game.createEvent("ylygguhuo_final", false);
              event.next.remove(next);
              trigger.after.push(next);
              next.targets = event.betrays;
              next.setContent(lib.skill.ylygguhuo_guess.contentx);
            }
          }
          game.delayx();
        },
        async contentx(event, trigger, player) {
          const targets = (event.targets || []).slice(0);
          let result;
          while (targets.length) {
            const target = targets.shift();
            event.target = target;
            result = await target.chooseToDiscard("弃置一张牌或失去1点体力").set("ai", (card) => 9 - get.value(card)).forResult();
            if (!result.bool) {
              await target.loseHp();
            }
            await target.addSkills("rechanyuan");
          }
        }
      }
    }
  },
	ylyghuinu: {
		locked: true,
		mark: true,
		intro: {
			content: (storage, player, skill) => get.skillInfoTranslation(skill, player),
		},
	},
};

export default skills;
