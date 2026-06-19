export class AkinatorEngine {
  constructor(data) {
    // ----------------------------
    // CLEAN INPUT DATA (SAFE)
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

    this.startCount = Math.max(this.allCharacters.length, 1);

    // ----------------------------
    // TRAIT MAPS
    // ----------------------------
    this.traitFrequency = new Map();
    this.traitIndex = new Map();

    for (const c of this.allCharacters) {
      const traits = c.traits || [];

      for (const t of traits) {
        this.traitFrequency.set(t, (this.traitFrequency.get(t) || 0) + 1);

        if (!this.traitIndex.has(t)) {
          this.traitIndex.set(t, new Set());
        }
        this.traitIndex.get(t).add(c.name);
      }
    }
  }

  // ----------------------------
  // PHASE
  // ----------------------------
  getPhase() {
    const r = this.candidates.length;
    if (r > 25) return "early";
    if (r > 6) return "mid";
    return "end";
  }

  reset() {
    this.candidates = [...this.allCharacters];
    this.askedTraits.clear();
    this.lastTraitAsked = null;
  }

  getDepth() {
    return 1 - (this.candidates.length / this.startCount);
  }

  // ----------------------------
  // WEIGHTS
  // ----------------------------
  traitWeight(trait) {
    const base = {
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

    const freq = this.traitFrequency.get(trait) || 1;
    const rarity = 1 / Math.log2(freq + 2);

    return (base[trait] || 1) * (1 + rarity);
  }

  // ----------------------------
  // SPLIT
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
    return ratio < 0.1 || ratio > 0.9;
  }

  // ----------------------------
  // INFORMATION GAIN (SAFE)
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

    const entropy =
      -(pYes * Math.log2(pYes)) -
      (pNo * Math.log2(pNo));

    return Math.log2(total) - entropy;
  }

  // ----------------------------
  // TRAITS
  // ----------------------------
  getAllTraits() {
    const set = new Set();

    for (const c of this.candidates) {
      for (const t of (c.traits || [])) {
        if (this.askedTraits.has(t)) continue;
        set.add(t);
      }
    }

    return [...set];
  }

  // ----------------------------
  // BEST TRAIT (SAFE)
  // ----------------------------
  getBestTrait() {
    const traits = this.getAllTraits();
    if (!traits.length) return null;

    let best = null;
    let bestScore = -Infinity;

    const phase = this.getPhase();

    for (const trait of traits) {
      if (this.isBadTraitSplit(trait)) continue;

      const ig = this.informationGain(trait);
      const weight = this.traitWeight(trait);

      let phaseBoost = 1;
      if (phase === "early") phaseBoost = 1.2;
      if (phase === "end") phaseBoost = 1.4;

      const depthPenalty = 1 - this.getDepth() * 0.5;

      const score =
        ig * (1 + Math.log(weight + 1)) * phaseBoost * depthPenalty;

      if (score > bestScore) {
        bestScore = score;
        best = trait;
      }
    }

    return best;
  }

  // ----------------------------
  // FALLBACK
  // ----------------------------
  getFallbackTrait() {
    const traits = this.getAllTraits();
    if (!traits.length) return null;

    let best = null;
    let bestScore = -Infinity;

    for (const t of traits) {
      const { yes, no } = this.splitByTrait(t);
      const score = Math.min(yes.length, no.length);

      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }

    return best;
  }

  // ----------------------------
  // FILTER (SAFE)
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

    // HARD SAFETY: prevent empty crash
    if (this.candidates.length === 0) {
      this.candidates = [...this.allCharacters];
    }
  }

  // ----------------------------
  // PROBABILITIES (SAFE)
  // ----------------------------
  calculateCandidateScore(candidate) {
    let score = 1;

    for (const trait of this.askedTraits) {
      score *= candidate.traits.includes(trait) ? 0.75 : 0.25;
    }

    return score;
  }

  getProbabilities() {
    if (!this.candidates.length) {
      return [];
    }

    const scores = this.candidates.map(c => ({
      character: c,
      score: this.calculateCandidateScore(c)
    }));

    const total = scores.reduce((s, x) => s + x.score, 0);

    if (total <= 0) {
      return this.candidates.map(c => ({
        character: c,
        probability: 1 / this.candidates.length
      }));
    }

    return scores.map(s => ({
      character: s.character,
      probability: s.score / total
    }));
  }

  // ----------------------------
  // GUESS SAFETY
  // ----------------------------
  shouldGuess() {
    if (!this.candidates.length) return false;

    const probs = this.getProbabilities();
    if (!probs.length) return false;

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
    if (!probs.length) return null;

    const best = probs.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    return best.character || null;
  }

  // ----------------------------
  // QUESTION FORMAT (SAFE)
  // ----------------------------
  formatQuestion(trait) {
    if (!trait) return null;

    const overrides = {
      companion: "Is this character a companion?",
      human: "Is this character human?",
      alien: "Is this character an alien?",
      timelord: "Is this character a Time Lord?",
      immortal: "Is this character immortal?",
      male: "Is the character male?",
      female: "Is the character female?"
    };

    if (overrides[trait]) return overrides[trait];

    const text = trait
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .toLowerCase();

    return `Does this character have the trait: ${text}?`;
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

    let trait = this.getBestTrait();
    if (!trait) trait = this.getFallbackTrait();

    if (!trait) {
      return {
        type: "guess",
        guess: null,
        remaining: this.candidates
      };
    }

    this.lastTraitAsked = trait;

    return {
      type: "question",
      trait,
      question: this.formatQuestion(trait),
      remainingCount: this.candidates.length
    };
  }
}
