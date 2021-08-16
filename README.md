# 新接龍

此為第二屆 F2E [第二關](https://challenge.thef2e.com/news/13)的內容。主要練習使用前端框架 Vue，以操作資料為原則更新 DOM 元素，避免在 Vue 中使用 jQuery 直接改變 DOM 元素。

需求為製作一個網頁版的新接龍遊戲，除了須符合遊戲規則外，另外還需有以下功能：
- 還原上一步
- 計時遊玩時間

## 使用工具

使用 CDN 引入 Vue3，並練習使用 composistion API 形式撰寫。另外使用 Sass 撰寫 CSS，其中使用 Sass 變數管理顏色；使用 mixin 統一卡牌樣式。最後使用 Vscode 套件匯出成 css 檔。

## 功能實現與技術細節

- 初始化
	- 使用 `reactive` 定義卡牌區物件，分成暫時存放區 ( 4 個長度為 0 的陣列集合 )、目標區 ( 4 個長度為 0 的陣列集合 )、卡堆區 ( 8 個長度為 0 的陣列集合 )
	- 定義卡牌初始化函式，依照花色與點數順序使用 `computed` 屬性創建卡片陣列 (陣列每一項為一卡片物件，包含 ID、點數、花色、style 樣式等 )
	- 複製卡片陣列，為後續洗牌用的卡片陣列 ( 以下稱為洗牌卡片陣列 )
	- 使用 Fisher-Yates 演算法定義洗牌函式，利用洗牌函式將洗牌卡片陣列隨機排序 ( 本來是按照點數與花色排序 )
	- 在 `onBeforeMount` 階段執行卡牌分配，將卡牌以 [ 7, 7, 7, 7, 6, 6, 6, 6 ] 的數量依序塞入至卡堆區的 8 個陣列中，即可使用 `v-for` 渲染出卡堆區

- 洗牌動畫
	1. `mounted` 階段卡牌渲染完成後，先將卡片的 `opacity` 設為 0
	2. 利用初始化的卡片陣列，依照黑桃、紅心、方塊、梅花且點數由小到大的順序，依序找出卡堆區卡片的順序
	3. 定義一 `setInterval` 函式，設定執行 104 次 ( 52 * 2 )
	4. 前 52 次依照上述順序，計算卡片與其對應的目標區域的距離，並改變卡堆區中的卡片物件內，style 物件的 left、top 與 opacity 屬性，使其移動至目標區域 ( 如此一來在視覺效果上，便會覺得好像卡片依序出現在目標區一樣 )
	4. 後 52 次則依照相反順序，將卡片物件中 style 物件的 left 與 top 屬性歸零 ( 在視覺效果上便會覺得卡片從目標區分配至卡堆區中 )
	5. 第 104 次以後將該 `setInterval` 函式設為 `null`，停止執行。如此便完成洗牌動畫

- 卡牌移動
	1. 點擊卡片時觸發 `mousedown` 事件，判斷卡牌可否移動 ( 例如點擊卡堆區第 6 欄第 4 張卡片，判斷該欄的第 4、第 5、第 6 張卡片是否可視為一個群組移動 )
	2. 若可移動，從卡堆區 ( 或其他卡片區 ) 的陣列集合中找出那些卡片物件，並記錄卡片來自於哪一個卡牌區的哪一個陣列，並記錄在 `movingCardsArray` 變數中
	3. 移動時觸發 `mousemove` 事件，改變該卡片物件中 style 物件的 transform 屬性值 ( 此 style 物件綁定至卡片的 inline-style )
	4. 結束拖曳時觸發 `mouseup` 事件，首先判斷滑鼠位於頁面的哪個位置，藉此計算出位於哪一個卡片區的第幾欄，並記錄在 `mouseArea` 變數中。
	5. 判斷目標區域在遊戲規則上是否可接受移動的卡片
	6. 定義一函式 `cardsReturnBack`，若目標區域可接受，則該函式根據 `movingCardsArray` 與 `mouseArea` 的資訊，使用 `slice` 方式自來源區域複製一份陣列，並 `push` 至目標區域的陣列集合中，同時使用 `splice` 將來源區域中的卡片切割丟棄
	7. 使用 `ref` 設置一變數 `finalNum`，若是將卡片移動至目標區，`finalNum` +1
	8. 將移動卡片物件中 style 物件的 transform 屬性值歸零並消除，如此便完成卡片移動 ( 若目標區域無接受，則函式僅將卡片移回原位而已 )
	9. 卡片移動完成後，將此次移動的 `movingCardsArray` 與 `mouseArea` 資訊記錄在 `record` 的變數中

- 提示
	- 定義一 `getHintArray` 函式，在卡片動畫完成，以及每次卡牌移動完成後執行
	- 該函式根據遊戲規則，尋找暫時存放區、卡堆區中可移動的卡片，並製作出 `hintArray` 陣列
	- 每次點擊畫面中的「HINT」按鈕，按照 `hintArray` 陣列中的卡片，在畫面上依序提示使用者 ( 例如 `hintArray` 有 5 項，按第一次按鈕提示第 1 項；按第二次提示第 2 項，依此類推，按第六次則再次提示第 1 項 )
	- 若該提示在遊戲規則中可以自動移動 ( 例如將梅花 1 移動至梅花目標區 )，則執行 `cardsReturnBack` 函式移動該卡牌
	- 滑鼠指向卡牌時，也同時提示使用者可接受該卡的卡片 ( 如指向黑桃 5，則提示紅心 6 或方塊 6。若滑鼠指向目標區，則提示使用者所有該花色的卡牌 )

- 復原
	- 定義一 `undo` 函式，於按下「UNDO」按鈕後執行
	- 使用 `record` 變數的最後一項作為 `cardsReturnBack` 的參數，但參數對調
	- 若卡片自目標區中移出，則 `finalNum` -1
	- 完成復原後使用 `splice` 將 `record` 切除最後一項
	- 切除最後一項後，若新的 `record` 最後一項為自動移動的項目，則再次執行復原動作，直到最後一項不是自動移動的項目

- 遊戲狀態
	- 定義一 `reactive` 物件 `status`，其中設定 `code` 屬性，其可能的值包含 init、inGame、new、restart、win、lose
	- 卡牌初始化與洗牌動畫執行階段將 `code` 值設為 init；遊戲進行中則將值設為 inGame；按下「NEW GAME」按鈕或「RESTART」按鈕則設為 new 以及 restart，畫面將顯示開啟新局或者重新遊戲的對話框；達到遊戲勝利或輸掉遊戲的條件時，分別將值設為 win 以及 lose，並開啟相對應的對話框
	- 在對話框中選擇開啟新局或重新遊戲，都將使遊戲狀態回到 init，卡牌再次初始化，但若是重新遊戲，洗牌卡片陣列不會再次執行洗牌函式，因此新局將會與上一局的牌型相同
	- 使用 `watch` 函式監控 `finalNum` 變數，當 `finalNum` 到達 52 時，則達成勝利條件
	- 使用 `watch` 函式監控 `hintArray` 的長度，當 `hintArray` 長度為 0 時，則玩家輸掉此局

- 計時計步
	- 遊戲狀態為 inGame 時啟動記時函式 ( 使用 `ref` 定義一變數 `time`，並用 `setInterval` 函式累加 )，狀態若非 inGame 時則用 `cleanInterval` 方法暫停計時，狀態為 init 時則時間歸零重新計算
	- 使用 `ref` 定義一變數 `moves`，每次完成移動時 `moves` +1，復原時則 -1；且自動移動或復原自動移動不會改變 `moves` 值


