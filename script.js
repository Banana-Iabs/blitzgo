import { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot} from "https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-app.js";
import { GoogleAuthProvider, getAuth } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js";
import { firebaseConfig } from '/js/config.js';

const app = initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();
const auth = getAuth(app);
const db = getFirestore(app); 
auth.languageCode = 'en'; 

const id = new URLSearchParams(window.location.search).get('id');
const ref = doc(db, "sessions", id);
let playerCount = 0;
const buttons = document.querySelectorAll("#goBoard .slot button");
buttons.forEach(button => button.disabled = true);
let firstPlayer = true;
let firstPlayerTurn = true;
let lever = false;
let count = 0;
let secondCount = 0;
const sessionInfo = document.getElementById('sessionCode');
sessionInfo.textContent = "Join Code: " + id;
const resignButton = document.getElementById('endGameButton');
//const drawButton = document.getElementById('drawButton');
const endGamePopup = document.getElementById('endGamePopup');
const closeButton = document.querySelector('.close');
const winnerSpan = document.getElementById('winner');
const totalMovesSpan = document.getElementById('totalMoves');
let previousBoard = null;  
let previousBoardFake = null; 
let firstPlayerBlack = null;
const placeStoneSound = new Audio('stones.mp3');
placeStoneSound.volume = 0.5;
const surroundSound = new Audio('surround.mp3');
surroundSound.volume = 0.5;
const victory = new Audio('victory.mp3');
victory.volume = 0.25;
const boardSize = parseInt(localStorage.getItem('boardSize'));
let isBlack = null;



//class PlayerTimer {
//    constructor(elementId, minutes) {
//        this.duration = minutes * 60 * 1000; // Duration in milliseconds
//        this.element = document.getElementById(elementId);
//        this.startTime = null;
//        this.elapsedTime = 0;
//        this.running = false;
//    }
//
//    start() {
//        if (this.running) {
//            this.pause();
//        }
//        this.running = true;
//        this.startTime = Date.now() - this.elapsedTime;
//        this.interval = setInterval(() => this.update(), 1000);
//    }
//
//    pause() {
//        if (this.running) {
//            clearInterval(this.interval);
//            this.elapsedTime = Date.now() - this.startTime;
//            this.running = false;
//        }
//    }
//
//    reset(minutes) {
//        this.duration = minutes * 60 * 1000;
//        this.elapsedTime = 0;
//        this.updateDisplay();
//    }
//
//    update() {
//      if(!done){
//        const now = Date.now();
//        this.elapsedTime = now - this.startTime;
//        if (this.elapsedTime >= this.duration) {
//            clearInterval(this.interval);
//            if(this.element.id.includes('1')){
//              setDoc(ref, { win: true, resigned: true, resignedPlayerisBlack: !isBlack }, { merge: true });
//              done = true;
//              disable();
//            } else{
//              setDoc(ref, { win: true, resigned: true, resignedPlayerisBlack: isBlack }, { merge: true });
//              done = true;
//              disable();
//                
//                
//            }
//            // Handle game over or disable game controls here
//            this.running = false;
//        } else {
//            this.updateDisplay();
//        }
//      }
//    }
//
//    updateDisplay() {
//        let remaining = this.duration - this.elapsedTime;
//        let minutes = Math.floor(remaining / 60000);
//        let seconds = Math.floor((remaining % 60000) / 1000);
//        this.element.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
//    }
//}




async function gameExists(){
  const docSnapshot = await getDoc(doc(db, "sessions", id));
  if(docSnapshot.exists()){
    return true;
  } else {
    return false;
  }
}
incrementPlayerCount();

var copied = false;

document.addEventListener('DOMContentLoaded', function() {
  var copyButton = document.getElementById('copyButton');

  
  if(!copied){
    copyButton.addEventListener('click', function() {
      const currentUrl = window.location.href; // Gets the current page URL
      navigator.clipboard.writeText(currentUrl).then(function() {
        console.log('URL successfully copied to clipboard');
        // Optionally, display a confirmation message to the user
        copyButton.textContent = 'Copied!';
        copied = true;
      })
      .catch(function(err) {
        console.error('Error in copying URL: ', err);
      });
    });
  }
});



onSnapshot(ref, async (snapshot) => {
  if(playerCount<2){
    if (snapshot.exists()) {
        const docSnapshot = await getDoc(doc(db, "sessions", id));
        playerCount = docSnapshot.data().playerCount;
        initializeGame(); // This will update the game based on the latest data
    }
  }
});



