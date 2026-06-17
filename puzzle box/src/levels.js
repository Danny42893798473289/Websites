const baseCamera = {
  theta: 0.95,
  phi: 0.86,
  distance: 22,
  target: [0, 1.5, 0]
};

const C = (overrides = {}) => ({ ...baseCamera, ...overrides });

export const campaignLevels = [
  {
    id: 1,
    name: "Warmup Lane",
    camera: C(),
    ball: [-8, 1.2, 0],
    pin: [8, 1.3, 0],
    platforms: [{ type: "box", size: [20, 1, 4], position: [0, 0, 0] }],
    obstacles: []
  },
  {
    id: 2,
    name: "Gentle Rise",
    camera: C({ target: [0, 2, 0] }),
    ball: [-8, 1.35, 0],
    pin: [6, 1.3, 0],
    forcedPerspective: {
      lockAxis: "z",
      lockValue: 0
    },
    platforms: [
      { type: "box", size: [6, 1, 4], position: [-7, 0, 0] },
      { type: "ramp", size: [10, 1, 4], position: [0, 0, 0], rotation: [0, 0, 0] },
      { type: "box", size: [5, 1, 4], position: [6, 0, 0] }
    ],
    obstacles: []
  },
  {
    id: 3,
    name: "U Swing",
    camera: C({ theta: 1.15, target: [0, 0, -2.4], distance: 28 }),
    ball: [-8, 4.15, -2.4],
    pin: [8, 4.15, -2.4],
    platforms: [
      { type: "box", size: [6, 1, 4], position: [-8, 3, -2.4] },
      {
        type: "arc",
        radius: 8,
        width: 4,
        height: 1,
        segments: 24,
        center: [0, 3, -2.4],
        start: Math.PI,
        end: Math.PI * 2,
        track: "inner"
      },
      { type: "box", size: [6, 1, 4], position: [8, 3, -2.4] }
    ],
    obstacles: []
  },
  {
    id: 4,
    name: "Bridge Steps",
    camera: C({ theta: 0.88, target: [0, 2.2, 0] }),
    ball: [-8, 1.2, 0],
    pin: [8, 5.32, 0],
    platforms: [
      { type: "box", size: [6, 1, 4], position: [-8, 0, 0] },
      { type: "box", size: [4, 1, 4], position: [-3, 1, 0] },
      { type: "box", size: [4, 1, 4], position: [1, 2, 0] },
      { type: "box", size: [4, 1, 4], position: [5, 3, 0] },
      { type: "box", size: [4, 1, 4], position: [8, 4, 0] }
    ],
    obstacles: []
  },
  {
    id: 5,
    name: "Mirror Bank",
    camera: C({ theta: 0.7, target: [0, 2.2, 0] }),
    ball: [-10, 1.2, -3],
    pin: [8, 1.3, 3],
    platforms: [{ type: "box", size: [24, 1, 12], position: [0, 0, 0] }],
    obstacles: [{ type: "wall", size: [1, 4, 8], position: [0, 2, 0], rotation: [0, 0.42, 0] }]
  },
  {
    id: 6,
    name: "Double Wall",
    camera: C({ theta: 0.62, target: [0, 2, 0] }),
    ball: [-9, 1.2, -3],
    pin: [9, 1.3, 3],
    platforms: [{ type: "box", size: [24, 1, 12], position: [0, 0, 0] }],
    obstacles: [
      { type: "wall", size: [1, 4, 7], position: [-2, 2, -0.5], rotation: [0, 0.35, 0] },
      { type: "wall", size: [1, 4, 7], position: [3, 2, 0.5], rotation: [0, -0.35, 0] }
    ]
  },
  {
    id: 7,
    name: "Spiral Drop",
    camera: C({ theta: 1.18, target: [0, 2.3, 0], distance: 24 }),
    ball: [-3, 8.5, 0],
    pin: [5, 1.3, 0],
    platforms: [
      { type: "spiral", center: [0, 6, 0], turns: 1.8, radius: 7, width: 3.8, segments: 50, drop: 6.8 },
      { type: "box", size: [10, 1, 6], position: [5, 0, 0] }
    ],
    obstacles: []
  },
  {
    id: 8,
    name: "Fake Bridge",
    camera: C({ theta: 0.74, phi: 0.74, target: [0, 2, 0] }),
    ball: [-8, 1.2, -2],
    pin: [8, 1.3, 2],
    platforms: [
      { type: "box", size: [8, 1, 3], position: [-8, 0, -2] },
      { type: "box", size: [8, 1, 3], position: [8, 0, 2] },
      { type: "hiddenBridge", size: [12, 1, 1.3], position: [0, -1.2, 0], illusion: true }
    ],
    obstacles: []
  },
  {
    id: 9,
    name: "Occlusion Trick",
    camera: C({ theta: 0.6, target: [0, 2, 0] }),
    ball: [-9, 1.2, 0],
    pin: [8, 1.3, 0],
    platforms: [
      { type: "box", size: [24, 1, 8], position: [0, 0, 0] },
      { type: "box", size: [7, 1, 3], position: [1.5, 1.4, -2.4] }
    ],
    obstacles: [{ type: "wall", size: [3, 7, 0.8], position: [0.5, 3.5, -1.6], rotation: [0, 0.2, 0], illusion: true }]
  },
  {
    id: 10,
    name: "Moving Gate",
    camera: C({ theta: 0.82, target: [0, 2.1, 0] }),
    ball: [-10, 1.2, 0],
    pin: [10, 1.3, 0],
    platforms: [{ type: "box", size: [26, 1, 8], position: [0, 0, 0] }],
    obstacles: [
      { type: "movingWall", size: [1, 4, 4], position: [0, 2, 0], moveAxis: "z", range: 3, speed: 1.8 },
      { type: "movingWall", size: [1, 4, 4], position: [4, 2, 0], moveAxis: "z", range: 3, speed: 1.4, phase: 1.4 }
    ]
  },
  {
    id: 11,
    name: "Needle Ridge",
    camera: C({ theta: 1.0, target: [0, 2.4, 0] }),
    ball: [-8, 3.2, 0],
    pin: [8, 3.2, 0],
    platforms: [
      { type: "box", size: [5, 1, 4], position: [-8, 2.5, 0] },
      { type: "box", size: [12, 1, 1.2], position: [0, 2.5, 0] },
      { type: "box", size: [5, 1, 4], position: [8, 2.5, 0] }
    ],
    obstacles: [{ type: "wall", size: [1, 4, 2], position: [0.8, 4.2, 0], rotation: [0, 0.15, 0] }]
  },
  {
    id: 12,
    name: "Final Illusion",
    camera: C({ theta: 0.7, phi: 0.79, target: [0, 3.2, 0], distance: 26 }),
    ball: [-11, 6, -2],
    pin: [10, 1.3, 2],
    platforms: [
      { type: "box", size: [7, 1, 3], position: [-11, 5.3, -2] },
      { type: "ramp", size: [8, 1, 3], position: [-5, 4.1, -1.5], rotation: [0, 0.2, -0.35] },
      { type: "box", size: [6, 1, 2], position: [0, 2.7, 0] },
      { type: "ramp", size: [8, 1, 3], position: [5.2, 2.1, 0.9], rotation: [0, -0.22, 0.31] },
      { type: "box", size: [6, 1, 4], position: [10, 0, 2] }
    ],
    obstacles: [{ type: "movingWall", size: [1, 4, 3.5], position: [2.5, 2.4, 0.2], moveAxis: "x", range: 2.2, speed: 1.1 }]
  }
];

