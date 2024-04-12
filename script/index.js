import { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot} from "https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-app.js";
import { GoogleAuthProvider, getAuth } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js";
import { firebaseConfig } from '/js/config.js';

const app = initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();
const auth = getAuth(app);
const db = getFirestore(app); 
auth.languageCode = 'en'; 

// Keep the existing "Create Game" button functionality as is
document.getElementById("createGameBtn").addEventListener("click", async function() {
  const boardSize = prompt("Enter Board Size:");
  
  if(boardSize === null || boardSize.trim() === "") {
    // If the user pressed "Cancel" or entered an empty string, do nothing and return early
    return;
  }
  
  const id = (Math.floor(Math.random() * 900000) + 100000).toString(); // Convert to string
  const newDocRef = doc(db, "sessions", id); 
  localStorage.setItem('boardSize', boardSize);
  const setResult = await setDoc(newDocRef, {
    boardSize: boardSize,
    playerCount: 0,
  });
  
  window.location.href = "game.html?id=" + id;
  
});

document.getElementById("joinGameBtn").addEventListener("click", async function() {
  const sessionCode = prompt("Please enter the 6 character session code:");

  if(sessionCode === null) {
    return;
  }

  const docRef = doc(db, "sessions", sessionCode); // Rename doc to docRef to avoid conflict
  const docSnapshot = await getDoc(docRef);
  
  if (docSnapshot.exists()) { // Use docSnapshot instead of doc for exists function
    // Redirect to game.html with the provided session ID
    window.location.href = "game.html?id=" + sessionCode;
  } else {
    // If input is invalid, alert the user and don't redirect
    alert("Invalid session code. Please enter a 6 character numerical code.");
  }
});


//sessionCode.length === 6 && !isNaN(sessionCode