function initializeGame(){
  gameExists().then((exists) => {
    if(exists && playerCount >= 2) {
      const playerInfoElement = document.getElementById('playerInfo');
      playerInfoElement.textContent = "Players: 2/2";
      document.getElementById('turnInfo').textContent = "Black's Turn";
      const boardElement = document.getElementById('goBoard');
      let duplicate = false;    
      let cornerCount = 0;
      isBlack = firstPlayer;
      let board = createBoardArray(boardSize+2); // Made this `let` to allow updates
      let clearCounter = 0;
      let winner = false;
      if(isBlack){
        document.getElementById('player').textContent = "Player: Black";
      }
      else{
        document.getElementById('player').textContent = "Player: White";
      }
      updateEvalBar(50,50);
      blackLive.textContent = "0";
      whiteLive.textContent = '0';
      
      
      
      resignButton.addEventListener('click', async () => {
        const ref = doc(db, "sessions", id);
        setDoc(ref, { win: true, resigned: true, resignedPlayerisBlack: isBlack }, { merge: true });
      });
      
      
      async function playSurroundSound(){
        setDoc(ref, { surroundSound: true }, { merge: true });
      }
      
      
      function updateDynamicStyles(boardSize) {
        const gridSize = boardSize + 2; // Considering additional rows for borders
        const styleElement = document.createElement('style');
        const newDimensionPx = 570 * (boardSize / 19);
        const dim = 570 * boardSize/19;
        const pos = 470 * boardSize/19;
        const wid = 63 * boardSize/19;
        styleElement.innerHTML = `
          #goBoard {
            grid-template-columns: repeat(${gridSize}, 1fr);
            width: ${dim}px;
            height: ${dim}px;
          }
        `;
        document.head.appendChild(styleElement);
      }
      updateDynamicStyles(boardSize);
      
      
      onSnapshot(ref, async (doc) => {
        const data = doc.data();
          placeStoneSound.play();
        if(data.surroundSound){
          surroundSound.play();
          setDoc(ref, { surroundSound: false }, { merge: true });
        }
        
        
//        if(!isBlack){
//          player1Timer.elapsedTime = data.firstTime;
//          player2Timer.elapsedTime = data.secondTime;
//        }
//        else{
//          player2Timer.elapsedTime = data.firstTime;
//          player1Timer.elapsedTime = data.secondTime;
//        }
        
        firstPlayerBlack = data.firstPlayerBlack;
        if(data.firstPlayerBlack){
          if(winCondition()){
            win(board);
          }
          if(!isBlack && count === 0){ //prevents White from making first move
            disable();
          }
          if (data.board) { 
              board = convert(data.board, boardSize+2);
              renderBoard(board, boardElement, firstPlayerBlack); 
              if(firstPlayer){
                disable();
              }
              if(count === 0){
                disable();  
              }

              firstPlayer=!firstPlayer;
              if(!isBlack && count%2===0){ //checks for doubles from second player.
                firstPlayer=!firstPlayer;
//                switchTurn();
              }


              count++;
              updateTurnDisplay();
          }
          if(data.playerCount !== 2 && playerCount === 2){ //playerCount === 2 prevents alert from showing twice for white.
            alert("Opponent has Left!");
            window.location.href = 'index.html';
          }
        }
        else{
          
          if(winCondition()){
            win(board);
          }
          if(!isBlack && count === 0){ //prevents White from making first move
            disable();
            secondCount++;
          }
          if (data.board) { 
              board = convert(data.board, boardSize+2);
              renderBoard(board, boardElement, firstPlayerBlack); 
            
              if(firstPlayer){
                disable();
              }
            
//              switchTurn();
              firstPlayer = !firstPlayer;
              
              if(isBlack && count%4===3){ //checks for doubles from second player.
                firstPlayer=!firstPlayer;
//                switchTurn();
              }

            
              count++;
              updateTurnDisplay();
          }
          if(data.playerCount !== 2 && playerCount === 2){ //playerCount === 2 prevents alert from showing twice for white.
            alert("Opponent has Left!");
            window.location.href = 'index.html';
          }         
        }
        
        
      });
      renderBoard(board, boardElement, firstPlayerBlack);


      
      function winCondition(){
        let emptyCount = 0;
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
              if (board[i][j] === 0){
                emptyCount++;
              }
            }
        }
        if(emptyCount === 0){
          let blackBoard = board.map(row => row.slice());
          for (let i = 0; i < blackBoard.length; i++) {
              for (let j = 0; j < blackBoard[i].length; j++) {
                if(blackBoard[i][j] === 3 || blackBoard[i][j] === 4 || blackBoard[i][j] === 5 || blackBoard[i][j] === 6){
                  blackBoard[i][j] = 2;
                }

              }
          }      
          let whiteBoard = board.map(row => row.slice());          
          for (let i = 0; i < whiteBoard.length; i++) {
              for (let j = 0; j < whiteBoard[i].length; j++) {
                  if(whiteBoard[i][j] === 3 || whiteBoard[i][j] === 4 || whiteBoard[i][j] === 5 || whiteBoard[i][j] === 6){
                    whiteBoard[i][j] = 1;
                  }
              }
          }
          for (let i = 1; i < blackBoard.length-1; i++) {
              for (let j = 1; j < blackBoard[i].length-1; j++) {
                if(!((i === 1 && j === 1) || (i === 1 && j === blackBoard.length-2) || (i === blackBoard.length-2 && j === 1) || (i === blackBoard.length-2 && j === blackBoard.length-2))){
                  if (blackBoard[i][j] === 1 && (blackBoard[i+1][j] === 10 && blackBoard[i-1][j] === 2 && blackBoard[i][j+1] === 2 && blackBoard[i][j-1] === 2)){
                    emptyCount++;
                  }
                  if (blackBoard[i][j] === 1 && (blackBoard[i+1][j] === 2 && blackBoard[i-1][j] === 10 && blackBoard[i][j+1] === 2 && blackBoard[i][j-1] === 2)){
                    emptyCount++; 
                  }
                  if (blackBoard[i][j] === 1 && (blackBoard[i+1][j] === 2 && blackBoard[i-1][j] === 2 && blackBoard[i][j+1] === 10 && blackBoard[i][j-1] === 2)){
                    emptyCount++;
                  }
                  if (blackBoard[i][j] === 1 && (blackBoard[i+1][j] === 2 && blackBoard[i-1][j] === 2 && blackBoard[i][j+1] === 2 && blackBoard[i][j-1] === 10)){
                    emptyCount++; 
                  } 
                }
              }
          }

          for (let i = 1; i < whiteBoard.length-1; i++) {
              for (let j = 1; j < whiteBoard[i].length-1; j++) {
                  if(!((i === 1 && j === 1) || (i === 1 && j === whiteBoard.length-2) || (i === whiteBoard.length-2 && j === 1) || (i === whiteBoard.length-2 && j === whiteBoard.length-2))){
                    if (whiteBoard[i][j] === 2 && (whiteBoard[i+1][j] === 20 && whiteBoard[i-1][j] === 1 && whiteBoard[i][j+1] === 1 && whiteBoard[i][j-1] === 1)){
                      emptyCount++; 
                    }
                    if (whiteBoard[i][j] === 2 && (whiteBoard[i+1][j] === 1 && whiteBoard[i-1][j] === 20 && whiteBoard[i][j+1] === 1 && whiteBoard[i][j-1] === 1)){
                      emptyCount++; 
                    }
                    if (whiteBoard[i][j] === 2 && (whiteBoard[i+1][j] === 1 && whiteBoard[i-1][j] === 1 && whiteBoard[i][j+1] === 20 && whiteBoard[i][j-1] === 1)){
                      emptyCount++; 
                    }
                    if (whiteBoard[i][j] === 2 && (whiteBoard[i+1][j] === 1 && whiteBoard[i-1][j] === 1 && whiteBoard[i][j+1] === 1 && whiteBoard[i][j-1] === 20)){
                      emptyCount++; 
                    }
                  }
              }
          }
          if(emptyCount === 0){
            for (let i = 0; i < board.length; i++) {
                for (let j = 0; j < board[i].length; j++) { 
                  let fakeWhiteCounter = 0;
                  let fakeBlackCounter = 0;
                  let whiteCounter = 0;
                  let blackCounter = 0;
                  let fakeBoardBlack = placeStoneEmulator(i,j, board.map(row => [...row]), true);
                  let fakeBoardWhite = placeStoneEmulator(i,j, board.map(row => [...row]), false);
                  for (let a = 0; a < fakeBoardBlack.length; a++) {
                    for (let b = 0; b < fakeBoardBlack[i].length; b++) {
                      if(fakeBoardBlack[a][b] === 10 || fakeBoardBlack[a][b] === 1){
                        fakeBlackCounter++;
                      }
                      if(board[a][b] === 10 || board[a][b] === 1){
                        blackCounter++;
                      }
                    }
                  }       
                  for (let a = 0; a < fakeBoardWhite.length; a++) {
                    for (let b = 0; b < fakeBoardWhite[i].length; b++) {
                      if(fakeBoardWhite[a][b] === 20 || fakeBoardWhite[a][b] === 2){
                        fakeWhiteCounter++;
                      }
                      if(board[a][b] === 20 || board[a][b] === 2){
                        whiteCounter++;
                      }
                    }
                  }
                  if(fakeBlackCounter>blackCounter+1 || fakeWhiteCounter>whiteCounter+1){
                    emptyCount++;
                  }
                }
            } 
          }
        }
        if(emptyCount >= 1){
          return false;
        }
        else{
          return true;
        }
      }
      
      function placeStoneEmulator(row, col, fakeBoard, black) {
          if (fakeBoard[row][col] === 0 || fakeBoard[row][col] === 10 || fakeBoard[row][col] === 20) {
              let tempBoard = fakeBoard.map(row => [...row]);
              tempBoard[row][col] = black ? 1 : 2;
              let capturedStones = checkAndRemoveSurroundedStonesEmulator(tempBoard, isBlack);
              let visited = new Set(), group = [], emptyTiles = new Set();
              let isSelfCapture = isSurrounded(tempBoard, row, col, tempBoard[row][col], visited, group, emptyTiles) && capturedStones === 0;
//              if (isSelfCapture || areBoardsEqual(tempBoard, previousBoardFake)) {
//                return fakeBoard;
//              }
              previousBoardFake = tempBoard;
              return tempBoard;
            
          }
          return fakeBoard;
      }
      
      function checkAndRemoveSurroundedStonesEmulator(fakeBoard, isBlack) {
        let oppositeColor = isBlack ? 2 : 1;
        for (let i = 0; i < fakeBoard.length; i++) {
            for (let j = 0; j < fakeBoard[i].length; j++) {
                  if (fakeBoard[i][j] === oppositeColor || fakeBoard[i][j] === 0 || fakeBoard[i][j] === 10 || fakeBoard[i][j] === 20) { // Check empty tiles as well
                      let visited = new Set();
                      let emptyTiles = new Set();
                      let group = [];
                      if (isSurrounded(fakeBoard, i, j, oppositeColor, visited, group, emptyTiles)) {
                          group.forEach(([r, c]) => {
                              fakeBoard[r][c] = isBlack ? 10 : 20; // Mark surrounded stones as territory
                          });
                          emptyTiles.forEach((tile) => {
                              const [r, c] = tile.split(",").map(Number);
                              fakeBoard[r][c] = isBlack ? 10 : 20; // Mark empty tiles as territory
                          });


                      }
                    clearEmpty(i, j, fakeBoard);


                  }
            }
        }
        for (let i = 0; i < fakeBoard.length; i++) {
            for (let j = fakeBoard[i].length-1; j >= 0; j--) {
                  if (fakeBoard[i][j] === oppositeColor || fakeBoard[i][j] === 0 || fakeBoard[i][j] === 10 || fakeBoard[i][j] === 20) { // Check empty tiles as well
                      let visited = new Set();
                      let emptyTiles = new Set();
                      let group = [];
                      if (isSurrounded(fakeBoard, i, j, oppositeColor, visited, group, emptyTiles)) {
                          group.forEach(([r, c]) => {
                              fakeBoard[r][c] = isBlack ? 10 : 20; // Mark surrounded stones as territory
                          });
                          emptyTiles.forEach((tile) => {
                              const [r, c] = tile.split(",").map(Number);
                              fakeBoard[r][c] = isBlack ? 10 : 20; // Mark empty tiles as territory
                          });


                      }
                    clearEmpty(i, j, fakeBoard);


                  }
            }
        }
        for (let i = fakeBoard.length-1; i >= 0; i--) {
            for (let j = 0; j < fakeBoard[i].length; j++) {
                  if (fakeBoard[i][j] === oppositeColor || fakeBoard[i][j] === 0 || fakeBoard[i][j] === 10 || fakeBoard[i][j] === 20) { // Check empty tiles as well
                      let visited = new Set();
                      let emptyTiles = new Set();
                      let group = [];
                      if (isSurrounded(fakeBoard, i, j, oppositeColor, visited, group, emptyTiles)) {
                          group.forEach(([r, c]) => {
                              fakeBoard[r][c] = isBlack ? 10 : 20; // Mark surrounded stones as territory
                          });
                          emptyTiles.forEach((tile) => {
                              const [r, c] = tile.split(",").map(Number);
                              fakeBoard[r][c] = isBlack ? 10 : 20; // Mark empty tiles as territory
                          });


                      }
                    clearEmpty(i, j, fakeBoard);


                  }
            }
        }
        for (let i = fakeBoard.length-1; i >= 0; i--) {
            for (let j = fakeBoard[i].length-1; j >= 0; j--) {
                  if (fakeBoard[i][j] === oppositeColor || fakeBoard[i][j] === 0 || fakeBoard[i][j] === 10 || fakeBoard[i][j] === 20) { // Check empty tiles as well
                      let visited = new Set();
                      let emptyTiles = new Set();
                      let group = [];
                      if (isSurrounded(fakeBoard, i, j, oppositeColor, visited, group, emptyTiles)) {
                          group.forEach(([r, c]) => {
                              fakeBoard[r][c] = isBlack ? 10 : 20; // Mark surrounded stones as territory
                          });
                          emptyTiles.forEach((tile) => {
                              const [r, c] = tile.split(",").map(Number);
                              fakeBoard[r][c] = isBlack ? 10 : 20; // Mark empty tiles as territory
                          });


                      }
                    clearEmpty(i, j, fakeBoard);


                  }
            }
        }
      }
      
      
      let redCountFake = 0;
      let blueCountFake = 0;
      let yellowCountFake = 0;
      let greenCountFake = 0;
      let flipCounterFake = 0;
      let pieceCountFake = 0;
      let cornerFake = false;

      function isSurroundedFake(fakeBoard, row, col, color, visited, group, emptyTiles) {
        if(fakeBoard[row][col] === 3){
          redCountfake++;
        }
        if(fakeBoard[row][col] === 4){
          blueCountfake++;
        }
        if(fakeBoard[row][col] === 5){
          yellowCountfake++;
        }
        if(fakeBoard[row][col] === 6){
          greenCountfake++;
        }
        
        if((redCountFake!==0&&blueCountFake!==0&&greenCountFake!==0) || (redCountFake!==0&&blueCountFake!==0&&yellowCountFake!==0) || (yellowCountFake!==0&&blueCountFake!==0&&greenCountFake!==0) || (yellowCountFake!==0&&greenCountFake!==0&&redCountFake!==0)){
          redCountFake = 0;
          blueCountFake = 0;
          yellowCountFake = 0;
          greenCountFake = 0;
          return false;
        }
        
        let key = row + "," + col;
        if (visited.has(key)){
          return true; 
        }
        visited.add(key);
        if (!isValidPos(row, col)){
          return false;
        }   
        if (fakeBoard[row][col] === 0 || fakeBoard[row][col] === 10 || fakeBoard[row][col] === 20) {
          emptyTiles.add(key);
        } else 
        if (fakeBoard[row][col] !== color || fakeBoard[row][col] === 0) {
          return true;
        } 
        else {
          group.push([row, col]);
        }

        const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
        return directions.every(([dRow, dCol]) => {
          return isSurrounded(fakeBoard, row + dRow, col + dCol, color, visited, group, emptyTiles);
        });
        
      }
      
      function isAllowedValue(value) {
        return value === 3 || value === 4 || value === 5 || value === 6;
      }

      function updateTurnDisplay() {
        const turnInfoElement = document.getElementById('turnInfo');
        if (playerCount < 2) {
          turnInfoElement.textContent = 'Waiting for another player...';
        } else {
          if(isBlack && firstPlayer){
            turnInfoElement.textContent = "Black's Turn";
          }
          else if(isBlack && !firstPlayer){
            turnInfoElement.textContent = "White's Turn";
            turnInfoElement.textContent = "Black's Turn";
          }
          else if(!isBlack && firstPlayer){
            turnInfoElement.textContent = "White's Turn";
          }
          const counts = countWhite(board);
          if(isBlack){
            blackLive.textContent = counts[0];
            whiteLive.textContent = counts[1];
          }
          else{
            blackLive.textContent = counts[1];
            whiteLive.textContent = counts[0];
          }
          console.log(counts[1], [counts[0]])
          updateEvalBar(parseInt(counts[0]), parseInt(counts[1]));
        }
      }  

      function createBoardArray(size) {
        let board = [];
        for (let i = 0; i < size; i++) {
          board.push(new Array(size).fill(0));
        }
        for (let i = 0; i < size - 1; i++) {
          board[0][i] = 3;
          board[i][0] = 4;
          board[size - 1][i] = 5;
          board[i][size - 1] = 6;
        }
        board[size-1][size-1] = 6;
        board[0][size-1] = 3;

        return board;
      }

function renderBoard(board, element, firstPlayerBlack) {
    element.innerHTML = ''; // Clear previous state
    const boardSize = board.length - 2; // Adjust for border rows/columns

    // Create horizontal and vertical lines
    for (let i = 1; i <= boardSize; i++) {
        let hLine = document.createElement('div');
        hLine.style.position = 'absolute';
        hLine.style.top = `${30 * i - 11}px`;
        hLine.style.left = '19px';
        hLine.style.right = '0';
        hLine.style.width = `${570 * (boardSize/19) - 24-4}px`;
        hLine.style.height = '2px';
        hLine.style.backgroundColor = '#000';
        element.appendChild(hLine);

        let vLine = document.createElement('div');
        vLine.style.position = 'absolute';
        vLine.style.left = `${30 * i - 11}px`;
        vLine.style.top = '19px';
        vLine.style.bottom = '0';
        vLine.style.width = '2px';
        vLine.style.height = `${570 * (boardSize/19) - 24-4}px`;
        vLine.style.backgroundColor = '#000';
        element.appendChild(vLine);
    }

    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            let cellElement = document.createElement('div');
            cellElement.className = 'slot';
            cellElement.style.position = 'relative'; // Ensure child elements are positioned relative to this

            let button = document.createElement('button');
            button.onclick = () => placeStone(i, j);
            cellElement.appendChild(button);

            if ((board[i][j] === 0 || board[i][j] === 10 || board[i][j] === 20) && !firstPlayer && count !== 0) {
                button.onmouseover = () => {
                    button.classList.add(isBlack ? 'hover-black' : 'hover-white');
                };
                button.onmouseout = () => {
                    button.classList.remove('hover-black', 'hover-white');
                };
            }
            if((board[i][j] === 0) && isBlack && count === 0 && firstPlayerBlack){ //fix initial syncing rendering hover
                button.onmouseover = () => {
                    button.classList.add(isBlack ? 'hover-black' : 'hover-white');
                };
                button.onmouseout = () => {
                    button.classList.remove('hover-black', 'hover-white');
                };
            }
            if((board[i][j] === 0) && isBlack && count === 1 && !firstPlayerBlack){ //fix initial syncing rendering hover
                button.onmouseover = () => {
                    button.classList.add(isBlack ? 'hover-black' : 'hover-white');
                };
                button.onmouseout = () => {
                    button.classList.remove('hover-black', 'hover-white');
                };
            }
            if((board[i][j] === 0) && !isBlack && secondCount === 3 && !firstPlayerBlack){ //fix initial syncing rendering hover
                button.onmouseover = () => {
                    button.classList.add(isBlack ? 'hover-black' : 'hover-white');
                };
                button.onmouseout = () => {
                    button.classList.remove('hover-black', 'hover-white');
                };
            }
          
          

            if (board[i][j] === 1) {
                let stone = document.createElement('div');
                stone.className = 'stone black';
                button.appendChild(stone);
            } else if (board[i][j] === 2) {
                let stone = document.createElement('div');
                stone.className = 'stone white';
                button.appendChild(stone);
            } else if (board[i][j] === 3) {
                let stone = document.createElement('div');
                stone.className = 'stone red';
                button.appendChild(stone);
            } else if (board[i][j] === 4) {
                let stone = document.createElement('div');
                stone.className = 'stone blue';
                button.appendChild(stone);
            } else if (board[i][j] === 5) {
                let stone = document.createElement('div');
                stone.className = 'stone yellow';
                button.appendChild(stone);
            } else if (board[i][j] === 6) {
                let stone = document.createElement('div');
                stone.className = 'stone green';
                button.appendChild(stone);
            }

            element.appendChild(cellElement);
        }
    }
    secondCount++;
    if(isBlack){ //for hover. count doesn't matter for black logic
      count++;
    }
}


      function areBoardsEqual(board1, board2) {
          if (!board1 || !board2) return false; // Ensure both boards are not null
          if (board1.length !== board2.length) return false;
          for (let i = 0; i < board1.length; i++) {
              for (let j = 0; j < board1[i].length; j++) {
                  if (board1[i][j] !== board2[i][j]) return false;
              }
          }
          return true;
      }

      async function placeStone(row, col) {
          if (board[row][col] === 0 || board[row][col] === 10 || board[row][col] === 20) {
              let tempBoard = board.map(row => [...row]);
              tempBoard[row][col] = isBlack ? 1 : 2;
              let capturedStones = checkAndRemoveSurroundedStones(tempBoard, isBlack);
              let visited = new Set(), group = [], emptyTiles = new Set();
              let isSelfCapture = isSurrounded(tempBoard, row, col, tempBoard[row][col], visited, group, emptyTiles) && capturedStones === 0;
              if (isSelfCapture || areBoardsEqual(tempBoard, previousBoard)) {
                  alert("No Duplicate Moves!");
                  return;
              }
              board = tempBoard;
              previousBoard = board.map(row => [...row]);
            
              const flattenedBoard = board.flat();
//              placeStoneSound.play();
            
              let moveStorage = [];
            
              const docSnapshot = await getDoc(doc(db, "sessions", id));
              if(docSnapshot.data().moveStorage !== undefined){
                moveStorage = docSnapshot.data().moveStorage;
              }
              moveStorage.push(row + ";" + col);
            
              console.log(moveStorage);
              try {
                  await setDoc(doc(db, "sessions", id), {
                      board: flattenedBoard,
                      firstPlayer: firstPlayer,
                      win: false,
                      resigned: false,
                      moveStorage: moveStorage,
//                      firstTime: firstTime,
//                      secondTime: secondTime,
                  }, { merge: true });
              } catch (error) {
                  console.error("Error updating document: ", error);
              }
          }
      }
      
      function checkAndRemoveSurroundedStones(board, isBlack) {
          let oppositeColor = isBlack ? 2 : 1;
          for (let i = 0; i < board.length; i++) {
              for (let j = 0; j < board[i].length; j++) {
                    if (board[i][j] === oppositeColor || board[i][j] === 0 || board[i][j] === 10 || board[i][j] === 20) { // Check empty tiles as well
                        let visited = new Set();
                        let emptyTiles = new Set();
                        let group = [];
                        if (isSurrounded(board, i, j, oppositeColor, visited, group, emptyTiles)) {
                            group.forEach(([r, c]) => {
                                surroundSound.play();
                                playSurroundSound();
                                board[r][c] = isBlack ? 10 : 20; // Mark surrounded stones as territory
                            });
                            emptyTiles.forEach((tile) => {
                                const [r, c] = tile.split(",").map(Number);
                                board[r][c] = isBlack ? 10 : 20; // Mark empty tiles as territory
                            });


                        } 
                      clearEmpty(i, j, board);


                    }
              }
          }
          for (let i = board.length-1; i >= 0; i--) {
              for (let j = board.length-1; j >= 0; j--) {
                    if (board[i][j] === oppositeColor || board[i][j] === 0 || board[i][j] === 10 || board[i][j] === 20) { // Check empty tiles as well
                        let visited = new Set();
                        let emptyTiles = new Set();
                        let group = [];
                        if (isSurrounded(board, i, j, oppositeColor, visited, group, emptyTiles)) {
                            group.forEach(([r, c]) => {
                                board[r][c] = isBlack ? 10 : 20; // Mark surrounded stones as territory
                            });
                            emptyTiles.forEach((tile) => {
                                const [r, c] = tile.split(",").map(Number);
                                board[r][c] = isBlack ? 10 : 20; // Mark empty tiles as territory
                            });


                        } 
                      clearEmpty(i, j, board);


                    }
              }
          }
          for (let i = board.length-1; i >= 0; i--) {
              for (let j = 0; j < board.length; j++) {
                    if (board[i][j] === oppositeColor || board[i][j] === 0 || board[i][j] === 10 || board[i][j] === 20) { // Check empty tiles as well
                        let visited = new Set();
                        let emptyTiles = new Set();
                        let group = [];
                        if (isSurrounded(board, i, j, oppositeColor, visited, group, emptyTiles)) {
                            group.forEach(([r, c]) => {
                                board[r][c] = isBlack ? 10 : 20; // Mark surrounded stones as territory
                            });
                            emptyTiles.forEach((tile) => {
                                const [r, c] = tile.split(",").map(Number);
                                board[r][c] = isBlack ? 10 : 20; // Mark empty tiles as territory
                            });


                        } 
                      clearEmpty(i, j, board);


                    }
              }
          }
          for (let i = 0; i < board.length; i++) {
              for (let j = board.length-1; j >= 0; j--) {
                    if (board[i][j] === oppositeColor || board[i][j] === 0 || board[i][j] === 10 || board[i][j] === 20) { // Check empty tiles as well
                        let visited = new Set();
                        let emptyTiles = new Set();
                        let group = [];
                        if (isSurrounded(board, i, j, oppositeColor, visited, group, emptyTiles)) {
                            group.forEach(([r, c]) => {
                                board[r][c] = isBlack ? 10 : 20; // Mark surrounded stones as territory
                            });
                            emptyTiles.forEach((tile) => {
                                const [r, c] = tile.split(",").map(Number);
                                board[r][c] = isBlack ? 10 : 20; // Mark empty tiles as territory
                            });


                        } 
                      clearEmpty(i, j, board);


                    }
              }
          }
        
      }
      
      function clearEmpty(rowIndex, colIndex, board){
          if (board[rowIndex][colIndex] === 10 && (!validPiece(board[rowIndex+1][colIndex]) || !validPiece(board[rowIndex-1][colIndex]) || !validPiece(board[rowIndex][colIndex+1]) || !validPiece(board[rowIndex][colIndex-1]))){
            
            board[rowIndex][colIndex] = 0;
            
            if(board[rowIndex+1][colIndex] === 10){
              clearEmpty(rowIndex+1, colIndex, board);
            }
            if(board[rowIndex-1][colIndex] === 10){
              clearEmpty(rowIndex-1, colIndex, board);
            }
            if(board[rowIndex][colIndex+1] === 10){
              clearEmpty(rowIndex, colIndex+1, board);
            }
            if(board[rowIndex][colIndex-1] === 10){
              clearEmpty(rowIndex, colIndex-1, board);
            }
          }
          if (board[rowIndex][colIndex] === 20 && (!validPieceWhite(board[rowIndex+1][colIndex]) || !validPieceWhite(board[rowIndex-1][colIndex]) || !validPieceWhite(board[rowIndex][colIndex+1]) || !validPieceWhite(board[rowIndex][colIndex-1]))){
            
            board[rowIndex][colIndex] = 0;
            
            if(board[rowIndex+1][colIndex] === 20){
              clearEmpty(rowIndex+1, colIndex, board);
            }
            if(board[rowIndex-1][colIndex] === 20){
              clearEmpty(rowIndex-1, colIndex, board);
            }
            if(board[rowIndex][colIndex+1] === 20){
              clearEmpty(rowIndex, colIndex+1, board);
            }
            if(board[rowIndex][colIndex-1] === 20){
              clearEmpty(rowIndex, colIndex-1, board);
            }
          }
      }
      
      function validPiece(cell){
        return cell === 1 || cell === 10 || cell === 3 || cell === 4 || cell === 5 || cell === 6;
      }
      
      function validPieceWhite(cell){
        return cell === 2 || cell === 20 || cell === 3 || cell === 4 || cell === 5 || cell === 6;
      }
      
      
      let redCount = 0;
      let blueCount = 0;
      let yellowCount = 0;
      let greenCount = 0;
      let flipCounter = 0;
      let pieceCount = 0;
      let corner = false;

      function isSurrounded(board, row, col, color, visited, group, emptyTiles) {
        if(board[row][col] === 3){
          redCount++;
        }
        if(board[row][col] === 4){
          blueCount++;
        }
        if(board[row][col] === 5){
          yellowCount++;
        }
        if(board[row][col] === 6){
          greenCount++;
        }
        
        if((redCount!==0&&blueCount!==0&&greenCount!==0) || (redCount!==0&&blueCount!==0&&yellowCount!==0) || (yellowCount!==0&&blueCount!==0&&greenCount!==0) || (yellowCount!==0&&greenCount!==0&&redCount!==0)){
          redCount = 0;
          blueCount = 0;
          yellowCount = 0;
          greenCount = 0;
          return false;
        }
        
        let key = row + "," + col;
        if (visited.has(key)){
          return true; 
        }
        visited.add(key);
        if (!isValidPos(row, col)){
          return false;
        }   
        if (board[row][col] === 0 || board[row][col] === 10 || board[row][col] === 20) {
          emptyTiles.add(key);
        } else 
        if (board[row][col] !== color || board[row][col] === 0) {
          return true;
        } 
        else {
          group.push([row, col]);
        }

        const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
        return directions.every(([dRow, dCol]) => {
          return isSurrounded(board, row + dRow, col + dCol, color, visited, group, emptyTiles);
        });
        
      }

      function isValidPos(row, col) {
        return row >= 0 && col >= 0 && row < boardSize+2 && col < boardSize+2;
      }
    }
  });
}

