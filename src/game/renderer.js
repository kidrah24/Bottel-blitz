import { prepareIdle, setWorldSize } from "./world.js";

function coverRect(image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  return { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight };
}

function drawFrame(ctx, image, frame, width, height) {
  const crop = frame.content || frame.source;
  ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, -width / 2, -height / 2, width, height);
}

function drawBottle(ctx, assetSet, bottle, idleTime) {
  const isPower = bottle.kind !== "regular";
  const frames = bottle.sheet === "extraPower"
    ? assetSet.extraPowerBottleFrames
    : (isPower ? assetSet.powerBottleFrames : assetSet.bottleFrames);
  const image = bottle.sheet === "extraPower"
    ? assetSet.extraPowerBottles
    : (isPower ? assetSet.powerBottles : assetSet.bottles);
  const frame = frames[bottle.frame];
  const crop = frame.content || frame.source;
  const bob = bottle.idlePhase === undefined ? 0 : Math.sin(idleTime * 1.7 + bottle.idlePhase) * 7;
  const idleTilt = bottle.idlePhase === undefined ? 0 : Math.sin(idleTime * 1.15 + bottle.idlePhase) * 0.035;
  const height = bottle.size;
  const width = height * crop.w / crop.h;
  ctx.save();
  ctx.translate(bottle.x, bottle.y + bob);
  ctx.rotate(bottle.angle + idleTilt);
  if (isPower) {
    const auraColors = {
      frozen: "rgba(116, 235, 255, .38)",
      rainbow: "rgba(255, 223, 77, .34)",
      golden: "rgba(255, 196, 54, .42)",
      time: "rgba(155, 255, 88, .38)",
      shockwave: "rgba(224, 75, 255, .4)",
    };
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, height * 0.7);
    halo.addColorStop(0, auraColors[bottle.kind] || auraColors.rainbow);
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(-height * 0.75, -height * 0.75, height * 1.5, height * 1.5);

    ctx.save();
    ctx.rotate(-bottle.angle - idleTilt);
    ctx.lineWidth = Math.max(2, height * 0.018);
    ctx.strokeStyle = bottle.kind === "frozen"
      ? "rgba(180, 248, 255, .8)"
      : (bottle.kind === "shockwave" ? "rgba(245, 144, 255, .82)" : "rgba(255, 240, 135, .76)");
    ctx.setLineDash([height * 0.07, height * 0.055]);
    ctx.lineDashOffset = -idleTime * height * 0.18;
    ctx.beginPath();
    ctx.ellipse(0, 0, height * 0.34, height * 0.56, idleTime * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 6; i += 1) {
      const phase = idleTime * (bottle.kind === "frozen" ? -1.5 : 2.2) + i * Math.PI / 3;
      const px = Math.cos(phase) * height * 0.38;
      const py = Math.sin(phase) * height * 0.5;
      const sparkle = height * (i % 2 ? 0.025 : 0.036);
      const sparkleColors = {
        frozen: "rgba(215, 253, 255, .92)",
        golden: "rgba(255, 226, 104, .92)",
        time: "rgba(183, 255, 111, .92)",
        shockwave: "rgba(246, 137, 255, .92)",
      };
      ctx.fillStyle = bottle.kind === "rainbow"
        ? `hsla(${(i * 60 + idleTime * 90) % 360}, 95%, 68%, .9)`
        : (sparkleColors[bottle.kind] || sparkleColors.golden);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-sparkle / 2, -sparkle / 2, sparkle, sparkle);
      ctx.restore();
    }
    ctx.restore();
  }
  drawFrame(ctx, image, frame, width, height);

  const labelWidth = width * 0.38;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (isPower) {
    const powerCenterY = bottle.sheet === "extraPower"
      ? (bottle.frame === 1 ? height * 0.08 : height * 0.14)
      : height * 0.08;
    const ptsFontSize = Math.max(9, height * 0.075);
    ctx.font = `900 ${ptsFontSize}px "Barlow Condensed", sans-serif`;
    ctx.fillStyle = "#fff8d4";
    ctx.strokeStyle = "#082729";
    ctx.lineWidth = Math.max(2, height * 0.015);
    ctx.strokeText(`${bottle.points} PTS`, 0, powerCenterY, labelWidth);
    ctx.fillText(`${bottle.points} PTS`, 0, powerCenterY, labelWidth);
  } else {
    const labelOffsets = [
      { dx: width * 0.0925, dy: height * 0.200 },
      { dx: width * 0.0038, dy: height * 0.168 },
      { dx: -width * 0.170, dy: height * 0.252 },
      { dx: width * 0.0961, dy: height * 0.148 },
      { dx: -width * 0.007, dy: height * 0.138 },
      { dx: -width * 0.115, dy: height * 0.076 },
    ];

    const offset = labelOffsets[bottle.frame] || { dx: 0, dy: height * 0.15 };
    const centerX = offset.dx;
    const centerY = offset.dy;

    const brandFontSize = Math.max(6, height * 0.040);
    const ptsFontSize = Math.max(7, height * 0.052);
    const brandY = centerY - height * 0.026;
    const ptsY = centerY + height * 0.030;

    const labelStyles = [
      { text: "#143820", stroke: null },
      { text: "#fff5c2", stroke: "#3a0505", strokeWidth: height * 0.012 },
      { text: "#fff7d0", stroke: "#0b233e", strokeWidth: height * 0.014 },
      { text: "#092c30", stroke: null },
      { text: "#2d1808", stroke: null },
      { text: "#fff9d6", stroke: "#4d1d00", strokeWidth: height * 0.012 },
    ];

    const style = labelStyles[bottle.frame] || { text: "#173b3a", stroke: null };

    ctx.font = `900 ${brandFontSize}px "Barlow Condensed", sans-serif`;
    if (style.stroke) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = Math.max(1.5, style.strokeWidth || 2);
      ctx.strokeText(bottle.brand, centerX, brandY, labelWidth);
    }
    ctx.fillStyle = style.text;
    ctx.fillText(bottle.brand, centerX, brandY, labelWidth);

    ctx.font = `900 ${ptsFontSize}px "Barlow Condensed", sans-serif`;
    if (style.stroke) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = Math.max(1.5, style.strokeWidth || 2);
      ctx.strokeText(`${bottle.points} PTS`, centerX, ptsY, labelWidth);
    }
    ctx.fillStyle = style.text;
    ctx.fillText(`${bottle.points} PTS`, centerX, ptsY, labelWidth);
  }
  ctx.restore();
}

