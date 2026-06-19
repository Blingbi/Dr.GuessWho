export class GuessWhoDoctorWhoEngine {
  constructor(data) {
    this.allCharacters = Array.isArray(data)
      ? data
          .filter(c => c && typeof c === "object")
          .map(c => ({
            name: c.name || "Unknown",
            type: c.type || "unknown",
            era: c.era || "unknown",
            gender: c.gender || "unknown",
            mainCompanionOf: c.mainCompanionOf || "",
            traits: Array.isArray(c.traits) ? c.traits : []
          }))
      : [];

    this.secretCharacter = this.pickDailyCharacter();
    this.guessHistory = [];
  }

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

    const hash = this.hashString(this.getDailyId());
    const index = hash % this.allCharacters.length;

    return this.allCharacters[index];
  }

  reset() {
    this.secretCharacter = this.pickDailyCharacter();
    this.guessHistory = [];
  }

  normalizeText(text) {
    return String(text || "").trim().toLowerCase();
  }

  findCharacter(name) {
    const target = this.normalizeText(name);

    return this.allCharacters.find(c =>
      this.normalizeText(c.name) === target
    );
  }

  getCharacters() {
    return this.allCharacters;
  }

  getCharacterNames() {
    return this.allCharacters.map(c => c.name);
  }

  getHistory() {
    return this.guessHistory;
  }

  getGuessCount() {
    return this.guessHistory.length;
  }

  compareField(label, guessValue, secretValue) {
    const guess = this.normalizeText(guessValue);
    const secret = this.normalizeText(secretValue);

    return {
      label,
      guessValue: guessValue || "Unknown",
      state: guess === secret ? "correct" : "incorrect"
    };
  }

  compareGuess(name) {
    const guess = this.findCharacter(name);

    if (!guess || !this.secretCharacter) {
      return {
        error: "Character not found."
      };
    }

    const secret = this.secretCharacter;

    const guessTraits = new Set(guess.traits);
    const secretTraits = new Set(secret.traits);

    const matchingTraits = guess.traits.filter(t => secretTraits.has(t));
    const wrongTraits = guess.traits.filter(t => !secretTraits.has(t));
    const missingTraits = secret.traits.filter(t => !guessTraits.has(t));

    const fields = [
      this.compareField("Character", guess.name, secret.name),
      this.compareField("Type", guess.type, secret.type),
      this.compareField("Era", guess.era, secret.era),
      this.compareField("Gender", guess.gender, secret.gender),
      this.compareField("Main Doctor", guess.mainCompanionOf, secret.mainCompanionOf)
    ];

    const traitScore =
      matchingTraits.length / Math.max(secret.traits.length, 1);

    let traitState = "incorrect";
    if (traitScore >= 0.75) traitState = "correct";
    else if (traitScore > 0) traitState = "partial";

    fields.push({
      label: "Traits",
      guessValue: `${matchingTraits.length} matching`,
      state: traitState
    });

    const correct =
      this.normalizeText(guess.name) === this.normalizeText(secret.name);

    const result = {
      guess,
      correct,
      fields,
      matchingTraits,
      wrongTraits,
      missingTraits,
      score: traitScore
    };

    this.guessHistory.push(result);

    return result;
  }

  getSuggestions(query) {
    const q = this.normalizeText(query);

    if (!q) return [];

    return this.allCharacters
      .filter(c => this.normalizeText(c.name).includes(q))
      .slice(0, 8);
  }

  getSecretForDebug() {
    return this.secretCharacter;
  }
}
