console.log("MAIN JS STARTED");

import { GuessWhoDoctorWhoEngine } from "./engine/guessWhoDoctorWhoEngine.js";
import data from "./data/mergeData.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM READY");

  const game = new GuessWhoDoctorWhoEngine(data);

  const input = document.getElementById("guessInput");
  const submitBtn = document.getElementById("submitGuess");
  const guesses = document.getElementById("guesses");
  const status = document.getElementById("status");
  const suggestions = document.getElementById("suggestions");
  const resetBtn = document.getElementById("resetBtn");

  function titleCase(text) {
    return String(text || "Unknown")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function renderSuggestions() {
    suggestions.innerHTML = "";

    const value = input.value.trim();
    if (!value) return;

    const matches = game.getSuggestions(value);

    matches.forEach(character => {
      const btn = document.createElement("button");
      btn.className = "suggestion";
      btn.textContent = character.name;

      btn.onclick = () => {
        input.value = character.name;
        suggestions.innerHTML = "";
        input.focus();
      };

      suggestions.appendChild(btn);
    });
  }

  function createCard(label, value, state) {
    const card = document.createElement("div");
    card.className = `guess-card ${state}`;

    card.innerHTML = `
      <span class="field-label-mobile">${label}</span>
      <strong>${titleCase(value)}</strong>
    `;

    return card;
  }

  function renderGuess(result) {
    const block = document.createElement("div");
    block.className = "guess-block";

    const row = document.createElement("div");
    row.className = "guess-row";

    result.fields.forEach(field => {
      row.appendChild(
        createCard(field.label, field.guessValue, field.state)
      );
    });

    const traitBox = document.createElement("div");
    traitBox.className = "trait-details";

   traitBox.innerHTML = `
  <strong>Matching traits:</strong>
  ${
    result.matchingTraits.length
      ? result.matchingTraits.map(titleCase).join(", ")
      : "None"
  }
`;

    block.appendChild(row);
    block.appendChild(traitBox);

    guesses.prepend(block);
  }

  function submitGuess() {
    const name = input.value.trim();

    if (!name) {
      setStatus("Type a Doctor Who character first.");
      return;
    }

    const result = game.compareGuess(name);

    if (result.error) {
      setStatus("Character not found. Pick one from the suggestions.");
      return;
    }

    renderGuess(result);

    input.value = "";
    suggestions.innerHTML = "";

    if (result.correct) {
      setStatus(`🎉 Correct! You found today's character in ${game.getGuessCount()} guesses.`);
      input.disabled = true;
      submitBtn.disabled = true;
      return;
    }

    setStatus(`Guess ${game.getGuessCount()} submitted. Keep scanning the vortex.`);
  }

  function resetGame() {
    game.reset();

    guesses.innerHTML = "";
    input.disabled = false;
    submitBtn.disabled = false;
    input.value = "";
    suggestions.innerHTML = "";

    setStatus("Guess today's Doctor Who character.");
    input.focus();
  }

  input.addEventListener("input", renderSuggestions);

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      submitGuess();
    }
  });

  submitBtn.addEventListener("click", submitGuess);
  resetBtn.addEventListener("click", resetGame);

  setStatus("Guess today's Doctor Who character.");
});
