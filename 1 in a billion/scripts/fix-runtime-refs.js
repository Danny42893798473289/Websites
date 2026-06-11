const fs = require("fs");
const path = require("path");

const files = ["rolling.js", "economy.js", "progression.js", "social.js", "main.js", "render.js"];
const dir = path.join(__dirname, "..", "js");

for (const file of files) {
  const p = path.join(dir, file);
  let c = fs.readFileSync(p, "utf8");
  c = c.replace(/import \{[^}]+\} from "\.\/runtime\.js";/, 'import { runtime } from "./runtime.js";');
  c = c.replace(/\bel\./g, "runtime.el.");
  c = c.replace(/\bstate\./g, "runtime.state.");
  c = c.replace(/if \(!state\)/g, "if (!runtime.state)");
  c = c.replace(/if \(!currentUser\)/g, "if (!runtime.currentUser)");
  c = c.replace(/encodeURIComponent\(currentUser\)/g, "encodeURIComponent(runtime.currentUser)");
  c = c.replace(/syncRarityTotals\(state\)/g, "syncRarityTotals(runtime.state)");
  c = c.replace(/achievement\.check\(state\)/g, "achievement.check(runtime.state)");
  c = c.replace(/\bfusionSearchQuery\b/g, "runtime.fusionSearchQuery");
  c = c.replace(/\bfusionTierFilter\b/g, "runtime.fusionTierFilter");
  c = c.replace(/\bfusionSelectedRecipeId\b/g, "runtime.fusionSelectedRecipeId");
  c = c.replace(/\bpreviousCoins\b/g, "runtime.previousCoins");
  c = c.replace(/\bpreviousGems\b/g, "runtime.previousGems");
  fs.writeFileSync(p, c);
  console.log("updated", file);
}
