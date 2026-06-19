export class GuessWhoDoctorWhoEngine {
  constructor(data) {
    // ----------------------------
    // CLEAN DATA
    // ----------------------------
    this.allCharacters = Array.isArray(data)
      ? data
          .filter(c => c && typeof c === "object")
          .map(c => ({
            name: typeof c.name === "string" ? c.name : "Unknown",
            traits: Array.isArray(c.traits) ? c.traits : []
          }))
      : [];

    // ----------------------------
    // GAME STATE
    // ----------------------------
    this.secretCharacter = this.pickDailyCharacter();
    this.guessHistory = [];
    this.activeFilters = new Set();
  }

  // =========================================================
  // DAILY CHARACTER SYSTEM (ONE PUZZLE PER DAY)
  // =========================================================
  getDailyId() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  pickDailyCharacter() {
    if (!this.allCharacters.length) return null;

    const seed = this.getDailyId();
    const hash = this.hashString(seed);

    const index = hash % this.allCharacters.length;

    return this.allCharacters[index];
  }

  reset() {
    this.guessHistory = [];
    this.activeFilters = new Set();
    this.secretCharacter = this.pickDailyCharacter();
  }

  // =========================================================
  // GUESS SYSTEM (SEARCH BAR LIKE YOUR IMAGE)
  // =========================================================
  compareGuess(name) {
    const guess = this.allCharacters.find(
      c => c.name.toLowerCase() === name.toLowerCase()
    );

    if (!guess || !this.secretCharacter) {
      return { error: "Invalid character" };
    }

    const secretTraits = new Set(this.secretCharacter.traits);
    const guessTraits = new Set(guess.traits);

    const matches = [];
    const mismatches = [];
    const missing = [];

    for (const t of guessTraits) {
      if (secretTraits.has(t)) matches.push(t);
      else mismatches.push(t);
    }

    for (const t of secretTraits) {
      if (!guessTraits.has(t)) missing.push(t);
    }

    const correct = guess.name === this.secretCharacter.name;

    const score =
      matches.length / Math.max(secretTraits.size, 1);

    const result = {
      guess: guess.name,
      matches,
      mismatches,
      missing,
      score,
      correct
    };

    this.guessHistory.push(result);

    return result;
  }

  // =========================================================
  // TRAIT FILTER SYSTEM (CORE OF YOUR UI)
  // =========================================================

  toggleTrait(trait) {
    if (this.activeFilters.has(trait)) {
      this.activeFilters.delete(trait);
    } else {
      this.activeFilters.add(trait);
    }
  }

  clearFilters() {
    this.activeFilters.clear();
  }

  getActiveFilters() {
    return [...this.activeFilters];
  }

  // =========================================================
  // FILTERED BOARD (WHAT SHOWS ON SCREEN)
  // =========================================================
  getFilteredCharacters() {
    const filters = [...this.activeFilters];

    if (filters.length === 0) {
      return this.allCharacters;
    }

    return this.allCharacters.filter(c =>
      filters.every(f => c.traits.includes(f))
    );
  }

  // =========================================================
  // CHARACTER STATE (GREEN / RED LOGIC LIKE YOUR IMAGE)
  // =========================================================
  getCharacterState(character) {
    const filters = [...this.activeFilters];

    if (filters.length === 0) return "neutral";

    const hasAll = filters.every(f =>
      character.traits.includes(f)
    );

    return hasAll ? "match" : "eliminated";
  }

  // =========================================================
  // WIN CONDITION CHECK
  // =========================================================
  isCorrectGuess(name) {
    return (
      this.secretCharacter &&
      name.toLowerCase() === this.secretCharacter.name.toLowerCase()
    );
  }

  // =========================================================
  // HINT SYSTEM (OPTIONAL LIKE YOUR IMAGE PANEL)
  // =========================================================
  getHint() {
    if (!this.secretCharacter) return null;

    const traits = this.secretCharacter.traits;
    if (!traits.length) return null;

    return traits[Math.floor(Math.random() * traits.length)];
  }

  // =========================================================
  // UI HELPERS
  // =========================================================
  getCharacters() {
    return this.allCharacters.map(c => c.name);
  }

  getRemainingCount() {
    return this.getFilteredCharacters().length;
  }

  getSecretForDebug() {
    return this.secretCharacter;
  }

  getHistory() {
    return this.guessHistory;
  }
}
