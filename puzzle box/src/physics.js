import * as CANNON from "cannon-es";

const MATERIALS = {
  platform: new CANNON.Material("platform"),
  ball: new CANNON.Material("ball"),
  pin: new CANNON.Material("pin")
};

export function createPhysicsWorld() {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -13, 0)
  });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.48;
  world.defaultContactMaterial.restitution = 0.16;

  world.addContactMaterial(
    new CANNON.ContactMaterial(MATERIALS.ball, MATERIALS.platform, {
      friction: 0.32,
      restitution: 0.34
    })
  );

  world.addContactMaterial(
    new CANNON.ContactMaterial(MATERIALS.ball, MATERIALS.pin, {
      friction: 0.22,
      restitution: 0.42
    })
  );

  return world;
}

export function buildLevelBodies(world, level) {
  const staticBodies = [];
  const movingBodies = [];

  for (const platform of level.platforms || []) {
    if (platform.type === "arc") {
      staticBodies.push(...createArcBodies(world, platform));
      continue;
    }
    if (platform.type === "spiral") {
      staticBodies.push(...createSpiralBodies(world, platform));
      continue;
    }
    staticBodies.push(createBoxBody(world, platform, MATERIALS.platform));
  }

  for (const obstacle of level.obstacles || []) {
    const body = createBoxBody(world, obstacle, MATERIALS.platform);
    if (obstacle.type === "movingWall") {
      body.type = CANNON.Body.KINEMATIC;
      body.updateMassProperties();
      body.userData = {
        basePosition: body.position.clone(),
        axis: obstacle.moveAxis || "x",
        range: obstacle.range || 2,
        speed: obstacle.speed || 1,
        phase: obstacle.phase || 0
      };
      movingBodies.push(body);
    }
    staticBodies.push(body);
  }

  const ballBody = createBallBody(world, level.ball);
  const pinBody = createPinBody(world, level.pin);
  pinBody.name = "pin";
  freezeGameplayBodies(ballBody, pinBody, level.ball, level.pin);

  return { ballBody, pinBody, staticBodies, movingBodies };
}

export function freezeGameplayBodies(ballBody, pinBody, ballSpawn, pinSpawn) {
  resetBody(ballBody, ballSpawn);
  resetBody(pinBody, pinSpawn);
  ballBody.type = CANNON.Body.KINEMATIC;
  pinBody.type = CANNON.Body.KINEMATIC;
  ballBody.updateMassProperties();
  pinBody.updateMassProperties();
  ballBody.userData = { ...(ballBody.userData || {}), frozen: true };
  pinBody.userData = { ...(pinBody.userData || {}), frozen: true };
}

export function unfreezeGameplayBodies(ballBody, pinBody) {
  ballBody.type = CANNON.Body.DYNAMIC;
  pinBody.type = CANNON.Body.DYNAMIC;
  ballBody.updateMassProperties();
  pinBody.updateMassProperties();
  ballBody.userData = { ...(ballBody.userData || {}), frozen: false };
  pinBody.userData = { ...(pinBody.userData || {}), frozen: false };
  ballBody.wakeUp();
  pinBody.wakeUp();
}

export function resetBody(body, position, quaternion = null) {
  body.position.set(position[0], position[1], position[2]);
  if (quaternion) {
    body.quaternion.copy(quaternion);
  } else {
    body.quaternion.set(0, 0, 0, 1);
  }
  body.velocity.setZero();
  body.angularVelocity.setZero();
  body.force.setZero();
  body.torque.setZero();
  body.sleepState = 0;
}

export function applyLaunchImpulse(ballBody, pinBody, direction, power) {
  unfreezeGameplayBodies(ballBody, pinBody);
  const impulse = new CANNON.Vec3(direction.x * power, Math.max(0.3, power * 0.05), direction.z * power);
  ballBody.wakeUp();
  ballBody.applyImpulse(impulse, ballBody.position);
}

export function updateMovingBodies(movingBodies, elapsedSeconds) {
  for (const body of movingBodies) {
    const data = body.userData;
    const shift = Math.sin(elapsedSeconds * data.speed + data.phase) * data.range;
    body.position.copy(data.basePosition);
    body.position[data.axis] += shift;
    body.velocity.setZero();
    body.angularVelocity.setZero();
  }
}

