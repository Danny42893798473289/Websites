function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function dateSeed(dateStr) {
  return dateStr.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function pickFromArray(arr, seed) {
  const rand = seededRandom(seed);
  return arr[Math.floor(rand() * arr.length)];
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getWordleAnswer(dateStr) {
  const seed = dateSeed(dateStr || getTodayString());
  return pickFromArray(WORDLE_WORDS, seed);
}

function parseRomanValue(str) {
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const s = str.toUpperCase();
  let total = 0;
  let prev = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const curr = values[s[i]] || 0;
    total += curr < prev ? -curr : curr;
    prev = curr;
  }
  return total;
}

function hasSpacesBothSides(text, startIndex, length) {
  const before = startIndex > 0 ? text[startIndex - 1] : "";
  const after = startIndex + length < text.length ? text[startIndex + length] : "";
  return before === " " && after === " ";
}

function findRomanRuns(text, uppercaseOnly) {
  const runs = [];
  let current = "";
  let startIndex = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const isRoman = uppercaseOnly
      ? "IVXLCDM".includes(ch)
      : "IVXLCDMivxldm".includes(ch);

    if (isRoman) {
      if (!current) startIndex = i;
      current += ch;
    } else if (current) {
      runs.push({ token: current, index: startIndex });
      current = "";
    }
  }

  if (current) runs.push({ token: current, index: startIndex });
  return runs;
}

function extractRomanNumerals(text, uppercaseOnly = false) {
  return findRomanRuns(text, uppercaseOnly)
    .filter((run) => hasSpacesBothSides(text, run.index, run.token.length))
    .map((run) => ({
      token: run.token,
      value: parseRomanValue(run.token),
      index: run.index
    }))
    .filter((run) => run.value > 0);
}

function romanProduct(text) {
  const numerals = extractRomanNumerals(text, true);
  if (!numerals.length) return 0;
  return numerals.reduce((acc, n) => acc * n.value, 1);
}

function sumDigits(text) {
  const digits = text.match(/\d/g);
  if (!digits || !digits.length) return 0;
  return digits.reduce((sum, d) => sum + parseInt(d, 10), 0);
}

function isLeapYear(num) {
  return (num % 4 === 0 && num % 100 !== 0) || num % 400 === 0;
}

function hasLeapYear(text) {
  const numbers = text.match(/\d+/g) || [];
  for (const n of numbers) {
    const val = parseInt(n, 10);
    if (isLeapYear(val)) return true;
  }
  const romans = extractRomanNumerals(text);
  for (const r of romans) {
    if (isLeapYear(r.value)) return true;
  }
  return false;
}

function getMoonPhaseEmoji(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const c = Math.floor(year / 100);
  const e = 2 - c + Math.floor(c / 4);
  const jd =
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    e -
    1524.5;
  const daysSinceNew = (jd - 2451549.5) % 29.530588853;
  const phase = daysSinceNew / 29.530588853;

  if (phase < 0.03 || phase > 0.97) return "🌑";
  if (phase < 0.22) return "🌒";
  if (phase < 0.28) return "🌓";
  if (phase < 0.47) return "🌔";
  if (phase < 0.53) return "🌕";
  if (phase < 0.72) return "🌖";
  if (phase < 0.78) return "🌗";
  return "🌘";
}

function getCurrentTimeString() {
  const now = new Date();
  return now.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true
  }).split(" ")[0];
}

function isPrime(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function randomColor(seed) {
  const rand = seededRandom(seed);
  const r = Math.floor(rand() * 256);
  const g = Math.floor(rand() * 256);
  const b = Math.floor(rand() * 256);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function hexColorCloseEnough(password, targetHex) {
  const matches = password.match(/#[0-9A-Fa-f]{6}/g);
  if (!matches) return false;
  const target = parseInt(targetHex.replace("#", ""), 16);
  return matches.some((hex) => {
    const val = parseInt(hex.replace("#", ""), 16);
    return Math.abs(val - target) <= 5;
  });
}

function generateCaptcha(seed) {
  const rand = seededRandom(seed);
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += CAPTCHA_CHARS[Math.floor(rand() * CAPTCHA_CHARS.length)];
  }
  return result;
}

function getVideoForDuration(seconds, seed) {
  const exact = VIDEO_URLS.find((v) => v.duration === seconds);
  if (exact) return exact;
  const rand = seededRandom(seed);
  return VIDEO_URLS[Math.floor(rand() * VIDEO_URLS.length)];
}

function getPlainText(editor) {
  return editor.innerText || "";
}

function getPasswordLength(editor) {
  return getPlainText(editor).length;
}

function walkTextNodes(root, callback) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    callback(node);
  }
}

