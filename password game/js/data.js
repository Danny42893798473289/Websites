const PERIODIC_ELEMENTS = [
  { symbol: "H", num: 1 }, { symbol: "He", num: 2 }, { symbol: "Li", num: 3 },
  { symbol: "Be", num: 4 }, { symbol: "B", num: 5 }, { symbol: "C", num: 6 },
  { symbol: "N", num: 7 }, { symbol: "O", num: 8 }, { symbol: "F", num: 9 },
  { symbol: "Ne", num: 10 }, { symbol: "Na", num: 11 }, { symbol: "Mg", num: 12 },
  { symbol: "Al", num: 13 }, { symbol: "Si", num: 14 }, { symbol: "P", num: 15 },
  { symbol: "S", num: 16 }, { symbol: "Cl", num: 17 }, { symbol: "Ar", num: 18 },
  { symbol: "K", num: 19 }, { symbol: "Ca", num: 20 }, { symbol: "Fe", num: 26 },
  { symbol: "Cu", num: 29 }, { symbol: "Zn", num: 30 }, { symbol: "Ag", num: 47 },
  { symbol: "Au", num: 79 }, { symbol: "Pb", num: 82 }, { symbol: "U", num: 92 },
  { symbol: "Sn", num: 50 }, { symbol: "Ni", num: 28 }, { symbol: "Co", num: 27 },
  { symbol: "Mn", num: 25 }, { symbol: "Cr", num: 24 }, { symbol: "Ti", num: 22 },
  { symbol: "Sc", num: 21 }, { symbol: "V", num: 23 }, { symbol: "Ga", num: 31 },
  { symbol: "Ge", num: 32 }, { symbol: "As", num: 33 }, { symbol: "Se", num: 34 },
  { symbol: "Br", num: 35 }, { symbol: "Kr", num: 36 }, { symbol: "Rb", num: 37 },
  { symbol: "Sr", num: 38 }, { symbol: "Y", num: 39 }, { symbol: "Zr", num: 40 },
  { symbol: "Nb", num: 41 }, { symbol: "Mo", num: 42 }, { symbol: "Tc", num: 43 },
  { symbol: "Ru", num: 44 }, { symbol: "Rh", num: 45 }, { symbol: "Pd", num: 46 },
  { symbol: "Cd", num: 48 }, { symbol: "In", num: 49 }, { symbol: "Sb", num: 51 },
  { symbol: "Te", num: 52 }, { symbol: "I", num: 53 }, { symbol: "Xe", num: 54 },
  { symbol: "Ba", num: 56 }, { symbol: "La", num: 57 }, { symbol: "Ce", num: 58 },
  { symbol: "Pt", num: 78 }, { symbol: "Hg", num: 80 }, { symbol: "Bi", num: 83 },
  { symbol: "Ra", num: 88 }, { symbol: "Th", num: 90 }
];

const TWO_LETTER_ELEMENTS = PERIODIC_ELEMENTS.filter((e) => e.symbol.length === 2);

