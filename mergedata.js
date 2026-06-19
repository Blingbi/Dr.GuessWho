import doctors from "./doctors.json" assert { type: "json" };
import companions from "./companions.json" assert { type: "json" };
import villains from "./villains.json" assert { type: "json" };
import recurring from "./recurring.json" assert { type: "json" };

const allCharacters = [
  ...doctors,
  ...companions,
  ...villains,
  ...recurring
];

export default allCharacters;