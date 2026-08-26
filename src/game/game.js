import { track } from "@vercel/analytics";
import { loadGameAssets } from "./assets.js";
import { createArcadeAudio } from "./audio.js";
import { bindSliceInput } from "./input.js";
import { createIntroController } from "./intro.js";
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

      const saveProgress = () => {
        void sdk.gameState.save({ version: 3, best, muted, hasSeenIntro }).catch(() => {});
      };

      const onRoundEnd = () => {
        best = Math.max(best, world.score);
        world.best = best;
        ui.showResults(world.score, best);
        saveProgress();
        const score = finiteScore(world.score);
        if (score !== null) void sdk.leaderboard.submit(score).catch(() => {});
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

      const completeIntro = () => {
        hasSeenIntro = true;
        saveProgress();
        track("intro_complete");
        beginRound();
      };

      const introController = createIntroController({ ui, onComplete: completeIntro });

      const activateFromOverlay = (event) => {
        if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
        if (ui.start.classList.contains("has-error")) {
          window.location.reload();
          return;
        }
        audio?.unlockAndStart();
        if (!hasSeenIntro) {
          introController.show(loadedAssets);
          return;
        }
        beginRound();
      };

      ui.start.addEventListener("click", activateFromOverlay);
      ui.start.addEventListener("keydown", activateFromOverlay);
      ui.retry.addEventListener("click", beginRound);
      ui.soundButton.addEventListener("click", toggleSound);
      ui.pauseButton.addEventListener("click", togglePause);
      ui.resume.addEventListener("click", resume);

      const handleHit = (result) => {
        audio?.smash(result.multiplier);
        result.powers.forEach((power) => audio?.power(power));
        const now = performance.now();
        if (now - lastHaptic > 55 && sdk.device.haptics.isSupported()) {
          lastHaptic = now;
          void sdk.device.haptics.vibrate(result.multiplier > 1 ? [18, 24, 18] : 18).catch(() => {});
        }
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

      Promise.all([
        loadGameAssets(assets),
        sdk.gameState.load().catch(() => null),
        sdk.audio.getContext().catch(() => null),
      ]).then(([assetSet, saved, managedAudio]) => {
        if (destroyed) return;
        best = saved?.version === 3 && Number.isFinite(saved.best) ? Math.max(0, saved.best) : 0;
        muted = saved?.version === 3 && Boolean(saved.muted);
        hasSeenIntro = saved?.version === 3 && Boolean(saved.hasSeenIntro);
        loadedAssets = assetSet;
        world.best = best;
        audio = managedAudio ? createArcadeAudio(managedAudio) : null;
        audio?.setMuted(muted);
        renderer.setAssets(assetSet);
        readyToPlay = true;
        ui.setReady(best);
        ui.setSoundMuted(muted);
        // The surface was display:none while loading; size only after reveal.
        renderer.resize();
      }).catch(() => {
        if (!destroyed) ui.setLoadError();
      });

      animationFrame = requestAnimationFrame(loop);

      cleanup = () => {
        destroyed = true;
        cancelAnimationFrame(animationFrame);
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
