console.log("MAIN JS STARTED");

// ----------------------
// IMPORTS (MODULE SAFE)
// ----------------------
import { AkinatorEngine } from "./engine/akinatorEngine.js";
import data from "./data/mergeData.js";

// ----------------------
// BOOT ONLY AFTER DOM READY
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM READY");

  // ----------------------
  // INIT ENGINE
  // ----------------------
  const game = new AkinatorEngine(data);

  // ----------------------
  // UI ELEMENTS
  // ----------------------
  const chat = document.getElementById("chat");

  if (!chat) {
    console.error("Missing #chat element in HTML");
    return;
  }

  let currentStep = null;
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
    dots.id = "dots";
    typingBubble.appendChild(dots);

    chat.appendChild(typingBubble);
    chat.scrollTop = chat.scrollHeight;

    animateDots();
  }

  function animateDots() {
    let count = 0;

    const interval = setInterval(() => {
      if (!typingBubble) return clearInterval(interval);

      count = (count + 1) % 4;
      const dots = typingBubble.querySelector("#dots");

      if (dots) dots.innerText = ".".repeat(count);
    }, 400);
  }

  function hideTyping() {
    if (typingBubble) {
      typingBubble.remove();
      typingBubble = null;
    }
  }

  // ----------------------
  // DELAY
  // ----------------------
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // ----------------------
  // GAME START
  // ----------------------
  async function startGame() {
    chat.innerHTML = "";

    addMsg("Think of a Doctor Who character...", "ai");
    addMsg("I will try to guess who you're thinking of.", "ai");

    currentStep = game.nextStep();
    await render(currentStep);
  }

  // ----------------------
  // RENDER STEP
  // ----------------------
  async function render(step) {
    if (!step) return;

    showTyping();
    await wait(500);
    hideTyping();

    if (step.type === "question") {
      addMsg(step.question, "ai");
    }

    if (step.type === "guess") {
      addMsg(`Is it ${step.guess.name}?`, "guess");
    }
  }

  // ----------------------
  // PLAYER ANSWERS
  // ----------------------
  async function answerYes() {
    if (!currentStep) return;

    addMsg("Yes", "user");

    showTyping();
    await wait(600);
    hideTyping();

    currentStep = game.nextStep(true);
    await render(currentStep);
  }

  async function answerNo() {
    if (!currentStep) return;

    addMsg("No", "user");

    showTyping();
    await wait(600);
    hideTyping();

    currentStep = game.nextStep(false);
    await render(currentStep);
  }

  // ----------------------
  // RESET GAME
  // ----------------------
  async function resetGame() {
    game.reset();
    await startGame();
  }

  // ----------------------
  // EXPOSE TO HTML BUTTONS
  // ----------------------
  window.yes = answerYes;
  window.no = answerNo;
  window.reset = resetGame;

  // ----------------------
  // START GAME
  // ----------------------
  startGame();
});
