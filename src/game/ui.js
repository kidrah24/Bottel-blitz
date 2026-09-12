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
        <div class="player-tag-btn" role="button" tabindex="0" title="Click to change handle">
          <span class="hud-icon">👤</span> <span data-player-handle>PLAYER</span> <span class="edit-icon">✎</span>
        </div>
        <p class="start-prompt">Loading…</p>
        <button class="control-btn start-leaderboard-btn" type="button"><span class="control-label">🏆 LEADERBOARD</span></button>
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
        <div class="results-actions">
          <button class="control-btn retry-btn" type="button"><span class="control-label">SMASH AGAIN</span></button>
          <button class="control-btn results-leaderboard-btn" type="button"><span class="control-label">🏆 LEADERBOARD</span></button>
        </div>
      </div>
    </div>
    <div class="name-overlay overlay" hidden>
      <div class="name-card">
        <h2 class="name-title">ENTER YOUR NAME</h2>
        <p class="name-subtitle">Set your handle to join the Global Leaderboard</p>
        <form class="name-form" action="#" onsubmit="return false;">
          <input type="text" class="name-input" maxlength="15" placeholder="e.g. SmashMaster" autocomplete="off" spellcheck="false" required />
          <p class="name-error" hidden>Please enter 2 to 15 characters</p>
          <button class="control-btn name-submit-btn" type="submit"><span class="control-label">CONFIRM & PLAY</span></button>
        </form>
      </div>
    </div>
    <div class="leaderboard-overlay overlay" hidden>
      <div class="leaderboard-card">
        <div class="leaderboard-header">
          <h2>🏆 GLOBAL LEADERBOARD</h2>
          <button class="icon-btn leaderboard-close-x" type="button" aria-label="Close leaderboard">×</button>
        </div>
        <div class="leaderboard-stats">
          <div class="stat-pill"><span class="stat-label">YOUR RANK</span> <strong data-lb-rank>#--</strong></div>
          <div class="stat-pill"><span class="stat-label">PLAYER</span> <strong data-lb-player>--</strong></div>
        </div>
        <div class="leaderboard-scroll">
          <ul class="leaderboard-list" data-lb-list></ul>
        </div>
        <button class="control-btn leaderboard-close-btn" type="button"><span class="control-label">BACK TO MENU</span></button>
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
    playerHandle: shell.querySelector("[data-player-handle]"),
    playerTagBtn: shell.querySelector(".player-tag-btn"),
    startLbBtn: shell.querySelector(".start-leaderboard-btn"),
    resultsLbBtn: shell.querySelector(".results-leaderboard-btn"),
    nameOverlay: shell.querySelector(".name-overlay"),
    nameForm: shell.querySelector(".name-form"),
    nameInput: shell.querySelector(".name-input"),
    nameError: shell.querySelector(".name-error"),
    nameSubmitBtn: shell.querySelector(".name-submit-btn"),
    lbOverlay: shell.querySelector(".leaderboard-overlay"),
    lbRank: shell.querySelector("[data-lb-rank]"),
    lbPlayer: shell.querySelector("[data-lb-player]"),
    lbList: shell.querySelector("[data-lb-list]"),
    lbCloseBtn: shell.querySelector(".leaderboard-close-btn"),
    lbCloseX: shell.querySelector(".leaderboard-close-x"),
  };

  let hintTimer = 0;

  return {
    ...elements,
    setPlayerHandle(name, isLocked = false) {
      if (elements.playerHandle) {
        elements.playerHandle.textContent = name || "SET NAME";
      }
      if (elements.playerTagBtn) {
        const editIcon = elements.playerTagBtn.querySelector(".edit-icon");
        const locked = isLocked || Boolean(name && name.trim().length >= 2);
        if (locked) {
          elements.playerTagBtn.classList.add("is-locked");
          elements.playerTagBtn.title = `Player: ${name}`;
          elements.playerTagBtn.setAttribute("tabindex", "-1");
          elements.playerTagBtn.setAttribute("aria-disabled", "true");
          if (editIcon) editIcon.hidden = true;
        } else {
          elements.playerTagBtn.classList.remove("is-locked");
          elements.playerTagBtn.title = "Click to set handle";
          elements.playerTagBtn.setAttribute("tabindex", "0");
          elements.playerTagBtn.removeAttribute("aria-disabled");
          if (editIcon) editIcon.hidden = false;
        }
      }
    },
    showNamePrompt(currentName = "") {
      elements.nameInput.value = currentName;
      elements.nameError.hidden = true;
      elements.nameOverlay.hidden = false;
      setTimeout(() => elements.nameInput.focus(), 100);
    },
    hideNamePrompt() {
      elements.nameOverlay.hidden = true;
    },
    showLeaderboardModal(scores, playerRank, playerName) {
      elements.lbRank.textContent = playerRank ? `#${playerRank}` : "#--";
      elements.lbPlayer.textContent = playerName || "ANONYMOUS";
      
      if (!scores || scores.length === 0) {
        elements.lbList.innerHTML = `<li class="lb-empty">No scores recorded yet.<br><small>Play a game to join the leaderboard!</small></li>`;
      } else {
        elements.lbList.innerHTML = scores.map((entry, index) => {
          const rank = index + 1;
          let medal = "";
          let rankClass = "";
          if (rank === 1) { medal = "🥇"; rankClass = "rank-1"; }
          else if (rank === 2) { medal = "🥈"; rankClass = "rank-2"; }
          else if (rank === 3) { medal = "🥉"; rankClass = "rank-3"; }
          else { medal = `#${rank}`; }

          const isUser = entry.isCurrentUser || (playerName && entry.name.toLowerCase() === playerName.toLowerCase());

          return `
            <li class="lb-item ${rankClass} ${isUser ? 'is-user' : ''}">
              <span class="lb-rank">${medal}</span>
              <span class="lb-name">${entry.name}${isUser ? ' <small>(YOU)</small>' : ''}</span>
              <span class="lb-score">${entry.score.toLocaleString()} PTS</span>
            </li>
          `;
        }).join("");
      }

      elements.lbOverlay.hidden = false;
    },
    hideLeaderboardModal() {
      elements.lbOverlay.hidden = true;
    },
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
      elements.nameOverlay.hidden = true;
      elements.lbOverlay.hidden = true;
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
      elements.nameOverlay.hidden = true;
      elements.lbOverlay.hidden = true;
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