function drawShard(ctx, assetSet, shard) {
  const frame = assetSet.shardFrames[shard.frame];
  const crop = frame.content || frame.source;
  const width = shard.size * crop.w / crop.h;
  const fade = shard.age > 6.5 ? Math.max(0, (8 - shard.age) / 1.5) : 1;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.angle);
  drawFrame(ctx, assetSet.shards, frame, width, shard.size);
  ctx.restore();
}

function drawBurst(ctx, assetSet, burst) {
  const index = Math.min(assetSet.shatterFrames.length - 1, Math.floor(burst.age / 0.075));
  const frame = assetSet.shatterFrames[index];
  const crop = frame.content || frame.source;
  const size = burst.size * (1.5 + Math.min(1, burst.age * 5) * 0.75);
  const width = size * crop.w / crop.h;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - burst.age / 0.55);
  ctx.translate(burst.x, burst.y);
  ctx.rotate(burst.angle * 0.25);
  drawFrame(ctx, assetSet.shatter, frame, width, size);
  ctx.restore();

}

function drawScorePopup(ctx, popup, world) {
  const alpha = Math.max(0, 1 - popup.age / 0.75);
  const lift = popup.age * 58;
  const baseSize = Math.min(world.width, world.height) * (popup.multiplier > 1 ? 0.065 : 0.052);
  const size = Math.max(16, Math.min(34, baseSize));
  const text = popup.multiplier > 1
    ? `+${popup.points}  x${popup.multiplier}`
    : `+${popup.points}`;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "#092628";
  ctx.lineWidth = 6;
  ctx.fillStyle = popup.multiplier > 1 ? "#43eee7" : "#fff1a6";
  ctx.strokeText(text, popup.x, popup.y - 44 - lift);
  ctx.fillText(text, popup.x, popup.y - 44 - lift);
  ctx.restore();
}