const COUNTRIES = [
  { name: "China", flag: "🇨🇳" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "France", flag: "🇫🇷" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "India", flag: "🇮🇳" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "Thailand", flag: "🇹🇭" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Chile", flag: "🇨🇱" },
  { name: "Peru", flag: "🇵🇪" },
  { name: "Greece", flag: "🇬🇷" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Vietnam", flag: "🇻🇳" }
];

const CHESS_PUZZLES = [
  { fen: "r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 1 0", sol: "Nf6+" },
  { fen: "1rb4r/pkPp3p/1b1P3n/1Q6/N3Pp2/8/P1P3PP/7K w - - 1 0", sol: "Qd5+" },
  { fen: "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 0", sol: "Qb8+" },
  { fen: "r1b2k1r/ppp1bppp/8/1B1Q4/5q2/2P5/PPP2PPP/R3R1K1 w - - 1 0", sol: "Qd8+" },
  { fen: "5rkr/pp2Rp2/1b1p1Pb1/3P2Q1/2n3P1/2p5/P4P2/4R1K1 w - - 1 0", sol: "Qxg6+" },
  { fen: "r2q1b1r/1pN1n1pp/p1n3k1/4Pb2/2BP4/8/PPP3PP/R1BQ1RK1 w - - 1 0", sol: "Qg4+" },
  { fen: "r4br1/3b1kpp/1q1P4/1pp1RP1N/p7/6Q1/PPB3PP/2KR4 w - - 1 0", sol: "Qg6+" },
  { fen: "3q2r1/4n2k/p1p1rBpp/PpPpPp2/1P3P1Q/2P3R1/7P/1R5K w - - 1 0", sol: "Qxh6+" }
];

const WORDLE_WORDS = [
  "about", "above", "abuse", "actor", "acute", "admit", "adopt", "adult", "after", "again",
  "agent", "agree", "ahead", "alarm", "album", "alert", "alike", "alive", "allow", "alone",
  "along", "alter", "among", "anger", "angle", "angry", "apart", "apple", "apply", "arena",
  "argue", "arise", "array", "aside", "asset", "audio", "audit", "avoid", "award", "aware",
  "badly", "baker", "bases", "basic", "beach", "began", "begin", "being", "below", "bench",
  "billy", "birth", "black", "blame", "blind", "block", "blood", "board", "boost", "booth",
  "bound", "brain", "brand", "bread", "break", "breed", "brief", "bring", "broad", "broke",
  "brown", "build", "built", "buyer", "cable", "calif", "carry", "catch", "cause", "chain",
  "chair", "chart", "chase", "cheap", "check", "chest", "chief", "child", "china", "chose",
  "civil", "claim", "class", "clean", "clear", "click", "climb", "clock", "close", "coach",
  "coast", "could", "count", "court", "cover", "craft", "crash", "cream", "crime", "cross",
  "crowd", "crown", "curve", "cycle", "daily", "dance", "dated", "dealt", "death", "debut",
  "delay", "depth", "doing", "doubt", "dozen", "draft", "drama", "drawn", "dream", "dress",
  "drill", "drink", "drive", "drove", "dying", "eager", "early", "earth", "eight", "elite",
  "empty", "enemy", "enjoy", "enter", "entry", "equal", "error", "event", "every", "exact",
  "exist", "extra", "faith", "false", "fault", "fiber", "field", "fifth", "fifty", "fight",
  "final", "first", "fixed", "flash", "fleet", "floor", "fluid", "focus", "force", "forth",
  "forty", "forum", "found", "frame", "frank", "fraud", "fresh", "front", "fruit", "fully",
  "funny", "giant", "given", "glass", "globe", "going", "grace", "grade", "grand", "grant",
  "grass", "great", "green", "gross", "group", "grown", "guard", "guess", "guest", "guide",
  "happy", "harry", "heart", "heavy", "hence", "henry", "horse", "hotel", "house", "human",
  "ideal", "image", "index", "inner", "input", "issue", "japan", "jimmy", "joint", "jones",
  "judge", "known", "label", "large", "laser", "later", "laugh", "layer", "learn", "lease",
  "least", "leave", "legal", "level", "lewis", "light", "limit", "links", "lives", "local",
  "logic", "loose", "lower", "lucky", "lunch", "lying", "magic", "major", "maker", "march",
  "maria", "match", "maybe", "mayor", "meant", "media", "metal", "might", "minor", "minus",
  "mixed", "model", "money", "month", "moral", "motor", "mount", "mouse", "mouth", "moved",
  "movie", "music", "needs", "never", "newly", "night", "noise", "north", "noted", "novel",
  "nurse", "occur", "ocean", "offer", "often", "order", "other", "ought", "paint", "panel",
  "paper", "party", "peace", "peter", "phase", "phone", "photo", "piece", "pilot", "pitch",
  "place", "plain", "plane", "plant", "plate", "point", "pound", "power", "press", "price",
  "prime", "print", "prior", "prize", "proof", "proud", "prove", "queen", "quick", "quiet",
  "quite", "radio", "raise", "range", "rapid", "ratio", "reach", "ready", "realm", "rebel",
  "refer", "relax", "reply", "right", "rival", "river", "robin", "roger", "roman", "rough",
  "round", "route", "royal", "rural", "scale", "scene", "scope", "score", "sense", "serve",
  "seven", "shall", "shape", "share", "sharp", "sheet", "shelf", "shell", "shift", "shirt",
  "shock", "shoot", "short", "shown", "sight", "since", "sixth", "sixty", "sized", "skill",
  "sleep", "slide", "small", "smart", "smile", "smith", "smoke", "solid", "solve", "sorry",
  "sound", "south", "space", "spare", "speak", "speed", "spend", "spent", "split", "spoke",
  "sport", "staff", "stage", "stake", "stand", "start", "state", "steam", "steel", "stick",
  "still", "stock", "stone", "stood", "store", "storm", "story", "strip", "stuck", "study",
  "stuff", "style", "sugar", "suite", "super", "sweet", "table", "taken", "taste", "taxes",
  "teach", "teeth", "terry", "texas", "thank", "theft", "their", "theme", "there", "these",
  "thick", "thing", "think", "third", "those", "three", "threw", "throw", "tight", "times",
  "tired", "title", "today", "topic", "total", "touch", "tough", "tower", "track", "trade",
  "train", "treat", "trend", "trial", "tribe", "trick", "tried", "tries", "truck", "truly",
  "trust", "truth", "twice", "under", "undue", "union", "unity", "until", "upper", "upset",
  "urban", "usage", "usual", "valid", "value", "video", "virus", "visit", "vital", "voice",
  "waste", "watch", "water", "wheel", "where", "which", "while", "white", "whole", "whose",
  "woman", "women", "world", "worry", "worse", "worst", "worth", "would", "wound", "write",
  "wrong", "wrote", "yield", "young", "youth", "tract", "diner", "crane", "slate", "trace"
];

const VIDEO_URLS = [
  { duration: 237, url: "https://www.bilibili.com/video/BV1GJ411x7h7" },
  { duration: 212, url: "https://www.bilibili.com/video/BV1xx411c7mu" },
  { duration: 185, url: "https://www.bilibili.com/video/BV1k4y1m7WvJ" },
  { duration: 301, url: "https://www.bilibili.com/video/BV1Hh411o7SN" },
  { duration: 154, url: "https://www.bilibili.com/video/BV1Ys411a7uN" },
  { duration: 267, url: "https://www.bilibili.com/video/BV1qT41197KE" },
  { duration: 198, url: "https://youtu.be/jNQXAC9IVRw" },
  { duration: 245, url: "https://youtu.be/dQw4w9WgXcQ" },
  { duration: 176, url: "https://youtu.be/9bZkp7q19f0" },
  { duration: 223, url: "https://youtu.be/kJQP7kiw5Fk" }
];

const SPONSORS = ["pepsi", "starbucks", "shell"];

const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const AFFIRMATIONS = ["i am loved", "i am worthy", "i am enough"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ROMAN_VALUES = {
  M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50,
  XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1
};

const ROMAN_PATTERN = /(CM|CD|XC|XL|IX|IV|M|D|C|L|X|V|I)/g;

const CHESS_PIECES = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};
