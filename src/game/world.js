const BOTTLE_TYPES = [
  { brand: "HOPHEX", points: 1 },
  { brand: "MOONMALT", points: 1 },
  { brand: "FROTHFOX", points: 2 },
  { brand: "BRASSHOP", points: 2 },
  { brand: "KEGNOVA", points: 3 },
  { brand: "TALLTALE", points: 5 },
];

const POWER_TYPES = {
  rainbow: { brand: "RAINBOW", points: 5, frame: 0, kind: "rainbow", sheet: "power" },
  frozen: { brand: "FROZEN", points: 3, frame: 1, kind: "frozen", sheet: "power" },
  golden: { brand: "GOLDEN", points: 4, frame: 0, kind: "golden", sheet: "extraPower" },
  time: { brand: "TIME", points: 3, frame: 1, kind: "time", sheet: "extraPower" },
  shockwave: { brand: "SHOCK", points: 5, frame: 2, kind: "shockwave", sheet: "extraPower" },
};

const POWER_POOL = Object.values(POWER_TYPES);

const clamp = (min, value, max) => Math.max(min, Math.min(value, max));
const random = (min, max) => min + Math.random() * (max - min);

function pointToSegmentDistanceSquared(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) {
    const rx = px - ax;
    const ry = py - ay;
    return rx * rx + ry * ry;
  }
  const t = clamp(0, ((px - ax) * dx + (py - ay) * dy) / lengthSquared, 1);
  const projX = ax + dx * t;
  const projY = ay + dy * t;
  const rx = px - projX;
  const ry = py - projY;
  return rx * rx + ry * ry;
}

function crossProduct(p1, p2, p3) {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

function segmentsIntersect(a, b, c, d) {
  const cp1 = crossProduct(a, b, c);
  const cp2 = crossProduct(a, b, d);
  const cp3 = crossProduct(c, d, a);
  const cp4 = crossProduct(c, d, b);

  if (((cp1 > 0 && cp2 < 0) || (cp1 < 0 && cp2 > 0))
      && ((cp3 > 0 && cp4 < 0) || (cp3 < 0 && cp4 > 0))) {
    return true;
  }
  return false;
}

function segmentToSegmentDistanceSquared(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegmentDistanceSquared(a.x, a.y, c.x, c.y, d.x, d.y),
    pointToSegmentDistanceSquared(b.x, b.y, c.x, c.y, d.x, d.y),
    pointToSegmentDistanceSquared(c.x, c.y, a.x, a.y, b.x, b.y),
    pointToSegmentDistanceSquared(d.x, d.y, a.x, a.y, b.x, b.y),
  );
}

function bottleTouchesSegment(bottle, a, b) {
  const halfHeight = bottle.size * 0.46;
  const halfWidth = bottle.size * 0.24;
  const slashRadius = Math.max(14, bottle.size * 0.12);
  const thresholdRadius = halfWidth + slashRadius;

  const sin = Math.sin(bottle.angle);
  const cos = Math.cos(bottle.angle);

  const axisX = -sin * halfHeight;
  const axisY = cos * halfHeight;

  const c = { x: bottle.x - axisX, y: bottle.y - axisY };
  const d = { x: bottle.x + axisX, y: bottle.y + axisY };

  return segmentToSegmentDistanceSquared(a, b, c, d) <= thresholdRadius * thresholdRadius;
}

function bottleData(frame) {
  return { frame, ...BOTTLE_TYPES[frame], kind: "regular", sheet: "regular" };
}

export function createWorld(config) {
  return {
    config,
    width: 1,
    height: 1,
    active: false,
    paused: false,
    ended: false,
    elapsed: 0,
    idleTime: 0,
    timeLeft: config.roundDuration,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    spawnTimer: 0,
    frenzyTimer: 0,
    freezeTimer: 0,
    doublePointsTimer: 0,
    shockwaveTimer: 0,
    shockwaveX: 0,
    shockwaveY: 0,
    powerCooldown: 0,
    strokeId: 0,
    activeStroke: null,
    bottles: [],
    bursts: [],
    shards: [],
    scorePops: [],
    trail: [],
    shake: 0,
    milestoneTimer: 0,
    milestoneText: "",
    lastCallShown: false,
    onHit: null,
  };
}

export function setWorldSize(world, width, height) {
  world.width = width;
  world.height = height;
}

