export class AkinatorEngine {
  constructor(data) {
    this.allCharacters = data;
    this.candidates = [...data];
    this.askedTraits = new Set();
    this.lastTraitAsked = null;

    this.startCount = data.length;

    // ----------------------------
    // TRAIT INDEX (FAST LOOKUP)
    // ----------------------------
    this.traitIndex = new Map();

    for (const c of data) {
      for (const t of c.traits) {
        if (!this.traitIndex.has(t)) {
          this.traitIndex.set(t, new Set());
        }
        this.traitIndex.get(t).add(c);
      }
    }
  }

  // ----------------------------
  // RESET GAME
  // ----------------------------
  reset() {
    this.candidates = [...this.allCharacters];
    this.askedTraits.clear();
    this.lastTraitAsked = null;
  }

  // ----------------------------
  // DEPTH (how far into game)
  // ----------------------------
  getDepth() {
    const remaining = this.candidates.length;
    const total = this.startCount;
    return 1 - (remaining / total);
  }

  // ----------------------------
  // TRAIT WEIGHTS
  // ----------------------------
  traitWeight(trait) {
    const weights = {
      human: 4,
      alien: 4,
      timelord: 4,
      villain: 5,
      companion: 5,
      doctor: 5,
      male: 3,
      female: 3,

      robotic: 1.2,
      immortal: 1.8,
      timeTraveler: 1.3,

      associatedWithUNIT: 1.2,
      associatedWithTorchwood: 1.2,

      shapeShifter: 1.6,
      hiveMind: 1.6,

      cosmicEntity: 2.2,
      quantumLocked: 2.0,
      memoryWipe: 1.7
    };

    return weights[trait] || 1;
  }

  // ----------------------------
  // SPLIT BY TRAIT (FAST VERSION)
  // ----------------------------
  splitByTrait(trait) {
    const yesSet = this.traitIndex.get(trait) || new Set();

    const yes = [];
    const no = [];

    for (const c of this.candidates) {
      if (yesSet.has(c)) yes.push(c);
      else no.push(c);
    }

    return { yes, no };
  }

  // ----------------------------
  // ENTROPY (FIXED)
  // ----------------------------
  informationGain(trait) {
    const total = this.candidates.length;
    if (total <= 1) return 0;

    const { yes, no } = this.splitByTrait(trait);

    const entropy = (arr) => {
      const p = arr.length / total;
      if (p === 0) return 0;
      return -p * Math.log2(p);
    };

    const before = Math.log2(total);
    const after = entropy(yes) + entropy(no);

    return before - after;
  }

  // ----------------------------
  // GET ALL POSSIBLE TRAITS
  // ----------------------------
  getAllTraits() {
    const set = new Set();

    for (const c of this.candidates) {
      for (const t of c.traits) {
        if (!this.askedTraits.has(t)) {
          set.add(t);
        }
      }
    }

    return [...set];
  }

  // ----------------------------
  // BEST QUESTION SELECTION
  // ----------------------------
  getBestTrait() {
    const traits = this.getAllTraits();

    let bestTrait = null;
    let bestScore = -Infinity;

    const depth = this.getDepth();

    for (const trait of traits) {
      const ig = this.informationGain(trait);
      const weight = this.traitWeight(trait);

      const depthPenalty = 1 - depth * 0.5;

      // softened weighting (IMPORTANT FIX)
      const score = ig * (1 + Math.log(weight)) * depthPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestTrait = trait;
      }
    }

    return bestTrait;
  }

  // ----------------------------
  // FILTER BY ANSWER
  // ----------------------------
  filterByTrait(trait, answer) {
    this.askedTraits.add(trait);

    if (answer) {
      this.candidates = this.candidates.filter(c =>
        c.traits.includes(trait)
      );
    } else {
      this.candidates = this.candidates.filter(c =>
        !c.traits.includes(trait)
      );
    }
  }

  // ----------------------------
  // CONFIDENCE MODEL (IMPROVED)
  // ----------------------------
  calculateCandidateScore(candidate) {
    let score = 1;

    for (const trait of this.askedTraits) {
      score *= candidate.traits.includes(trait) ? 0.75 : 0.25;
    }

    return score;
  }

  getProbabilities() {
    const scores = this.candidates.map(c => ({
      character: c,
      score: this.calculateCandidateScore(c)
    }));

    const total = scores.reduce((sum, s) => sum + s.score, 0);

    return scores.map(s => ({
      character: s.character,
      probability: total === 0 ? 0 : s.score / total
    }));
  }

  // ----------------------------
  // GUESS LOGIC
  // ----------------------------
  shouldGuess() {
    const probs = this.getProbabilities();

    if (probs.length === 0) return false;

    const best = probs.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    return (
      best.probability > 0.92 ||
      this.candidates.length <= 3
    );
  }

  guess() {
    const probs = this.getProbabilities();

    if (probs.length === 0) return null;

    return probs.reduce((a, b) =>
      a.probability > b.probability ? a : b
    ).character;
  }

  // ----------------------------
  // QUESTION FORMATTER
  // ----------------------------
  formatQuestion(trait) {
    const map = {
      human: "Is this character human?",
      alien: "Is this character an alien?",
      timelord: "Is this a Time Lord?",
      doctor: "Is this character one of the Doctors?",
      companion: "Is this character a companion?",
      villain: "Is this character a villain?",

      male: "Is the character male?",
      female: "Is the character female?",

      robotic: "Is this character robotic?",
      immortal: "Is this character immortal?",
      shapeShifter: "Can this character change appearance?",
      hiveMind: "Is this character part of a hive mind?",
      quantumLocked: "Is this character quantum locked?",

      associatedWithUNIT: "Is this character associated with UNIT?",
      associatedWithTorchwood: "Is this character associated with Torchwood?"
    };

    return map[trait] || `Does this character have trait: ${trait}?`;
  }

  // ----------------------------
  // MAIN GAME LOOP
  // ----------------------------
  nextStep(answer = null) {
    if (this.lastTraitAsked) {
      this.filterByTrait(this.lastTraitAsked, answer);
    }

    if (this.shouldGuess()) {
      return {
        type: "guess",
        guess: this.guess(),
        remaining: this.candidates
      };
    }

    const nextTrait = this.getBestTrait();

    if (!nextTrait || this.candidates.length === 0) {
      return {
        type: "guess",
        guess: this.guess(),
        remaining: this.candidates
      };
    }

    this.lastTraitAsked = nextTrait;

    return {
      type: "question",
      trait: nextTrait,
      question: this.formatQuestion(nextTrait),
      remainingCount: this.candidates.length
    };
  }
}