window.addEventListener('beforeunload', async function(event) {
  if(playerCount === 2){
    const playerInfoElement = document.getElementById('playerInfo');
    playerInfoElement.textContent = "Players: 1/2";
  }
  const ref = doc(db, "sessions", id);
  setDoc(ref, { playerCount: playerCount - 1 }, { merge: true });
  playerCount = playerCount - 1;
  if(playerCount <= 1) {
    try {
      await deleteDoc(doc(db, "sessions", id));
    } catch(error) {
      console.error("Error deleting document:", error);
    }
  }
});


window.addEventListener('DOMContentLoaded', async function() {
  const docSnapshot = await getDoc(doc(db, "sessions", id));
  const tempPlayerCount = docSnapshot.data().playerCount;
  if (tempPlayerCount >= 2) {
    alert("This Game is Full!");
    window.location.href = 'index.html';
  }
  const boardSize = docSnapshot.data().boardSize; // Access playerCount from the document data
  localStorage.setItem('boardSize', boardSize);
})  

function countWhite(board) {
  let whiteCount = 0;
  let blackCount = 0;
  board.forEach(row => {row.forEach(cell => {
    if (cell === 1 || cell === 10) {
      whiteCount++;
    }
    if (cell === 2 || cell === 20){
      blackCount++;
    }
  });});
  return [blackCount, whiteCount];
}