export function prepareIdle(world) {
  const size = clamp(68, Math.min(world.width, world.height) * 0.20, 112);
  world.active = false;
  world.ended = false;
  world.bottles = [
    { x: world.width * 0.18, y: world.height * 0.75, size, angle: -0.18, ...bottleData(0), idlePhase: 0 },
    { x: world.width * 0.50, y: world.height * 0.82, size: size * 1.04, angle: 0.12, ...POWER_TYPES.rainbow, idlePhase: 1.8 },
    { x: world.width * 0.82, y: world.height * 0.75, size: size * 0.98, angle: 0.24, ...POWER_TYPES.frozen, idlePhase: 3.5 },
  ];
  world.bursts = [];
  world.shards = [];
  world.scorePops = [];
  world.trail = [];
}

export function resetRound(world, best) {
  world.active = true;
  world.paused = false;
  world.ended = false;
  world.elapsed = 0;
  world.timeLeft = world.config.roundDuration;
  world.score = 0;
  world.best = best;
  world.combo = 0;
  world.comboTimer = 0;
  world.maxCombo = 0;
  world.spawnTimer = 0.18;
  world.frenzyTimer = 0;
  world.freezeTimer = 0;
  world.doublePointsTimer = 0;
  world.shockwaveTimer = 0;
  world.powerCooldown = 5;
  world.activeStroke = null;
  world.bottles = [];
  world.bursts = [];
  world.shards = [];
  world.scorePops = [];
  world.trail = [];
  world.shake = 0;
  world.milestoneTimer = 0;
  world.milestoneText = "";
  world.lastCallShown = false;
}

function spawnBottle(world, originOverride, allowPower = true) {
  const origins = world.frenzyTimer > 0 ? ["left", "right", "top"] : ["left", "right"];
  const origin = originOverride ?? origins[Math.floor(Math.random() * origins.length)];
  const size = clamp(76, Math.min(world.width, world.height) * random(0.205, 0.245), 126);
  const frame = Math.floor(Math.random() * BOTTLE_TYPES.length);
  let type = bottleData(frame);
  if (allowPower && world.elapsed > 6 && world.powerCooldown <= 0 && Math.random() < 0.07) {
    type = POWER_POOL[Math.floor(Math.random() * POWER_POOL.length)];
    world.powerCooldown = 6.5;
  }
  const fromTop = origin === "top";
  const fromLeft = origin === "left";
  world.bottles.push({
    x: fromTop ? world.width * random(0.2, 0.8) : (fromLeft ? -size * 0.55 : world.width + size * 0.55),
    y: fromTop ? -size * 0.62 : world.height * random(0.32, 0.58),
    vx: fromTop ? world.width * random(-0.16, 0.16) : (fromLeft ? 1 : -1) * world.width * random(0.58, 0.78),
    vy: fromTop ? world.height * random(0.16, 0.26) : -world.height * random(0.18, 0.28),
    size: type.kind === "regular" ? size : size * 1.08,
    angle: random(-0.32, 0.32),
    spin: random(1.35, 2.8) * (Math.random() < 0.5 ? -1 : 1),
    ...type,
  });
}

function updateShards(world, dt) {
  const gravity = world.height * 1.65;
  for (const shard of world.shards) {
    shard.age += dt;
    if (shard.settled) continue;
    shard.vy += gravity * dt;
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;
    shard.angle += shard.spin * dt;
    const floor = world.height - shard.floorOffset;
    if (shard.y < floor) continue;
    shard.y = floor;
    if (shard.bounces === 0 && shard.vy > world.height * 0.18) {
      shard.vy *= -0.24;
      shard.vx *= 0.58;
      shard.spin *= 0.7;
      shard.bounces = 1;
    } else {
      shard.vy = 0;
      shard.vx = 0;
      shard.spin = 0;
      shard.settled = true;
    }
  }
  world.shards = world.shards.filter((shard) => shard.age < 8 && shard.x > -80 && shard.x < world.width + 80);
  if (world.shards.length > 150) world.shards.splice(0, world.shards.length - 150);
}

