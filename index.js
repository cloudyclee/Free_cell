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
		// set by initCardsPack, elementTransfer
		const packs = reactive({
			temp: [[], [], [], []],
			final: [[], [], [], []],
			col: [[], [], [], [], [], [], [], []],
			moving: [],
		});
		// set by timer
		const time = ref(0);
		// set by cardsDistibuting, dragStart, dragEnd
		const isTransition = ref(false);
		// set by dragStart, dragEnd
		const isDragging = ref(false);
		// set by startNewGame, restartCurrentGame
		const isShuffle = ref(true);
		// set by getMaxLength and recalculate while packs.temp or packs.col changes
		const maxLength = reactive({ empty: 0, nonEmpty: 0 });
		// set by getArea
		const mouseArea = reactive({ pack: "", packIndex: null });
		// moves: set by elementTransfer
		// mouse: set by getArea
		// position: set by dragStart
		// card: ???
		const record = reactive({
			moves: [],
			mouse: [],
			position: [],
			card: null,
		});
		// parent: set by checkIsMovable
		// parentIndex: set by checkIsMovable
		// indexes: set by checkIsMovable
		const movingCardsArray = reactive({
			parent: "",
			parentIndex: null,
			indexes: [],
		});
		// set by getHintArray
		const hintArray = ref([]);
		// set by getHintArray
		const hintArrayLength = ref(0);
		// set by getHintArray, hint
		const hintIndex = ref(0);

		// 2. Variables which changes with other varibales change

		// when time changes
		const minute = ref(0);
		const second = ref(0);
		// when item in packs is transfered (elementTransfer in dragEnd and undo)
		const moves = ref(0);
		// when packs.final changes
		const finalNum = ref(0);

		// 4. Functions which used in other functions

		// used in initCardsPack to execute cards shuffling
		const shuffle = (array) => {
			for (let i = array.length - 1; i > 0; i--) {
				let j = Math.floor(Math.random() * (i + 1));
				[array[i], array[j]] = [array[j], array[i]];
			}
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
			const hintTarget = ["temp", "final", "col"];
			const potentialHint = [];
			hintArray.value = [];
			for (let i = 0; i < hintTarget.length; i++) {
				packs[hintTarget[i]].forEach((item, index) => {
					if (hintTarget[i] === "final") {
						potentialHint.push({
							parent: hintTarget[i],
							index,
							acceptCard: item.last
								? item.last.acceptCard
								: `${Object.keys(suits)[index] + 1}`,
						});
					} else {
						potentialHint.push({
							parent: hintTarget[i],
							index,
							card: item.last ? item.last.card : null,
							acceptCardType: item.last
								? item.last.acceptCardType
								: "All",
							type: item.last ? item.last.type : null,
						});
					}
				});
			}

			potentialHint.forEach((hintItem) => {
				if (hintItem.parent === "temp" && hintItem.card) {
					potentialHint
						.filter((i) => i.parent !== "temp")
						.forEach((item) => {
							if (
								item.parent === "final" &&
								hintItem.card === item.acceptCard
							) {
								hintArray.value.push([hintItem, item]);
							} else if (
								(item.parent === "col" &&
									hintItem.type === item.acceptCardType) ||
								item.acceptCardType === "All"
							) {
								hintArray.value.push([hintItem, item]);
							}
						});
				} else if (hintItem.parent === "col" && hintItem.card) {
					potentialHint.forEach((item) => {
						if (
							item.parent === "final" &&
							hintItem.card === item.acceptCard
						) {
							hintArray.value.push([hintItem, item]);
						} else if (
							item.parent === "temp" &&
							item.acceptCardType == "All"
						) {
							hintArray.value.push([hintItem, item]);
						} else {
							// col --> col
						}
					});
				}
			});
			hintArrayLength.value = hintArray.value.length;
			hintIndex.value = 0;
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
		// used in dragEnd and undo to transfer card object in packs
		const elementTransfer = (targetPack, sourcePack, isUndo = false) => {
			const sliceLength = movingCardsArray.indexes.length;
			const movingCardsPack = sourcePack.slice(-sliceLength);
			sourcePack.splice(-sliceLength, sliceLength);
			targetPack.push(...movingCardsPack);
			cardReturnBack(targetPack);
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
				});
				moves.value++;
				//console.log("record: ", record.moves);
			} else {
				record.moves.pop();
				moves.value--;
				//console.log("record: ", record.moves);
			}
			getHintArray();
			//console.log("hint: ", hintArray.value);
		};
		// used in dragEnd to delete card's tranform
		const cardReturnBack = (cardPack) => {
			const tl = cardPack.length;
			const ml = movingCardsArray.indexes.length;
			if (tl !== 0) {
				movingCardsArray.indexes.forEach((item, index) => {
					cardPack[tl - ml + index].styleObject.transform =
						"translate(0px, 0px)";
					cardPack[tl - ml + index].styleObject.zIndex = 10;
					delete cardPack[tl - ml + index].styleObject.transform;
				});
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
		// set game status to "new"
		const newGameHandler = () => {
			status.code = "new";
		};
		// set game status to "restart"
		const restartHandler = () => {
			status.code = "restart";
		};
		// set game status to "inGame"
		const closeHandler = () => {
			status.code = "inGame";
		};
		// set game status to "init" and isShuffle to true
		const startNewGame = () => {
			isShuffle.value = true;
			status.code = "init";
		};
		// set game status to "init" and isShuffle to false
		const restartCurrentGame = () => {
			isShuffle.value = false;
			status.code = "init";
		};
		// mouse hoveer
		const hoverHint = (e) => {
			//console.log(mouseArea.pack);
			// record.card = packs[mouseArea.pack][mouseArea.packIndex].find(
			// 	(item) => {
			// 		item.card === e.target.id;
			// 	}
			// );
			// console.log(record.card);
		};
		// drag start
		const dragStart = (e) => {
			// drag with translate change, so temporily remove "transition" class
			isTransition.value = false;
			isDragging.value = true;
			movingCardsArray.parent = "";
			movingCardsArray.parentIndex = null;
			movingCardsArray.indexes = [];

			// set base mouse position
			record.mouse.push({ x: e.pageX, y: e.pageY });
			record.position.x = record.mouse.last.x;
			record.position.y = record.mouse.last.y;

			// get cards which is movable
			checkIsMovable(getAllNextCards(e.target));
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
					][item].styleObject.zIndex = 999;
				});
			}
		};
		//drag end
		const dragEnd = (e) => {
			const { pack, packIndex } = mouseArea;
			const packLength = packs[pack][packIndex].length;
			const sourceType =
				packs[movingCardsArray.parent][movingCardsArray.parentIndex][
					movingCardsArray.indexes[0]
				].type;
			const sourceCard =
				packs[movingCardsArray.parent][movingCardsArray.parentIndex][
					movingCardsArray.indexes[0]
				].card;
			const sourcePoint = e.target.dataset.point - 0;
			const sourceColor = e.target.dataset.color;

			if (pack === "col") {
				if (
					packLength !== 0 &&
					sourceType ===
						packs[pack][packIndex][packLength - 1].acceptCardType &&
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
					packs[movingCardsArray.parent][movingCardsArray.parentIndex]
				);
			}

			isTransition.value = true;
			isDragging.value = false;
		};
		// undo the steps
		const undo = () => {
			status.code = "inGame";
			if (record.moves.length > 0) {
				const lastStep = record.moves.last;
				if (lastStep.target.pack === "final") {
					finalNum.value--;
				}
				elementTransfer(
					packs[lastStep.source.parent][lastStep.source.parentIndex],
					packs[lastStep.target.pack][lastStep.target.packIndex],
					true
				);
			}
		};
		// get hint
		const hint = () => {
			if (hintArrayLength.value > 0) {
				hintIndex.value = hintArray.value[hintIndex.value]
					? hintIndex.value
					: 0;
				const hintItem = hintArray.value[hintIndex.value];
				hintItem.forEach((item) => {
					if (item.card) {
						packs[item.parent][item.index].last.isHoverHint = true;
					} else {
						document
							.getElementById(`${item.parent + (item.index + 1)}`)
							.firstElementChild.classList.add("hoverHint");
					}
					setTimeout(() => {
						if (item.card) {
							packs[item.parent][
								item.index
							].last.isHoverHint = false;
						} else {
							document
								.getElementById(
									`${item.parent + (item.index + 1)}`
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

		// 5-3 statement not for render
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
		};
		// function to set maxLength
		const getMaxLength = () => {
			const emptyTemp = packs.temp.filter((item) => item.length === 0);
			const emptyCol = packs.col.filter((item) => item.length === 0);
			maxLength.nonEmpty = (emptyTemp.length + 1) * (emptyCol.length + 1);
			maxLength.empty = (emptyTemp.length + 1) * emptyCol.length;
		};
		// function to set dropPosition and boundaries
		const getBoundary = () => {
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
		// function to set shuffler and to distribute cards
		const cardsDistributing = () => {
			const ids = cardsForShuffle.value.map((item) => item.card); // get shuffle order
			let index = 0;

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
					// const offsetX =
					// 	finalRefs.value[mod].getBoundingClientRect().left -
					// 	cardRefs.value[c].getBoundingClientRect().left;
					// const offsetY =
					// 	finalRefs.value[mod].getBoundingClientRect().top -
					// 	cardRefs.value[c].getBoundingClientRect().top;
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
				}
				index++;
			}, shuffleSpeed);
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
		const shuffleSpeed = 10;
		// used in cardsDistributing to play distributing animation and set by default
		let shuffler = null;
		// used when status.code changes and set by default
		let timer = null;
		// used in getBoundary to make dropPosition and set by default
		const dropArea = [tempRefs, finalRefs, colRefs];
		// used in getAreaIndex to determine which parent element to be dropped
		// when mouse up and set by getBoundary
		const dropPosition = [];
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
					Object.values(packs).forEach((item) =>
						item.forEach((subItem) => (subItem.length = 0))
					);

					initCardsPack();
					cardsDistributing();
					getHintArray();
				} else {
					status.info = statusInfo[status.code];
				}
			}
		);
		// packs -->  maxLength
		watch(packs, (newPacks, oldPacks) => {
			getMaxLength();
		});
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
		// finalNum  -->  status.code = "win"
		watch(finalNum, (newVal, oldVal) => {
			//console.log("new final num: ", newVal);
			//console.log("old final num: ", oldVal);
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

		// 9. Lifecycle functions

		onBeforeMount(() => {
			// shuffles cards and distributes before mounted
			initCardsPack();
			// get hibt array
			getHintArray();
		});
		onMounted(() => {
			//.......
			window.addEventListener("resize", getBoundary);
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
			dragStart,
			drag,
			dragEnd,
			undo,
			hint,
		};
	},
};
Vue.createApp(app).mount("#app");
