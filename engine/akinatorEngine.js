export class AkinatorEngine {
 constructor(data) {
  // ----------------------------
  // CLEAN INPUT DATA
  // ----------------------------
  this.allCharacters = Array.isArray(data)
    ? data
        .filter(c => c && typeof c === "object")
        .map(c => ({
          ...c,
          name: typeof c.name === "string" ? c.name : "Unknown",
          traits: Array.isArray(c.traits)
            ? c.traits.filter(t => typeof t === "string")
            : []
        }))
    : [];

  this.candidates = [...this.allCharacters];
  this.askedTraits = new Set();
  this.lastTraitAsked = null;

  this.startCount = this.allCharacters.length;

  // ----------------------------
  // TRAIT FREQUENCY MAP
  // ----------------------------
  this.traitFrequency = new Map();

  for (const c of this.allCharacters) {
    const traits = Array.isArray(c?.traits) ? c.traits : [];

    for (const t of traits) {
      this.traitFrequency.set(
        t,
        (this.traitFrequency.get(t) || 0) + 1
      );
    }
  }

  // ----------------------------
  // TRAIT INDEX
  // ----------------------------
  this.traitIndex = new Map();

  for (const c of this.allCharacters) {
    const traits = Array.isArray(c?.traits) ? c.traits : [];

    for (const t of traits) {
      if (!this.traitIndex.has(t)) {
        this.traitIndex.set(t, new Set());
      }

      this.traitIndex.get(t).add(c.name);
    }
  }

  // ----------------------------
  // DEBUG OUTPUT
  // ----------------------------
  console.log(
    "Akinator loaded",
    this.allCharacters.length,
    "characters"
  );

  const badCharacters = this.allCharacters.filter(
    c => !Array.isArray(c.traits)
  );

  if (badCharacters.length) {
    console.warn("Bad characters found:", badCharacters);
  }
}

  // ----------------------------
  // GAME PHASE
  // ----------------------------
  getPhase() {
    const remaining = this.candidates.length;

    if (remaining > 25) return "early";
    if (remaining > 6) return "mid";
    return "end";
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
  // DEPTH
  // ----------------------------
  getDepth() {
    return 1 - (this.candidates.length / this.startCount);
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
  // SPLIT BY TRAIT
  // ----------------------------
  splitByTrait(trait) {
    const yesSet = this.traitIndex.get(trait) || new Set();

    const yes = [];
    const no = [];

    for (const c of this.candidates) {
      if (yesSet.has(c.name)) yes.push(c);
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
  // INFORMATION GAIN
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
      pNo * Math.log2(pNo);

    return entropyBefore - entropyAfter;
  }

  // ----------------------------
  // ALL TRAITS
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
  // BEST TRAIT
  // ----------------------------
  getBestTrait() {
    const traits = this.getAllTraits();

    let bestTrait = null;
    let bestScore = -Infinity;

    const phase = this.getPhase();

   for (const trait of traits) {
  // Skip traits that don't have a human-readable question
      if (!this.formatQuestion(trait)) continue;
    
      if (this.isBadTraitSplit(trait)) continue;
    
      const ig = this.informationGain(trait);
      const weight = this.traitWeight(trait);

      let phaseBoost = 1;

      if (phase === "early") phaseBoost = 1.2;
      if (phase === "end") phaseBoost = 1.4;

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

    return bestTrait || this.getFallbackTrait();
  }

  // ----------------------------
  // FALLBACK TRAIT
  // ----------------------------
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
  // FILTER
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
  // PROBABILITY MODEL
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
  // QUESTION FORMAT
  // ----------------------------
  formatQuestion(trait) {
    const map = {
    const map = {
  // Core
  doctor: "Is this character one of the Doctors?",
  companion: "Is this character a companion?",
  villain: "Is this character a villain?",

  // Species
  human: "Is this character human?",
  alien: "Is this character an alien?",
  timelord: "Is this character a Time Lord?",
  immortal: "Is this character immortal?",
  robotic: "Is this character robotic?",

  // Gender
  male: "Is the character male?",
  female: "Is the character female?",

  // Era
  classicEra: "Is this character primarily from Classic Doctor Who?",
  modernEra: "Is this character primarily from Modern Doctor Who?",

  // Travel
  traveledInTARDIS: "Has this character traveled in the TARDIS?",
  frequentTraveler: "Has this character traveled with the Doctor for an extended period?",

  // Organizations
  associatedWithUNIT: "Is this character associated with UNIT?",
  associatedWithTorchwood: "Is this character associated with Torchwood?",
  associatedWithGallifrey: "Is this character associated with Gallifrey?",

  // Occupation
  teacher: "Is this character a teacher?",
  scientist: "Is this character a scientist?",
  doctorProfession: "Is this character a medical doctor?",
  journalist: "Is this character a journalist?",
  policeOfficer: "Does this character work in law enforcement?",
  soldier: "Is this character a soldier?",
  politician: "Is this character involved in politics?",

  // Time period
  fromPast: "Does this character primarily come from the past?",
  fromPresent: "Does this character primarily come from the present day?",
  fromFuture: "Does this character primarily come from the future?",

  // Companion-specific
  married: "Is this character married?",
  parent: "Is this character a parent?",
  teenager: "Is this character a teenager?",
  child: "Is this character a child?",

  // Villain-specific
  recurringVillain: "Is this a recurring villain?",
  leader: "Is this character a leader of a group or species?",
  conqueror: "Does this character seek conquest or domination?",

  // Alien features
  shapeShifter: "Can this character change appearance?",
  hiveMind: "Is this character part of a hive mind?",
  quantumLocked: "Is this character quantum locked?",

  // Doctor-specific
  regenerated: "Has this character regenerated?",
  usesSonic: "Has this character used a sonic device?",

  // Importance
  recurring: "Is this character recurring across multiple stories?",
  majorCharacter: "Is this considered a major Doctor Who character?"
};

    rreturn map[trait] || null;
  }

  // ----------------------------
  // MAIN LOOP
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
