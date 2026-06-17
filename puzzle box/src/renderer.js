import * as THREE from "three";

export function createRenderer(canvas, settings) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = settings.shadowQuality !== "off";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xefe4d0);
  scene.fog = new THREE.Fog(0xefe4d0, 30, 82);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfff0d5, 0.95);
  key.position.set(15, 24, 14);
  key.castShadow = settings.shadowQuality !== "off";
  key.shadow.mapSize.width = settings.shadowQuality === "high" ? 2048 : 1024;
  key.shadow.mapSize.height = settings.shadowQuality === "high" ? 2048 : 1024;
  key.shadow.camera.left = -30;
  key.shadow.camera.right = 30;
  key.shadow.camera.top = 30;
  key.shadow.camera.bottom = -30;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 80;
  scene.add(key);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9c8aa, 0.48);
  scene.add(hemi);

  const materials = {
    platform: new THREE.MeshStandardMaterial({ color: 0xffd94f, roughness: 0.58, metalness: 0.06 }),
    platformIllusion: new THREE.MeshStandardMaterial({
      color: 0xffd94f,
      roughness: 0.65,
      metalness: 0.02,
      transparent: true,
      opacity: 0.72
    }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf9ca24, roughness: 0.62, metalness: 0.05 }),
    ball: new THREE.MeshStandardMaterial({ color: 0xee5a23, roughness: 0.2, metalness: 0.45 }),
    pin: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.08 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xdc2f2f, roughness: 0.4, metalness: 0.05 }),
    ghost: new THREE.LineBasicMaterial({ color: 0xcc5533, transparent: true, opacity: 0.5 })
  };

  const aimLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: 0x333333 })
  );
  aimLine.visible = false;
  scene.add(aimLine);

  const worldRoot = new THREE.Group();
  scene.add(worldRoot);

  return { renderer, scene, camera, worldRoot, materials, aimLine };
}

export function applyCameraConfig(camera, cameraRig, config) {
  cameraRig.theta = config.theta;
  cameraRig.phi = config.phi;
  cameraRig.distance = config.distance;
  cameraRig.target.set(config.target[0], config.target[1], config.target[2]);
  updateCamera(camera, cameraRig, 1);
}

export function updateCamera(camera, cameraRig, lerp = 0.12) {
  const theta = cameraRig.theta;
  const phi = THREE.MathUtils.clamp(cameraRig.phi, 0.25, 1.45);
  const radius = THREE.MathUtils.clamp(cameraRig.distance, 8, 52);
  const target = cameraRig.target;

  const desired = new THREE.Vector3(
    target.x + Math.cos(theta) * Math.cos(phi) * radius,
    target.y + Math.sin(phi) * radius,
    target.z + Math.sin(theta) * Math.cos(phi) * radius
  );
  camera.position.lerp(desired, lerp);
  camera.lookAt(target);
}

export function clearLevelVisuals(worldRoot) {
  while (worldRoot.children.length > 0) {
    const child = worldRoot.children.pop();
    disposeObject(child);
  }
}

export function buildLevelVisuals(worldRoot, levelState, materials) {
  const bodyMeshMap = new Map();

  for (const body of levelState.staticBodies) {
    const shape = body.shapes[0];
    let mesh;
    if (shape.type === 4) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2),
        body.userData?.illusion ? materials.platformIllusion : materials.platform
      );
    } else {
      continue;
    }
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    worldRoot.add(mesh);
    bodyMeshMap.set(body, mesh);
  }

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 24), materials.ball);
  ball.castShadow = true;
  ball.receiveShadow = true;
  ball.position.copy(levelState.ballBody.position);
  worldRoot.add(ball);
  bodyMeshMap.set(levelState.ballBody, ball);

  const pinGroup = new THREE.Group();
  const pinBodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 1.6, 16), materials.pin);
  pinBodyMesh.castShadow = true;
  pinBodyMesh.receiveShadow = true;
  pinGroup.add(pinBodyMesh);
  const stripe1 = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 10, 22), materials.stripe);
  stripe1.rotation.x = Math.PI / 2;
  stripe1.position.y = 0.35;
  const stripe2 = stripe1.clone();
  stripe2.position.y = 0.08;
  pinGroup.add(stripe1, stripe2);
  pinGroup.position.copy(levelState.pinBody.position);
  pinGroup.quaternion.copy(levelState.pinBody.quaternion);
  worldRoot.add(pinGroup);
  bodyMeshMap.set(levelState.pinBody, pinGroup);

  const ghostGeometry = new THREE.BufferGeometry();
  ghostGeometry.setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const ghostLine = new THREE.Line(ghostGeometry, materials.ghost);
  ghostLine.visible = false;
  worldRoot.add(ghostLine);

  return { bodyMeshMap, ghostLine };
}

export function syncVisuals(bodyMeshMap) {
  for (const [body, mesh] of bodyMeshMap.entries()) {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }
}

export function setAimLine(aimLine, from, to, visible) {
  aimLine.visible = visible;
  if (!visible) return;
  const pts = [new THREE.Vector3(from.x, from.y, from.z), new THREE.Vector3(to.x, to.y, to.z)];
  aimLine.geometry.setFromPoints(pts);
}

export function setGhostTrail(line, points) {
  if (!line) return;
  if (!points || points.length < 2) {
    line.visible = false;
    return;
  }
  const vectors = points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  line.geometry.setFromPoints(vectors);
  line.visible = true;
}

function disposeObject(obj) {
  if (!obj) return;
  obj.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
  });
}
