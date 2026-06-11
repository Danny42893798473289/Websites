const fs = require("fs");
const path = require("path");
const publicDir = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
const tabsDir = path.join(publicDir, "tabs");
fs.mkdirSync(tabsDir, { recursive: true });

const ids = ["main", "pets", "inventory", "garden", "market", "prestige", "mastery"];

function extractBlock(html, id) {
  const start = html.indexOf(`<div id="${id}"`);
  if (start < 0) return null;
  let depth = 0;
  let j = start;
  const tag = "div";
  while (j < html.length) {
    const closeIdx = html.indexOf(`</${tag}>`, j);
    if (closeIdx < 0) break;
    const slice = html.slice(j, closeIdx);
    const opens = (slice.match(new RegExp(`<${tag}[\\s>]`, "g")) || []).length;
    const closes = (slice.match(new RegExp(`</${tag}>`, "g")) || []).length;
    j = closeIdx + `</${tag}>`.length;
    depth += opens - closes;
    if (depth <= 0 && j > start) break;
    depth = 1;
    // walk one closing at a time from start
  }
  // simpler depth walk
  depth = 0;
  j = start;
  while (j < html.length) {
    const nextOpen = html.indexOf(`<${tag}`, j);
    const nextClose = html.indexOf(`</${tag}>`, j);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      const ch = html[nextOpen + tag.length + 1];
      if (ch === " " || ch === ">") depth++;
      j = nextOpen + 1;
    } else {
      depth--;
      j = nextClose + `</${tag}>`.length;
      if (depth === 0) break;
    }
  }
  return html.slice(start, j);
}

for (const id of ids) {
  const chunk = extractBlock(html, id);
  if (!chunk) {
    console.error("missing", id);
    continue;
  }
  fs.writeFileSync(path.join(tabsDir, `${id}.html`), chunk);
  console.log("wrote", id);
}
