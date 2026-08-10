export function createUI(mount) {
  const shell = document.createElement("section");
  shell.className = "game-shell";
  shell.innerHTML = `
    <canvas class="game-surface" aria-label="Bottle slicing playfield" hidden></canvas>
    <div class="hud-row" hidden>
      <div class="badge score-badge"><span class="hud-icon">◆</span><strong data-score>0</strong></div>
      <div class="badge best-badge">BEST <strong data-best>0</strong></div>
      <div class="hud-actions">
        <div class="badge timer-badge"><span class="timer-dot"></span><strong data-time>60</strong></div>
        <button class="icon-btn sound-btn" type="button" aria-label="Turn sound off" aria-pressed="false"><span aria-hidden="true" data-sound-icon>♪</span></button>
        <button class="icon-btn pause-btn" type="button" aria-label="Pause game"><span aria-hidden="true">Ⅱ</span></button>
      </div>
    </div>
    <div class="combo-toast" hidden data-combo></div>
    <div class="power-status" hidden data-power-status></div>
    <div class="milestone-toast" hidden data-milestone></div>
    <div class="play-hint" hidden>ONE SWIPE: 2=x2 • 3=x3</div>
    <div class="start-overlay overlay" role="button" tabindex="0" aria-label="Start game">
      <div class="start-stack">
        <h1 class="start-title">BOTTLE<br><span>BLITZ</span></h1>
        <p class="start-prompt">Loading…</p>
      </div>
    </div>
    <div class="intro-overlay overlay" hidden>
      <div class="intro-panel" aria-live="polite">
        <div class="intro-topbar">
          <span class="intro-step" data-intro-step>1 / 4</span>
          <button class="intro-skip" type="button"><span class="control-label">SKIP</span></button>
        </div>
        <div class="intro-content">
          <h2 data-intro-title>SWIPE TO SMASH</h2>
          <canvas class="intro-art" aria-hidden="true"></canvas>
          <p class="intro-copy" data-intro-copy></p>
          <p class="intro-detail" data-intro-detail></p>
        </div>
        <div class="intro-footer">
          <div class="intro-dots" aria-hidden="true">
            <span class="is-active"></span><span></span><span></span><span></span>
          </div>
          <button class="control-btn intro-next" type="button"><span class="control-label" data-intro-next-label>NEXT</span></button>
        </div>
      </div>
    </div>
    <div class="pause-overlay overlay" hidden>
      <div class="pause-stack">
        <h2>PAUSED</h2>
        <button class="control-btn resume-btn" type="button"><span class="control-label">RESUME</span></button>
      </div>
    </div>
    <div class="results-overlay overlay" hidden>
      <div class="results-stack">
        <p class="result-kicker">TIME!</p>
        <h2><strong data-result>0</strong><span>POINTS</span></h2>
        <p class="result-best">BEST <strong data-result-best>0</strong></p>
        <button class="control-btn retry-btn" type="button"><span class="control-label">SMASH AGAIN</span></button>
      </div>
    </div>
  `;
  mount.replaceChildren(shell);

  const elements = {
    shell,
    canvas: shell.querySelector("canvas"),
    hud: shell.querySelector(".hud-row"),
    start: shell.querySelector(".start-overlay"),
    intro: shell.querySelector(".intro-overlay"),
    introCanvas: shell.querySelector(".intro-art"),
    introStep: shell.querySelector("[data-intro-step]"),
    introTitle: shell.querySelector("[data-intro-title]"),
    introCopy: shell.querySelector("[data-intro-copy]"),
    introDetail: shell.querySelector("[data-intro-detail]"),
    introNext: shell.querySelector(".intro-next"),
    introNextLabel: shell.querySelector("[data-intro-next-label]"),
    introSkip: shell.querySelector(".intro-skip"),
    introDots: [...shell.querySelectorAll(".intro-dots span")],
    prompt: shell.querySelector(".start-prompt"),
    results: shell.querySelector(".results-overlay"),
    retry: shell.querySelector(".retry-btn"),
    pauseOverlay: shell.querySelector(".pause-overlay"),
    resume: shell.querySelector(".resume-btn"),
    pauseButton: shell.querySelector(".pause-btn"),
    soundButton: shell.querySelector(".sound-btn"),
    soundIcon: shell.querySelector("[data-sound-icon]"),
    score: shell.querySelector("[data-score]"),
    best: shell.querySelector("[data-best]"),
    time: shell.querySelector("[data-time]"),
    combo: shell.querySelector("[data-combo]"),
    milestone: shell.querySelector("[data-milestone]"),
    powerStatus: shell.querySelector("[data-power-status]"),
    hint: shell.querySelector(".play-hint"),
    result: shell.querySelector("[data-result]"),
    resultBest: shell.querySelector("[data-result-best]"),
    timerBadge: shell.querySelector(".timer-badge"),
  };

  let hintTimer = 0;

  return {
    ...elements,
    setReady(best) {
      elements.canvas.hidden = false;
      elements.hud.hidden = false;
      elements.best.textContent = best;
      elements.prompt.textContent = "Tap to start";
      elements.start.classList.add("is-ready");
      elements.start.setAttribute("aria-disabled", "false");
    },
    setLoadError() {
      elements.prompt.textContent = "Could not load • Tap to retry";
      elements.start.classList.add("has-error");
    },
    beginRound(duration) {
      elements.start.hidden = true;
      elements.results.hidden = true;
      elements.intro.hidden = true;
      elements.pauseOverlay.hidden = true;
      elements.hint.hidden = false;
      elements.time.textContent = Math.ceil(duration);
      elements.timerBadge.classList.remove("urgent");
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => { elements.hint.hidden = true; }, 2600);
    },
    update(world) {
      elements.score.textContent = world.score;
      elements.best.textContent = Math.max(world.best, world.score);
      elements.time.textContent = Math.ceil(world.timeLeft);
      elements.timerBadge.classList.toggle("urgent", world.timeLeft <= 10 && world.active);
      elements.timerBadge.classList.toggle("clock-frozen", world.freezeTimer > 0);
      elements.combo.hidden = world.combo < 2 || world.comboTimer <= 0;
      elements.combo.textContent = `x${world.combo} ONE SWIPE`;
      elements.milestone.hidden = world.milestoneTimer <= 0;
      elements.milestone.textContent = world.milestoneText;
      elements.powerStatus.hidden = world.freezeTimer <= 0 && world.doublePointsTimer <= 0 && world.frenzyTimer <= 0;
      if (world.freezeTimer > 0) {
        elements.powerStatus.textContent = `CLOCK FROZEN ${world.freezeTimer.toFixed(1)}s`;
        elements.powerStatus.dataset.mode = "frozen";
      } else if (world.doublePointsTimer > 0) {
        elements.powerStatus.textContent = `x2 POINTS ${world.doublePointsTimer.toFixed(1)}s`;
        elements.powerStatus.dataset.mode = "gold";
      } else if (world.frenzyTimer > 0) {
        elements.powerStatus.textContent = `RAINBOW RUSH ${world.frenzyTimer.toFixed(1)}s`;
        elements.powerStatus.dataset.mode = "rainbow";
      }
    },
    setSoundMuted(muted) {
      elements.soundIcon.textContent = muted ? "×" : "♪";
      elements.soundButton.setAttribute("aria-pressed", String(muted));
      elements.soundButton.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
      elements.soundButton.classList.toggle("is-muted", muted);
    },
    showPause(paused) {
      elements.pauseOverlay.hidden = !paused;
      elements.pauseButton.setAttribute("aria-pressed", String(paused));
    },
    showResults(score, best) {
      window.clearTimeout(hintTimer);
      elements.hint.hidden = true;
      elements.combo.hidden = true;
      elements.milestone.hidden = true;
      elements.powerStatus.hidden = true;
      elements.pauseOverlay.hidden = true;
      elements.intro.hidden = true;
      elements.result.textContent = score;
      elements.resultBest.textContent = best;
      elements.results.hidden = false;
    },
    destroy() {
      window.clearTimeout(hintTimer);
      mount.replaceChildren();
    },
  };
}
