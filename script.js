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
let firstPlayer = false;
let firstPlayerTurn = true;
let lever = false;
let count = 0;
let secondCount = 0;
const sessionInfo = document.getElementById('sessionCode');
sessionInfo.textContent = "Join Code: " + id;
const resignButton = document.getElementById('endGameButton');
const endGamePopup = document.getElementById('endGamePopup');
const closeButton = document.querySelector('.close');
const winnerSpan = document.getElementById('winner');
const totalMovesSpan = document.getElementById('totalMoves');

async function gameExists(){
  const docSnapshot = await getDoc(doc(db, "sessions", id));
  if(docSnapshot.exists()){
    return true;
  } else {
    return false;
  }
}
incrementPlayerCount();


onSnapshot(ref, async (snapshot) => {
  if(playerCount<2){
    if (snapshot.exists()) {
        const docSnapshot = await getDoc(doc(db, "sessions", id));
        playerCount = docSnapshot.data().playerCount;
        initializeGame(); // This will update the game based on the latest data
    } else {
    }
  }
});


function initializeGame(){
  gameExists().then((exists) => {
    if(exists && playerCount >= 2) {
      const playerInfoElement = document.getElementById('playerInfo');
      playerInfoElement.textContent = "Players: 2/2";
      const boardSize = parseInt(localStorage.getItem('boardSize'));
      document.getElementById('turnInfo').textContent = "Black's Turn";
      let board = createBoardArray(boardSize+2); // Made this `let` to allow updates
      const boardElement = document.getElementById('goBoard');
      let duplicate = false;    
      let cornerCount = 0;
      let previousBoard = null;  
      let previousBoardFake = null;  
      let isBlack = !firstPlayer;
      
      resignButton.addEventListener('click', async () => {
        const ref = doc(db, "sessions", id);
        setDoc(ref, { win: true, resigned: true, resignedPlayerisBlack: isBlack }, { merge: true });
        const docSnapshot = await getDoc(doc(db, "sessions", id));
        win(convert(docSnapshot.data().board, 19));
      });
      
      
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
        
        if(!isBlack && count === 0){
          disable();
        }
        if (data && data.board) {
            board = convert(data.board, boardSize+2);
            renderBoard(board, boardElement);
            if(firstPlayer){
              disable();
            }
          
          
            if(count === 0){
              disable();  
              firstPlayer=!firstPlayer;
            }
            firstPlayer=!firstPlayer;
            if(!isBlack && count%2===0){
              firstPlayer=!firstPlayer;
            }
            count++;
            updateTurnDisplay();
        }
        if(data.playerCount !== 2 && playerCount === 2){
          alert("Opponent has Left!");
          window.location.href = 'index.html';
        }
        if(winCondition()){
          win(board);
        }
      });
      renderBoard(board, boardElement);
      
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
                    if(fakeBoardBlack[a][b] === 10){
                      fakeBlackCounter++;
                    }
                    if(board[a][b] === 10){
                      blackCounter++;
                    }
                  }
                }       
                for (let a = 0; a < fakeBoardWhite.length; a++) {
                  for (let b = 0; b < fakeBoardWhite[i].length; b++) {
                    if(fakeBoardWhite[a][b] === 20){
                      fakeWhiteCounter++;
                    }
                    if(board[a][b] === 20){
                      whiteCounter++;
                    }
                  }
                }
                if(fakeBlackCounter>blackCounter || fakeWhiteCounter>whiteCounter){
                  emptyCount++;
                }
              }
          } 
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
                  if (blackBoard[i][j] === 1 && (blackBoard[i+1][j] === 20 && blackBoard[i-1][j] === 2 && blackBoard[i][j+1] === 2 && blackBoard[i][j-1] === 2)){
                    emptyCount++;
                  }
                  if (blackBoard[i][j] === 1 && (blackBoard[i+1][j] === 2 && blackBoard[i-1][j] === 20 && blackBoard[i][j+1] === 2 && blackBoard[i][j-1] === 2)){
                    emptyCount++; 
                  }
                  if (blackBoard[i][j] === 1 && (blackBoard[i+1][j] === 2 && blackBoard[i-1][j] === 2 && blackBoard[i][j+1] === 20 && blackBoard[i][j-1] === 2)){
                    emptyCount++;
                  }
                  if (blackBoard[i][j] === 1 && (blackBoard[i+1][j] === 2 && blackBoard[i-1][j] === 2 && blackBoard[i][j+1] === 2 && blackBoard[i][j-1] === 20)){
                    emptyCount++; 
                  } 
                }
              }
          }

          for (let i = 1; i < whiteBoard.length-1; i++) {
              for (let j = 1; j < whiteBoard[i].length-1; j++) {
                  if(!((i === 1 && j === 1) || (i === 1 && j === whiteBoard.length-2) || (i === whiteBoard.length-2 && j === 1) || (i === whiteBoard.length-2 && j === whiteBoard.length-2))){
                    if (whiteBoard[i][j] === 2 && (whiteBoard[i+1][j] === 10 && whiteBoard[i-1][j] === 1 && whiteBoard[i][j+1] === 1 && whiteBoard[i][j-1] === 1)){
                      emptyCount++; 
                    }
                    if (whiteBoard[i][j] === 2 && (whiteBoard[i+1][j] === 1 && whiteBoard[i-1][j] === 10 && whiteBoard[i][j+1] === 1 && whiteBoard[i][j-1] === 1)){
                      emptyCount++; 
                    }
                    if (whiteBoard[i][j] === 2 && (whiteBoard[i+1][j] === 1 && whiteBoard[i-1][j] === 1 && whiteBoard[i][j+1] === 10 && whiteBoard[i][j-1] === 1)){
                      emptyCount++; 
                    }
                    if (whiteBoard[i][j] === 2 && (whiteBoard[i+1][j] === 1 && whiteBoard[i-1][j] === 1 && whiteBoard[i][j+1] === 1 && whiteBoard[i][j-1] === 10)){
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
              tempBoard[row][col] = black ? 2 : 1;
              let capturedStones = checkAndRemoveSurroundedStones(tempBoard, isBlack);
              let visited = new Set(), group = [], emptyTiles = new Set();
              let isSelfCapture = isSurrounded(tempBoard, row, col, tempBoard[row][col], visited, group, emptyTiles) && capturedStones === 0;
              if (isSelfCapture || areBoardsEqual(tempBoard, previousBoardFake)) {
                return fakeBoard;
              }
              previousBoardFake = tempBoard;
              return tempBoard;
            
          }
          return fakeBoard;
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
          }
          else if(!isBlack && !firstPlayer){
            turnInfoElement.textContent = "Black's Turn";
          }
          else if(!isBlack && firstPlayer){
            turnInfoElement.textContent = "White's Turn";
          }
          const counts = countWhite(board);
          blackLive.textContent = counts[1];
          whiteLive.textContent = counts[0];
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
        return board;
      }

function renderBoard(board, element) {
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

    board.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            let cellElement = document.createElement('div');
            cellElement.className = 'slot';
            cellElement.style.position = 'relative'; // Ensure child elements are positioned relative to this

            let button = document.createElement('button');
            button.onclick = () => placeStone(rowIndex, colIndex);
            cellElement.appendChild(button);

            if ((cell === 0 || cell === 10 || cell === 20) && !firstPlayer) {
                button.onmouseover = () => {
                    button.classList.add(isBlack ? 'hover-black' : 'hover-white');
                };
                button.onmouseout = () => {
                    button.classList.remove('hover-black', 'hover-white');
                };
            }

            if (cell === 1) {
                let stone = document.createElement('div');
                stone.className = 'stone white';
                button.appendChild(stone);
            } else if (cell === 2) {
                let stone = document.createElement('div');
                stone.className = 'stone black';
                button.appendChild(stone);
            }

            element.appendChild(cellElement);
        });
    });
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
              tempBoard[row][col] = isBlack ? 2 : 1;
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
              try {
                  await setDoc(doc(db, "sessions", id), {
                      board: flattenedBoard,
                      firstPlayer: firstPlayer,
                      win: false,
                      resigned: false,
                  }, { merge: true });
              } catch (error) {
                  console.error("Error updating document: ", error);
              }
          }
      }
      
      function checkAndRemoveSurroundedStones(board, isBlack) {
          let oppositeColor = isBlack ? 1 : 2;

          // Iterate through the entire board
          board.forEach((row, rowIndex) => {
              row.forEach((cell, colIndex) => {
                  if (cell === oppositeColor || cell === 0) { // Check empty tiles as well
                      let visited = new Set();
                      let emptyTiles = new Set();
                      let group = [];
                      if (isSurrounded(board, rowIndex, colIndex, oppositeColor, visited, group, emptyTiles)) {
                          group.forEach(([r, c]) => {
                              board[r][c] = isBlack ? 10 : 20; // Mark surrounded stones as territory
                          });
                          emptyTiles.forEach((tile) => {
                              const [r, c] = tile.split(",").map(Number);
                              board[r][c] = isBlack ? 10 : 20; // Mark empty tiles as territory
                          });
                      }
                  }
              });
          });
      }

      let redCount = 0;
      let blueCount = 0;
      let yellowCount = 0;
      let greenCount = 0;

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
        
        if((redCount!==0&&blueCount!==0&&greenCount!==0) || (redCount!==0&&blueCount!==0&&yellowCount!==0) || (yellowCount!==0&&blueCount!==0&&greenCount!==0) || (yellowCount!==0&&greenCount!==0&&redCount!==0) || (redCount!==0 && blueCount!==0) || (redCount!==0 && greenCount!==0) || (greenCount!==0&&yellowCount!==0) ||(yellowCount!==0 && blueCount!==0)){
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
        } else {
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
    if (cell === 2 || cell === 10) {
      whiteCount++;
    }
    if (cell === 1 || cell === 20){
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

async function win(board){
  const ref = doc(db, "sessions", id);
  setDoc(ref, { win: true }, { merge: true });
  const document = await getDoc(doc(db, "sessions", id));
  endGamePopup.style.display = 'block';
  
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
  if(playerCount === 1){
    firstPlayer = true;
  }
  if(playerCount === 2){
    firstPlayer = false;
  }
  const ref = doc(db, "sessions", id);
  setDoc(ref, { playerCount: playerCount + 1 }, { merge: true });
}

const redirectButton = document.getElementById('redirectButton');
redirectButton.addEventListener('click', () => {
  window.location.href = 'index.html';
});

let toggleClose = false
closeButton.addEventListener('click', () => {
  if(!toggleClose){
    endGamePopup.style.marginTop = '50px'; // Moves the popup 100px to the right
    toggleClose = !toggleClose;
  }
  else{
    endGamePopup.style.marginTop = '0px'; // Moves the popup 100px to the right
    toggleClose = !toggleClose; 
  }
});

