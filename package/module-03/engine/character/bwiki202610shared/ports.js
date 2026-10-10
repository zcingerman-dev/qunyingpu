export function portedSkills({lib,game,ui,get,ai,_status}) {return {
	bw_dcshiyu: {
		audio: false,
		trigger: { global: "phaseBegin" },
		round: 1,
		filter(event, player) {
			return player != event.player;
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			const result = await player
				.chooseButton({
					createDialog: [`识预：猜测${get.translation(target)}本回合是否会使用这些类型的牌`, [["basic", "trick", "equip"].map(i => ["", "", `bw_type_${i}`]), "vcard"]],
					selectButton: [1, 3],
					ai(button) {
						const { player, target } = get.event();
						if (get.attitude(player, target) > 0 || target.hasCards("j", card => get.name(card) == "lebu")) return 0;
						const link = button.link[2].slice(8);
						if (link == "basic") return 1;
						return 0.5 - Math.random();
					},
				})
				.set("target", target)
				.forResult();
			if (result?.bool && result.links?.length) {
				event.result = {
					bool: true,
					targets: [target],
					cost_data: result.links.map(type => type[2].slice(8)),
				};
			}
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cost_data: types1,
			} = event;
			const turn = trigger.name === "phase" ? trigger : trigger.getParent("phase");
			player
				.when({ global: "phaseEnd" })
				.filter(evt => evt === turn)
				.step(async (event, trigger, player) => {
					if (!player.isIn() || !target.isIn()) return;
					const types2 = target
						.getAllHistory("useCard", evt => evt.getParent("phase") === turn)
						.flatMap(evt => get.type2(evt.card))
						.unique();
					let num1 = types1.slice().removeArray(types2).length,
						num2 = types1.length - num1;
					if (num2 > 0) {
						if (target.hasCards("he")) {
							await player.gainPlayerCard({ forced: true, position: "he", target, selectButton: Math.min(target.countCards("he"), num2) });
						}
					}
						player.addTempSkill("bw_dcshiyu_nodamage", "roundStart");
						player.markAuto("bw_dcshiyu_nodamage", [target]);
					if (num1 > 0) {
						while (num1-- && player.isIn() && target.isIn()) {
							await target.damage({ num: 1, source: player });
							if (player.isIn() && target.isIn()) await player.damage({ num: 1, source: target });
						}
					} else {
						delete player.storage["bw_dcshiyu_roundcount"];
					}
				});
		},
		subSkill: {
			nodamage: {
				charlotte: true,
				intro: { content: "防止$本轮下次对你造成的伤害" },
				onremove: true,
				forced: true,
				firstDo: true,
				trigger: { player: "damageBegin4" },
				filter(event, player) {
					return event.source && player.getStorage("bw_dcshiyu_nodamage").includes(event.source);
				},
				async content(event, trigger, player) {
					trigger.cancel();
					player.unmarkAuto(event.name, [trigger.source]);
				},
			},
		},
	},
	bw_dcshuaijian: {
		audio: false,
		trigger: { global: ["phaseBegin", "phaseEnd"] },
		filter(event, player) {
			return ["h", "e"].some(pos => game.hasPlayer(current => current.hasCards(pos)));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseButtonTarget({
					createDialog: [
						"率俭：你可以令一名手牌数最多或装备区牌数最多的一名角色弃牌",
						[
							[
								["h", "手牌最多"],
								["e", "装备区牌最多"],
							],
							"tdnodes",
						],
					],
					filterButton(button) {
						const pos = button.link;
						return game.hasPlayer(current => current.hasCards(pos));
					},
					filterTarget(card, player, target) {
						if (!ui.selected.buttons?.length) return false;
						const pos = ui.selected.buttons[0].link;
						return !game.hasPlayer(current => current.countCards(pos) > target.countCards(pos)) && target.hasCards(pos);
					},
					ai1(button) {
						const player = get.player();
						if (game.hasPlayer(current => current.hasCards("e"))) {
							const targets = game.filterPlayer(target => !game.hasPlayer(current => current.countCards("e") > target.countCards("e")) && target.hasCards("e"));
							if (targets.some(target => get.attitude(player, target) < 0) && game.hasPlayer(current => get.recoverEffect(current, player, player) > 0)) {
								return button.link == "e";
							}
						}
						if (game.hasPlayer(current => current.hasCards("h"))) {
							const targets = game.filterPlayer(target => !game.hasPlayer(current => current.countCards("h") > target.countCards("h")) && target.hasCards("h"));
							if (targets.some(target => get.attitude(player, target) < 0)) {
								return button.link == "h";
							}
						}
						return 0;
					},
					ai2(target) {
						const player = get.player();
						if (!ui.selected.buttons?.length) return 0;
						const pos = ui.selected.buttons[0].link;
						return -get.attitude(player, target) * target.countCards(pos);
					},
				})
				.forResult();
			if (event.result?.bool && event.result.links?.length) {
				event.result.cost_data = event.result.links;
			}
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cost_data: [pos],
			} = event;
			let num = 0;
			while (target.isIn()) {
				const before = target.countCards(pos);
				const others = game.filterPlayer(current => current !== target);
				if (!others.length) break;
				const excess = before - Math.max(0, ...others.map(current => current.countCards(pos)));
				if (excess <= 0 || !target.countDiscardableCards(target, pos)) break;
				const discard = target.chooseToDiscard({ forced: true, position: pos, selectCard: excess });
				await discard.forResult();
				const actual = discard.done?.done?.getd(target) || [];
				num += actual.length;
				if (!actual.length || target.countCards(pos) >= before) break;
			}
			let result;
			if (num > 0 && player.isIn()) {
				if (pos == "e" && !game.hasPlayer(current => current.isDamaged())) {
					return;
				}
				const prompt = `率俭：令一名角色${pos == "h" ? `摸${get.cnNumber(num)}张牌` : `回复${num}点体力`}`;
				result = await player
					.chooseTarget({
						prompt,
						forced: true,
						filterTarget(card, player, target) {
							return get.event().pos == "h" || target.isDamaged();
						},
						ai(target) {
							const player = get.player();
							return get.event().pos == "h" ? get.effect(target, { name: "draw" }, player, player) : get.recoverEffect(target, player, player);
						},
					})
					.set("pos", pos)
					.forResult();
				if (result?.bool && result.targets?.length) {
					const target = result.targets[0];
					player.line(target);
					await target[pos == "h" ? "draw" : "recover"](num);
				}
			}
		},
	},
	bw_dcranlv: {
		audio: false,
		init(player) {
			player.storage["bw_dcranlv"] = [true, true, true];
		},
		trigger: { global: "damageEnd" },
		filter(event, player) {
			if (!player.getStorage("bw_dcranlv")?.length) {
				return false;
			}
			let num = 0;
			for (const i of player.getStorage("bw_dcranlv")) {
				if (i) {
					num++;
				}
			}
			return !event.hasNature("linked") && num > 0;
		},
		async cost(event, trigger, player) {
			const choiceList = ["横置或重置至多四名角色", "摸三张牌", "弃置一名角色两张牌"];
			const controls = [];
			for (const i of [0, 1, 2]) {
				if (player.getStorage("bw_dcranlv")[i]) {
					controls.push(`选项${["一", "二", "三"][i]}`);
				} else {
					choiceList[i] = `<span style="text-decoration: line-through;">${choiceList[i]}</span>`;
				}
			}
			controls.push("cancel2");
			const result = await player
				.chooseControl({
					prompt: "燃缕：是否选择一项执行？",
					choiceList: choiceList,
					controls: controls,
					ai: () => {
						const player = get.player();
						const controls = get.event().controls;
						if (controls.includes("选项二")) {
							return "选项二";
						}
						if (
							controls.includes("选项三") &&
							game.countPlayer(current => {
								return get.effect(current, { name: "guohe_copy2" }, player, player) && current.hasDiscardableCards(player, "he");
							})
						) {
							return "选项三";
						}
						return "选项一";
					},
				})
				.set("controls", controls)
				.forResult();
			event.result = {
				bool: result.control !== "cancel2",
				cost_data: {
					control: result.control,
				},
			};
		},
		async content(event, trigger, player) {
			const control = event.cost_data.control;
			const index = ["一", "二", "三"].indexOf(control[2]);
			player.storage["bw_dcranlv"][index] = false;
			if (index === 0) {
				const result = await player
					.chooseTarget({
						prompt: "选择横置或重置至多4名角色",
						forced: true,
						selectTarget: [1, 4],
						ai(target) {
							const player = get.player();
							if (player === target) {
								if (player.hasSkill("bw_dcjuexun")) {
									return player.isLinked() ? 1 : 5;
								}
								return player.isLinked() ? 2 : 0;
							}
							if (get.attitude(player, target)) {
								return target.isLinked() ? 3 : 0;
							}
							return target.isLinked() ? 0 : 4;
						},
					})
					.forResult();
				const targets = result.targets.sortBySeat();
				player.line(targets);
				for (const i of targets) {
					await i.link();
				}
			} else if (index === 1) {
				await player.draw(3);
			} else {
				const result = await player
					.chooseTarget({
						prompt: "选择一名角色并弃置其两张牌",
						forced: true,
						filterTarget(card, player, target) {
							return target.countDiscardableCards(player, "he");
						},
						ai: target => {
							const player = get.player();
							return get.effect(target, { name: "guohe_copy2" }, player, player);
						},
					})
					.forResult();
				const target = result.targets[0];
				await player.discardPlayerCard(target, true, "he", 2);
			}
		},
	},

	bw_dcjuexun: {
		audio: false,
		usable: 1,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			return event.getl?.(player)?.hs?.length > 0 && player.isMinHandcard();
		},
		async content(event, trigger, player) {
			if (player.hasSkill("bw_dcranlv") && player.storage["bw_dcranlv"]?.length) {
				player.storage["bw_dcranlv"] = [true, true, true];
			}
			const { bool } = await player
				.chooseBool({
					prompt: "是否对自己造成一点火焰伤害？",
					ai() {
						const player = get.player();
						return player.hp === 2 && game.hasPlayer(current => current.isLinked() && get.attitude(player, current) < 0);
					},
				})
				.forResult();
			if (bool) {
				await player.damage("fire");
				if (player.isMinHp()) {
					const targets = game.filterPlayer(current => current !== player && current.isLinked());
					player.line(targets);
					targets.forEach(i => {
						i.addSkill("bw_dcjuexun_eff");
						i.addMark("bw_dcjuexun_eff", 1);
					});
				}
			}
		},
		check: () => true,
		subSkill: {
			eff: {
				forced: true,
				charlotte: true,
				popup: false,
				trigger: {
					player: "damageBegin3",
				},
				filter(event, player) {
					return event.hasNature("fire") && player.countMark("bw_dcjuexun_eff");
				},
				async content(event, trigger, player) {
					trigger.num += player.countMark("bw_dcjuexun_eff");
					player.removeSkill("bw_dcjuexun_eff");
				},
				mark: true,
				intro: {
					onremove: true,
					content: "下次受到的火焰伤害+#",
				},
			},
		},
	},
	bw_dcshaowei: {
		audio: false,
		forced: true,
		locked: false,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			if (event.name === "gain" && event.player === player) {
				return false;
			}
			const evt = event.getl(player);
			if (!evt?.cards2?.length) {
				return false;
			}
			return ["diamond", "heart"].some(suit => {
				return evt.cards2.some(i => get.suit(i, player) === suit) && !player.getStorage("bw_dcshaowei_used")?.includes(suit);
			});
		},
		async content(event, trigger, player) {
			const evt = trigger.getl(player);
			if (!evt?.cards2?.length) {
				return;
			}
			const suits = ["diamond", "heart"].filter(suit => {
				return evt.cards2.some(i => get.suit(i, player) === suit) && !player.getStorage("bw_dcshaowei_used")?.includes(suit);
			});
			if (suits.includes("diamond")) {
				const cardsx = [];
				while (cardsx.length < 3) {
					const card = get.cardPile2(i => get.color(i) === "red" && !cardsx.includes(i));
					if (card) {
						cardsx.push(card);
					} else {
						break;
					}
				}
				if (cardsx.length) {
					await player.gain(cardsx, "draw");
				}
				player.addTempSkill("bw_dcshaowei_used");
				player.markAuto("bw_dcshaowei_used", ["diamond"]);
			}
			if (suits.includes("heart")) {
				await player.recover();
				if (player.hasDisabledSlot()) {
					await player.chooseToEnable();
				}
				player.addTempSkill("bw_dcshaowei_used");
				player.markAuto("bw_dcshaowei_used", ["heart"]);
			}
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
				sub: true,
				sourceSkill: "bw_dcshaowei",
			},
		},
	},
	bw_dcdichou: {
		audio: false,
		forced: true,
		intro: {
			content: "mark",
			name2: "仇",
		},
		marktext: "仇",
		trigger: {
			target: "useCardToTarget",
		},
		filter(event, player) {
			return event.player !== player;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (target.isIn()) {
				target.addMark("bw_dcdichou", 1);
			}
		},
		group: ["bw_dcdichou_discard", "bw_dcdichou_draw", "bw_dcdichou_damage"],
		subSkill: {
			discard: {
				forced: true,
				trigger: {
					player: "phaseBegin",
				},
				filter(event, player) {
					return player.hasEnabledSlot() || game.countPlayer(i => i.countMark("bw_dcdichou") && i.countDiscardableCards(player, "he"));
				},
				async content(event, trigger, player) {
					if (player.hasEnabledSlot()) {
						await player.chooseToDisable();
					}
					if (game.countPlayer(i => i.countMark("bw_dcdichou") && i.countDiscardableCards(player, "he"))) {
						const result = await player
							.chooseTarget({
								prompt: "弃置一名有“仇”的角色一张牌",
								filterTarget(card, player, target) {
									return target.countMark("bw_dcdichou") && target.countDiscardableCards(player, "he");
								},
								forced: true,
								ai: target => {
									return -get.attitude(get.player(), target);
								},
							})
							.forResult();
						const target = result.targets[0];
						const { links } = await player
							.discardPlayerCard({
								target,
								forced: true,
								position: "he",
							})
							.forResult();
						const card = links[0];
						if (!card) {
							return;
						}
						const num = get.translation(get.name(card)).length;
						if (!num) {
							return;
						}
						player.addTempSkill("bw_dcdichou_eff");
						player.addMark("bw_dcdichou_eff", num);
					}
				},
				sub: true,
				sourceSkill: "bw_dcdichou",
			},
			eff: {
				audio: false,
				charlotte: true,
				mark: true,
				intro: {
					content: "本回合攻击范围与使用【杀】的次数上限均+#",
				},
				onremove: true,
				mod: {
					attackRange(player, num) {
						return num + player.countMark("bw_dcdichou_eff");
					},
					cardUsable(card, player, num) {
						if (card.name === "sha") {
							return num + player.countMark("bw_dcdichou_eff");
						}
					},
				},
				sub: true,
				sourceSkill: "bw_dcdichou",
			},
			draw: {
				forced: true,
				trigger: {
					player: "useCardToPlayer",
				},
				filter(event, player) {
					return event.target.countMark("bw_dcdichou");
				},
				async content(event, trigger, player) {
					const target = trigger.target;
					target.removeMark("bw_dcdichou", 1);
					await player.draw();
				},
				sub: true,
				sourceSkill: "bw_dcdichou",
			},
			damage: {
				forced: true,
				trigger: {
					player: "phaseEnd",
				},
				filter(event, player) {
					return game.countPlayer(i => i.countMark("bw_dcdichou"));
				},
				async content(event, trigger, player) {
					const result = await player
						.chooseTarget({
							prompt: "对任意名有“仇”的角色各造成1点火焰伤害并移除其“仇”",
							selectTarget: [1, Infinity],
							forced: true,
							filterTarget: (card, player, target) => {
								return target.countMark("bw_dcdichou");
							},
							ai: target => {
								const player = get.player();
								if (get.damageEffect(target, player, player, "fire") > 0) {
									return 1;
								}
								return 0;
							},
						})
						.forResult();
					if (!result.targets?.length) {
						return;
					}
					const targets = result.targets.sortBySeat();
					player.line(targets);
					for (const target of targets) {
						if (!target.isIn()) {
							continue;
						}
						target.damage("fire");
						target.removeMark("bw_dcdichou", target.countMark("bw_dcdichou"));
					}
				},
				sub: true,
				sourceSkill: "bw_dcdichou",
			},
		},
	},
	bw_dcsbchengce: {
		audio: false,
		derivation: "bw_dcsbxinzhan",
		trigger: { global: "roundStart" },
		async content(event, trigger, player) {
			const cards = get.cards(2, true);
			if (!cards.length) {
				return;
			}
			await game.cardsGotoOrdering(cards);
			const list = [["牌堆顶的牌", cards]];
			let prompt = "观看牌堆顶的两张牌";
			const hs = player.getCards("h");
			if (hs.length) {
				list.push(["你的手牌", hs]);
				prompt = "用任意张手牌交换牌堆顶的等量牌";
			}
			const result = await player
				.chooseToMove({
					prompt: prompt,
					forced: true,
					filterMove: (from, to) => {
						return typeof to !== "number";
					},
					list: list,
					num: 2,
				})
				.forResult();
			event.forceDie = true;
			if (result?.moved?.[1]?.length) {
				const lose = result.moved[0].slice();
				const gain = result.moved[1].slice().filter(i => !get.owner(i));
				if (lose.some(i => get.owner(i))) {
					await player.lose(
						lose.filter(i => get.owner(i)),
						ui.special
					);
				}
				await game.cardsGotoPile(lose.slice().reverse(), "insert");
				game.updateRoundNumber();
				if (gain.length) {
					await player.gain(gain, "draw");
				}
			} else {
				const restore = result?.moved?.[0]?.length ? result.moved[0] : cards.filter(card => get.position(card, true) === "o");
				if (restore.length) await game.cardsGotoPile(restore.slice().reverse(), "insert");
			}
			if (!player.isIn() || game.countPlayer() < 2) {
				return;
			}
			const result1 = await player
				.chooseTarget({
					prompt: "令一名其他角色观看牌堆顶两张牌并获得其中一张",
					forced: true,
					filterTarget: (card, player, target) => {
						return target !== player;
					},
					ai: target => {
						const player = get.player();
						return get.attitude(player, target);
					},
				})
				.forResult();
			const target = result1?.targets?.[0];
			if (!target?.isIn()) return;
			const cards0 = get.cards(2, true);
			if (!cards0.length) return;
			const result2 = await target
				.chooseButton({
					createDialog: ["选择一张牌获得", cards0],
					forced: true,
					ai: button => {
						const card = button.link;
						let val = get.value(card);
						if (!get.tag(card, "damage")) {
							val += 5;
						}
						return val;
					},
				})
				.forResult();
			const card0 = result2?.links?.[0];
			if (!card0) {
				return;
			}
			await target.gain(card0, "draw");
			if (get.tag(card0, "damage")) {
				const cardsx = [];
				while (cardsx.length < 3) {
					const card = get.cardPile2(i => get.tag(i, "damage") && !cardsx.includes(i));
					if (card) {
						cardsx.push(card);
					} else {
						break;
					}
				}
				if (cardsx.length && player.isIn()) await player.gain(cardsx, "draw");
				if (target.isIn()) {
					const cardsx = target
						.getCards("h")
						.filter(card => !get.is.damageCard(card))
						.randomGets(3);
					if (cardsx?.length) {
						target.addTempSkill(`${event.name}_sha`, { global: "roundEnd" });
						target.addGaintag(cardsx, `${event.name}_sha`);
					}
				}
			} else {
				const cardsx = [];
				while (cardsx.length < 3) {
					const card = get.cardPile2(i => !get.tag(i, "damage") && !cardsx.includes(i));
					if (card) {
						cardsx.push(card);
					} else {
						break;
					}
				}
				if (cardsx.length && player.isIn()) await player.gain(cardsx, "draw");
				if (target.isIn()) {
					target.addTempSkill("bw_dcsbxinzhan", { global: "roundEnd" });
				}
			}
		},
		check: (event, player) => {
			return game.hasPlayer(current => {
				return current !== player && get.attitude(player, current) > 0;
			});
		},
		subSkill: {
			sha: {
				charlotte: true,
				mod: {
					cardname(card) {
						if (get.itemtype(card) === "card" && card.hasGaintag("bw_dcsbchengce_sha")) {
							return "sha";
						}
					},
					cardnature(card) {
						if (get.itemtype(card) === "card" && card.hasGaintag("bw_dcsbchengce_sha")) {
							return false;
						}
					},
				},
				trigger: { global: "roundEnd" },
				onremove(player, skill) {
					player.removeGaintag("bw_dcsbchengce_sha");
				},
				sub: true,
				sourceSkill: "bw_dcsbchengce",
			},
		},
	},
	bw_dcsbxinzhan: {
		audio: false,
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			if (!(event.card?.name === "sha" || get.type(event.card) === "trick") || event.targets.length !== 1 || event.target === player) {
				return false;
			}
			const eventx = event.getParent();
			const history = player.getHistory(
				"useCard",
				evt => {
					if (eventx.card?.name === "sha") {
						return evt !== eventx && evt.card?.name === "sha";
					} else {
						return evt !== eventx && get.type(evt.card) === "trick";
					}
				},
				eventx
			);
			return !history.length;
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			const card = trigger.card;
			const use = trigger.getParent();
			if (!target || !card) {
				return;
			}
			const result = await player
				.chooseControl("响应", "不响应")
				.set("prompt", `猜测你的${get.translation(card)}是否被响应`)
				.set("ai", () => {
					return [0, 1].randomGet();
				})
				.forResult();
			player.addTempSkill("bw_dcsbxinzhan_eff");
			player.markAuto("bw_dcsbxinzhan_eff", [
				{
					target: target,
					use: use,
					card: card,
					result: result.control,
				},
			]);
		},
		check(event, player) {
			if (!event.target) {
				return false;
			}
			return get.attitude(player, event.target) < 0;
		},
		subSkill: {
			eff: {
				forced: true,
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					const storage = player.getStorage("bw_dcsbxinzhan_eff");
					if (!storage) {
						return false;
					}
					return storage.some(item => {
						return item.use === event;
					});
				},
				async content(event, trigger, player) {
					const item = player.storage["bw_dcsbxinzhan_eff"].find(i => i.use === trigger);
					if (!item) return;
					player.storage["bw_dcsbxinzhan_eff"].remove(item);
					const { target, card, use, result } = item;
					if (!player.isIn()) return;
					let xiangying = "不响应";
					game.checkGlobalHistory("everything", evt => {
						if (["useCard", "respond"].includes(evt.name)) {
							if (Array.isArray(evt.respondTo) && evt.respondTo[1] === card && evt.getParent(parent => parent === use, true) === use) {
								xiangying = "响应";
							}
						}
					});
					if (xiangying === result) {
						if (target.isIn() && target.countCards("h")) {
							await player.gainPlayerCard(target, 1, "h", true, "visible");
						}
					} else {
						const cardx = new lib.element.VCard({ name: "juedou", isCard: true });
						if (target.isIn() && target.canUse(cardx, player)) {
							await target.useCard(cardx, player);
						}
					}
				},
				sub: true,
				sourceSkill: "bw_dcsbxinzhan",
			},
		},
	},
	bw_dcshenduan: {
		audio: false,
		trigger: { global: "chooseToCompareBegin" },
		filter(event, player) {
			if (player === event.player) {
				return true;
			}
			return (event?.targets?.includes(player) || player === event.target) && player.countDiscardableCards(player, "he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(`###${get.prompt(event.skill)}###弃置一张牌，然后用牌堆中点数最大的牌拼点`, "he")
				.set("ai", card => {
					const player = get.player();
					const number = get.number(card);
					if (number >= 11 || player.hasCard(card => get.number(card) >= 12, "h")) {
						return 0;
					}
					return 7 - get.value(card);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = lib.skill.bw_dcshenduan.getExtreCard("max");
			await game.cardsGotoOrdering(cards);
			if (!trigger.fixedResult) {
				trigger.fixedResult = {};
			}
			trigger.fixedResult[player.playerid] = cards[0];
		},
		//获得牌堆X个点数不同且为极大或极小的牌各一张
		getExtreCard(str, count = 1) {
			const cards = [];
			if (!["max", "min"].includes(str) || count < 1) {
				return cards;
			}
			let num = str === "max" ? 13 : 1;
			while (num > 0 && num < 14) {
				const card = get.cardPile2(card => {
					return get.number(card, false) === num;
				});
				if (card) {
					cards.add(card);
					if (cards.length === count) {
						break;
					}
				}
				str === "max" ? num-- : num++;
			}
			return cards;
		},
		group: ["bw_dcshenduan_effect"],
		subSkill: {
			effect: {
				audio: "bw_dcshenduan",
				trigger: { global: ["chooseToCompareAfter", "compareMultipleAfter"] },
				filter(event, player, name) {
					if (event.preserve || event.result?.cancelled) {
						return false;
					}
					if (!lib.skill.bw_dcshenduan_effect.logTarget(event, player).length) {
						return false;
					}
					if (event.name === "compareMultiple") {
						return true;
					}
					return !event.compareMultiple;
				},
				logTarget(event, player) {
					let list = [];
					if (event.targets?.length) {
						list.push([event.player, event.result.num1[0], event.result.player]);
						for (const i in event.targets) {
							list.push([event.targets[i], event.result.num2[i], event.result.targets[i]]);
						}
					} else {
						list = [
							[event.player, event.num1, event.card1],
							[event.target, event.num2, event.card2],
						];
					}
					event.set("bw_dcshenduan_list", list);
					return list
						.filter(arr => arr[1] === 13)
						.map(arr => arr[0])
						.filter(target => target.isIn());
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					const targets = [player].concat(event.targets.sortBySeat());
					for (const target of targets) {
						const card = lib.skill.bw_dcshenduan.getExtreCard("min");
						if (card) {
							game.log(target, "从牌堆获得一张牌");
							await target.gain(card, "draw");
						} else {
							break;
						}
					}
					const putter = trigger.name === "compareMultiple" ? trigger.winner : trigger.result.winner;
					if (putter?.isIn()) {
						const card = trigger.bw_dcshenduan_list?.filter(arr => arr[0] === putter)[0][2];
						if (get.owner(card)) {
							return;
						}
						game.log(putter, "将", card, "置于牌堆底");
						await game.cardsGotoPile(card);
					}
				},
			},
		},
	},
	bw_dckegou: {
		audio: false,
		
		trigger: { player: "phaseUseBegin", global: "phaseEnd" },
		filter(event, player) {
			if (!game.hasPlayer(target => player.canCompare(target))) {
				return false;
			}
			if (event.name === "chooseToUse") {
				return !player.hasSkill("bw_dckegou_used");
			}
			return (event.name === "phaseUse" || player.hasHistory("useCard") || player.hasHistory("respond"));
		},
		async precontent(event, trigger, player) {
			player.addTempSkill("bw_dckegou_used", "phaseUseAfter");
		},
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => player.canCompare(target))
				.set("ai", target => -get.attitude(get.player(), target) / target.countCards("h"))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			while (player.canCompare(target)) {
				const result = await player.chooseToCompare(target).forResult();
				if (result.bool) {
					const cards = lib.skill.bw_dcshenduan.getExtreCard("min", 2);
					if (cards.length) {
						await player.gain(cards, "gain2");
					}
					break;
				} else {
					if (target.canUse({ name: "sha", isCard: true }, player, false, false)) {
						await target.useCard(get.autoViewAs({ name: "sha", isCard: true }), player, false);
					}
					if (!player.canCompare(target)) {
						break;
					}
					const result2 = await player
						.chooseBool(`克构：是否继续与${get.translation(target)}拼点`)
						.set("ai", () => get.attitude(get.player(), get.event().target) < 0)
						.set("target", target)
						.forResult();
					if (!result2.bool) {
						break;
					}
				}
			}
		},
		ai: {
			order: 5,
			result: {
				target: -1,
			},
		},
		subSkill: {
			used: {
				charlotte: true,
			},
		},
	},
	bw_dcdixian: {
		audio: false,
		limited: true,
		enable: "phaseUse",
		chooseButton: {
			dialog(event, player) {
				const card = lib.skill.bw_dcshenduan.getExtreCard("min")[0];
				const num = get.number(card, false);
				return ui.create.dialog(`${get.prompt2("bw_dcdixian")}<span class=thundertext> 当前牌堆最小点数为：${get.strNumber(num)}</span>`);
			},
			chooseControl(event, player) {
				const choices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => get.strNumber(i));
				choices.push("cancel2");
				return choices;
			},
			check(event, player) {
				return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].randomGet();
			},
			backup(result, player) {
				return {
					audio: "bw_dcdixian",
					skillAnimation: true,
					animationColor: "metal",
					num: result.control,
					async content(event, trigger, player) {
						player.awakenSkill("bw_dcdixian");
						const num = get.numString(lib.skill.bw_dcdixian_backup.num);
						const card = get.cardPile2(card => get.number(card, false) < num);
						if (!card) {
							await player.draw(num);
							player.addSkill("bw_dcdixian_effect");
							player.markAuto("bw_dcdixian_effect", [num]); //用数组存还是考虑到后续重置限定技的问题（）
						} else {
							const discard = Array.from(ui["discardPile"].childNodes).filter(cardx => get.number(cardx, false) === 13);
							const cards = Array.from(ui["cardPile"].childNodes)
								.filter(cardx => get.number(cardx, false) === 13)
								.concat(discard);
							if (cards.length) {
								//照搬武陆逊的写法，父子在技能代码上也有联系，这很合理吧（）
								const next = player.gain(cards);
								next.shown_cards = discard;
								next.set("animate", event => {
									const player = event.player;
									const cards = event.cards;
									const shown = event.shown_cards;
									if (shown.length < cards.length) {
										const num = cards.length - shown.length;
										player.$draw(num);
										game.log(player, "从牌堆获得了", get.cnNumber(num), "张点数为K的牌");
									}
									if (shown.length > 0) {
										player.$gain2(shown, false);
										game.log(player, "从弃牌堆获得了", shown);
									}
									return 500;
								});
								await next;
							}
						}
					},
				};
			},
		},
		ai: {
			order: 10,
			result: {
				player: 1,
			},
		},
		subSkill: {
			effect: {
				mark: true,
				intro: {
					markcount: () => 0,
					content: `使用点数小于等于$的牌无距离次数限制`,
				},
				charlotte: true,
				onremove: true,
				mod: {
					cardUsable(card, player) {
						const num = get.number(card, player) || 0;
						if (player.getStorage("bw_dcdixian_effect").some(numx => num <= numx)) {
							return Infinity;
						}
					},
					targetInRange(card, player, target) {
						const num = get.number(card, player) || 0;
						if (player.getStorage("bw_dcdixian_effect").some(numx => num <= numx)) {
							return true;
						}
					},
				},
			},
		},
	},
	bw_clandunji: {
		audio: false,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (!event.cards?.someInD("od") || !game.hasPlayer(target => target.countCards("h"))) return false;
			return player.getHistory("useCard", evt => get.color(evt.card) === "black").indexOf(event) === 0;
		},
		forced: true,
		async content(event, trigger, player) {
			const cards = trigger.cards.filterInD("od");
			const result = await player
				.chooseTarget(`追迹：令一名角色用一张手牌交换${get.translation(cards)}`, true, (card, player, target) => {
					return target.countCards("h") > 0;
				})
				.set("ai", target => {
					const { player, cards } = get.event();
					return get.attitude(player, target) * cards.reduce((sum, card) => sum + get.value(card, target), 0);
				})
				.set("cards", cards)
				.forResult();
			if (!result?.bool || !result.targets?.length) return;
			const target = result.targets[0];
			player.storage[event.name] = target;
			player.addTip(event.name, [event.name, target].map(get.translation).join(" "));
			player.markSkill(event.name);
			player.line(target, "green");
			const result2 = await target
				.chooseCard("h", true, `追迹：用一张手牌交换${get.translation(cards)}`)
				.set("ai", card => 6 - get.value(card))
				.forResult();
			if (result2?.bool && result2.cards?.length) {
				await target.loseToDiscardpile(result2.cards);
				await target.gain(cards, "gain2");
			}
		},
		onremove(player, skill) {
			player.removeTip(skill);
			delete player.storage[skill];
		},
		intro: { content: "players" },
	},
	bw_clanyunying: {
		audio: false,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			const target = player.storage.bw_clandunji;
			return get.itemtype(target) === "player" && (game.hasGlobalHistory("changeHp", evt => evt.player === target && evt.changedHp < 0) || target.hasHistory("lose", evt => evt.hs?.length > 0));
		},
		forced: true,
		async content(event, trigger, player) {
			const target = player.storage.bw_clandunji;
			if (game.hasGlobalHistory("changeHp", evt => evt.player === target && evt.changedHp < 0)) {
				const cards = player.getCards("h", card => get.color(card, player) === "black");
				if (cards.length > 0 && cards.every(card => game.checkMod(card, player, "unchanged", "cardEnabled2", player))) {
					const sha = get.autoViewAs({ name: "sha", isCard: true, storage: { bw_clanyunying: true } }, cards);
					if (player.hasUseTarget(sha, false)) await player.chooseUseTarget("云影：将所有黑色手牌当无距离限制的【杀】使用", sha, cards, true, false, "nodistance").set("cards", cards);
				}
			}
			if (target.hasHistory("lose", evt => evt.hs?.length > 0)) {
				const cards = [];
				game.getGlobalHistory("cardMove", evt => {
					if (evt.name === "cardsDiscard" || (evt.name === "lose" && evt.position === ui.discardPile)) {
						cards.addArray((evt.cards || []).filter(card => get.position(card, true) === "d"));
					}
				});
				await player.drawTo(Math.min(5, cards.filter(card => get.color(card, false) === "black").length));
			}
		},
	},
	bw_clandaojie: {
		audio: false,
		audioname: ["clan_xunshu", "clan_xunchen", "clan_xuncai", "clan_xuncan", "clan_xunyou", "clan_xunyu", "clan_xunshuang", "clan_xunshi", "clan_xunguan"],
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return (
				get.type(event.card, null, false) == "trick" &&
				!get.tag(event.card, "damage") &&
				event.cards.filterInD().length > 0 &&
				player
					.getHistory("useCard", evt => {
						return get.type(evt.card, null, false) == "trick" && !get.tag(evt.card, "damage");
					})
					.indexOf(event) == 0
			);
		},
		forced: true,
		clanSkill: true,
		async content(event, trigger, player) {
			const skills = player.getSkills(null, false, false).filter(skill => {
				let info = get.info(skill);
				if (!info || info.charlotte || !get.is.locked(skill) || get.skillInfoTranslation(skill, player).length == 0) {
					return false;
				}
				return true;
			});
			let result;
			if (!skills.length) {
				result = { bool: false };
			} else {
				result = await player
					.chooseButton(["蹈节：失去一个锁定技，或点“取消”失去1点体力", [skills, "skill"]])
					.set("displayIndex", false)
					.set("ai", button => {
						const player = get.player();
						const skills = get.event().listx.slice();
						skills.removeArray(["clanbaichu"]);
						const { link } = button;
						if (!skills.includes(link)) {
							return 0;
						}
						const info = get.info(link);
						if (info?.ai?.neg || info?.ai?.halfneg) {
							return 3;
						}
						if (get.effect(player, { name: "losehp" }, player, player) >= 0 || player.hp > 3 || player.countCards("hs", card => player.canSaveCard(card, player))) {
							return 0;
						}
						if (Math.random() < 0.75 && link == "bw_clandaojie") {
							if (player.hasSkill("clanbaichu")) return 0;
							return 2;
						} else if (get.event().removeSkillCheck) {
							return 100 - get.skillRank(link);
						}
						return 0;
					})
					.set("listx", skills)
					.set("removeSkillCheck", player.hp < 2 && !player.countCards("hs", card => get.tag(card, "save")))
					.forResult();
			}
			if (result?.bool && result?.links?.length) {
				await player.removeSkills(result.links);
			} else {
				await player.loseHp();
			}
			const targets = game.filterPlayer(current => current == player || current.hasClan("颍川荀氏"));
			if (!targets.length || !trigger.cards.someInD()) {
				return;
			}
			result =
				targets.length == 1
					? { bool: true, targets }
					: await player
							.chooseTarget("蹈节：将" + get.translation(trigger.cards.filterInD()) + "交给一名颍川荀氏角色", true, (card, player, target) => {
								return target == player || target.hasClan("颍川荀氏");
							})
							.set("ai", target => get.attitude(get.player(), target))
							.forResult();
			if (result?.bool && result?.targets?.length) {
				const target = result.targets[0];
				player.line(target, "green");
				if (trigger.cards.someInD()) {
					await target.gain(trigger.cards.filterInD(), player, "gain2");
				}
			}
		},
	},
	bw_olbiguo: {
		audio: false,
		trigger: { player: "phaseDrawEnd" },
		filter(event, player) {
			return player.hasDiscardableCards(player, "he");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt2(event.skill),
					position: "he",
					ai(card) {
						return 6 - get.value(card);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = ["basic", "trick", "equip"].map(type => get.cardPile2(card => get.type2(card) == type)).filter(Boolean);
			if (cards.length) {
				await player.showCards(cards, get.translation(player) + "发动了【愎果】");
				await player.gain({ cards, animate: "gain2" });
			}
			player.addTempSkill(`${event.name}_effect`);
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: {
					target: "useCardToTargeted",
				},
				filter(event, player) {
					return game.hasPlayer(target => player.canCompare(target));
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget({
							prompt: get.prompt(event.skill),
							prompt2: "可以与一名其他角色拼点，没赢的角色本回合不能使用或打出与双方拼点牌类型相同的牌",
							filterTarget(card, player, target) {
								return player.canCompare(target);
							},
							ai(target) {
								return -get.attitude(_status.event.player, target) / target.countCards("h");
							},
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const {
						targets: [target],
					} = event;
					const result = await player.chooseToCompare(target).forResult();
					if (result?.cancelled || !result?.player || !result?.target) return;
					const types = [get.type2(result.player), get.type2(result.target)].unique();
					[player, target].forEach(target => {
						if (target != result.winner) {
							target.addTempSkill("bw_olbiguo_debuff");
							target.markAuto("bw_olbiguo_debuff", types);
						}
					});
				},
			},
			debuff: {
				charlotte: true,
				onremove: true,
				intro: {
					content: "不能使用或打出$牌",
				},
				mod: {
					cardEnabled(card, player) {
						if (player.getStorage("bw_olbiguo_debuff").includes(get.type2(card))) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (player.getStorage("bw_olbiguo_debuff").includes(get.type2(card))) {
							return false;
						}
					},
					cardRespondable(card, player) {
						if (player.getStorage("bw_olbiguo_debuff").includes(get.type2(card))) {
							return false;
						}
					},
				},
			},
		},
	},
	bw_oldouyu: {
		audio: false,
		trigger: {
			global: "compareCardShowBefore",
		},
		filter(event, player) {
			if (event.player == player) {
				return true;
			}
			if (event.targets?.length) {
				return event.targets.includes(player);
			} else {
				return event.target == player;
			}
		},
		async cost(event, trigger, player) {
			if (trigger.targets?.length) {
				const targets = [trigger.player, ...trigger.targets].remove(player);
				event.result = await player
					.chooseTarget({
						prompt: get.prompt2(event.skill),
						filterTarget(card, player, target) {
							return get.event().targets.includes(target);
						},
						ai(target) {
							return Math.random() - 0.5;
						},
					})
					.set("targets", targets)
					.forResult();
			} else {
				const target = trigger.player == player ? trigger.target : trigger.player;
				event.result = await player
					.chooseBool({
						prompt: get.prompt2(event.skill, target),
						choice: true,
					})
					.forResult();
				event.result.targets = [target];
			}
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const targets = [player, target];
			game.log(targets, "交换了拼点牌");
			if (trigger.targets?.length) {
				const { cardlist } = trigger;
				const index1 = trigger.targets.indexOf(player);
				const index2 = trigger.targets.indexOf(target);
				const card1 = index1 < 0 ? trigger.card1 : cardlist[index1];
				const card2 = index2 < 0 ? trigger.card1 : cardlist[index2];
				if (!card1 || !card2) return;
				if (index1 < 0) trigger.card1 = card2; else cardlist[index1] = card2;
				if (index2 < 0) trigger.card1 = card1; else cardlist[index2] = card1;
				trigger.num1 = trigger.getNum(trigger.card1);
				if (trigger.result) {
					trigger.result.player = trigger.card1;
					trigger.result.targets = cardlist.slice();
				}
			} else {
				const list = [trigger.card1, trigger.card2];
				trigger.card1 = list[1];
				trigger.card2 = list[0];
			}
			player
				.when({ global: "chooseToCompareAfter" })
				.filter(evt => evt === trigger)
				.step(async (event, trigger, player) => {
					if (!player.isIn() || trigger.result?.cancelled) return;
					if (trigger.targets?.length) {
						const {num1 = [], num2 = []} = trigger.result || {};
						const wins = trigger.player === player ? num1.filter((n, i) => n > num2[i]).length : num2.filter((n, i) => trigger.targets[i] === player && n > num1[i]).length;
						for (let i = 0; i < wins && player.isIn(); i++) await player.draw(2);
					} else if (trigger.result?.winner === player) await player.draw(2);
				});
		},
	},
	bw_twbingde: {
		audio: false,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he") && player.getStorage("bw_twbingde_clear").length < 4;
		},
		onChooseToUse(event) {
			if (event.type == "phase" && !game.online) {
				const map = {};
				event.player.getHistory("useCard", evt => {
					const evtx = evt.getParent("phaseUse"),
						suit = get.suit(evt.card);
					if (!lib.suit.includes(suit)) {
						return;
					}
					if (evtx != event.getParent("phaseUse")) {
						return;
					}
					if (typeof map[suit] != "number") {
						map[suit] = 0;
					}
					map[suit]++;
				});
				event.set("bw_twbingde_map", map);
			}
		},
		chooseButton: {
			dialog(event, player) {
				let str = get.translation("bw_twbingde_info"),
					str2 = "";
				if (event.bw_twbingde_map) {
					str2 = '<div class="text center">本回合使用牌对应花色数：</div>';
					str2 += '<div class="text center">';
					for (const suit of lib.suit) {
						str2 += get.translation(suit) + "：" + get.cnNumber(event.bw_twbingde_map[suit] || 0) + "张；";
					}
					str2 = str2.slice(0, str2.length - 1) + "</div>";
				}
				return ui.create.dialog("###秉德###" + str, str2);
			},
			chooseControl(event, player) {
				const list = lib.suit.slice();
				list.removeArray(player.getStorage("bw_twbingde_clear"));
				list.push("cancel2");
				return list;
			},
			check(event, player) {
				const map = event.bw_twbingde_map;
				const suit = lib.suit
					.filter(suit => !player.getStorage("bw_twbingde_clear").includes(suit) && player.hasCard(card => get.suit(card) == suit, "he"))
					.sort((a, b) => {
						return map[b] - map[a];
					})[0];
				if (map[suit] == 0) {
					return "cancel2";
				}
				return suit;
			},
			backup(result, player) {
				return {
					audio: "bw_twbingde",
					filterCard: lib.filter.cardDiscardable,
					position: "he",
					suit: result.control,
					check(card) {
						const suit = lib.skill.bw_twbingde_backup.suit;
						if (get.suit(card) == suit) {
							return 10 - get.value(card);
						}
						return 6 - get.value(card);
					},
					async content(event, trigger, player) {
						const { suit } = get.info(event.name);
						let num = 0;
						player.popup(suit + 2);
						game.log(player, "选择了", "#y" + suit + 2);
						player.addTempSkill("bw_twbingde_clear", "phaseUseAfter");
						player.markAuto("bw_twbingde_clear", [suit]);
						player.getHistory("useCard", evt => {
							var evtx = evt.getParent("phaseUse"),
								suitx = get.suit(evt.card);
							if (!evtx || evtx != event.getParent("phaseUse") || suit != suitx) {
								return false;
							}
							num++;
						});
						if (num > 0) {
							await player.draw(num);
						}
						if (get.suit(event.cards[0], player) == suit && player.getStat("skill").bw_twbingde) {
							delete player.getStat("skill").bw_twbingde;
							game.log(player, "重置了", "#g【秉德】");
						}
					},
					ai: { result: { player: 1 } },
				};
			},
			prompt: () => "秉德：弃置一张牌",
		},
		ai: {
			order: 2,
			result: { player: 1 },
		},
		subSkill: {
			backup: {},
			clear: {
				charlotte: true,
				onremove: true,
			},
		},
	},
	bw_twqingtao: {
		audio: false,
		trigger: { player: ["phaseDrawEnd", "phaseJieshuBegin"] },
		filter(event, player) {
			if (!player.countCards("he")) {
				return false;
			}
			return event.name == "phaseDraw" || !player.hasHistory("custom", evt => evt.bw_twqingtao);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(get.prompt2(event.skill), "he", lib.filter.cardRecastable)
				.set("ai", function (card) {
					if (card.name == "jiu" || get.type(card) != "basic") {
						return 10 - get.value(card);
					}
					return 6 - get.value(card);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			await player.recast(cards);
			if (trigger.name == "phaseDraw") {
				player.getHistory("custom").push({ [event.name]: true });
			}
			if (get.name(cards[0]) == "jiu" || get.type(cards[0], false, player) != "basic") {
				await player.draw();
			}
		},
	},
};}