function getFormattedStats(editor) {
  let boldCount = 0;
  let italicCount = 0;
  let wingdingsCount = 0;
  let totalChars = 0;
  const digitFontIssues = [];
  const letterSizeMap = {};
  const letterSizeIssues = [];
  const vowelIssues = [];
  const romanTnrIssues = [];
  const romanPositions = [];

  const plain = getPlainText(editor);
  const romans = extractRomanNumerals(plain, true);
  romans.forEach((r) => {
    for (let i = 0; i < r.token.length; i++) {
      romanPositions.push(r.index + i);
    }
  });

  let charIndex = 0;
  walkTextNodes(editor, (textNode) => {
    const text = textNode.textContent;
    const parent = textNode.parentElement;
    if (!text) return;

    const isBold = parent.closest("b, strong") !== null ||
      (parent.style && parent.style.fontWeight === "bold");
    const isItalic = parent.closest("i, em") !== null ||
      (parent.style && parent.style.fontStyle === "italic");

    let fontFamily = "";
    let fontSize = 28;
    let el = parent;
    while (el && el !== editor) {
      if (el.style) {
        if (el.style.fontFamily) fontFamily = el.style.fontFamily.replace(/['"]/g, "");
        if (el.style.fontSize) fontSize = parseInt(el.style.fontSize, 10) || 28;
      }
      el = el.parentElement;
    }

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      totalChars++;

      if (/[aeiou]/i.test(ch)) {
        if (!isBold) vowelIssues.push(charIndex);
      }

      if (isBold) boldCount++;
      if (isItalic) italicCount++;
      if (fontFamily.toLowerCase().includes("wingdings")) wingdingsCount++;

      if (/\d/.test(ch)) {
        const digit = parseInt(ch, 10);
        if (digit * digit !== fontSize) digitFontIssues.push(charIndex);
      }

      if (/[a-zA-Z]/.test(ch)) {
        const key = ch.toLowerCase() + ":" + fontSize;
        if (letterSizeMap[key]) letterSizeIssues.push(charIndex);
        else letterSizeMap[key] = true;
      }

      if (romanPositions.includes(charIndex)) {
        if (!fontFamily.toLowerCase().includes("times new roman")) {
          romanTnrIssues.push(charIndex);
        }
      }

      charIndex++;
    }
  });

  return {
    boldCount,
    italicCount,
    wingdingsCount,
    totalChars,
    digitFontIssues,
    letterSizeIssues,
    vowelIssues,
    romanTnrIssues,
    allVowelsBold: vowelIssues.length === 0 && /[aeiou]/i.test(plain)
  };
}

function sumAtomicNumbers(text) {
  let remaining = text;
  let sum = 0;
  const sorted = [...PERIODIC_ELEMENTS].sort((a, b) => b.symbol.length - a.symbol.length);

  let changed = true;
  while (changed) {
    changed = false;
    for (const el of sorted) {
      const idx = remaining.indexOf(el.symbol);
      if (idx !== -1) {
        sum += el.num;
        remaining = remaining.slice(0, idx) + " ".repeat(el.symbol.length) + remaining.slice(idx + el.symbol.length);
        changed = true;
      }
    }
  }
  return sum;
}

function parseFenBoard(fen) {
  const rows = fen.split(" ")[0].split("/");
  const board = [];
  for (const row of rows) {
    const line = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch, 10); i++) line.push("");
      } else {
        line.push(ch);
      }
    }
    board.push(line);
  }
  return board;
}

function renderChessBoard(fen) {
  const board = parseFenBoard(fen);
  const container = document.createElement("div");
  container.className = "chess-board";
  board.forEach((row, ri) => {
    row.forEach((piece, ci) => {
      const sq = document.createElement("div");
      sq.className = "chess-square " + ((ri + ci) % 2 === 0 ? "light" : "dark");
      sq.textContent = CHESS_PIECES[piece] || "";
      container.appendChild(sq);
    });
  });
  return container;
}

function drawCaptcha(canvas, text) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.5)`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }

  ctx.font = "bold 28px monospace";
  ctx.fillStyle = "#222";
  for (let i = 0; i < text.length; i++) {
    const x = 16 + i * 28 + Math.random() * 6;
    const y = 34 + Math.random() * 8;
    const angle = (Math.random() - 0.5) * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  let parts = [];
  if (m > 0) parts.push(`${m} minute${m > 1 ? "s" : ""}`);
  if (s > 0) parts.push(`${s} second${s > 1 ? "s" : ""}`);
  return parts.join(" ") || "0 seconds";
}

function findVideoDurationInPassword(text) {
  const urls = text.match(/https?:\/\/[^\s]+/g) || [];
  for (const url of urls) {
    const match = VIDEO_URLS.find((v) => url.includes(v.url.replace(/https?:\/\//, "")) || url === v.url);
    if (match) return match.duration;
  }
  return null;
}
