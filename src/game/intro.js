const PAGES = [
  {
    title: "SWIPE TO SMASH",
    copy: "Break bottles before the 60-second clock runs out.",
    detail: "One quick swipe can hit several bottles for a multiplier.",
  },
  {
    title: "BOTTLE VALUES",
    copy: "Each bottle type has its own point value.",
    detail: "Line up valuable bottles before you swipe.",
  },
  {
    title: "RARE POWERS",
    copy: "Rainbow starts an 8s rush from every side.",
    detail: "Frozen stops only the clock for 4.5s.",
  },
  {
    title: "MORE POWERS",
    copy: "Gold doubles points. Lime adds five seconds.",
    detail: "Purple sends a shockwave through every normal bottle.",
  },
];

const POINTS = [1, 1, 2, 2, 3, 5];

function sizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return { ctx, width: rect.width, height: rect.height };
}

function drawFrameInBox(ctx, image, frame, x, y, width, height) {
  const crop = frame.content || frame.source;
  const scale = Math.min(width / crop.w, height / crop.h);
  const drawWidth = crop.w * scale;
  const drawHeight = crop.h * scale;
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.w,
    crop.h,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawSwipeLesson(ctx, assets, width, height) {
  drawFrameInBox(ctx, assets.bottles, assets.bottleFrames[2], width * 0.32, height * 0.08, width * 0.36, height * 0.78);
  const points = [
    [width * 0.14, height * 0.72],
    [width * 0.37, height * 0.56],
    [width * 0.62, height * 0.4],
    [width * 0.86, height * 0.23],
  ];
  for (const [lineWidth, color] of [[18, "rgba(61, 224, 255, .2)"], [8, "rgba(67, 231, 255, .78)"], [2.5, "#fffce6"]]) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}

function drawValuesLesson(ctx, assets, width, height) {
  const columns = 3;
  const rows = 2;
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  for (let i = 0; i < 6; i += 1) {
    const x = (i % columns) * cellWidth;
    const y = Math.floor(i / columns) * cellHeight;
    drawFrameInBox(ctx, assets.bottles, assets.bottleFrames[i], x + 5, y + 3, cellWidth - 10, cellHeight - 22);
    ctx.font = `900 ${Math.max(11, Math.min(17, cellHeight * 0.2))}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#fff0a6";
    ctx.fillText(`${POINTS[i]} ${POINTS[i] === 1 ? "PT" : "PTS"}`, x + cellWidth / 2, y + cellHeight - 2);
  }
}

function drawPowerLesson(ctx, assets, width, height) {
  const boxes = [
    { x: 0, frame: 0, color: "rgba(255, 214, 75, .3)", label: "RAINBOW RUSH" },
    { x: width / 2, frame: 1, color: "rgba(119, 231, 255, .32)", label: "CLOCK FREEZE" },
  ];
  for (const box of boxes) {
    const centerX = box.x + width / 4;
    const halo = ctx.createRadialGradient(centerX, height * 0.42, 0, centerX, height * 0.42, height * 0.44);
    halo.addColorStop(0, box.color);
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(box.x, 0, width / 2, height * 0.84);
    drawFrameInBox(ctx, assets.powerBottles, assets.powerBottleFrames[box.frame], box.x + width * 0.08, 4, width * 0.34, height * 0.72);
    ctx.font = `900 ${Math.max(12, Math.min(18, width * 0.045))}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = box.frame === 0 ? "#ffe56d" : "#c9f8ff";
    ctx.fillText(box.label, centerX, height - 4, width * 0.44);
  }
}

function drawExtraPowerLesson(ctx, assets, width, height) {
  const labels = ["x2 POINTS", "+5 SEC", "SHOCKWAVE"];
  const colors = ["#ffe06a", "#b8ff78", "#f39cff"];
  const cellWidth = width / 3;
  for (let i = 0; i < 3; i += 1) {
    const x = i * cellWidth;
    const centerX = x + cellWidth / 2;
    const halo = ctx.createRadialGradient(centerX, height * 0.42, 0, centerX, height * 0.42, height * 0.4);
    halo.addColorStop(0, `${colors[i]}55`);
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x, 0, cellWidth, height * 0.82);
    drawFrameInBox(
      ctx,
      assets.extraPowerBottles,
      assets.extraPowerBottleFrames[i],
      x + cellWidth * 0.14,
      3,
      cellWidth * 0.72,
      height * 0.72,
    );
    ctx.font = `900 ${Math.max(10, Math.min(16, cellWidth * 0.13))}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = colors[i];
    ctx.fillText(labels[i], centerX, height - 4, cellWidth * 0.92);
  }
}

function drawPage(canvas, assets, page) {
  const surface = sizeCanvas(canvas);
  if (!surface) return;
  const { ctx, width, height } = surface;
  if (page === 0) drawSwipeLesson(ctx, assets, width, height);
  if (page === 1) drawValuesLesson(ctx, assets, width, height);
  if (page === 2) drawPowerLesson(ctx, assets, width, height);
  if (page === 3) drawExtraPowerLesson(ctx, assets, width, height);
}

export function createIntroController({ ui, onComplete }) {
  let assets = null;
  let page = 0;
  let manualMode = false;

  const render = () => {
    const content = PAGES[page];
    ui.introStep.textContent = `${page + 1} / ${PAGES.length}`;
    ui.introTitle.textContent = content.title;
    ui.introCopy.textContent = content.copy;
    ui.introDetail.textContent = content.detail;
    ui.introNextLabel.textContent = page === PAGES.length - 1 ? (manualMode ? "BACK TO MENU" : "LET'S SMASH") : "NEXT";
    ui.introDots.forEach((dot, index) => dot.classList.toggle("is-active", index === page));
    drawPage(ui.introCanvas, assets, page);
  };

  const finish = () => {
    ui.intro.hidden = true;
    onComplete({ manualMode });
  };

  const next = () => {
    if (page >= PAGES.length - 1) {
      finish();
      return;
    }
    page += 1;
    render();
  };

  ui.introNext.addEventListener("click", next);
  ui.introSkip.addEventListener("click", finish);

  return {
    show(assetSet, isManual = false) {
      assets = assetSet;
      page = 0;
      manualMode = isManual;
      ui.start.hidden = true;
      if (ui.pauseOverlay) ui.pauseOverlay.hidden = true;
      ui.intro.hidden = false;
      requestAnimationFrame(render);
    },
    destroy() {
      ui.introNext.removeEventListener("click", next);
      ui.introSkip.removeEventListener("click", finish);
    },
  };
}