function drawTrail(ctx, world) {
  if (world.trail.length < 2) return;
  const now = world.idleTime;
  const layers = [
    { width: 18, color: "rgba(54, 226, 255, .18)" },
    { width: 8, color: "rgba(68, 232, 255, .72)" },
    { width: 2.5, color: "rgba(255, 255, 235, .98)" },
  ];
  for (const layer of layers) {
    ctx.beginPath();
    let started = false;
    for (const point of world.trail) {
      if (now - point.time > 0.24) continue;
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.width * world.config.effectsIntensity;
    ctx.stroke();
  }
}

function drawPowerOverlay(ctx, world, width, height) {
  if (world.frenzyTimer > 0) {
    const rainbow = ctx.createLinearGradient(0, 0, width, 0);
    rainbow.addColorStop(0, "#ff4a4a");
    rainbow.addColorStop(0.2, "#ffb52e");
    rainbow.addColorStop(0.4, "#f5f04d");
    rainbow.addColorStop(0.6, "#43e896");
    rainbow.addColorStop(0.8, "#4bb8ff");
    rainbow.addColorStop(1, "#b75cff");
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = rainbow;
    ctx.fillRect(0, 0, width, 5);
    ctx.fillRect(0, height - 5, width, 5);
    for (let i = 0; i < 10; i += 1) {
      const phase = world.idleTime * 1.8 + i * 2.41;
      const x = ((i * 0.173 + world.idleTime * 0.035) % 1) * width;
      const y = height * (0.15 + ((Math.sin(phase) + 1) * 0.34));
      const size = 2.5 + (i % 3);
      ctx.fillStyle = `hsla(${(i * 41 + world.idleTime * 80) % 360}, 95%, 70%, .72)`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.restore();
  }

  if (world.doublePointsTimer > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 210, 73, .72)";
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    for (let i = 0; i < 8; i += 1) {
      const phase = world.idleTime * 2.4 + i * 0.79;
      const x = width * (0.1 + (i % 4) * 0.265);
      const y = height * (0.16 + (Math.sin(phase) + 1) * 0.34);
      const radius = 2.5 + i % 2;
      ctx.fillStyle = "rgba(255, 225, 105, .78)";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (world.freezeTimer > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(207, 253, 255, .62)";
    ctx.lineWidth = 3;
    const reach = Math.min(width, height) * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, reach);
    ctx.lineTo(reach * 0.36, reach * 0.58);
    ctx.lineTo(reach * 0.6, 0);
    ctx.moveTo(width, reach);
    ctx.lineTo(width - reach * 0.36, reach * 0.58);
    ctx.lineTo(width - reach * 0.6, 0);
    ctx.stroke();
    for (let i = 0; i < 8; i += 1) {
      const x = ((i * 0.137 + world.idleTime * 0.025) % 1) * width;
      const y = height * (0.1 + ((Math.sin(world.idleTime * 1.2 + i * 1.7) + 1) * 0.36));
      const size = 3 + i % 3;
      ctx.fillStyle = "rgba(220, 253, 255, .68)";
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.restore();
  }


  if (world.shockwaveTimer > 0) {
    const progress = 1 - world.shockwaveTimer / 0.7;
    const maxRadius = Math.hypot(width, height) * 0.72;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.strokeStyle = "rgba(241, 128, 255, .94)";
    ctx.lineWidth = 8 - progress * 5;
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = Math.max(0, maxRadius * progress - ring * 28);
      ctx.beginPath();
      ctx.arc(world.shockwaveX, world.shockwaveY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function createRenderer(canvas, world) {
  const ctx = canvas.getContext("2d");
  let assetSet = null;
  let cssWidth = 1;
  let cssHeight = 1;
  let idlePrepared = false;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cssWidth = rect.width;
    cssHeight = rect.height;
    setWorldSize(world, cssWidth, cssHeight);
    if (!world.active && !world.ended) {
      prepareIdle(world);
      idlePrepared = true;
    }
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  return {
    setAssets(nextAssets) {
      assetSet = nextAssets;
    },
    resize,
    render() {
      if (!assetSet || !idlePrepared) return;
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      const background = coverRect(assetSet.background, cssWidth, cssHeight);
      const shakeX = world.shake ? (Math.random() - 0.5) * world.shake : 0;
      const shakeY = world.shake ? (Math.random() - 0.5) * world.shake : 0;
      ctx.save();
      ctx.translate(shakeX, shakeY);
      ctx.drawImage(assetSet.background, background.x, background.y, background.width, background.height);
      const shade = ctx.createLinearGradient(0, 0, 0, cssHeight);
      shade.addColorStop(0, "rgba(3, 22, 24, .08)");
      shade.addColorStop(0.5, "rgba(3, 22, 24, .02)");
      shade.addColorStop(1, "rgba(3, 16, 18, .28)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      for (const bottle of world.bottles) drawBottle(ctx, assetSet, bottle, world.idleTime);
      for (const shard of world.shards) drawShard(ctx, assetSet, shard);
      for (const burst of world.bursts) drawBurst(ctx, assetSet, burst);
      drawPowerOverlay(ctx, world, cssWidth, cssHeight);
      drawTrail(ctx, world);
      for (const popup of world.scorePops) drawScorePopup(ctx, popup, world);
      ctx.restore();
    },
    destroy() {
      observer.disconnect();
    },
  };
}
