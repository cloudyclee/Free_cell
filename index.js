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
Object.defineProperties( Array.prototype, {
	last: {
		get () {
			return this[ this.length - 1 ];
		},
	},
	hasContent: {
		get () {
			return this.length !== 0;
		},
	},
} );

const app = {
	setup () {

		// used to render and in initCards, dragEnd, to get suit and set by default
		const suits = [ "S", "H", "D", "C" ];
		// used in getAreaIndex to determine which parent element to be dropped
		// when mouse up and set by getBoundary
		// status.code
		//// init: set by startNewGame, restartCurrentGame
		//// inGame: set by cardsDistributing, closeHandler
		//// new: set by newGameHandler
		//// restart: set by restartHandler
		//// win: when finalNum changes
		//// lose: when hintArrayLength = 0
		// status.info: when status.code changes
		const status = reactive( {
			code: "init",
			info: {},
		} );
		// set by initCardsPack, elementTransfer
		const packs = reactive( {
			temp: [ [], [], [], [] ],
			final: [ [], [], [], [] ],
			col: [ [], [], [], [], [], [], [], [] ],
		} );
		// set by getMaxLength and recalculate while packs.temp or packs.col changes
		const maxLength = reactive( { empty: 0, nonEmpty: 0 } );
		// set by timer
		const time = ref( 0 );
		// used in cardsDistributing to determine shuffle speed and set by default
		const shuffleSpeed = 30;
		// set by startNewGame, restartCurrentGame
		const isShuffle = ref( true );
		// set by cardsDistibuting, dragStart, dragEnd
		const isTransition = ref( false );
		// used when status.code changes and set by default
		let timer = null;
		// used in cardsDistributing to play distributing animation and set by default
		let shuffler = null;

		// used in initCardsPack to execute cards shuffling
		const shuffle = ( array ) => {
			for ( let i = array.length - 1; i > 0; i-- ) {
				let j = Math.floor( Math.random() * ( i + 1 ) );
				[ array[ i ], array[ j ] ] = [ array[ j ], array[ i ] ];
			}
		};
		// function to set maxLength
		const getMaxLength = () => {
			const emptyTemp = packs.temp.filter( ( item ) => !item.hasContent );
			const emptyCol = packs.col.filter( ( item ) => !item.hasContent );
			maxLength.nonEmpty = ( emptyTemp.length + 1 ) * ( emptyCol.length + 1 );
			maxLength.empty = ( emptyTemp.length + 1 ) * emptyCol.length;
		};
		// return cards and cardsForshuffle
		const initCards = ( array = [] ) => {
			for ( let i = 1; i < 14; i++ ) {
				suits.forEach( ( suit ) => {
					array.push( {
						card: `${ suit + i }`,
						suit,
						point: i,
						// control class "hoverHint" on & off
						isHoverHint: false,
						styleObject: {
							backgroundImage: `url(./F2E_W2_material/material/cards_background/${ suit + i }.png)`,
							left: "0px",
							top: "0px",
							zIndex: 10,
							opacity: 0,
						},
						acceptCardType:
							( suit === "S" || suit === "C" ? "red" : "black" ) + ( i - 1 ),
						type:
							( suit === "S" || suit === "C" ? "black" : "red" ) + i,
						acceptCard: `${ suit + ( i + 1 ) }`,
					} );
				} );
			}
			return array;
		};
		// function to set packs
		const initCardsPack = () => {
			// shuffle...
			if ( isShuffle.value ) {
				shuffle( cardsForShuffle.value );
			}

			// distribute cards
			let j = 0;
			for ( let i = 0; i < cardsForShuffle.value.length; i++ ) {
				if ( i < 28 ) {
					if ( packs.col[ j ].length < 7 ) {
						packs.col[ j ].push( cardsForShuffle.value[ i ] );
					} else {
						j++;
						packs.col[ j ].push( cardsForShuffle.value[ i ] );
					}
				} else {
					if ( packs.col[ j ].length < 6 ) {
						packs.col[ j ].push( cardsForShuffle.value[ i ] );
					} else {
						j++;
						packs.col[ j ].push( cardsForShuffle.value[ i ] );
					}
				}
			}
		};
		// function to set shuffler and to distribute cards
		const cardsDistributing = () => {
			const ids = cardsForShuffle.value.map( ( item ) => item.card ); // get shuffle order
			let index = 0;
			let order = [];
			cards.value.forEach( item => {
				order.push( ids.indexOf( item.card ) );
			} );

			// set cards invisible
			cardsForShuffle.value.forEach( ( item ) => {
				item.styleObject.opacity = 0;
			} );

			// animation of cards distributing
			shuffler = setInterval( () => {
				const mod = index % 4;
				// get cards to final spaces first
				if ( index < 52 ) {
					const c = order[ index ];
					const colIdx = c < 28 ? parseInt( c / 7 ) : parseInt( ( c - 28 ) / 6 ) + 4;
					const cardIdx = c < 28 ? c % 7 : ( c - 28 ) % 6;
					// calculate card's offset
					const finalRect = document.getElementById( `final${ mod + 1 }` ).getBoundingClientRect();
					const cardRect = document.getElementById( ids[ c ] ).getBoundingClientRect();
					const offsetX = finalRect.left - cardRect.left;
					const offsetY = finalRect.top - cardRect.top;
					// set card's offset
					packs.col[ colIdx ][ cardIdx ].styleObject.left = `${ offsetX }px`;
					packs.col[ colIdx ][ cardIdx ].styleObject.top = `${ offsetY - ( parseInt( index / 4 ) - 1 ) * 1.5 }px`;
					packs.col[ colIdx ][ cardIdx ].styleObject.zIndex = index + 10;
					packs.col[ colIdx ][ cardIdx ].styleObject.opacity = 1;

					//then return cards back to its orginal place
				} else if ( index < 104 ) {
					const c = order[ 103 - index ];
					const colIndex = c < 28 ? parseInt( c / 7 ) : parseInt( ( c - 28 ) / 6 ) + 4;
					const cardIndex = c < 28 ? c % 7 : ( c - 28 ) % 6;
					// add transition
					isTransition.value = true;
					// reset card's offset 
					packs.col[ colIndex ][ cardIndex ].styleObject.left = "0px";
					packs.col[ colIndex ][ cardIndex ].styleObject.top = "0px";
					packs.col[ colIndex ][ cardIndex ].styleObject.zIndex = 10;
				} else {
					clearInterval( shuffler );
					status.code = "inGame";
					setTimeout( () => {
						// get max length while packs is settled down
						getMaxLength();
						// get hint array while packs & max length is settled down
						getHintArray();
					}, 500 );
				}
				index++;
			}, shuffleSpeed );
		};


		const dropArea = [ "temp", "final", "col" ];
		// used in getArea and set by getBoundary
		const boundaries = {
			vertical: 0,
			leftHorizontal: 0,
			rightHorizontal: 0,
			topLeftHorizontal: 0,
			topRightHorizontal: 0,
		};
		const lengths = {
			temp: packs.temp.length,
			final: packs.final.length,
			col: packs.col.length
		};
		let dropPosition = [];

		// function to set dropPosition and boundaries
		const getBoundary = () => {
			dropPosition = [];
			// set dropPosition
			dropArea.forEach( ( item ) => {
				const l = packs[ item ].length;
				for ( let i = 0; i < l; i++ ) {
					dropPosition.push( document.getElementById( `${ item + ( i + 1 ) }` ).getBoundingClientRect() );
				}
			} );
			// set boundaries
			boundaries.vertical = ( dropPosition[ 0 ].bottom + dropPosition[ 8 ].top ) / 2;
			boundaries.leftHorizontal = dropPosition[ 8 ].left - 20;
			boundaries.rightHorizontal = dropPosition[ 15 ].right + 20;
			boundaries.topLeftHorizontal = dropPosition[ 3 ].right + 20;
			boundaries.topRightHorizontal = dropPosition[ 4 ].left - 20;
		};


		// set by getArea
		const mouseArea = reactive( { pack: "", packIndex: null } );
		// parent: set by checkIsMovable
		// parentIndex: set by checkIsMovable
		// indexes: set by checkIsMovable
		const movingCardsArray = reactive( {
			parent: "",
			parentIndex: null,
			indexes: [],
		} );
		// moves: set by elementTransfer
		// mouse: set by getArea
		// position: set by dragStart
		const record = reactive( {
			moves: [],
			posStart: { x: 0, y: 0 },
		} );
		// when item in packs is transfered (elementTransfer in dragEnd and undo)
		const moves = ref( 0 );
		// set by dragStart, dragEnd
		const isDragging = ref( false );

		// used in dragStart to get all cards behind a card
		const getAllNextCards = ( elem ) => {
			let nexts = { parent: "", parentIndex: null, indexes: [] };
			const id = elem.id;
			[ nexts.parent, nexts.parentIndex ] =
				elem.parentElement.id.split( /(\d+)/ );
			nexts.parentIndex = nexts.parentIndex - 0 - 1;
			let cardIndex = packs[ nexts.parent ][ nexts.parentIndex ].findIndex(
				( item ) => item.card === id
			);
			const packLength = packs[ nexts.parent ][ nexts.parentIndex ].length;

			while ( cardIndex < packLength ) {
				nexts.indexes.push( cardIndex );
				cardIndex++;
			}
			return nexts;
		};
		// used in dragStart to check which cards to set movingCardsArray
		const checkIsMovable = ( cardsArray ) => {
			const l = cardsArray.indexes.length;
			const { parent, parentIndex } = cardsArray;
			// set movingCardsArray
			movingCardsArray.parent = parent;
			movingCardsArray.parentIndex = parentIndex;
			movingCardsArray.indexes.push( cardsArray.indexes[ 0 ] );
			// set movingCardsArray.indexes
			for ( let i = 0; i < l; i++ ) {
				const p = cardsArray.indexes[ i ];
				const previousCard = packs[ parent ][ parentIndex ][ p ];
				const nextCard = packs[ parent ][ parentIndex ][ p + 1 ];

				if ( nextCard ) {
					const type = previousCard.acceptCardType;
					const nextCardType = nextCard.type;
					if ( type === nextCardType ) {
						movingCardsArray.indexes.push(
							cardsArray.indexes[ i + 1 ]
						);
					}
				}
			}
			// reset movingCardsArray if moving cards don't comply with rules
			if ( l !== 1 && movingCardsArray.indexes.length !== l ) {
				movingCardsArray.parent = "";
				movingCardsArray.parentIndex = null;
				movingCardsArray.indexes = [];
			}
		};
		// used in getArea to get which pack is to be pushed into cards
		const getAreaIndex = ( indexCount, indexLength, limitBoundary, e ) => {
			let packIndex = indexCount;
			while (
				e.clientX > ( packIndex < indexCount + indexLength - 1
					? dropPosition[ packIndex ].right / 2 + dropPosition[ packIndex + 1 ].left / 2
					: limitBoundary )
			) {
				packIndex++;
			}
			packIndex -= indexCount;
			return packIndex;
		};
		// used in drag to get mouse target pack
		const getArea = ( e ) => {
			if (
				e.clientX > boundaries.leftHorizontal &&
				e.clientX < boundaries.rightHorizontal
			) {
				if ( e.clientY > boundaries.vertical ) {
					mouseArea.pack = "col";
					mouseArea.packIndex = getAreaIndex( lengths.temp + lengths.final, lengths.col, boundaries.rightHorizontal, e );
				} else if ( e.clientX < boundaries.topLeftHorizontal ) {
					mouseArea.pack = "temp";
					mouseArea.packIndex = getAreaIndex( 0, lengths.temp, boundaries.topLeftHorizontal, e );
				} else if (
					e.clientX > boundaries.topRightHorizontal
				) {
					mouseArea.pack = "final";
					mouseArea.packIndex = getAreaIndex( lengths.temp, lengths.final, boundaries.rightHorizontal, e );
				} else {
					mouseArea.pack = null;
					mouseArea.packIndex = null;
				}
			} else {
				mouseArea.pack = null;
				mouseArea.packIndex = null;
			}
		};
		//const getTop = ( id ) => document.getElementById( id ).getBoundingClientRect().top;
		// used in dragEnd to delete card's tranform
		const cardReturnBack = ( cardPack, offset = { offsetX: 0, offsetY: 0 } ) => {
			const { offsetX, offsetY } = offset;
			const { pack } = mouseArea;
			const { indexes } = movingCardsArray;

			const tl = cardPack.length;
			const ml = indexes.length;
			const isCardSpace = pack === "col" && tl !== ml;
			console.log( isCardSpace );

			isTransition.value = true;
			isDragging.value = false;

			if ( tl !== 0 ) {
				indexes.forEach( ( item, index ) => {
					cardPack[ tl - ml + index ].styleObject.transform =
						`translate(${ offsetX }px, ${ offsetY - 35.8 * isCardSpace }px)`;
					// for those cards which move not through drag event
					cardPack[ tl - ml + index ].styleObject.zIndex = `${ time.value + 11 }`;
					setTimeout( () => {
						cardPack[ tl - ml + index ].styleObject.transform = `translate(0px, 0px)`;
						delete cardPack[ tl - ml + index ].styleObject.transform;
					}, 50 );
				} );
			}
		};
		// used in dragEnd and undo to transfer card object in packs
		const elementTransfer = ( targetPack, sourcePack, isUndo = false, autoReturn = false ) => {
			const { parent, parentIndex, indexes } = movingCardsArray;
			const { pack, packIndex } = mouseArea;

			const sourceCardId = packs[ parent ][ parentIndex ][ indexes[ 0 ] ].card;
			const targetCardId = pack === "col" && packs[ pack ][ packIndex ].last
				? packs[ pack ][ packIndex ].last.card : null;

			const source = document.querySelector( `#${ sourceCardId }` );
			const target = targetCardId
				? document.querySelector( `#${ targetCardId }` )
				: document.querySelector( `#${ pack + ( packIndex + 1 ) }` );

			const offsetX = source.getBoundingClientRect().left - target.getBoundingClientRect().left;
			const offsetY = source.getBoundingClientRect().top - target.getBoundingClientRect().top;
			const offset = { offsetX, offsetY };

			const sliceLength = indexes.length;
			const movingCardsPack = sourcePack.slice( -sliceLength );

			sourcePack.splice( -sliceLength, sliceLength );
			targetPack.push( ...movingCardsPack );
			cardReturnBack( targetPack, offset );
			getMaxLength();

			if ( pack === "final" ) {
				finalNum.value++;
			}

			if ( !isUndo ) {
				record.moves.push( {
					target: { pack, packIndex },
					source: { parent, parentIndex },
					length: indexes.length,
					autoReturn,
				} );
				if ( !autoReturn ) {
					moves.value++;
					getHintArray();
				}
			} else {
				if ( record.moves.last && !record.moves.last.autoReturn ) {
					moves.value--;
					getHintArray();
				}
				record.moves.pop();
			}
		};
		// drag start
		const dragStart = ( e ) => {
			// drag with translate change, so temporily remove "transition" class
			isTransition.value = false;
			// reset movingCardsArray
			movingCardsArray.parent = "";
			movingCardsArray.parentIndex = null;
			movingCardsArray.indexes = [];
			// set start mouse position
			record.posStart.x = e.pageX;
			record.posStart.y = e.pageY;
			// get cards which are movable
			checkIsMovable( getAllNextCards( e.target ) );
			if ( movingCardsArray.indexes.length !== 0 ) {
				//const { parent, parentIndex } = movingCardsArray;
				isDragging.value = true;
				// packs.moving = movingCardsArray.indexes.map( item => {
				// 	return packs[ parent ][ parentIndex ][ item ];});
			}
		};
		// drag
		const drag = ( e, start = record.posStart ) => {
			const offsetX = e.pageX - start.x;
			const offsetY = e.pageY - start.y;
			const { parent, parentIndex, indexes } = movingCardsArray;
			if ( isDragging.value ) {
				indexes.forEach( ( item ) => {
					packs[ parent ][ parentIndex ][ item ].styleObject.transform = `translate(${ offsetX }px, ${ offsetY }px)`;
					packs[ parent ][ parentIndex ][ item ].styleObject.zIndex = `${ time.value + 11 }`;
				} );
			}
		};
		//drag end
		const dragEnd = ( e ) => {
			getArea( e );
			const { pack, packIndex } = mouseArea;
			const { parent, parentIndex, indexes } = movingCardsArray;

			// check cards is movable
			if ( pack && packIndex !== null && isDragging.value ) {
				const packLength = packs[ pack ][ packIndex ].length;
				const sourceType = packs[ parent ][ parentIndex ][ indexes[ 0 ] ].type;
				const sourceCard = packs[ parent ][ parentIndex ][ indexes[ 0 ] ].card;

				if ( pack === "col" ) {
					if (
						packLength !== 0 &&
						sourceType === packs[ pack ][ packIndex ][ packLength - 1 ].acceptCardType &&
						indexes.length <= maxLength.nonEmpty
					) {
						elementTransfer( packs[ pack ][ packIndex ], packs[ parent ][ parentIndex ] );
					} else if (
						packLength === 0 &&
						indexes.length <= maxLength.empty
					) {
						elementTransfer( packs[ pack ][ packIndex ], packs[ parent ][ parentIndex ] );
					} else {
						cardReturnBack( packs[ parent ][ parentIndex ] );
					}
				} else if ( pack === "temp" && indexes.length === 1 ) {
					if ( packs.temp[ packIndex ].length === 0 ) {
						elementTransfer( packs[ pack ][ packIndex ], packs[ parent ][ parentIndex ] );
					} else {
						cardReturnBack( packs[ parent ][ parentIndex ] );
					}
				} else if (
					pack === "final" && indexes.length === 1
				) {
					if (
						packLength !== 0 &&
						sourceCard === packs[ pack ][ packIndex ][ packLength - 1 ].acceptCard
					) {
						elementTransfer( packs[ pack ][ packIndex ], packs[ parent ][ parentIndex ] );
					} else if (
						packLength === 0 && sourceCard === suits[ packIndex ] + 1
					) {
						elementTransfer( packs[ pack ][ packIndex ], packs[ parent ][ parentIndex ] );
					} else {
						cardReturnBack( packs[ parent ][ parentIndex ] );
					}
				} else {
					cardReturnBack( packs[ parent ][ parentIndex ] );
				}
			}
		};

		// set by getHintArray
		const hintArray = ref( [] );
		// set by getHintArray, hint
		const hintIndex = ref( 0 );
		// ...
		const hintPack = [ "temp", "final", "col" ];
		// ...
		let potentialHint = [];
		// ...
		let getHint = false;

		// used in elemrntTransfer and execute in onBeforeMount to get hintArray
		const getHintArray = () => {
			// reset
			hintArray.value = [];
			potentialHint = [];
			getHint = false;

			// make hint potential list
			hintPack.forEach( packName => {
				packs[ packName ].forEach( ( item, index ) => {
					// for final sapce
					if ( packName === "final" ) {
						potentialHint.push( {
							parent: packName,
							index,
							// only push "acceptCard" property
							// cards in final space couldn't move
							// only could accpet the cards of the same suit
							items: [ {
								acceptCard: item.last ? item.last.acceptCard : `${ suits[ index ] + 1 }`,
								acceptPoint: item.last ? item.last.point + 1 : null,
							} ],
						} );
						// for temp space
					} else if ( packName === "temp" ) {
						potentialHint.push( {
							parent: packName,
							index,
							items: [ {
								// cards in temp space don't have "acceptCard" property
								// they couldn't accept cards like in final space
								card: item.last ? item.last.card : null,
								// if the temp space has no cards,
								// set "acceptCardType" property as "All"
								acceptCardType: item.last ? item.last.acceptCardType : "All",
								type: item.last ? item.last.type : null,
								point: item.last ? item.last.point : null,
							} ],
						} );
						// for col space
					} else {
						const hintCards = [];
						const hintCol = packs[ packName ][ index ];
						let pHIndex = hintCol.length - 1;

						// first push the last card of the column
						hintCards.push( {
							// set values as in temp space
							card: item.last ? item.last.card : null,
							acceptCardType: item.last ? item.last.acceptCardType : "All",
							type: item.last ? item.last.type : null,
							point: item.last ? item.last.point : null,
						} );
						// if the previous card of the last card complies with rules
						// also push this card into array
						while (
							hintCol[ pHIndex - 1 ] &&
							hintCol[ pHIndex ].type === hintCol[ pHIndex - 1 ].acceptCardType
						) {
							hintCards.push( {
								card: item[ pHIndex - 1 ].card,
								acceptCardType: item[ pHIndex - 1 ].acceptCardType,
								type: item[ pHIndex - 1 ].type,
								point: item[ pHIndex - 1 ].point,
							} );
							pHIndex--;
						}
						potentialHint.push( { parent: packName, index, items: hintCards, } );
					}
				} );
			} );

			// make hint list
			// temp --> final
			// temp --> col
			// col --> temp
			// col --> final
			// col --> col
			potentialHint.forEach( ( hintSource ) => {
				// hint source: temp
				if ( hintSource.parent === "temp" && hintSource.items[ 0 ].card ) {
					// filter col & final items in potential hint list
					potentialHint
						.filter( ( item ) => item.parent !== "temp" )
						.forEach( ( hintTarget ) => {
							// temp --> final
							if (
								hintTarget.parent === "final" &&
								hintSource.items[ 0 ].card === hintTarget.items[ 0 ].acceptCard
							) {
								// if accept card type of a card is not in col or temp space
								// then can go back to the final
								let findTempsCard;
								let findColsCard;
								let findCards;
								for ( let i = 0; i < packs.temp.length + packs.col.length; i++ ) {
									if ( i < packs.temp.length ) {
										findTempsCard = packs.temp[ i ].find( ( item ) => {
											return item.type === hintSource.items[ 0 ].acceptCardType;
										} );
										if ( findTempsCard ) {
											findCards = true;
										}
									} else {
										findColsCard = packs.col[ i - 4 ].find( ( item ) => {
											return item.type === hintSource.items[ 0 ].acceptCardType;
										} );
										if ( findColsCard ) {
											findCards = true;
										}
									}
								}

								// if both don't exist, move the source card
								if ( !findCards || hintSource.items[ 0 ].point === 2 ) {
									getHint = true;
									// set moving cards array
									movingCardsArray.parent = hintSource.parent;
									movingCardsArray.parentIndex = hintSource.index;
									movingCardsArray.indexes = [
										packs[ hintSource.parent ][ hintSource.index ].length - 1
									];
									// set mouse area as for target
									mouseArea.pack = hintTarget.parent;
									mouseArea.packIndex = hintTarget.index;
									// auto returns to final space
									elementTransfer(
										packs[ hintTarget.parent ][ hintTarget.index ],
										packs[ hintSource.parent ][ hintSource.index ],
										false, true
									);
									// or one of them exists, push it into hint array
								} else {
									hintArray.value.push( [ hintSource, hintTarget ] );
								}
								// temp --> col
							} else if (
								// if the card complies with rules
								// or the column is empty
								( hintTarget.parent === "col" &&
									hintSource.items[ 0 ].type === hintTarget.items[ 0 ].acceptCardType ) ||
								hintTarget.items[ 0 ].acceptCardType === "All"
							) {
								hintArray.value.push( [ hintSource, hintTarget ] );
							}
						} );
					// hint source: col
				} else if ( hintSource.parent === "col" && hintSource.items[ 0 ].card ) {
					potentialHint.forEach( ( hintTarget ) => {
						// col --> final
						if (
							hintTarget.parent === "final" &&
							hintSource.items[ 0 ].card === hintTarget.items[ 0 ].acceptCard
						) {
							// if accept card type of a card is not in col or temp space
							// then can go back to the final
							let findTempsCard;
							let findColsCard;
							let findCards;
							for ( let i = 0; i < packs.temp.length + packs.col.length; i++ ) {
								if ( i < packs.temp.length ) {
									findTempsCard = packs.temp[ i ].find( ( item ) => {
										return item.type === hintSource.items[ 0 ].acceptCardType;
									} );
									if ( findTempsCard ) {
										findCards = true;
									}
								} else {
									findColsCard = packs.col[ i - 4 ].find( ( item ) => {
										return item.type === hintSource.items[ 0 ].acceptCardType;
									} );
									if ( findColsCard ) {
										findCards = true;
									}
								}
							}

							// if both don't exist, move the source card
							if ( !findCards || hintSource.items[ 0 ].point === 2 ) {
								getHint = true;
								// set moving cards array
								movingCardsArray.parent = hintSource.parent;
								movingCardsArray.parentIndex = hintSource.index;
								movingCardsArray.indexes = [
									packs[ hintSource.parent ][ hintSource.index ].length - 1,
								];
								// set mouse area as for target
								mouseArea.pack = hintTarget.parent;
								mouseArea.packIndex = hintTarget.index;
								elementTransfer(
									packs[ hintTarget.parent ][ hintTarget.index ],
									packs[ hintSource.parent ][ hintSource.index ],
									false, true
								);
								// or one of them exists, push it into hint array
							} else {
								// first deep copy the object
								// otherwise slice items would affect the orginal one
								const hintSourceForFianl = JSON.parse( JSON.stringify( hintSource ) );
								hintSourceForFianl.items = [ hintSource.items[ 0 ] ];
								hintArray.value.push( [ hintSourceForFianl, hintTarget ] );
							}
							// col --> col
							// except the same column
						} else if (
							hintTarget.parent === "col" &&
							hintTarget.index !== hintSource.index
						) {
							// check every cards combinations in hint source
							hintSource.items.forEach( ( sub, subindex ) => {
								const hintSourceCopy = JSON.parse( JSON.stringify( hintSource ) );
								const subSource = hintSourceCopy.items.slice( 0, subindex + 1 );
								const subPotentialHint = {
									parent: hintSource.parent,
									index: hintSource.index,
									items: subSource,
								};
								// if card(s) complies with rules
								// and length of combination doesn't reach the max length
								if (
									subSource.length <= maxLength.nonEmpty &&
									hintTarget.items[ 0 ].acceptCardType === subSource.last.type
								) {
									hintArray.value.push( [ subPotentialHint, hintTarget ] );
									// or target column is empty
									// and length of combination doesn't reach the max length
								} else if (
									hintTarget.items[ 0 ].acceptCardType === "All" &&
									subSource.length <= maxLength.empty
								) {
									hintArray.value.push( [ subPotentialHint, hintTarget ] );
								}
							} );
							// col --> temp
							// targe temp space is emrty
						} else if (
							hintTarget.items[ 0 ].acceptCardType == "All"
						) {
							// do the same thing as the situation where
							// cards can move to final space do
							const hintSourceForTemp = JSON.parse( JSON.stringify( hintSource ) );
							hintSourceForTemp.items = [ hintSource.items.last ];
							hintArray.value.push( [ hintSourceForTemp, hintTarget ] );
						}
					} );
				}
			} );

			if ( getHint ) {
				setTimeout( () => {
					getHintArray();
					// set length of hint array
					hintArrayLength.value = hintArray.value.length;
					// set hint array index value
					hintIndex.value = 0;
				}, 500 );
			} else {
				// set length of hint array
				hintArrayLength.value = hintArray.value.length;
				// set hint array index value
				hintIndex.value = 0;
			}
		};
		// get hint
		const hint = () => {
			if ( hintArrayLength.value > 0 ) {
				hintIndex.value = hintArray.value[ hintIndex.value ] ? hintIndex.value : 0;
				const hintPair = hintArray.value[ hintIndex.value ];
				hintPair.forEach( ( pair ) => {
					if ( pair.items[ 0 ].card ) {
						pair.items.forEach( ( item, index ) => {
							const l = packs[ pair.parent ][ pair.index ].length - 1;
							packs[ pair.parent ][ pair.index ][ l - index ].isHoverHint = true;
						} );
					} else {
						document
							.getElementById( `${ pair.parent + ( pair.index + 1 ) }` )
							.firstElementChild.classList.add( "hoverHint" );
					}
					setTimeout( () => {
						if ( pair.items[ 0 ].card ) {
							pair.items.forEach( ( item, index ) => {
								const l = packs[ pair.parent ][ pair.index ].length - 1;
								packs[ pair.parent ][ pair.index ][ l - index ].isHoverHint = false;
							} );
						} else {
							document
								.getElementById( `${ pair.parent + ( pair.index + 1 ) }` )
								.firstElementChild.classList.remove( "hoverHint" );
						}
					}, 800 );
				} );
				hintIndex.value++;
			}
		};
		// mouse hover
		const hoverHint = ( e, isMouseEnter = true ) => {
			if ( !isDragging.value ) {
				document
					.querySelectorAll( `[data-acceptCardType='${ e.target.dataset.type }']` )
					.forEach( ( elem ) => {
						if ( isMouseEnter ) {
							elem.classList.add( "hoverHint" );
						} else {
							elem.classList.remove( "hoverHint" );
						}
					} );
			}
		};
		const hoverHintForFinal = ( e, isMouseEnter = true ) => {
			if ( !isDragging.value ) {
				const suit = suits.find( ( item ) => item === e.target.classList[ 1 ] );
				document
					.querySelectorAll( `[data-suit='${ suit }']` )
					.forEach( ( elem ) => {
						if ( isMouseEnter ) {
							elem.classList.add( "hoverHint" );
						} else {
							elem.classList.remove( "hoverHint" );
						}
					} );
			}
		};
		// undo the steps
		const undo = () => {
			status.code = "inGame";
			if ( moves.value > 0 ) {
				const lastStep = record.moves.last;
				let doAgain = lastStep.autoReturn;
				// set movingCardsArray and mouseArea
				movingCardsArray.parent = lastStep.target.pack;
				movingCardsArray.parentIndex = lastStep.target.packIndex;
				movingCardsArray.indexes = [];
				mouseArea.pack = lastStep.source.parent;
				mouseArea.packIndex = lastStep.source.parentIndex;
				for ( let i = 0; i < lastStep.length; i++ ) {
					movingCardsArray.indexes.push(
						packs[ movingCardsArray.parent ][ movingCardsArray.parentIndex ].length -
						lastStep.length + i
					);
				}
				if ( lastStep.target.pack === "final" ) {
					finalNum.value--;
				}
				elementTransfer(
					packs[ lastStep.source.parent ][ lastStep.source.parentIndex ],
					packs[ lastStep.target.pack ][ lastStep.target.packIndex ],
					true, false
				);
				if ( doAgain ) {
					setTimeout( () => {
						undo();
					}, 500 );
				}
			}
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

		// when time changes
		const minute = ref( 0 );
		const second = ref( 0 );
		// time  -->  minute, second
		watch( time, ( newTime, oldTime ) => {
			if ( newTime !== 0 ) {
				if ( second.value === 59 ) {
					second.value = 0;
				} else {
					second.value++;
				}
				if ( newTime % 60 === 0 ) {
					minute.value++;
				}
			} else {
				minute.value = 0;
				second.value = 0;
			}
		} );


		// when packs.final changes
		const finalNum = ref( 0 );
		// set by getHintArray
		const hintArrayLength = ref( 0 );

		// set game status to "inGame"
		const closeHandler = () => {
			status.code = "inGame";
		};
		// set game status to "new"
		const newGameHandler = () => {
			status.code = "new";
		};
		// set game status to "restart"
		const restartHandler = () => {
			status.code = "restart";
		};
		// finalNum  -->  status.code = "win"
		watch( finalNum, ( newVal, oldVal ) => {
			if ( newVal === 52 ) {
				status.code = "win";
			}
		} );
		// hintArrayLength -->  status.code = "lose"
		watch( hintArrayLength, ( newVal, oldVal ) => {
			if ( newVal === 0 && finalNum.value !== 52 ) {
				status.code = "lose";
			}
		} );
		// status.code
		watch(
			() => status.code,
			( newVal, oldVal ) => {
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
				clearInterval( timer );
				// check which condition is to be applied
				if ( newVal === "inGame" ) {
					status.info = {};
					timer = setInterval( () => {
						time.value++;
					}, 1000 );
				} else if ( newVal === "init" ) {
					status.info = {};
					time.value = 0;
					finalNum.value = 0;
					moves.value = 0;
					isTransition.value = false;
					record.moves = [];

					// clean out packs
					Object.values( packs ).forEach( ( item ) => {
						item.forEach( ( subItem ) => {
							subItem.length = 0;
						} );
					} );

					initCardsPack();
					cardsDistributing();
				} else {
					status.info = statusInfo[ status.code ];
				}
			}
		);

		// cards and cardForShuffling
		const cards = computed( () => initCards( [] ) );
		const cardsForShuffle = computed( () => initCards( [] ) );
		// define ref of each area and set ref function
		const loadingFrame = ref( null );
		const tempRefs = ref( [] );
		const finalRefs = ref( [] );
		const colRefs = ref( [] );
		const cardRefs = ref( [] );
		const setTempRef = ( el ) => {
			if ( el ) tempRefs.value.push( el );
		};
		const setFinalRef = ( el ) => {
			if ( el ) finalRefs.value.push( el );
		};
		const setColRef = ( el ) => {
			if ( el ) colRefs.value.push( el );
		};
		const setCardRef = ( el ) => {
			if ( el ) cardRefs.value.push( el );
		};
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
				button: [ buttonInfo.restart, buttonInfo.new ],
			},
			new: {
				img: "angry",
				title: "START A NEW GAME",
				content: "Are you sure you want to give up?",
				button: [ buttonInfo.new ],
			},
			restart: {
				img: "happy",
				title: "RESTART THE CURRENT GAME",
				content: "Are you sure to restart the current game?",
				button: [ buttonInfo.restart ],
			},
			lose: {
				img: "sad",
				title: "NO MORE MOVES",
				content: "There are no more moves available.",
				button: [ buttonInfo.restart, buttonInfo.new, buttonInfo.undo ],
			},
		};


		onBeforeMount( () => {
			// shuffles cards and distributes before mounted
			initCardsPack();
		} );
		onMounted( () => {
			// calculate elements' boundaries
			getBoundary();
			window.addEventListener( "resize", getBoundary );
			window.addEventListener( "scroll", getBoundary );
			window.addEventListener( "mousemove", drag );
			window.addEventListener( "mouseup", dragEnd );
			// play card distributing animation
			cardsDistributing();
			loadingFrame.value.style.display = "none";
		} );
		onBeforeUpdate( () => {
			// update refs
			tempRefs.value = [];
			finalRefs.value = [];
			colRefs.value = [];
			cardRefs.value = [];
		} );

		return {
			loadingFrame,
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
Vue.createApp( app ).mount( "#app" );