const snap = await getDoc(doc(db, "sessions", id));
onSnapshot(ref, async (snap) => {
  if (snap.data().win === true) {
    win(convert(snap.data().board, 19));
  }
});

let done = false;

async function win(board){
  const ref = doc(db, "sessions", id);
  setDoc(ref, { win: true }, { merge: true });
  const document = await getDoc(doc(db, "sessions", id));
  endGamePopup.style.display = 'block';
  victory.play();
  done = true;
  disable();
  
  
  
  const storageRef = doc(db, 'size ' + boardSize, id);
  setDoc(storageRef, { storage: document.data().moveStorage }, { merge: true });
  
  if(document.data().resigned === false){
    const counts = countWhite(board);
    blackTerritory.textContent = counts[1];
    whiteTerritory.textContent = counts[0];
    if(counts[1] > counts[0]){
      winnerSpan.textContent = "Black";
    }
    else if(counts[1] < counts[0]){
      winnerSpan.textContent = "White";
    }
    else if(counts[1] === counts[0]){
      winnerSpan.textContent = "Tie";
    }
  }
  else{
    if(document.data().resignedPlayerisBlack === true){
      winnerSpan.textContent = "White"; 
    }
    else{
      winnerSpan.textContent = "Black"; 
    }
    const counts = countWhite(board);
    blackTerritory.textContent = counts[1];
    whiteTerritory.textContent = counts[0];
  }

}