export function generateProceduralLevel(seed = 1, difficulty = 1) {
  const rand = mulberry32(seed);
  const segments = 4 + Math.floor(difficulty * 2);
  const platforms = [];
  const obstacles = [];
  let x = -10;
  let y = 0;
  let z = (rand() - 0.5) * 3;

  platforms.push({ type: "box", size: [6, 1, 4], position: [x, y, z] });
  for (let i = 0; i < segments; i += 1) {
    x += 4 + rand() * 3;
    y += (rand() - 0.45) * 2;
    z += (rand() - 0.5) * 4;
    platforms.push({
      type: rand() > 0.6 ? "ramp" : "box",
      size: [4 + rand() * 3, 1, 2.8 + rand() * 2],
      position: [x, y, z],
      rotation: [0, (rand() - 0.5) * 0.7, (rand() - 0.5) * 0.42]
    });
    if (rand() > 0.66) {
      obstacles.push({
        type: rand() > 0.5 ? "wall" : "movingWall",
        size: [1, 3 + rand() * 2, 2 + rand() * 2.5],
        position: [x - 1.3, y + 1.6, z + (rand() - 0.5) * 2],
        rotation: [0, (rand() - 0.5) * 0.6, 0],
        moveAxis: "z",
        range: 1.6 + rand() * 2,
        speed: 0.8 + rand() * 1.3
      });
    }
  }

  return {
    id: 1000 + seed,
    name: `Generated ${difficulty}`,
    camera: C({ target: [0, 2, 0], distance: 25 }),
    ball: [-10, 1.2, z],
    pin: [x + 2.2, y + 1.3, z],
    platforms,
    obstacles
  };
}

export function getDailyChallengeLevel(date = new Date()) {
  const key = Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
      date.getUTCDate()
    ).padStart(2, "0")}`
  );
  const difficulty = 2 + (key % 4);
  return generateProceduralLevel(key, difficulty);
}

function mulberry32(a) {
  return function seeded() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
