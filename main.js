console.log("MAIN JS STARTED");

import { GuessWhoDoctorWhoEngine } from "./engine/guessWhoDoctorWhoEngine.js";
import data from "./data/mergeData.js";

document.addEventListener("DOMContentLoaded", () => {
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
      };

      suggestions.appendChild(btn);
    });
  }

  function renderGuess(result) {
    const row = document.createElement("div");
    row.className = "guess-row";

    const nameCard = document.createElement("div");
    nameCard.className = result.correct ? "guess-name correct" : "guess-name incorrect";
    nameCard.textContent = result.guess.name;
    row.appendChild(nameCard);

    result.fields.slice(1).forEach(field => {
      const card = document.createElement("div");
      card.className = `result-card ${field.state}`;
      card.innerHTML = `
        <span class="field-label">${field.label}</span>
        <strong>${titleCase(field.guessValue)}</strong>
      `;
      row.appendChild(card);
    });

    guesses.prepend(row);

    const traitBox = document.createElement("div");
    traitBox.className = "trait-details";

    traitBox.innerHTML = `
      <strong>Matching traits:</strong>
      ${result.matchingTraits.length ? result.matchingTraits.map(titleCase).join(", ") : "None"}
    `;

    guesses.prepend(traitBox);
  }

  function submitGuess() {
    const name = input.value.trim();

    if (!name) {
      setStatus("Type a Doctor Who character first.");
      return;
    }

    const result = game.compareGuess(name);

    if (result.error) {
      setStatus("Character not found. Try choosing from the suggestions.");
      return;
    }

    renderGuess(result);
    input.value = "";
    suggestions.innerHTML = "";

    if (result.correct) {
      setStatus(`🎉 Correct! You found today's character in ${game.getGuessCount()} guesses.`);
      input.disabled = true;
      submitBtn.disabled = true;
    } else {
      setStatus(`Guess ${game.getGuessCount()} submitted. Keep scanning the vortex.`);
    }
  }

  function resetGame() {
    game.reset();
    guesses.innerHTML = "";
    input.disabled = false;
    submitBtn.disabled = false;
    input.value = "";
    suggestions.innerHTML = "";
    setStatus("Guess today's Doctor Who character.");
  }

  input.addEventListener("input", renderSuggestions);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") submitGuess();
  });

  submitBtn.addEventListener("click", submitGuess);
  resetBtn.addEventListener("click", resetGame);

  setStatus("Guess today's Doctor Who character.");
});
