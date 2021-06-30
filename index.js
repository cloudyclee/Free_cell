const {
	ref,
	reactive,
	watch,
	onMounted,
	onBeforeUpdate,
	computed,
	onBeforeMount,
} = Vue;

// add array property "last" to get the last item os an array
Object.defineProperties(Array.prototype, {
	last: {
		get() {
			return this[this.length - 1];
		},
	},
});

const app = {
	setup() {
		// 1. Variables to be set and watched
		// 2. Variables which changes with other varibales change
		// 3. Other variables which don't have to be watched
		// 4. Functions which used in other functions
		// 5. Functionality
		// 6. Refs and set refs
		// 7. Computed functions
		// 8. Watch functions
		// 9. Lifecycle functions

		// 1. Variables to be set and watched

		// set by getHintArray
		const hintArray = ref([]);
		// set by getHintArray
		const hintArrayLength = ref(0);
		// set by getHintArray, hint
		const hintIndex = ref(0);
		// set by timer
		const time = ref(0);

		// set by dragStart, dragEnd
		const isDragging = ref(false);
		//
		const isLoading = ref(true);
		// set by startNewGame, restartCurrentGame
		const isShuffle = ref(true);
		// set by cardsDistibuting, dragStart, dragEnd
		const isTransition = ref(false);
		// set by getMaxLength and recalculate while packs.temp or packs.col changes

		const maxLength = reactive({ empty: 0, nonEmpty: 0 });
		// set by getArea
		const mouseArea = reactive({ pack: "", packIndex: null });
		// parent: set by checkIsMovable
		// parentIndex: set by checkIsMovable
		// indexes: set by checkIsMovable
		const movingCardsArray = reactive({
			parent: "",
			parentIndex: null,
			indexes: [],
		});
		// set by initCardsPack, elementTransfer
		const packs = reactive({
			temp: [[], [], [], []],
			final: [[], [], [], []],
			col: [[], [], [], [], [], [], [], []],
			moving: [],
		});
		// moves: set by elementTransfer
		// mouse: set by getArea
		// position: set by dragStart
		const record = reactive({
			moves: [],
			mouse: [],
			position: {},
			cardPosition: {},
		});
		// status.code
		//// init: set by startNewGame, restartCurrentGame
		//// inGame: set by cardsDistributing, closeHandler
		//// new: set by newGameHandler
		//// restart: set by restartHandler
		//// win: when finalNum changes
		//// lose: when hintArrayLength = 0
		// status.info: when status.code changes
		const status = reactive({
			code: "init",
			info: {},
		});

		// 2. Variables which changes with other varibales change

		// when packs.final changes
		const finalNum = ref(0);
		// when item in packs is transfered (elementTransfer in dragEnd and undo)
		const moves = ref(0);
		// when time changes
		const minute = ref(0);
		const second = ref(0);

		// 4. Functions which used in other functions

		// used in dragEnd to delete card's tranform
		const cardReturnBack = (
			cardPack,
			offset = { offsetX: 0, offsetY: 0 }
		) => {
			const tl = cardPack.length;
			const ml = movingCardsArray.indexes.length;
			const { offsetX, offsetY } = offset;

			isTransition.value = true;
			isDragging.value = false;

			if (tl !== 0) {
				movingCardsArray.indexes.forEach((item, index) => {
					cardPack[
						tl - ml + index
					].styleObject.transform = `translate(${
						offsetX +
						0.5 *
							(movingCardsArray.parent === "final" ||
								packs[mouseArea.pack][mouseArea.packIndex]
									.length === 0)
					}px, ${
						offsetY -
						75 * (mouseArea.pack === "col") +
						0.5 *
							(movingCardsArray.parent === "final" ||
								packs[mouseArea.pack][mouseArea.packIndex]
									.length === 0)
					}px)`;
					// for those cards which move not through drag event
					cardPack[tl - ml + index].styleObject.zIndex = `${
						time.value + 11
					}`;
					setTimeout(() => {
						cardPack[tl - ml + index].styleObject.transform =
							"translate(0px, 0px)";
						//delete cardPack[tl - ml + index].styleObject.transform;
					}, 50);
				});
			}
		};
		// used in dragStart to check which cards to set movingCardsArray
		const checkIsMovable = (cardsArray) => {
			const l = cardsArray.indexes.length;
			movingCardsArray.parent = cardsArray.parent;
			movingCardsArray.parentIndex = cardsArray.parentIndex;
			movingCardsArray.indexes.push(cardsArray.indexes[0]);

			for (let i = 0; i < l; i++) {
				const p = cardsArray.indexes[i];
				const previousCard =
					packs[cardsArray.parent][cardsArray.parentIndex][p];
				const nextCard =
					packs[cardsArray.parent][cardsArray.parentIndex][p + 1];

				if (nextCard) {
					const type = previousCard.acceptCardType;
					const nextCardType = nextCard.type;
					if (type === nextCardType) {
						movingCardsArray.indexes.push(
							cardsArray.indexes[i + 1]
						);
					}
				}
			}

			if (l !== 1 && movingCardsArray.indexes.length !== l) {
				movingCardsArray.parent = "";
				movingCardsArray.parentIndex = null;
				movingCardsArray.indexes = [];
			}
		};
		// used in dragEnd and undo to transfer card object in packs
		const elementTransfer = (
			targetPack,
			sourcePack,
			isUndo = false,
			autoReturn = false
		) => {
			const sourceCardId =
				packs[movingCardsArray.parent][movingCardsArray.parentIndex][
					movingCardsArray.indexes[0]
				].card;
			const targetCardId =
				mouseArea.pack === "col" &&
				packs[mouseArea.pack][mouseArea.packIndex].last
					? packs[mouseArea.pack][mouseArea.packIndex].last.card
					: null;
			const source = document.querySelector(`#${sourceCardId}`);
			const target = targetCardId
				? document.querySelector(`#${targetCardId}`)
				: document.querySelector(
						`#${mouseArea.pack + (mouseArea.packIndex + 1)}`
				  );
			const offsetX =
				source.getBoundingClientRect().left -
				target.getBoundingClientRect().left;
			const offsetY = targetCardId
				? source.getBoundingClientRect().top -
				  target.getBoundingClientRect().top +
				  35
				: source.getBoundingClientRect().top -
				  target.getBoundingClientRect().top;
			const offset = { offsetX, offsetY };

			const sliceLength = movingCardsArray.indexes.length;
			const movingCardsPack = sourcePack.slice(-sliceLength);
			sourcePack.splice(-sliceLength, sliceLength);
			targetPack.push(...movingCardsPack);
			cardReturnBack(targetPack, offset);
			getMaxLength();
			if (mouseArea.pack === "final") {
				finalNum.value++;
			}

			if (!isUndo) {
				const { pack, packIndex } = mouseArea;
				const { parent, parentIndex } = movingCardsArray;
				const length = movingCardsArray.indexes.length;
				record.moves.push({
					target: { pack, packIndex },
					source: { parent, parentIndex },
					length,
					autoReturn,
				});
				if (!autoReturn) {
					moves.value++;
					getHintArray();
				}
			} else {
				if (record.moves.last && !record.moves.last.autoReturn) {
					moves.value--;
					getHintArray();
				}
				record.moves.pop();
			}
		};
		// used in dragStart to get all cards behind a card
		const getAllNextCards = (elem) => {
			let nexts = { parent: "", parentIndex: null, indexes: [] };
			const id = elem.id;
			[nexts.parent, nexts.parentIndex] =
				elem.parentElement.id.split(/(\d+)/);
			nexts.parentIndex = nexts.parentIndex - 0 - 1;
			let cardIndex = packs[nexts.parent][nexts.parentIndex].findIndex(
				(item) => item.card === id
			);
			const packLength = packs[nexts.parent][nexts.parentIndex].length;

			while (cardIndex < packLength) {
				nexts.indexes.push(cardIndex);
				cardIndex++;
			}
			return nexts;
		};
		// used in drag to get mouse target pack
		const getArea = (e) => {
			record.mouse.push({ x: e.pageX, y: e.pageY });

			if (
				record.mouse.last.x > boundaries.leftHorizontal &&
				record.mouse.last.x < boundaries.rightHorizontal
			) {
				if (record.mouse.last.y > boundaries.vertical) {
					mouseArea.pack = "col";
					mouseArea.packIndex = getAreaIndex(
						packs.temp.length + packs.final.length,
						packs.col.length,
						boundaries.rightHorizontal
					);
				} else if (record.mouse.last.x < boundaries.topLeftHorizontal) {
					mouseArea.pack = "temp";
					mouseArea.packIndex = getAreaIndex(
						0,
						packs.temp.length,
						boundaries.topLeftHorizontal
					);
				} else if (
					record.mouse.last.x > boundaries.topRightHorizontal
				) {
					mouseArea.pack = "final";
					mouseArea.packIndex = getAreaIndex(
						packs.temp.length,
						packs.final.length,
						boundaries.rightHorizontal
					);
				} else {
					mouseArea.pack = null;
					mouseArea.packIndex = null;
				}
			} else {
				mouseArea.pack = null;
				mouseArea.packIndex = null;
			}
		};
		// used in getArea to get which pack is to be pushed into cards
		const getAreaIndex = (indexCount, indexLength, limitBoundary) => {
			let packIndex = indexCount;
			while (
				record.mouse.last.x >
				(packIndex < indexCount + indexLength - 1
					? dropPosition[packIndex].right / 2 +
					  dropPosition[packIndex + 1].left / 2
					: limitBoundary)
			) {
				packIndex++;
			}

			packIndex -= indexCount;
			return packIndex;
		};
		// used in getBoundary to get left, top, right, bottom of an element
		const getElementRange = (elem) => {
			return {
				left: elem.getBoundingClientRect().left,
				top: elem.getBoundingClientRect().top,
				right: elem.getBoundingClientRect().right,
				bottom: elem.getBoundingClientRect().bottom,
			};
		};
		// used in elemrntTransfer and execute in onBeforeMount to get hintArray
		const getHintArray = () => {
			const hintPack = ["temp", "final", "col"];
			const potentialHint = [];
			let getHint = false;
			hintArray.value = [];
			// make hint potential list
			for (let i = 0; i < hintPack.length; i++) {
				packs[hintPack[i]].forEach((item, index) => {
					// for final sapce
					if (hintPack[i] === "final") {
						potentialHint.push({
							parent: hintPack[i],
							index,
							items: [
								{
									// only push "acceptCard" property
									// cards in final space couldn't move
									// only could accpet the cards of the same suit
									acceptCard: item.last
										? item.last.acceptCard
										: `${Object.keys(suits)[index] + 1}`,
									acceptPoint: item.last
										? item.last.point + 1
										: null,
								},
							],
						});
						// for temp space
					} else if (hintPack[i] === "temp") {
						potentialHint.push({
							parent: hintPack[i],
							index,
							items: [
								{
									// cards in temp space don't have "acceptCard" property
									// they couldn't accept cards like in final space
									card: item.last ? item.last.card : null,
									// if the temp space has no cards,
									// set "acceptCardType" property as "All"
									acceptCardType: item.last
										? item.last.acceptCardType
										: "All",
									type: item.last ? item.last.type : null,
									point: item.last ? item.last.point : null,
								},
							],
						});
						// for col space
					} else {
						let pHIndex = packs[hintPack[i]][index].length - 1;
						const hintCards = [];
						// first push the last card of the column
						hintCards.push({
							// set values as in temp space
							card: item.last ? item.last.card : null,
							acceptCardType: item.last
								? item.last.acceptCardType
								: "All",
							type: item.last ? item.last.type : null,
							point: item.last ? item.last.point : null,
						});
						// if the previous card of the last card complies with rules
						// also push this card into array
						while (
							packs[hintPack[i]][index][pHIndex - 1] &&
							packs[hintPack[i]][index][pHIndex].type ===
								packs[hintPack[i]][index][pHIndex - 1]
									.acceptCardType
						) {
							hintCards.push({
								card: item[pHIndex - 1].card,
								acceptCardType:
									item[pHIndex - 1].acceptCardType,
								type: item[pHIndex - 1].type,
								point: item[pHIndex - 1].point,
							});
							pHIndex--;
						}
						potentialHint.push({
							parent: hintPack[i],
							index,
							items: hintCards,
						});
					}
				});
			}

			// make hint list
			// temp --> final
			// temp --> col
			// col --> temp
			// col --> final
			// col --> col
			potentialHint.forEach((hintSource) => {
				// hint source: temp
				if (hintSource.parent === "temp" && hintSource.items[0].card) {
					// filter col & final items in potential hint list
					potentialHint
						.filter((item) => item.parent !== "temp")
						.forEach((hintTarget) => {
							// temp --> final
							if (
								hintTarget.parent === "final" &&
								hintSource.items[0].card ===
									hintTarget.items[0].acceptCard
							) {
								// if accept card type of a card is not in col or temp space
								// then can go back to the final
								let findTempsCard;
								let findColsCard;
								let findCards;
								for (
									let i = 0;
									i < packs.temp.length + packs.col.length;
									i++
								) {
									if (i < packs.temp.length) {
										findTempsCard = packs.temp[i].find(
											(item) =>
												item.type ===
												hintSource.items[0]
													.acceptCardType
										);
										if (findTempsCard) {
											findCards = true;
										}
									} else {
										findColsCard = packs.col[i - 4].find(
											(item) =>
												item.type ===
												hintSource.items[0]
													.acceptCardType
										);
										if (findColsCard) {
											findCards = true;
										}
									}
								}

								// if both don't exist, move the source card
								if (
									!findCards ||
									hintSource.items[0].point === 2
								) {
									getHint = true;
									// set moving cards array
									movingCardsArray.parent = hintSource.parent;
									movingCardsArray.parentIndex =
										hintSource.index;
									movingCardsArray.indexes = [
										packs[hintSource.parent][
											hintSource.index
										].length - 1,
									];
									// set mouse area as for target
									mouseArea.pack = hintTarget.parent;
									mouseArea.packIndex = hintTarget.index;
									// auto returns to final space
									elementTransfer(
										packs[hintTarget.parent][
											hintTarget.index
										],
										packs[hintSource.parent][
											hintSource.index
										],
										false,
										true
									);
									// or one of them exists, push it into hint array
								} else {
									hintArray.value.push([
										hintSource,
										hintTarget,
									]);
								}
								// temp --> col
							} else if (
								// if the card complies with rules
								// or the column is empty
								(hintTarget.parent === "col" &&
									hintSource.items[0].type ===
										hintTarget.items[0].acceptCardType) ||
								hintTarget.items[0].acceptCardType === "All"
							) {
								hintArray.value.push([hintSource, hintTarget]);
							}
						});
					// hint source: col
				} else if (
					hintSource.parent === "col" &&
					hintSource.items[0].card
				) {
					potentialHint.forEach((hintTarget) => {
						// col --> final
						if (
							hintTarget.parent === "final" &&
							hintSource.items[0].card ===
								hintTarget.items[0].acceptCard
						) {
							// if accept card type of a card is not in col or temp space
							// then can go back to the final
							let findTempsCard;
							let findColsCard;
							let findCards;
							for (
								let i = 0;
								i < packs.temp.length + packs.col.length;
								i++
							) {
								if (i < packs.temp.length) {
									findTempsCard = packs.temp[i].find(
										(item) =>
											item.type ===
											hintSource.items[0].acceptCardType
									);
									if (findTempsCard) {
										findCards = true;
									}
								} else {
									findColsCard = packs.col[i - 4].find(
										(item) =>
											item.type ===
											hintSource.items[0].acceptCardType
									);
									if (findColsCard) {
										findCards = true;
									}
								}
							}

							// if both don't exist, move the source card
							if (!findCards || hintSource.items[0].point === 2) {
								getHint = true;
								// set moving cards array
								movingCardsArray.parent = hintSource.parent;
								movingCardsArray.parentIndex = hintSource.index;
								movingCardsArray.indexes = [
									packs[hintSource.parent][hintSource.index]
										.length - 1,
								];
								// set mouse area as for target
								mouseArea.pack = hintTarget.parent;
								mouseArea.packIndex = hintTarget.index;
								elementTransfer(
									packs[hintTarget.parent][hintTarget.index],
									packs[hintSource.parent][hintSource.index],
									false,
									true
								);
								// or one of them exists, push it into hint array
							} else {
								// first deep copy the object
								// otherwise slice items would affect the orginal one
								const hintSourceForFianl = JSON.parse(
									JSON.stringify(hintSource)
								);
								hintSourceForFianl.items = [
									hintSource.items[0],
								];
								hintArray.value.push([
									hintSourceForFianl,
									hintTarget,
								]);
							}
							// col --> col
							// except the same column
						} else if (
							hintTarget.parent === "col" &&
							hintTarget.index !== hintSource.index
						) {
							// check every cards combinations in hint source
							hintSource.items.forEach((sub, subindex) => {
								const hintSourceCopy = JSON.parse(
									JSON.stringify(hintSource)
								);
								const subSource = hintSourceCopy.items.slice(
									0,
									subindex + 1
								);
								const subPotentialHint = {
									parent: hintSource.parent,
									index: hintSource.index,
									items: subSource,
								};
								// if card(s) complies with rules
								// and length of combination doesn't reach the max length
								if (
									subSource.length <= maxLength.nonEmpty &&
									hintTarget.items[0].acceptCardType ===
										subSource.last.type
								) {
									hintArray.value.push([
										subPotentialHint,
										hintTarget,
									]);
									// or target column is empty
									// and length of combination doesn't reach the max length
								} else if (
									hintTarget.items[0].acceptCardType ===
										"All" &&
									subSource.length <= maxLength.empty
								) {
									hintArray.value.push([
										subPotentialHint,
										hintTarget,
									]);
								}
							});
							// col --> temp
							// targe temp space is emrty
						} else if (
							hintTarget.items[0].acceptCardType == "All"
						) {
							// do the same thing as the situation where
							// cards can move to final space do
							const hintSourceForTemp = JSON.parse(
								JSON.stringify(hintSource)
							);
							hintSourceForTemp.items = [hintSource.items.last];
							hintArray.value.push([
								hintSourceForTemp,
								hintTarget,
							]);
						}
					});
				}
			});

			if (getHint) {
				setTimeout(() => {
					getHintArray();
				}, 500);
			}
			// set length of hint array
			hintArrayLength.value = hintArray.value.length;
			// set hint array index value
			hintIndex.value = 0;
		};
		// used in initCardsPack to execute cards shuffling
		const shuffle = (array) => {
			for (let i = array.length - 1; i > 0; i--) {
				let j = Math.floor(Math.random() * (i + 1));
				[array[i], array[j]] = [array[j], array[i]];
			}
		};

		// 5. Functionality

		// 5-1 express function
		// return cards and cardsForshuffle
		const initCards = (array = []) => {
			for (let i = 1; i < 14; i++) {
				Object.keys(suits).forEach((suit) => {
					array.push({
						card: `${suit + i}`,
						suit,
						point: i,
						isHoverHint: false,
						styleObject: {
							backgroundImage: `url(./F2E_W2_material/material/cards_background/${
								suit + i
							}.png)`,
							left: "0px",
							top: "0px",
							zIndex: 10,
							opacity: 0,
						},
						acceptCardType:
							(suit === "S" || suit === "C" ? "red" : "black") +
							(i - 1),
						type:
							(suit === "S" || suit === "C" ? "black" : "red") +
							i,
						acceptCard: `${suit + (i + 1)}`,
					});
				});
			}
			return array;
		};

		// 5-2 statement for render
		// set game status to "inGame"
		const closeHandler = () => {
			status.code = "inGame";
		};
		// drag start
		const dragStart = (e) => {
			// drag with translate change, so temporily remove "transition" class
			isTransition.value = false;
			movingCardsArray.parent = "";
			movingCardsArray.parentIndex = null;
			movingCardsArray.indexes = [];

			// set base mouse position
			record.mouse.push({ x: e.pageX, y: e.pageY });
			record.position.x = record.mouse.last.x;
			record.position.y = record.mouse.last.y;

			// get cards which is movable
			checkIsMovable(getAllNextCards(e.target));
			if (movingCardsArray.indexes.length !== 0) {
				isDragging.value = true;
			}
		};
		// drag
		const drag = (e) => {
			getArea(e);
			if (isDragging.value) {
				movingCardsArray.indexes.forEach((item) => {
					packs[movingCardsArray.parent][
						movingCardsArray.parentIndex
					][item].styleObject.transform = `translate(${
						record.mouse.last.x - record.position.x
					}px, ${record.mouse.last.y - record.position.y}px)`;
					packs[movingCardsArray.parent][
						movingCardsArray.parentIndex
					][item].styleObject.zIndex = `${time.value + 11}`;
				});
			}
		};
		//drag end
		const dragEnd = (e) => {
			const { pack, packIndex } = mouseArea;

			// check cards is movable
			if (pack && packIndex !== null && isDragging.value) {
				const packLength = packs[pack][packIndex].length;
				const sourceType =
					packs[movingCardsArray.parent][
						movingCardsArray.parentIndex
					][movingCardsArray.indexes[0]].type;
				const sourceCard =
					packs[movingCardsArray.parent][
						movingCardsArray.parentIndex
					][movingCardsArray.indexes[0]].card;

				if (pack === "col") {
					if (
						packLength !== 0 &&
						sourceType ===
							packs[pack][packIndex][packLength - 1]
								.acceptCardType &&
						movingCardsArray.indexes.length <= maxLength.nonEmpty
					) {
						elementTransfer(
							packs[pack][packIndex],
							packs[movingCardsArray.parent][
								movingCardsArray.parentIndex
							]
						);
					} else if (
						packLength === 0 &&
						movingCardsArray.indexes.length <= maxLength.empty
					) {
						elementTransfer(
							packs[pack][packIndex],
							packs[movingCardsArray.parent][
								movingCardsArray.parentIndex
							]
						);
					} else {
						cardReturnBack(
							packs[movingCardsArray.parent][
								movingCardsArray.parentIndex
							]
						);
					}
				} else if (
					pack === "temp" &&
					movingCardsArray.indexes.length === 1
				) {
					if (packs.temp[packIndex].length === 0) {
						elementTransfer(
							packs[pack][packIndex],
							packs[movingCardsArray.parent][
								movingCardsArray.parentIndex
							]
						);
					} else {
						cardReturnBack(
							packs[movingCardsArray.parent][
								movingCardsArray.parentIndex
							]
						);
					}
				} else if (
					pack === "final" &&
					movingCardsArray.indexes.length === 1
				) {
					if (
						packLength !== 0 &&
						sourceCard ===
							packs[pack][packIndex][packLength - 1].acceptCard
					) {
						elementTransfer(
							packs[pack][packIndex],
							packs[movingCardsArray.parent][
								movingCardsArray.parentIndex
							]
						);
					} else if (
						packLength === 0 &&
						sourceCard === Object.keys(suits)[packIndex] + 1
					) {
						elementTransfer(
							packs[pack][packIndex],
							packs[movingCardsArray.parent][
								movingCardsArray.parentIndex
							]
						);
					} else {
						cardReturnBack(
							packs[movingCardsArray.parent][
								movingCardsArray.parentIndex
							]
						);
					}
				} else {
					cardReturnBack(
						packs[movingCardsArray.parent][
							movingCardsArray.parentIndex
						]
					);
				}
			}
		};
		// get hint
		const hint = () => {
			if (hintArrayLength.value > 0) {
				hintIndex.value = hintArray.value[hintIndex.value]
					? hintIndex.value
					: 0;
				const hintPair = hintArray.value[hintIndex.value];
				hintPair.forEach((pair) => {
					if (pair.items[0].card) {
						pair.items.forEach((item, index) => {
							const l = packs[pair.parent][pair.index].length - 1;
							packs[pair.parent][pair.index][
								l - index
							].isHoverHint = true;
						});
					} else {
						document
							.getElementById(`${pair.parent + (pair.index + 1)}`)
							.firstElementChild.classList.add("hoverHint");
					}
					setTimeout(() => {
						if (pair.items[0].card) {
							pair.items.forEach((item, index) => {
								const l =
									packs[pair.parent][pair.index].length - 1;
								packs[pair.parent][pair.index][
									l - index
								].isHoverHint = false;
							});
						} else {
							document
								.getElementById(
									`${pair.parent + (pair.index + 1)}`
								)
								.firstElementChild.classList.remove(
									"hoverHint"
								);
						}
					}, 800);
				});
				hintIndex.value++;
			}
		};
		// mouse hover
		const hoverHint = (e, isMouseEnter = true) => {
			if (mouseArea.pack !== "final") {
				document
					.querySelectorAll(
						`[data-acceptCardType='${e.target.dataset.type}']`
					)
					.forEach((elem) => {
						if (isMouseEnter) {
							elem.classList.add("hoverHint");
						} else {
							elem.classList.remove("hoverHint");
						}
					});
			}
		};
		const hoverHintForFinal = (e, isMouseEnter = true) => {
			const suit = Object.keys(suits).find(
				(key) => suits[key] === e.target.classList[1]
			);
			document
				.querySelectorAll(`[data-suit='${suit}']`)
				.forEach((elem) => {
					if (isMouseEnter) {
						elem.classList.add("hoverHint");
					} else {
						elem.classList.remove("hoverHint");
					}
				});
		};
		// set game status to "new"
		const newGameHandler = () => {
			status.code = "new";
		};
		// set game status to "restart"
		const restartHandler = () => {
			status.code = "restart";
		};
		// set game status to "init" and isShuffle to false
		const restartCurrentGame = () => {
			isShuffle.value = false;
			status.code = "init";
		};
		// set game status to "init" and isShuffle to true
		const startNewGame = () => {
			isShuffle.value = true;
			status.code = "init";
		};
		// undo the steps
		const undo = () => {
			status.code = "inGame";
			if (moves.value > 0) {
				const lastStep = record.moves.last;
				let doAgain = lastStep.autoReturn;
				// set movingCardsArray and mouseArea
				movingCardsArray.parent = lastStep.target.pack;
				movingCardsArray.parentIndex = lastStep.target.packIndex;
				movingCardsArray.indexes = [];
				mouseArea.pack = lastStep.source.parent;
				mouseArea.packIndex = lastStep.source.parentIndex;
				for (let i = 0; i < lastStep.length; i++) {
					movingCardsArray.indexes.push(
						packs[movingCardsArray.parent][
							movingCardsArray.parentIndex
						].length -
							lastStep.length +
							i
					);
				}
				if (lastStep.target.pack === "final") {
					finalNum.value--;
				}
				elementTransfer(
					packs[lastStep.source.parent][lastStep.source.parentIndex],
					packs[lastStep.target.pack][lastStep.target.packIndex],
					true,
					false
				);
				if (doAgain) {
					setTimeout(() => {
						undo();
					}, 500);
				}
			}
		};

		// 5-3 statement not for render
		// function to set shuffler and to distribute cards
		const cardsDistributing = () => {
			const ids = cardsForShuffle.value.map((item) => item.card); // get shuffle order
			let index = 0;
			isLoading.value = false;

			// set cards invisible
			cardsForShuffle.value.forEach((item) => {
				item.styleObject.opacity = 0;
			});

			// animation of cards distributing
			shuffler = setInterval(() => {
				const mod = index % 4;

				// get cards to final spaces first
				if (index < 52) {
					const c = ids.indexOf(cards.value[index].card);
					const colIndex =
						c < 28 ? parseInt(c / 7) : parseInt((c - 28) / 6) + 4;
					const cardIndex = c < 28 ? c % 7 : (c - 28) % 6;
					const offsetX =
						finalRefs.value[mod].getBoundingClientRect().left -
						document.getElementById(ids[c]).getBoundingClientRect()
							.left;
					const offsetY =
						finalRefs.value[mod].getBoundingClientRect().top -
						document.getElementById(ids[c]).getBoundingClientRect()
							.top;

					packs.col[colIndex][
						cardIndex
					].styleObject.left = `${offsetX}px`;
					packs.col[colIndex][cardIndex].styleObject.top = `${
						offsetY - (parseInt(index / 4) - 1) * 1.5
					}px`;
					packs.col[colIndex][cardIndex].styleObject.zIndex =
						index + 10;
					packs.col[colIndex][cardIndex].styleObject.opacity = 1;
				} else if (index < 104) {
					isTransition.value = true;
					//then return cards back to its orginal place
					const c = ids.indexOf(cards.value[103 - index].card);
					const colIndex =
						c < 28 ? parseInt(c / 7) : parseInt((c - 28) / 6) + 4;
					const cardIndex = c < 28 ? c % 7 : (c - 28) % 6;

					packs.col[colIndex][cardIndex].styleObject.left = "0px";
					packs.col[colIndex][cardIndex].styleObject.top = "0px";
					packs.col[colIndex][cardIndex].styleObject.zIndex = 10;
				} else {
					clearInterval(shuffler);
					status.code = "inGame";
					setTimeout(() => {
						getHintArray();
					}, 500);
				}
				index++;
			}, shuffleSpeed);
		};
		// function to set dropPosition and boundaries
		const getBoundary = () => {
			dropPosition = [];
			dropArea.forEach((item) => {
				item.value.forEach((subItem) => {
					dropPosition.push(getElementRange(subItem));
				});
			});

			// set boundaries
			boundaries.vertical =
				(dropPosition[0].bottom + dropPosition[8].top) / 2;
			boundaries.leftHorizontal = dropPosition[8].left - 20;
			boundaries.rightHorizontal = dropPosition[15].right + 20;
			boundaries.topLeftHorizontal = dropPosition[3].right + 20;
			boundaries.topRightHorizontal = dropPosition[4].left - 20;
		};
		// function to set maxLength
		const getMaxLength = () => {
			const emptyTemp = packs.temp.filter((item) => item.length === 0);
			const emptyCol = packs.col.filter((item) => item.length === 0);
			maxLength.nonEmpty = (emptyTemp.length + 1) * (emptyCol.length + 1);
			maxLength.empty = (emptyTemp.length + 1) * emptyCol.length;
		};
		// function to set packs
		const initCardsPack = () => {
			// shuffle...
			if (isShuffle.value) {
				shuffle(cardsForShuffle.value);
			}

			// distribute cards
			let j = 0;
			for (let i = 0; i < cardsForShuffle.value.length; i++) {
				if (i < 28) {
					if (packs.col[j].length < 7) {
						packs.col[j].push(cardsForShuffle.value[i]);
					} else {
						j++;
						packs.col[j].push(cardsForShuffle.value[i]);
					}
				} else {
					if (packs.col[j].length < 6) {
						packs.col[j].push(cardsForShuffle.value[i]);
					} else {
						j++;
						packs.col[j].push(cardsForShuffle.value[i]);
					}
				}
			}

			getMaxLength();
		};

		// 6. Refs and set refs

		// define ref of each area and set ref function
		const tempRefs = ref([]);
		const finalRefs = ref([]);
		const colRefs = ref([]);
		const cardRefs = ref([]);
		const setTempRef = (el) => {
			if (el) tempRefs.value.push(el);
		};
		const setFinalRef = (el) => {
			if (el) finalRefs.value.push(el);
		};
		const setColRef = (el) => {
			if (el) colRefs.value.push(el);
		};
		const setCardRef = (el) => {
			if (el) cardRefs.value.push(el);
		};

		// 3. Other variables which don't have to be watched

		// used to render and in initCards, dragEnd, to get suit and set by default
		const suits = { S: "spade", H: "heart", D: "diamond", C: "club" };
		// used in statusInfo and set by default
		const buttonInfo = {
			new: {
				function: startNewGame,
				content: "NEW GAME",
			},
			restart: {
				function: restartCurrentGame,
				content: "PLAY AGAIN",
			},
			undo: {
				function: undo,
				content: "UNDO",
			},
		};
		// used in status.code watch function and set by default
		const statusInfo = {
			win: {
				img: "joy",
				title: "CONGRADULATIONS!",
				content: "You win the game!",
				button: [buttonInfo.restart, buttonInfo.new],
			},
			new: {
				img: "angry",
				title: "START A NEW GAME",
				content: "Are you sure you want to give up?",
				button: [buttonInfo.new],
			},
			restart: {
				img: "happy",
				title: "RESTART THE CURRENT GAME",
				content: "Are you sure to restart the current game?",
				button: [buttonInfo.restart],
			},
			lose: {
				img: "sad",
				title: "NO MORE MOVES",
				content: "There are no more moves available.",
				button: [buttonInfo.restart, buttonInfo.new, buttonInfo.undo],
			},
		};
		// used in cardsDistributing to determine shuffle speed and set by default
		const shuffleSpeed = 30;
		// used in cardsDistributing to play distributing animation and set by default
		let shuffler = null;
		// used when status.code changes and set by default
		let timer = null;
		// used in getAreaIndex to determine which parent element to be dropped
		// when mouse up and set by getBoundary
		let dropPosition = [];
		// used in getBoundary to make dropPosition and set by default
		const dropArea = [tempRefs, finalRefs, colRefs];
		// used in getArea and set by getBoundary
		const boundaries = {
			vertical: 0,
			leftHorizontal: 0,
			rightHorizontal: 0,
			topLeftHorizontal: 0,
			topRightHorizontal: 0,
		};

		// 7. Computed Variables

		// cards and cardForShuffling
		const cards = computed(() => initCards([]));
		const cardsForShuffle = computed(() => initCards([]));

		// 8. watch function

		// finalNum  -->  status.code = "win"
		watch(finalNum, (newVal, oldVal) => {
			if (newVal === 52) {
				status.code = "win";
			}
		});
		// hintArrayLength -->  status.code = "lose"
		watch(hintArrayLength, (newVal, oldVal) => {
			if (newVal === 0 && finalNum.value !== 52) {
				status.code = "lose";
			}
		});
		// status.code
		watch(
			() => status.code,
			(newVal, oldVal) => {
				// propable situation:
				// init --> inGame
				// inGame <--> new
				// inGame <--> restart
				// inGame <--> win
				// inGame <--> lose
				// new --> init
				// restart --> iit
				// win --> init
				// lose --> init
				// lose --> inGame

				// stop timing
				clearInterval(timer);
				// check which condition is to be applied
				if (newVal === "inGame") {
					status.info = {};
					timer = setInterval(() => {
						time.value++;
					}, 1000);
				} else if (newVal === "init") {
					status.info = {};
					time.value = 0;
					finalNum.value = 0;
					moves.value = 0;
					isTransition.value = false;
					record.moves = [];

					// clean out packs
					Object.values(packs).forEach((item) => {
						item.forEach((subItem) => {
							subItem.length = 0;
						});
					});

					initCardsPack();
					cardsDistributing();
				} else {
					status.info = statusInfo[status.code];
				}
			}
		);
		// time  -->  minute, second
		watch(time, (newTime, oldTime) => {
			if (newTime !== 0) {
				if (second.value === 59) {
					second.value = 0;
				} else {
					second.value++;
				}
				if (newTime % 60 === 0) {
					minute.value++;
				}
			} else {
				minute.value = 0;
				second.value = 0;
			}
		});

		// 9. Lifecycle functions

		onBeforeMount(() => {
			// shuffles cards and distributes before mounted
			initCardsPack();
		});
		onMounted(() => {
			//.......
			window.addEventListener("resize", getBoundary);
			window.addEventListener("scroll", getBoundary);
			// calculate elements' boundaries
			getBoundary();
			// play card distributing animation
			cardsDistributing();
		});
		onBeforeUpdate(() => {
			// update refs
			tempRefs.value = [];
			finalRefs.value = [];
			colRefs.value = [];
			cardRefs.value = [];
		});

		return {
			isLoading,
			minute,
			second,
			moves,
			maxLength,
			record,
			mouseArea,
			isTransition,
			suits,
			packs,
			status,
			setTempRef,
			setFinalRef,
			setColRef,
			setCardRef,
			newGameHandler,
			restartHandler,
			closeHandler,
			hoverHint,
			hoverHintForFinal,
			dragStart,
			drag,
			dragEnd,
			undo,
			hint,
		};
	},
};
Vue.createApp(app).mount("#app");