export function settleLevelBodies(world, levelBodies, steps = 8) {
  for (let i = 0; i < steps; i += 1) {
    world.step(1 / 120);
  }
  for (const body of levelBodies.movingBodies) {
    body.aabbNeedsUpdate = true;
    body.updateAABB();
  }
}

export function isPinKnocked(pinBody) {
  if (pinBody.userData?.frozen) return false;
  const up = new CANNON.Vec3(0, 1, 0);
  const pinUp = pinBody.quaternion.vmult(up);
  const fallen = pinUp.y < 0.75;
  const moving = pinBody.velocity.lengthSquared() > 0.12;
  return fallen || (pinBody.position.y < 0.8 && moving);
}

function createBoxBody(world, desc, material) {
  const [sx, sy, sz] = desc.size;
  const body = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)),
    material
  });
  body.position.set(desc.position[0], desc.position[1], desc.position[2]);
  const r = desc.rotation || [0, 0, 0];
  body.quaternion.setFromEuler(r[0], r[1], r[2], "XYZ");
  body.aabbNeedsUpdate = true;
  body.updateAABB();
  world.addBody(body);
  return body;
}

function createBallBody(world, start) {
  const body = new CANNON.Body({
    mass: 1.5,
    shape: new CANNON.Sphere(0.65),
    material: MATERIALS.ball,
    linearDamping: 0.14,
    angularDamping: 0.16
  });
  body.position.set(start[0], start[1], start[2]);
  body.ccdSpeedThreshold = 0.5;
  body.ccdIterations = 4;
  world.addBody(body);
  return body;
}

function createPinBody(world, start) {
  const shape = new CANNON.Cylinder(0.36, 0.22, 1.6, 12);
  const body = new CANNON.Body({
    mass: 0.9,
    shape,
    material: MATERIALS.pin,
    linearDamping: 0.3,
    angularDamping: 0.34
  });
  body.position.set(start[0], start[1], start[2]);
  world.addBody(body);
  return body;
}

function createArcBodies(world, arc) {
  const out = [];
  const segments = Math.max(8, arc.segments || 16);
  const delta = (arc.end - arc.start) / segments;
  const halfHeight = (arc.height || 1) / 2;
  const track = arc.track || "inner";

  for (let i = 0; i < segments; i += 1) {
    const t = arc.start + (i + 0.5) * delta;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const cx = arc.center[0];
    const cy = arc.center[1];
    const cz = arc.center[2];
    const r = arc.radius;

    const px = cx + cosT * r;
    const py = cy + sinT * r;
    const radialOutX = cosT;
    const radialOutY = sinT;
    const offset = track === "inner" ? halfHeight : -halfHeight;

    const piece = {
      size: [Math.max(1.0, Math.abs(delta) * r * 1.08), arc.height || 1, arc.width || 4],
      position: [px + radialOutX * offset, py + radialOutY * offset, cz],
      rotation: [0, 0, Math.atan2(Math.cos(t), -Math.sin(t))]
    };
    out.push(createBoxBody(world, piece, MATERIALS.platform));
  }
  return out;
}

function createSpiralBodies(world, spiral) {
  const out = [];
  const segments = Math.max(16, spiral.segments || 40);
  const maxAngle = spiral.turns * Math.PI * 2;
  for (let i = 0; i < segments; i += 1) {
    const t = (i / (segments - 1)) * maxAngle;
    const y = spiral.center[1] - (i / (segments - 1)) * spiral.drop;
    const x = spiral.center[0] + Math.cos(t) * spiral.radius;
    const z = spiral.center[2] + Math.sin(t) * spiral.radius;
    const tangentYaw = -t + Math.PI / 2;
    out.push(
      createBoxBody(
        world,
        {
          size: [1.4, 1, spiral.width || 4],
          position: [x, y, z],
          rotation: [0, tangentYaw, -0.05]
        },
        MATERIALS.platform
      )
    );
  }
  return out;
}