export function updateWorld(world, dt) {
  if (world.paused) return false;
  world.idleTime += dt;
  world.trail = world.trail.filter((point) => world.idleTime - point.time < 0.24);
  world.bursts.forEach((burst) => { burst.age += dt; });
  world.bursts = world.bursts.filter((burst) => burst.age < 0.52);
  world.scorePops.forEach((popup) => { popup.age += dt; });
  world.scorePops = world.scorePops.filter((popup) => popup.age < 0.75);
  updateShards(world, dt);
  world.shake = Math.max(0, world.shake - dt * 28);
  world.comboTimer = Math.max(0, world.comboTimer - dt);
  world.milestoneTimer = Math.max(0, world.milestoneTimer - dt);
  world.shockwaveTimer = Math.max(0, world.shockwaveTimer - dt);

  if (!world.active) return false;

  const clockFrozen = world.freezeTimer > 0;
  world.freezeTimer = Math.max(0, world.freezeTimer - dt);
  if (!clockFrozen) world.elapsed += dt;
  world.frenzyTimer = Math.max(0, world.frenzyTimer - dt);
  world.doublePointsTimer = Math.max(0, world.doublePointsTimer - dt);
  world.powerCooldown = Math.max(0, world.powerCooldown - dt);
  world.timeLeft = Math.max(0, world.config.roundDuration - world.elapsed);

  if (world.elapsed >= world.config.roundDuration) {
    world.active = false;
    world.ended = true;
    world.activeStroke = null;
    world.bottles = [];
    world.trail = [];
    return true;
  }

  if (world.elapsed >= world.config.roundDuration - 20 && !world.lastCallShown) {
    world.lastCallShown = true;
    world.milestoneText = "LAST CALL!";
    world.milestoneTimer = 1.4;
  }

  const gravity = world.height * world.config.gravityScale;
  for (const bottle of world.bottles) {
    bottle.vy += gravity * dt;
    bottle.x += bottle.vx * dt;
    bottle.y += bottle.vy * dt;
    bottle.angle += bottle.spin * dt;
  }
  world.bottles = world.bottles.filter((bottle) => (
    bottle.y < world.height + bottle.size * 0.8
    && bottle.x > -bottle.size * 1.4
    && bottle.x < world.width + bottle.size * 1.4
  ));

  if (world.trail.length > 0 && world.bottles.length > 0) {
    for (let i = 0; i < world.trail.length; i += 1) {
      const p1 = world.trail[i];
      const p2 = world.trail[i + 1] || p1;
      const result = sliceSegment(world, p1, p2);
      if (result.hits.length && world.onHit) {
        world.onHit(result);
      }
      if (!world.bottles.length) break;
    }
  }

  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    const progress = clamp(0, world.elapsed / world.config.roundDuration, 1);
    let batch = 1;
    if (progress > 0.38 && Math.random() < 0.2 + progress * 0.22) batch += 1;
    if (progress > 0.78 && Math.random() < 0.28) batch += 1;
    for (let i = 0; i < batch; i += 1) spawnBottle(world);
    const interval = world.config.spawnStart + (world.config.spawnEnd - world.config.spawnStart) * progress;
    world.spawnTimer = interval * (world.frenzyTimer > 0 ? 0.46 : 1) * random(0.82, 1.12);
  }

  return false;
}

export function addTrailPoint(world, x, y) {
  world.trail.push({ x, y, time: world.idleTime });
}

export function setPaused(world, paused) {
  world.paused = Boolean(paused);
  if (world.paused) world.activeStroke = null;
}

export function beginSliceStroke(world) {
  world.strokeId += 1;
  world.activeStroke = {
    id: world.strokeId,
    count: 0,
    baseTotal: 0,
    awarded: 0,
    bonus: 0,
    scoreBoost: world.doublePointsTimer > 0 ? 2 : 1,
    xTotal: 0,
    yTotal: 0,
  };
}

export function endSliceStroke(world) {
  world.activeStroke = null;
}

function spawnBottleShards(world, bottle) {
  const count = Math.round(random(7, 11) * world.config.effectsIntensity);
  for (let i = 0; i < count; i += 1) {
    world.shards.push({
      x: bottle.x + random(-bottle.size * 0.08, bottle.size * 0.08),
      y: bottle.y + random(-bottle.size * 0.12, bottle.size * 0.12),
      vx: random(-world.width * 0.3, world.width * 0.3),
      vy: random(-world.height * 0.42, -world.height * 0.08),
      size: random(bottle.size * 0.12, bottle.size * 0.28),
      frame: bottle.kind === "frozen"
        ? (i % 2 === 0 ? 2 : 3)
        : (bottle.kind === "rainbow" ? i % BOTTLE_TYPES.length : (bottle.frame + i) % BOTTLE_TYPES.length),
      angle: random(-Math.PI, Math.PI),
      spin: random(-8, 8),
      floorOffset: random(8, 28),
      bounces: 0,
      settled: false,
      age: 0,
    });
  }
}

