import { track } from "@vercel/analytics";
import { loadGameAssets } from "./assets.js";
import { createArcadeAudio } from "./audio.js";
import { bindSliceInput } from "./input.js";
import { createIntroController } from "./intro.js";
import { leaderboardManager } from "./leaderboard.js";
import { createRenderer } from "./renderer.js";
import { createUI } from "./ui.js";
import {
  addTrailPoint,
  beginSliceStroke,
  createWorld,
  endSliceStroke,
  resetRound,
  setPaused,
  sliceSegment,
  updateWorld,
} from "./world.js";

function finiteScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(Math.round(value), Number.MAX_SAFE_INTEGER));
}

export function createGame({ mount, sdk, tweaks, assets }) {
  let cleanup = () => {};

  return {
    start() {
      const config = {
        roundDuration: tweaks.get("roundDuration"),
        spawnStart: tweaks.get("spawnStart"),
        spawnEnd: tweaks.get("spawnEnd"),
        gravityScale: tweaks.get("gravityScale"),
        effectsIntensity: tweaks.get("effectsIntensity"),
      };
      const world = createWorld(config);
      const ui = createUI(mount);
      const renderer = createRenderer(ui.canvas, world);
      const unsubscribes = Object.keys(config).map((key) => tweaks.subscribe(key, (value) => {
        config[key] = value;
      }));
      let audio = null;
      let inputCleanup = () => {};
      let animationFrame = 0;
      let previousTime = performance.now();
      let readyToPlay = false;
      let best = 0;
      let muted = false;
      let hasSeenIntro = false;
      let loadedAssets = null;
      let lastCountdown = -1;
      let lastAudioMode = "normal";
      let lastHaptic = 0;
      let destroyed = false;
      let pendingStartAction = null;

      const saveProgress = () => {
        void sdk.gameState.save({
          version: 3,
          best,
          muted,
          hasSeenIntro,
          playerName: leaderboardManager.getPlayerName(),
        }).catch(() => {});
      };

      const onRoundEnd = () => {
        best = Math.max(best, world.score);
        world.best = best;
        ui.showResults(world.score, best);
        const score = finiteScore(world.score);
        if (score !== null) {
          leaderboardManager.submitGlobalScore(score);
          void sdk.leaderboard.submit(score).catch(() => {});
        }
        saveProgress();
        track("round_end", { score: score ?? 0, best });
      };

      const loop = (time) => {
        if (destroyed) return;
        const dt = Math.min(0.033, Math.max(0, (time - previousTime) / 1000));
        previousTime = time;
        const ended = updateWorld(world, dt);
        const audioMode = world.frenzyTimer > 0 ? "frenzy" : "normal";
        if (audioMode !== lastAudioMode) {
          lastAudioMode = audioMode;
          audio?.setMode(audioMode);
        }
        if (world.active) {
          const second = Math.ceil(world.timeLeft);
          if (second <= 5 && second !== lastCountdown) {
            lastCountdown = second;
            audio?.countdown(second);
          }
        }
        if (ended) onRoundEnd();
        ui.update(world);
        renderer.render();
        animationFrame = requestAnimationFrame(loop);
      };

      const beginRound = () => {
        if (!readyToPlay) return;
        resetRound(world, best);
        ui.beginRound(config.roundDuration);
        lastCountdown = -1;
        lastAudioMode = "normal";
        audio?.setMode("normal");
        audio?.setPaused(false);
        audio?.unlockAndStart();
        track("round_start");
      };

      const toggleSound = () => {
        if (!readyToPlay) return;
        muted = !muted;
        ui.setSoundMuted(muted);
        audio?.setMuted(muted);
        saveProgress();
      };

      const togglePause = () => {
        if (!world.active || world.ended) return;
        const paused = !world.paused;
        setPaused(world, paused);
        ui.showPause(paused);
        audio?.setPaused(paused);
      };

      const resume = () => {
        if (!world.paused) return;
        setPaused(world, false);
        ui.showPause(false);
        audio?.setPaused(false);
      };

      const completeIntro = ({ manualMode = false } = {}) => {
        hasSeenIntro = true;
        saveProgress();
        track("intro_complete");
        if (manualMode) {
          ui.start.hidden = false;
        } else {
          beginRound();
        }
      };

      const introController = createIntroController({ ui, onComplete: completeIntro });

      const openGameGuide = () => {
        if (!loadedAssets) return;
        audio?.unlockAndStart();
        introController.show(loadedAssets, true);
      };

      const promptPlayerName = (onSuccess, forcePrompt = false) => {
        if (!forcePrompt && leaderboardManager.hasPlayerName()) {
          if (onSuccess) onSuccess();
          return;
        }
        pendingStartAction = onSuccess;
        ui.showNamePrompt(leaderboardManager.getPlayerName());
      };

      const handleNameSubmit = (e) => {
        e?.preventDefault();
        const val = ui.nameInput.value.trim();
        if (val.length < 2 || val.length > 15) {
          ui.nameError.hidden = false;
          return;
        }
        ui.nameError.hidden = true;
        leaderboardManager.setPlayerName(val);
        ui.setPlayerHandle(val);
        if (best > 0) {
          leaderboardManager.submitGlobalScore(best);
          void sdk.leaderboard.submit(best).catch(() => {});
        }
        saveProgress();
        ui.hideNamePrompt();
        if (!ui.lbOverlay.hidden) {
          openLeaderboard(world.active ? world.score : best);
        }
        if (pendingStartAction) {
          const action = pendingStartAction;
          pendingStartAction = null;
          action();
        }
      };

      const openLeaderboard = (scoreContext = 0) => {
        audio?.unlockAndStart();
        const topScores = leaderboardManager.getTopScores();
        const playerRank = leaderboardManager.getPlayerRank(scoreContext);
        const name = leaderboardManager.getPlayerName();
        ui.showLeaderboardModal(topScores, playerRank, name);

        // Fetch latest online scores from global backend
        leaderboardManager.fetchGlobalScores().then(() => {
          if (!ui.lbOverlay.hidden) {
            const freshTop = leaderboardManager.getTopScores();
            const freshRank = leaderboardManager.getPlayerRank(scoreContext);
            ui.showLeaderboardModal(freshTop, freshRank, leaderboardManager.getPlayerName());
          }
        }).catch(() => {});
      };


      const closeLeaderboard = () => {
        ui.hideLeaderboardModal();
      };

      const activateFromOverlay = (event) => {
        if (
          event.target.closest(".player-tag-btn") ||
          event.target.closest(".start-leaderboard-btn") ||
          event.target.closest(".start-guide-btn")
        ) return;
        if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
        if (ui.start.classList.contains("has-error")) {
          window.location.reload();
          return;
        }
        try { window.focus(); } catch (err) { void err; }
        audio?.unlockAndStart();

        const proceedToGame = () => {
          if (!hasSeenIntro) {
            introController.show(loadedAssets, false);
          } else {
            beginRound();
          }
        };

        if (!leaderboardManager.hasPlayerName()) {
          promptPlayerName(proceedToGame);
          return;
        }

        proceedToGame();
      };

      ui.start.addEventListener("click", activateFromOverlay);
      ui.start.addEventListener("keydown", activateFromOverlay);
      ui.retry.addEventListener("click", beginRound);
      ui.soundButton.addEventListener("click", toggleSound);
      ui.pauseButton.addEventListener("click", togglePause);
      ui.resume.addEventListener("click", resume);

      ui.startGuideBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        openGameGuide();
      });
      ui.pauseGuideBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        openGameGuide();
      });
      ui.playerTagBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        promptPlayerName(() => {}, true);
      });
      ui.playerTagBtn?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          promptPlayerName(() => {}, true);
        }
      });
      ui.lbPlayerPill?.addEventListener("click", (e) => {
        e.stopPropagation();
        promptPlayerName(() => {}, true);
      });
      ui.lbPlayerPill?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          promptPlayerName(() => {}, true);
        }
      });
      ui.nameForm?.addEventListener("submit", handleNameSubmit);
      ui.startLbBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        openLeaderboard(best);
      });
      ui.resultsLbBtn?.addEventListener("click", () => openLeaderboard(world.score));
      ui.lbCloseBtn?.addEventListener("click", closeLeaderboard);
      ui.lbCloseX?.addEventListener("click", closeLeaderboard);

      const triggerHaptic = (pattern, force = false) => {
        const now = performance.now();
        if (!force && now - lastHaptic < 40) return;
        lastHaptic = now;

        let triggered = false;
        try {
          if (sdk?.device?.haptics?.isSupported && sdk.device.haptics.isSupported()) {
            void sdk.device.haptics.vibrate(pattern).catch(() => {});
            triggered = true;
          }
        } catch {
          // SDK fallback
        }

        if (!triggered && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          try {
            navigator.vibrate(pattern);
          } catch {
            // Browser fallback error
          }
        }
      };

      const handleHit = (result) => {
        audio?.smash(result.multiplier);
        result.powers.forEach((power) => audio?.power(power));

        let pattern = 25;
        if (result.powers && result.powers.length > 0) {
          pattern = [35, 30, 45];
        } else if (result.multiplier > 1) {
          pattern = [22, 28, 22];
        }

        triggerHaptic(pattern);
      };

      world.onHit = handleHit;

      inputCleanup = bindSliceInput(ui.canvas, world, {
        addTrailPoint,
        beginSliceStroke,
        endSliceStroke,
        sliceSegment,
        onSwipe: () => audio?.swipe(),
        onHit: handleHit,
      });

      const MIN_LOADING_TIME = 1800; // Minimum 1.8 seconds loading screen time
      const loadStartTime = performance.now();

      const withTimeout = (promise, ms = 1200) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)),
      ]);

      Promise.all([
        loadGameAssets(assets, (progress, statusText) => {
          ui.updateLoadingProgress(progress, statusText);
        }),
        withTimeout(sdk.gameState.load(), 1000).catch(() => null),
        withTimeout(sdk.audio.getContext(), 1000).catch(() => null),
        withTimeout(leaderboardManager.fetchGlobalScores(), 1500).catch(() => null),
      ]).then(([assetSet, saved, managedAudio]) => {
        if (destroyed) return;
        best = saved?.version === 3 && Number.isFinite(saved.best) ? Math.max(0, saved.best) : 0;
        muted = saved?.version === 3 && Boolean(saved.muted);
        hasSeenIntro = saved?.version === 3 && Boolean(saved.hasSeenIntro);
        if (saved?.playerName) {
          leaderboardManager.setPlayerName(saved.playerName);
        }
        const activeHandle = leaderboardManager.getPlayerName();
        if (best > 0 && activeHandle) {
          leaderboardManager.submitGlobalScore(best, activeHandle).catch(() => {});
        }
        loadedAssets = assetSet;
        world.best = best;
        audio = createArcadeAudio(managedAudio);
        audio?.setMuted(muted);
        renderer.setAssets(assetSet);
        readyToPlay = true;

        ui.updateLoadingProgress(1, "READY!");
        const elapsed = performance.now() - loadStartTime;
        const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

        setTimeout(() => {
          if (destroyed) return;
          ui.hideLoadingScreen();
          ui.setReady(best);
          ui.setSoundMuted(muted);
          ui.setPlayerHandle(leaderboardManager.getPlayerName());
          // The surface was display:none while loading; size only after reveal.
          renderer.resize();
        }, remaining);
      }).catch(() => {
        if (!destroyed) ui.setLoadError();
      });

      const handleVisibilityChange = () => {
        if (document.hidden) {
          audio?.suspend();
          if (world.active && !world.ended && !world.paused) {
            setPaused(world, true);
            ui.showPause(true);
            audio?.setPaused(true);
          }
        } else {
          if (!world.paused) {
            audio?.resume();
          }
        }
      };

      const handleWindowBlur = () => {
        if (document.hidden) {
          audio?.suspend();
          if (world.active && !world.ended && !world.paused) {
            setPaused(world, true);
            ui.showPause(true);
            audio?.setPaused(true);
          }
        }
      };

      const handleWindowFocus = () => {
        if (!document.hidden && !world.paused) {
          audio?.resume();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleWindowBlur);
      window.addEventListener("focus", handleWindowFocus);
      window.addEventListener("pagehide", handleVisibilityChange);

      animationFrame = requestAnimationFrame(loop);

      cleanup = () => {
        destroyed = true;
        cancelAnimationFrame(animationFrame);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("blur", handleWindowBlur);
        window.removeEventListener("focus", handleWindowFocus);
        window.removeEventListener("pagehide", handleVisibilityChange);
        audio?.stop();
        inputCleanup();
        renderer.destroy();
        introController.destroy();
        unsubscribes.forEach((unsubscribe) => unsubscribe());
        ui.start.removeEventListener("click", activateFromOverlay);
        ui.start.removeEventListener("keydown", activateFromOverlay);
        ui.retry.removeEventListener("click", beginRound);
        ui.soundButton.removeEventListener("click", toggleSound);
        ui.pauseButton.removeEventListener("click", togglePause);
        ui.resume.removeEventListener("click", resume);
        ui.destroy();
      };
    },
    destroy() {
      cleanup();
      cleanup = () => {};
    },
  };
}

