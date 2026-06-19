import doctors from "./doctors.json" with { type: "json" };
import companions from "./companions.json" with { type: "json" };
import villains from "./villains.json" with { type: "json" };
import recurring from "./recurring.json" with { type: "json" };

const allCharacters = [
  ...doctors,
  ...companions,
  ...villains,
  ...recurring
];

export default allCharacters;
