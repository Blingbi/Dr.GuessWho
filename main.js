console.log("MAIN JS STARTED");

// ----------------------
// IMPORTS
// ----------------------
import { GuessWhoDoctorWhoEngine } from "./engine/guessWhoDailyEngine.js";
import data from "./data/mergeData.js";

// ----------------------
// BOOT AFTER DOM READY
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM READY");

  // ----------------------
  // INIT ENGINE (DAILY MODE)
  // ----------------------
  const game = new GuessWhoDoctorWhoEngine(data);

  // ----------------------
  // UI ELEMENTS
  // ----------------------
  const chat = document.getElementById("chat");
  const board = document.getElementById("board"); // <-- ADD THIS IN HTML

  if (!chat) {
    console.error("Missing #chat element");
    return;
  }

  if (!board) {
    console.error("Missing #board element (character grid)");
    return;
  }

  let typingBubble = null;

  // ----------------------
  // CHAT HELPERS
  // ----------------------
  function addMsg(text, type = "ai") {
    const div = document.createElement("div");
    div.className = `msg ${type}`;
    div.innerText = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  // ----------------------
  // TYPING INDICATOR
  // ----------------------
  function showTyping() {
    hideTyping();

    typingBubble = document.createElement("div");
    typingBubble.className = "msg ai";
    typingBubble.innerText = "Thinking";

    const dots = document.createElement("span");
    typingBubble.appendChild(dots);

    chat.appendChild(typingBubble);
    chat.scrollTop = chat.scrollHeight;

    let count = 0;
    const interval = setInterval(() => {
      if (!typingBubble) return clearInterval(interval);

      count = (count + 1) % 4;
      dots.innerText = ".".repeat(count);
    }, 400);
  }

  function hideTyping() {
    if (typingBubble) {
      typingBubble.remove();
      typingBubble = null;
    }
  }

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // ----------------------
  // RENDER BOARD (CHARACTERS)
  // ----------------------
  function renderBoard() {
    board.innerHTML = "";

    const characters = game.getCharacters();

    characters.forEach(name => {
      const btn = document.createElement("button");
      btn.className = "char-btn";
      btn.innerText = name;

      btn.onclick = () => handleGuess(name);

      board.appendChild(btn);
    });
  }

  // ----------------------
  // HANDLE GUESS (CORE GAMEPLAY)
  // ----------------------
  async function handleGuess(name) {
    addMsg(`I guess: ${name}`, "user");

    showTyping();
    await wait(500);
    hideTyping();

    const result = game.compareGuess(name);

    if (result.error) {
      addMsg("Invalid guess.", "ai");
      return;
    }

    // show feedback
    if (result.correct) {
      addMsg(`🎉 Correct! It was ${name}!`, "ai");
      addMsg(`Game complete in ${game.getStatus().guesses + 1} guesses.`, "ai");
      return;
    }

    addMsg(
      `Matches: ${result.matches.join(", ") || "none"}`,
      "ai"
    );

    addMsg(
      `Wrong traits: ${result.mismatches.join(", ") || "none"}`,
      "ai"
    );

    addMsg("Try again 👀", "ai");
  }

  // ----------------------
  // RESET GAME
  // ----------------------
  async function resetGame() {
    game.reset();
    chat.innerHTML = "";
    addMsg("New Daily Doctor Who puzzle started!", "ai");
    renderBoard();
  }

  // ----------------------
  // EXPOSE BUTTONS
  // ----------------------
  window.reset = resetGame;

  // ----------------------
  // START GAME
  // ----------------------
  function startGame() {
    chat.innerHTML = "";

    addMsg("👁 Think of today's Doctor Who target (or just start guessing).", "ai");
    addMsg("Click a character below to make a guess.", "ai");

    renderBoard();
  }

  startGame();
});
