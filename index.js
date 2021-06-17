const { ref, reactive, watch, onMounted, onBeforeUpdate, computed } = Vue;

const app = {
	setup() {
		// status
		const time = ref(0);
		const minute = ref(0);
		const second = ref(0);
		const moves = ref(0);
		const index = ref(0);
		const opacity = ref(0);
		const status = reactive({
			code: "init",
			info: {},
		}); // win, lose, new, restart

		// refs
		const tempNum = ref(4);
		const tempRefs = ref([]);
		const finalNum = ref(4);
		const finalRefs = ref([]);
		const colRefs = ref([]);
		const cardRefs = ref([]);
		const cardspack = reactive({
			col1: [],
			col2: [],
			col3: [],
			col4: [],
			col5: [],
			col6: [],
			col7: [],
			col8: [],
		});

		// other variables
		const suit = { S: "spade", H: "heart", D: "diamond", C: "club" };
		const shuffleSpeed = 50;
		let shuffler = null;
		let timer = null;
		let cards = [];
		let cardsShuffle = [];

		// const dragEventMap = computed(() => {
		// 	return {
		// 		dragstart: dragStart($event),
		// 		drag: drag($event),
		// 		dragend: dragEnd($event),
		// 	};
		// });
		// const dropEventMap = computed(() => {
		// 	return {
		// 		drop: dropped($event),
		// 		dragenter: cancelDefault($event),
		// 		dragover: cancelDefault($event),
		// 	};
		// });

		// event handler
		const newGameHandler = () => {
			status.code = "new";
		};
		const restartHandler = () => {
			status.code = "restart";
		};
		const closeHandler = () => {
			status.code = "inGame";
		};
		const startNewGame = () => {
			closeHandler();
			status.code = "init";

			finalRefs.value.forEach((c) => {
				c.innerHTML = "";
			});
			tempRefs.value.forEach((c) => {
				c.innerHTML = "";
			});
			colRefs.value.forEach((c) => {
				c.innerHTML = "";
			});
			Object.keys(cardspack).forEach((key) => {
				cardspack[key] = [];
			});

			initCardsPack(true);
		};
		const restartCurrentGame = () => {
			closeHandler();
			status.code = "init";

			finalRefs.value.forEach((c) => {
				c.innerHTML = "";
			});
			tempRefs.value.forEach((c) => {
				c.innerHTML = "";
			});
			colRefs.value.forEach((c) => {
				c.innerHTML = "";
			});
			Object.keys(cardspack).forEach((key) => {
				cardspack[key] = [];
			});

			initCardsPack(false);
		};

		const dragStart = (e) => {
			//let crt = this.cloneNode(true);
			//crt.style.opacity = "1";
			//document.body.appendChild(crt);
			//e.dataTransfer.setDragImage(crt, 0, 0);
			e.dataTransfer.setData("text/plain", e.target.id);
			//e.dataTransfer.dragEffect = "move";
		};
		const drag = (e) => {
			// e.target.style.position = "absolute";
			// e.target.style.left = `${e.clientX}px`;
			// e.target.style.top = `${e.clientY}px`;
			e.target.style.opacity = "0";
			//e.target.draggable.cursor = "pointer"
		};
		const dragEnd = (e) => {
			// e.target.style.position = "relative";
			// e.target.style.left = "0px";
			// e.target.style.top = "0px";
			e.target.style.opacity = "1";
			//e.dataTransfer.effectAllowed = "move";
		};
		const dropped = (e) => {
			cancelDefault(e);
			let id = e.dataTransfer.getData("text/plain");
			let ids = cardRefs.value.map((el) => el.id);
			let c = ids.indexOf(id);
			if (
				e.target.className === "card" ||
				e.target.className === "space_card"
			) {
				let parentClass = e.target.parentElement.classList;
				if (parentClass.contains("final")) {
					cardRefs.value[c].style.marginTop = "0px";
				} else if (parentClass.contains("col")) {
					cardRefs.value[c].style.marginTop =
						e.target.className === "space_card"
							? "-147px"
							: "-110px";
				} else {
					return false;
				}
				e.target.parentElement.appendChild(cardRefs.value[c]);
			} else {
				cardRefs.value[c].style.marginTop = "0px";
				e.target.appendChild(cardRefs.value[c]);
			}
		};
		// function dragOver(e){
		//  cancelDefault(e);
		//  e.dataTransfer.dropEffect = "move"
		// };
		const cancelDefault = (e) => {
			e.preventDefault();
			e.stopPropagation();
			return false;
		};

		// message status
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
				function: "",
				content: "UNDO",
			},
		};
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

		// set cards
		const initCards = () => {
			for (let i = 1; i < 14; i++) {
				Object.keys(suit).forEach((c) => {
					cards.push(`${c + i}`);
					cardsShuffle.push({
						cards: `${c + i}`,
						suit: c,
						point: i,
						img: `url(./F2E_W2_material/material/cards_background/${
							c + i
						}.png)`,
					});
				});
			}
		};

		// suffle function
		// Fisher-Yates algorithm
		const shuffle = (array) => {
			for (let i = array.length - 1; i > 0; i--) {
				let j = Math.floor(Math.random() * (i + 1));
				[array[i], array[j]] = [array[j], array[i]];
			}
		};

		// get absolute position of an element
		// const elemPosition = (elem) => {
		// 	let x = 0,
		// 		y = 0;
		// 	while (elem.offsetParent) {
		// 		x += elem.offsetLeft;
		// 		y += elem.offsetTop;
		// 		elem = elem.offsetParent;
		// 	}
		// 	return { x, y };
		// };

		// initialize card packs
		const initCardsPack = (isShuffle = true) => {
			// shuffle...
			if (isShuffle) {
				shuffle(cardsShuffle);
			}

			// distribute cards
			let j = 0;
			for (let i = 0; i < cardsShuffle.length; i++) {
				if (j <= 7) {
					cardspack[Object.keys(cardspack)[j]].push(cardsShuffle[i]);
					j++;
				} else {
					j = 0;
					cardspack[Object.keys(cardspack)[j]].push(cardsShuffle[i]);
					j++;
				}
			}

			// animation of cards distributing
			shuffler = setInterval(() => {
				let mod = index.value % 4;
				let ids = cardRefs.value.map((el) => el.id);

				// get cards to final spaces first
				if (index.value < 52) {
					let c = ids.indexOf(cards[index.value]);
					let offsetX =
						finalRefs.value[mod].getBoundingClientRect().left -
						// elemPosition(finalRefs.value[mod]).x -
						// elemPosition(cardRefs.value[c]).x;
						cardRefs.value[c].getBoundingClientRect().left;
					let offsetY =
						finalRefs.value[mod].getBoundingClientRect().top -
						// elemPosition(finalRefs.value[mod]).y -
						// elemPosition(cardRefs.value[c]).y;
						cardRefs.value[c].getBoundingClientRect().top;

					cardRefs.value[c].style.left = `${offsetX}px`;
					cardRefs.value[c].style.top = `${
						offsetY - (parseInt(index.value / 4) - 1) * 1.5
					}px`;
					cardRefs.value[c].style.zIndex = index.value + 10;
					cardRefs.value[c].style.opacity = 1;
				} else if (index.value < 104) {
					// then return cards back to its orginal place
					let c = ids.indexOf(cards[103 - index.value]);
					cardRefs.value[c].style.left = "0px";
					cardRefs.value[c].style.top = "0px";
					cardRefs.value[c].style.zIndex = "10";
				} else {
					clearInterval(shuffler);
					status.code = "inGame";
				}
				index.value++;
			}, shuffleSpeed);
		};

		// set refs
		initCards();
		const setTempRef = (el) => {
			if (el) {
				tempRefs.value.push(el);
			}
		};
		const setFinalRef = (el) => {
			if (el) {
				finalRefs.value.push(el);
			}
		};
		const setColRef = (el) => {
			if (el) {
				colRefs.value.push(el);
			}
		};
		const setCardRef = (el) => {
			if (el) {
				cardRefs.value.push(el);
				//console.log(elemPosition(el).x, elemPosition(el).y);
			}
		};

		onMounted(() => {
			initCardsPack();
		});
		onBeforeUpdate(() => {
			tempRefs.value = [];
			finalRefs.value = [];
			colRefs.value = [];
			cardRefs.value = [];
		});

		// watch function
		// timing...
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
			}
		});

		// game status chage
		watch(
			() => status.code,
			(newVal, oldVal) => {
				console.log(newVal);
				if (newVal === "inGame") {
					status.info = {};
					timer = setInterval(() => {
						time.value++;
					}, 1000);
				} else if (newVal === "init") {
					time.value = 0;
					minute.value = 0;
					second.value = 0;
					index.value = 0;
					moves.value = 0;
					opacity.value = 0;
					status.info = {};
					clearInterval(timer);
				} else {
					clearInterval(timer);
					status.info = statusInfo[status.code];
				}
			}
		);

		// set cards visible while distributing
		watch(index, (newIndex, oldIndex) => {
			if (newIndex > 51) {
				opacity.value = 1;
			}
		});

		return {
			suit,
			status,
			minute,
			second,
			moves,
			opacity,
			tempNum,
			setTempRef,
			finalNum,
			setFinalRef,
			setColRef,
			setCardRef,
			cardspack,
			newGameHandler,
			restartHandler,
			closeHandler,
			dragStart,
			drag,
			dragEnd,
			dropped,
			cancelDefault,
		};
	},
};
Vue.createApp(app).mount("#app");
