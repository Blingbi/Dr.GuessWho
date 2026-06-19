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

  const blockedPrefixes = [
    "marriedTo",
    "motherOf",
    "daughterOf",
    "sonOf",
    "wifeOf",
    "husbandOf",
    "friendOf",
    "met",
    "appearedIn",
    "appearedOn",
    "knows",
    "doctorWho",
  ];

  const blockedExact = new Set([
    "doctorsGranddaughter",
    "reverseTimelineRelationship",
    "girlWhoWaited",
    "impossibleGirl",
    "doctorDonna",
    "badWolfEntity",
    "metaHumanEvolution",
    "knowsDoctorsName",
    "multipleDoctors",
    "regeneratedRomana"
  ]);

  for (const c of this.candidates) {
    for (const t of (c.traits || [])) {

      // already asked
      if (this.askedTraits.has(t)) continue;

      // block exact junk traits
      if (blockedExact.has(t)) continue;

      // block prefix-based relational traits
      if (blockedPrefixes.some(p => t.startsWith(p))) continue;

      // IMPORTANT: only allow traits that can produce a real question
      if (!this.formatQuestion(t)) continue;

      set.add(t);
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
  if (!trait) return null;

  // ----------------------------
  // CLEAN OVERRIDES (BEST QUALITY QUESTIONS)
  // ----------------------------
  const overrides = {
    companion: "Is this character a companion?",
    human: "Is this character human?",
    alien: "Is this character an alien?",
    timeLord: "Is this character a Time Lord?",
    timelord: "Is this character a Time Lord?",
    immortal: "Is this character immortal?",
    robotic: "Is this character robotic?",

    male: "Is the character male?",
    female: "Is the character female?",

    travelsInTardis: "Has this character traveled in the TARDIS?",
    associatedWithUNIT: "Is this character associated with UNIT?",
    torchwoodAgent: "Is this character associated with Torchwood?"
  };

  if (overrides[trait]) return overrides[trait];

  // ----------------------------
  // NORMALIZE TRAIT TEXT
  // ----------------------------
  let text = trait
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();

  // remove junk prefixes
  text = text
    .replace(/^is /, "")
    .replace(/^has /, "")
    .replace(/^can /, "");

  const lowerTrait = trait.toLowerCase();

  // ----------------------------
  // ROLE-BASED QUESTIONS
  // ----------------------------
  if (
    lowerTrait.includes("teacher") ||
    lowerTrait.includes("doctor") ||
    lowerTrait.includes("scientist") ||
    lowerTrait.includes("soldier") ||
    lowerTrait.includes("officer") ||
    lowerTrait.includes("nurse") ||
    lowerTrait.includes("student") ||
    lowerTrait.includes("journalist")
  ) {
    return `Is this character a ${text}?`;
  }

  // ----------------------------
  // AFFILIATION QUESTIONS
  // ----------------------------
  if (
    lowerTrait.includes("associatedwith") ||
    lowerTrait.includes("partof") ||
    lowerTrait.includes("unit") ||
    lowerTrait.includes("torchwood")
  ) {
    return `Is this character associated with ${text}?`;
  }

  // ----------------------------
  // ACTION / EXPERIENCE TRAITS
  // ----------------------------
  if (
    lowerTrait.includes("travels") ||
    lowerTrait.includes("uses") ||
    lowerTrait.includes("has")
  ) {
    return `Has this character ${text}?`;
  }

  // ----------------------------
  // DEFAULT (SAFE FALLBACK)
  // ----------------------------
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
