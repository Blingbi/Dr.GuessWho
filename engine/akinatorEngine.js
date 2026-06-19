export class AkinatorEngine {
  constructor(data) {
    this.allCharacters = data;
    this.candidates = [...data];
    this.askedTraits = new Set();
    this.lastTraitAsked = null;

    this.startCount = data.length;
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
  // TRAIT WEIGHTS (importance tuning)
  // ----------------------------
  traitWeight(trait) {
    const weights = {
      human: 1,
      alien: 1,
      timelord: 1,
      villain: 1,
      companion: 1,
      doctor: 1,

      robotic: 1.1,
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
  // ENTROPY (true information gain)
  // ----------------------------
  splitByTrait(trait) {
    const yes = [];
    const no = [];

    for (const c of this.candidates) {
      if (c.traits.includes(trait)) yes.push(c);
      else no.push(c);
    }

    return { yes, no };
  }

  informationGain(trait) {
    const total = this.candidates.length;
    if (total <= 1) return 0;

    const { yes, no } = this.splitByTrait(trait);

    const pYes = yes.length / total;
    const pNo = no.length / total;

    const before = Math.log2(total);

    const after =
      pYes * Math.log2(yes.length || 1) +
      pNo * Math.log2(no.length || 1);

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

      // depth penalty: early game avoids deep traits
      const depthPenalty = 1 - depth * 0.5;

      const score = ig * weight * depthPenalty;

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
  // CONFIDENCE SYSTEM
  // ----------------------------
  calculateCandidateScore(candidate) {
    let score = 1;

    for (const trait of this.askedTraits) {
      if (candidate.traits.includes(trait)) {
        score *= 1.2;
      } else {
        score *= 0.8;
      }
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
      probability: s.score / total
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

    return best.probability > 0.75 || this.candidates.length <= 1;
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

  classicWho: "Did this character first appear in Classic Doctor Who?",
  newWho: "Did this character first appear in Modern Doctor Who?",

  travelsInTardis: "Did this character travel in the TARDIS?",
  teacher: "Is this character a teacher?",
  genius: "Is this character considered a genius?",
  military: "Does this character have a military background?",
  scientist: "Is this character a scientist?",

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

    if (!nextTrait) {
      return {
        type: "guess",
        guess: this.guess(),
        remaining: this.canidates
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
