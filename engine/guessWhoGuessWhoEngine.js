export class GuessWhoDoctorWhoEngine {
  constructor(data) {
    // ----------------------------
    // CLEAN INPUT DATA
    // ----------------------------
    this.allCharacters = Array.isArray(data)
      ? data
          .filter(c => c && typeof c === "object")
          .map(c => ({
            name: typeof c.name === "string" ? c.name : "Unknown",
            traits: Array.isArray(c.traits) ? c.traits : []
          }))
      : [];

    this.guessHistory = [];

    // DAILY SECRET CHARACTER
    this.secretCharacter = this.pickDailyCharacter();
  }

  // ----------------------------
  // DATE BASED DAILY SEED
  // ----------------------------
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

    const seedStr = this.getDailyId();
    const hash = this.hashString(seedStr);

    const index = hash % this.allCharacters.length;

    return this.allCharacters[index];
  }

  // ----------------------------
  // RESET (DOES NOT CHANGE DAILY ANSWER)
  // ----------------------------
  reset() {
    this.guessHistory = [];
    this.secretCharacter = this.pickDailyCharacter();
  }

  // ----------------------------
  // CORE GAME LOGIC
  // ----------------------------
  compareGuess(guessName) {
    const guess = this.allCharacters.find(
      c => c.name === guessName
    );

    if (!guess || !this.secretCharacter) {
      return {
        error: "Invalid guess or missing character."
      };
    }

    const secretTraits = new Set(this.secretCharacter.traits);
    const guessTraits = new Set(guess.traits);

    const matches = [];
    const mismatches = [];
    const missing = [];

    // traits guessed correctly
    for (const t of guessTraits) {
      if (secretTraits.has(t)) {
        matches.push(t);
      } else {
        mismatches.push(t);
      }
    }

    // traits secret has but guess doesn't
    for (const t of secretTraits) {
      if (!guessTraits.has(t)) {
        missing.push(t);
      }
    }

    const score =
      matches.length / Math.max(secretTraits.size, 1);

    const correct = guess.name === this.secretCharacter.name;

    this.guessHistory.push({
      guess: guess.name,
      matches,
      mismatches,
      missing,
      score
    });

    return {
      guess: guess.name,
      matches,
      mismatches,
      missing,
      score,
      correct
    };
  }

  // ----------------------------
  // HINT SYSTEM
  // ----------------------------
  getHint() {
    if (!this.secretCharacter) return null;

    const traits = this.secretCharacter.traits;
    if (!traits.length) return null;

    return traits[Math.floor(Math.random() * traits.length)];
  }

  // ----------------------------
  // LIST CHARACTERS (FOR UI)
  // ----------------------------
  getCharacters() {
    return this.allCharacters.map(c => c.name);
  }

  // ----------------------------
  // GAME STATUS
  // ----------------------------
  getStatus() {
    return {
      guesses: this.guessHistory.length,
      lastGuess: this.guessHistory[this.guessHistory.length - 1] || null
    };
  }

  // ----------------------------
  // DEBUG ONLY (REMOVE IN PROD)
  // ----------------------------
  reveal() {
    return this.secretCharacter;
  }
}