function convert(flatArray, size) {
  let board = [];
  for (let i = 0; i < size; i++) {
    board.push(flatArray.slice(i * size, (i + 1) * size));
  }
  return board;
} 


function disable(){
  document.querySelectorAll("#goBoard .slot button").forEach(button => button.disabled = true);
  let cellElement = document.createElement('div');
  cellElement.className = 'slot';
  let button = document.createElement('button');
  button.onclick = () => placeStone(rowIndex, colIndex);

  button.onmouseover = () => {
      button.classList.remove('hover-black', 'hover-white');
  };
  cellElement.appendChild(button);
}

async function incrementPlayerCount() {
  const snapshot = await getDoc(doc(db, "sessions", id));
  playerCount = snapshot.data().playerCount;
  const ref = doc(db, "sessions", id);
  if(playerCount === 0){
    if(Math.random() < 0.5){
      firstPlayer = firstPlayer;
    }
    else{
      firstPlayer = !firstPlayer;
    }
    setDoc(ref, { playerCount: playerCount + 1, blackChosen: firstPlayer }, { merge: true });
    if(firstPlayer){
      firstPlayerBlack = true;
    }
    else{
      firstPlayerBlack = false;
    }
  }
  if(snapshot.data().playerCount === 1){
    firstPlayer = !snapshot.data().blackChosen;
    
    if(firstPlayer){
      firstPlayerBlack = false;
      setDoc(ref, { playerCount: playerCount + 1, blackChosen: firstPlayer, firstPlayerBlack: false }, { merge: true });
    }
    else{
      firstPlayerBlack = true;
      setDoc(ref, { playerCount: playerCount + 1, blackChosen: firstPlayer, firstPlayerBlack: true }, { merge: true });
    }
  }
  
}