function addBottleBreak(world, bottle) {
  world.bursts.push({
    x: bottle.x,
    y: bottle.y,
    size: bottle.size,
    angle: bottle.angle,
    age: 0,
  });
  spawnBottleShards(world, bottle);
}

export function sliceSegment(world, a, b) {
  if (!world.active || world.paused) return { hits: [], multiplier: 1, pointsAdded: 0, powers: [] };
  if (!world.activeStroke) beginSliceStroke(world);
  const hits = world.bottles.filter((bottle) => bottleTouchesSegment(bottle, a, b));
  if (!hits.length) return { hits, multiplier: world.activeStroke.count || 1, pointsAdded: 0 };

  const hitSet = new Set(hits);
  world.bottles = world.bottles.filter((bottle) => !hitSet.has(bottle));
  const stroke = world.activeStroke;
  const powers = [];
  for (const bottle of hits) {
    stroke.count += 1;
    stroke.baseTotal += bottle.points;
    stroke.xTotal += bottle.x;
    stroke.yTotal += bottle.y;
    addBottleBreak(world, bottle);
    if (bottle.kind === "rainbow") {
      powers.push("rainbow");
      world.frenzyTimer = Math.max(world.frenzyTimer, 8);
      world.spawnTimer = 0.04;
      world.milestoneText = "RAINBOW RUSH!";
      world.milestoneTimer = 1.5;
      spawnBottle(world, "left", false);
      spawnBottle(world, "right", false);
      spawnBottle(world, "top", false);
    } else if (bottle.kind === "frozen") {
      powers.push("frozen");
      world.freezeTimer = Math.max(world.freezeTimer, 4.5);
      world.milestoneText = "CLOCK FROZEN!";
      world.milestoneTimer = 1.5;
    } else if (bottle.kind === "golden") {
      powers.push("golden");
      world.doublePointsTimer = Math.max(world.doublePointsTimer, 7);
      stroke.scoreBoost = 2;
      world.milestoneText = "DOUBLE POINTS!";
      world.milestoneTimer = 1.5;
    } else if (bottle.kind === "time") {
      powers.push("time");
      world.elapsed = Math.max(0, world.elapsed - 5);
      world.timeLeft = Math.max(0, world.config.roundDuration - world.elapsed);
      world.milestoneText = "+5 SECONDS!";
      world.milestoneTimer = 1.5;
    } else if (bottle.kind === "shockwave") {
      powers.push("shockwave");
      const victims = world.bottles.filter((candidate) => candidate.kind === "regular");
      const victimSet = new Set(victims);
      world.bottles = world.bottles.filter((candidate) => !victimSet.has(candidate));
      for (const victim of victims) {
        stroke.bonus += victim.points;
        addBottleBreak(world, victim);
      }
      world.shockwaveX = bottle.x;
      world.shockwaveY = bottle.y;
      world.shockwaveTimer = 0.7;
      world.milestoneText = "SHOCKWAVE!";
      world.milestoneTimer = 1.2;
    }
  }

  const multiplier = stroke.count;
  const totalStrokePoints = (stroke.baseTotal * multiplier + stroke.bonus) * stroke.scoreBoost;
  const pointsAdded = totalStrokePoints - stroke.awarded;
  stroke.awarded = totalStrokePoints;
  world.score += pointsAdded;
  world.combo = multiplier;
  world.comboTimer = 0.85;
  world.maxCombo = Math.max(world.maxCombo, multiplier);
  world.shake = Math.min(11, world.shake + (2.4 + hits.length * 1.5) * world.config.effectsIntensity);

  let popup = world.scorePops.find((item) => item.strokeId === stroke.id);
  if (!popup) {
    popup = { strokeId: stroke.id, age: 0 };
    world.scorePops.push(popup);
  }
  popup.x = stroke.xTotal / stroke.count;
  popup.y = stroke.yTotal / stroke.count;
  popup.points = totalStrokePoints;
  popup.multiplier = multiplier;
  popup.age = 0;

  return { hits, multiplier, pointsAdded, totalStrokePoints, powers };
}
