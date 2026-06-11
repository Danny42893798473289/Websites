function createRules() {
  return [
    {
      id: 1,
      desc: "Your password must be at least 5 characters.",
      check: (ctx) => ctx.length >= 5
    },
    {
      id: 2,
      desc: "Your password must include a number.",
      check: (ctx) => /\d/.test(ctx.text)
    },
    {
      id: 3,
      desc: "Your password must include an uppercase letter.",
      check: (ctx) => /[A-Z]/.test(ctx.text)
    },
    {
      id: 4,
      desc: "Your password must include a special character.",
      check: (ctx) => /[^a-zA-Z0-9]/.test(ctx.text)
    },
    {
      id: 5,
      desc: "The digits in your password must add up to 25.",
      check: (ctx) => sumDigits(ctx.text) === 25
    },
    {
      id: 6,
      desc: "Your password must include a month of the year.",
      check: (ctx) => {
        const lower = ctx.text.toLowerCase();
        return MONTHS.some((m) => lower.includes(m.toLowerCase()));
      }
    },
    {
      id: 7,
      desc: "Your password must include a roman numeral surrounded by spaces on both sides.",
      check: (ctx) => extractRomanNumerals(ctx.text).length > 0
    },
    {
      id: 8,
      desc: () => `Your password must include one of our sponsors: ${ctxSponsorNames()}.`,
      check: (ctx) => SPONSORS.some((s) => ctx.text.toLowerCase().includes(s)),
      widget: "sponsors"
    },
    {
      id: 9,
      desc: "The roman numerals in your password (each surrounded by spaces) should multiply to 35.",
      check: (ctx) => romanProduct(ctx.text) === 35
    },
    {
      id: 10,
      desc: "Your password must include this CAPTCHA:",
      check: (ctx) => ctx.text.includes(ctx.state.captcha),
      widget: "captcha"
    },
    {
      id: 11,
      desc: () => `Your password must include today's daily word.`,
      check: (ctx) => ctx.text.toLowerCase().includes(ctx.state.wordleAnswer),
      widget: "wordle"
    },
    {
      id: 12,
      desc: "Your password must include a two letter symbol from the periodic table.",
      check: (ctx) => TWO_LETTER_ELEMENTS.some((el) => ctx.text.includes(el.symbol))
    },
    {
      id: 13,
      desc: "Your password must include the current phase of the moon as an emoji.",
      check: (ctx) => ctx.text.includes(ctx.state.moonEmoji),
      widget: "moon"
    },
    {
      id: 14,
      desc: "Your password must include the name of this country.",
      check: (ctx) => ctx.text.toLowerCase().replace(/\s/g, "").includes(
        ctx.state.country.name.toLowerCase().replace(/\s/g, "")
      ),
      widget: "country"
    },
    {
      id: 15,
      desc: "Your password must include a leap year.",
      check: (ctx) => hasLeapYear(ctx.text)
    },
    {
      id: 16,
      desc: "Your password must include the best move in algebraic chess notation.",
      check: (ctx) => ctx.text.includes(ctx.state.chess.sol),
      widget: "chess"
    },
    {
      id: 17,
      desc: "🥚 ← This is my chicken Paul. He hasn't hatched yet, please put him in your password and keep him safe.",
      check: (ctx) => {
        const hasPaul = ctx.text.includes("🥚") || (ctx.state.paulHatched && ctx.text.includes("🐔"));
        if (ctx.state.eggPlaced && !hasPaul) {
          ctx.triggerDeath("Paul has been slain!");
        }
        return hasPaul;
      },
      widget: "paul"
    },
    {
      id: 18,
      desc: "The elements in your password must have atomic numbers that add up to 200.",
      check: (ctx) => sumAtomicNumbers(ctx.text) === 200
    },
    {
      id: 19,
      desc: "All the vowels in your password must be bolded.",
      check: (ctx) => {
        const stats = getFormattedStats(ctx.editor);
        return stats.allVowelsBold && /[aeiou]/i.test(ctx.text);
      },
      requiresFormatting: true
    },
    {
      id: 20,
      desc: "Oh no! Your password is on fire. Quick, put it out!",
      check: (ctx) => !ctx.text.includes("🔥") && ctx.state.fireStarted,
      onUnlock: (state, editor) => {
        if (!state.fireStarted) {
          state.fireStarted = true;
          insertAtEnd(editor, "🔥");
        }
      }
    },
    {
      id: 21,
      desc: "Your password is not strong enough 🏋️‍♂️",
      check: (ctx) => (ctx.text.match(/🏋️‍♂️/g) || []).length >= 3
    },
    {
      id: 22,
      desc: "Your password must contain one of the following affirmations: i am loved, i am worthy, i am enough",
      check: (ctx) => {
        const lower = ctx.text.toLowerCase();
        return AFFIRMATIONS.some(
          (a) => lower.includes(a) || lower.includes(a.replace(/ /g, ""))
        );
      }
    },
    {
      id: 23,
      desc: "Paul has hatched! Please don't forget to feed him, he eats three 🐛 every minute.",
      check: (ctx) => ctx.text.includes("🐛") || ctx.state.paulFed,
      onUnlock: (state) => {
        state.paulHatched = true;
        state.wormDeadline = Date.now() + 60000;
      },
      widget: "paulHatched"
    },
    {
      id: 24,
      desc: (ctx) => {
        const dur = formatDuration(ctx.state.youtubeDuration);
        const exact = ctx.state.youtubeDuration % 60 === 0 && ctx.state.youtubeDuration < 60;
        return `Your password must include the URL of a${exact ? "n exactly" : ""} ${dur} long video.`;
      },
      check: (ctx) => {
        const found = findVideoDurationInPassword(ctx.text);
        return found !== null && Math.abs(found - ctx.state.youtubeDuration) <= 1;
      },
      widget: "youtube"
    },
    {
      id: 25,
      desc: "A sacrifice must be made. Pick 2 letters that you will no longer be able to use.",
      check: (ctx) => {
        if (ctx.state.sacrificedLetters.length !== 2) return false;
        const upper = ctx.text.toUpperCase();
        return !ctx.state.sacrificedLetters.some((l) => upper.includes(l));
      },
      onUnlock: (state) => {
        state.sacrificePending = true;
      }
    },
    {
      id: 26,
      desc: "Your password must contain twice as many italic characters as bold.",
      check: (ctx) => {
        const stats = getFormattedStats(ctx.editor);
        return stats.italicCount >= 2 * stats.boldCount;
      },
      requiresFormatting: true
    },
    {
      id: 27,
      desc: "At least 30% of your password must be in the Wingdings font.",
      check: (ctx) => {
        const stats = getFormattedStats(ctx.editor);
        return ctx.length > 0 && stats.wingdingsCount / ctx.length >= 0.3;
      },
      requiresFormatting: true
    },
    {
      id: 28,
      desc: "Your password must include this color in hex.",
      check: (ctx) => hexColorCloseEnough(ctx.text, ctx.state.randomColor),
      widget: "color"
    },
    {
      id: 29,
      desc: "All roman numerals must be in Times New Roman.",
      check: (ctx) => {
        const stats = getFormattedStats(ctx.editor);
        return extractRomanNumerals(ctx.text).length === 0 || stats.romanTnrIssues.length === 0;
      },
      requiresFormatting: true
    },
    {
      id: 30,
      desc: "The font size of every digit must be equal to its square.",
      check: (ctx) => {
        const stats = getFormattedStats(ctx.editor);
        const hasDigits = /\d/.test(ctx.text);
        return hasDigits && stats.digitFontIssues.length === 0;
      },
      requiresFormatting: true
    },
    {
      id: 31,
      desc: "Every instance of the same letter must have a different font size.",
      check: (ctx) => {
        const stats = getFormattedStats(ctx.editor);
        return stats.letterSizeIssues.length === 0;
      },
      requiresFormatting: true
    },
    {
      id: 32,
      desc: "Your password must include the length of your password.",
      check: (ctx) => ctx.text.includes(String(ctx.length))
    },
    {
      id: 33,
      desc: "The length of your password must be a prime number.",
      check: (ctx) => isPrime(ctx.length)
    },
    {
      id: 34,
      desc: "Uhhh let's skip this one.",
      check: () => true
    },
    {
      id: 35,
      desc: "Your password must include the current time.",
      check: (ctx) => ctx.text.includes(getCurrentTimeString())
    },
    {
      id: 36,
      desc: "Is this your final password?",
      check: () => false,
      isFinal: true
    }
  ];
}

function ctxSponsorNames() {
  return SPONSORS.join(", ");
}

function insertAtEnd(editor, text) {
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand("insertText", false, text);
}

function getRuleDescription(rule, ctx) {
  if (typeof rule.desc === "function") return rule.desc(ctx);
  return rule.desc;
}