const redirectButton = document.getElementById('redirectButton');
redirectButton.addEventListener('click', () => {
  window.location.href = 'index.html';
});

let toggleClose = false
closeButton.addEventListener('click', () => {
  if (!toggleClose) {
    endGamePopup.style.bottom = '-206px'; // Adjust the percentage as needed
    toggleClose = !toggleClose;
  } else {
    endGamePopup.style.bottom = '40%'; // Reset margin to 0
    toggleClose = !toggleClose;
  }
});
;


function updateEvalBar(whiteTerritory, blackTerritory){
  const totalTerritory = whiteTerritory + blackTerritory;
  const whitePercentage = (whiteTerritory / totalTerritory) * 100;
  const blackPercentage = (blackTerritory / totalTerritory) * 100;
  if(isBlack){
    document.getElementById('whiteTerritoryBar').style.top = `7.5%`;
    document.getElementById('blackTerritoryBar').style.bottom = `7.5%`;
    document.getElementById('whiteLive').style.color = `#fff`;
    document.getElementById('blackLive').style.color = `#262421`;
  }
  else{
    document.getElementById('whiteTerritoryBar').style.bottom = `7.5%`;
    document.getElementById('blackTerritoryBar').style.top = `7.5%`;
    document.getElementById('blackLive').style.color = `#fff`;
    document.getElementById('whiteLive').style.color = `#262421`;
  }

  document.getElementById('whiteTerritoryBar').style.height = `${whitePercentage*0.85}%`;
  document.getElementById('blackTerritoryBar').style.height = `${blackPercentage*0.85}%`;
}



