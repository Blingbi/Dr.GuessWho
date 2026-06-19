export class AkinatorEngine {
  constructor(data) {
    this.allCharacters = data;
    this.candidates = [...data];
    this.askedTraits = new Set();
    this.lastTraitAsked = null;

    this.startCount = data.length;

    this.traitFrequency = new Map();

    for (const c of data) {
      for (const t of c.traits) {
        this.traitFrequency.set(t, (this.traitFrequency.get(t) || 0) + 1);
      }
    }
    getPhase() {
      const remaining = this.candidates.length;
    
      if (remaining > 25) return "early";
      if (remaining > 6) return "mid";
      return "end";
    }
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
  const baseWeights = {
    villain: 5,
    companion: 5,
    doctor: 5,

    human: 3,
    alien: 3,

    timelord: 3.5,
    immortal: 2,

    male: 2,
    female: 2
  };

  const base = baseWeights[trait] || 1;

  const freq = this.traitFrequency.get(trait) || 1;
  const rarityBoost = 1 / Math.log2(freq + 1);

  return base * (1 + rarityBoost);
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
  isBadTraitSplit(trait) {
  const { yes, no } = this.splitByTrait(trait);

  const ratio = yes.length / (no.length + 1);

  return ratio < 0.15 || ratio > 0.85;
}

  // ----------------------------
  // ENTROPY (FIXED)
  // ----------------------------
informationGain(trait) {
  const total = this.candidates.length;
  if (total <= 1) return 0;

  let yes = 0;

  for (const c of this.candidates) {
    if (c.traits.includes(trait)) yes++;
  }

  const no = total - yes;

  if (yes === 0 || no === 0) return 0;

  const pYes = yes / total;
  const pNo = no / total;

  const entropyBefore = Math.log2(total);
  const entropyAfter =
    -pYes * Math.log2(pYes) -
    -pNo * Math.log2(pNo);

  return entropyBefore - entropyAfter;
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

  const phase = this.getPhase();

for (const trait of traits) {
  if (this.isBadTraitSplit(trait)) continue;

  const ig = this.informationGain(trait);
  const weight = this.traitWeight(trait);

  let phaseBoost = 1;

  if (phase === "early") {
    // prefer broad splits
    phaseBoost = 1.2;
  }

  if (phase === "mid") {
    // balanced selection
    phaseBoost = 1.0;
  }

  if (phase === "end") {
    // favor rare / precise traits
    phaseBoost = 1.4;
  }

  const depthPenalty = 1 - this.getDepth() * 0.5;

  const score =
    ig *
    (1 + Math.log(weight)) *
    phaseBoost *
    depthPenalty;

  if (score > bestScore) {
    bestScore = score;
    bestTrait = trait;
  }
}
if (!bestTrait) {
  return this.getFallbackTrait();
}
    return bestTrait;
  }
getFallbackTrait() {
  const traits = this.getAllTraits();

  let bestTrait = null;
  let bestSplitScore = -Infinity;

  for (const trait of traits) {
    const { yes, no } = this.splitByTrait(trait);

    const split = Math.min(yes.length, no.length);

    if (split > bestSplitScore) {
      bestSplitScore = split;
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

  const phase = this.getPhase();

  if (phase === "early") return false;

  if (phase === "mid") {
    return best.probability > 0.95 || this.candidates.length <= 2;
  }

  // end game
  return best.probability > 0.85 || this.candidates.length <= 2;
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
