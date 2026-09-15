export function createArcadeAudio(managedAudio) {
  const context = managedAudio.context;
  let beatTimer = 0;
  let beatStep = 0;
  let noiseBuffer = null;
  let unlocked = false;
  let muted = false;
  let paused = false;
  let mode = "normal";

  function isBackgroundHidden() {
    return typeof document !== "undefined" && document.hidden;
  }

  function getNoise() {
    if (noiseBuffer) return noiseBuffer;
    noiseBuffer = context.createBuffer(1, context.sampleRate * 0.6, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function tone(frequency, duration, volume, type = "square", when = context.currentTime) {
    if (muted || context.state !== "running" || isBackgroundHidden()) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(when);
    oscillator.stop(when + duration);
  }

  function noise({ duration, volume, frequency, q = 0.7, type = "bandpass", delay = 0 }) {
    if (muted || context.state !== "running" || isBackgroundHidden()) return;
    const when = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = getNoise();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(when);
    source.stop(when + duration);
  }

  function beat() {
    const patterns = {
      normal: [82, 98, 110, 98, 123, 110, 98, 92],
      frenzy: [110, 147, 165, 147, 196, 165, 147, 131],
      frozen: [65, 73, 82, 73],
    };
    const notes = patterns[mode];
    const note = notes[beatStep % notes.length];
    if (mode === "frozen") {
      tone(note, 0.44, 0.026, "sine");
      tone(note * 4, 0.24, 0.01, "triangle", context.currentTime + 0.04);
    } else {
      tone(note, mode === "frenzy" ? 0.11 : 0.15, 0.028, "triangle");
      if (beatStep % 4 === 0) noise({ duration: 0.055, volume: 0.025, frequency: 180, type: "lowpass" });
      if (beatStep % 2 === 1) noise({ duration: 0.032, volume: 0.012, frequency: 5600, type: "highpass" });
      if (beatStep % 4 === 2) tone(note * 3, 0.055, 0.01, "square");
    }
    beatStep += 1;
  }

  function restartBeat() {
    window.clearInterval(beatTimer);
    beatTimer = 0;
    if (!unlocked || muted || paused || context.state !== "running" || isBackgroundHidden()) return;
    beatStep = 0;
    beat();
    const interval = mode === "frenzy" ? 145 : (mode === "frozen" ? 520 : 220);
    beatTimer = window.setInterval(beat, interval);
  }

  return {
    unlockAndStart() {
      void managedAudio.unlock().then(() => {
        unlocked = true;
        restartBeat();
      }).catch(() => {});
    },
    suspend() {
      window.clearInterval(beatTimer);
      beatTimer = 0;
      if (context && context.state === "running") {
        void context.suspend().catch(() => {});
      }
    },
    resume() {
      if (!unlocked || muted || paused || isBackgroundHidden()) return;
      if (context && context.state === "suspended") {
        void context.resume().then(() => {
          restartBeat();
        }).catch(() => {});
      } else {
        restartBeat();
      }
    },
    setMuted(value) {
      muted = Boolean(value);
      restartBeat();
    },
    setPaused(value) {
      paused = Boolean(value);
      restartBeat();
    },
    setMode(nextMode) {
      if (nextMode === mode) return;
      mode = nextMode;
      restartBeat();
    },
    smash(combo = 1) {
      noise({ duration: 0.028, volume: 0.24, frequency: 4200, q: 0.45, type: "highpass" });
      noise({ duration: 0.11, volume: 0.08, frequency: 6800, q: 1.8, type: "bandpass", delay: 0.014 });
      const tings = Math.min(6, 3 + combo);
      for (let i = 0; i < tings; i += 1) {
        const delay = 0.012 + Math.random() * 0.07;
        tone(1850 + Math.random() * 2600, 0.035 + Math.random() * 0.055, 0.018, "triangle", context.currentTime + delay);
      }
    },
    power(kind) {
      if (kind === "frozen") {
        noise({ duration: 0.16, volume: 0.1, frequency: 7200, q: 2.4, type: "bandpass" });
        tone(1040, 0.28, 0.04, "sine");
        tone(620, 0.4, 0.03, "sine", context.currentTime + 0.07);
      } else if (kind === "golden") {
        [523, 659, 784, 1047].forEach((frequency, index) => {
          tone(frequency, 0.13, 0.032, "triangle", context.currentTime + index * 0.035);
        });
      } else if (kind === "time") {
        [440, 554, 659].forEach((frequency, index) => {
          tone(frequency, 0.11, 0.03, "square", context.currentTime + index * 0.055);
        });
      } else if (kind === "shockwave") {
        noise({ duration: 0.24, volume: 0.12, frequency: 900, q: 0.8, type: "lowpass" });
        tone(180, 0.38, 0.055, "sawtooth");
        tone(360, 0.24, 0.025, "triangle", context.currentTime + 0.045);
      } else {
        [392, 523, 659, 784].forEach((frequency, index) => {
          tone(frequency, 0.14, 0.035, "triangle", context.currentTime + index * 0.045);
        });
      }
    },
    swipe() {
      noise({ duration: 0.1, volume: 0.035, frequency: 1800, q: 0.6 });
    },
    countdown(second) {
      tone(second === 0 ? 880 : 440, 0.08, 0.045, "square");
    },
    stop() {
      window.clearInterval(beatTimer);
      beatTimer = 0;
    },
  };
}
