const LOCAL_STORAGE_KEY = "bottle_blitz_leaderboard_v1";
const PLAYER_NAME_KEY = "bottle_blitz_player_name";
const SECRET_SALT = "BB_v1_S3cr3t_S@lt_2026";
const MAX_ALLOWED_SCORE = 5000;

const DUMMY_NAMES = [
  "blademaster",
  "viperslice",
  "ninjacombo",
  "bottleking",
  "smashqueen",
  "glasscutter",
  "rushmaster",
];

export function computeHash(dataStr) {
  const str = `${dataStr}_${SECRET_SALT}`;
  let hash1 = 5381;
  let hash2 = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 31) + char;
  }
  return (Math.abs(hash1) + Math.abs(hash2)).toString(36);
}

function getCookie(name) {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  } catch {
    // Cookie unavailable
  }
  return "";
}

function setCookie(name, value) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Cookie unavailable
  }
}

function generateDeviceHandle() {
  try {
    const screenStr = typeof window !== "undefined" && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : "screen";
    const navStr = typeof navigator !== "undefined"
      ? `${navigator.userAgent}_${navigator.language}`
      : "navigator";
    const seedStr = `${screenStr}_${navStr}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i += 1) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) & 0xffffffff;
    }
    const num = (Math.abs(hash) % 8999) + 1000;
    return `Player_${num}`;
  } catch {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `Player_${randomNum}`;
  }
}

const DREAMLO_PUBLIC_KEY = "6aa67aaa8f40bb15a879a651";
const DREAMLO_PRIVATE_KEY = "fNj18yEImEWEw2cXfmdoLQROnPmX7pN0WHj4Nrlk-NWw";

export class LeaderboardManager {
  constructor() {
    this.playerName = this.loadPlayerName();
    this.scores = this.loadScores();
    this.initParentListener();
  }

  initParentListener() {
    if (typeof window !== "undefined") {
      window.addEventListener("message", (event) => {
        try {
          const data = event.data;
          if (!data) return;
          const remoteName = data.playerName || data.username || data.name || data.handle || data.user?.name || data.user?.username;
          if (remoteName && typeof remoteName === "string" && remoteName.trim().length >= 2) {
            this.setPlayerName(remoteName.trim().slice(0, 15));
          }
        } catch {
          // Ignore invalid cross-origin messages
        }
      });
    }
  }

  loadPlayerName() {
    // 1. Check URL query parameters (?player=..., ?name=..., ?username=..., ?handle=..., ?user=..., ?user_id=..., ?displayName=..., ?nickname=...)
    try {
      if (typeof window !== "undefined" && window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const urlName = params.get("player") || params.get("name") || params.get("username") || params.get("handle") || params.get("user") || params.get("user_id") || params.get("displayName") || params.get("nickname");
        if (urlName && urlName.trim().length >= 2) {
          const sanitized = urlName.trim().slice(0, 15);
          this.setPlayerName(sanitized);
          return sanitized;
        }
      }
    } catch (err) { void err; }

    // 2. Check LocalStorage
    try {
      const stored = localStorage.getItem(PLAYER_NAME_KEY);
      if (stored && stored.trim().length >= 2) {
        return stored.trim().slice(0, 15);
      }
    } catch (err) { void err; }

    // 3. Check Cookie
    const cookieName = getCookie(PLAYER_NAME_KEY);
    if (cookieName && cookieName.trim().length >= 2) {
      const decoded = decodeURIComponent(cookieName).trim().slice(0, 15);
      try {
        localStorage.setItem(PLAYER_NAME_KEY, decoded);
      } catch (err) { void err; }
      return decoded;
    }

    // 4. Fallback to deterministic device-seeded handle
    const deviceName = generateDeviceHandle();
    try {
      localStorage.setItem(PLAYER_NAME_KEY, deviceName);
    } catch (err) { void err; }
    setCookie(PLAYER_NAME_KEY, deviceName);
    return deviceName;
  }

  setPlayerName(name) {
    const trimmed = (name || "").trim().slice(0, 15);
    if (!trimmed || trimmed.length < 2) return this.playerName;
    this.playerName = trimmed;
    try {
      localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    } catch (err) { void err; }
    setCookie(PLAYER_NAME_KEY, trimmed);
    this.updateCurrentUserFlags();
    this.saveScores();
    return trimmed;
  }

  updateCurrentUserFlags() {
    const activeName = (this.playerName || "").toLowerCase();
    this.scores.forEach((entry) => {
      entry.isCurrentUser = Boolean(activeName && entry.name.toLowerCase() === activeName);
    });
  }

  getPlayerName() {
    return this.playerName;
  }

  hasPlayerName() {
    return Boolean(this.playerName && this.playerName.trim().length >= 2);
  }

  loadScores() {
    let storedScores = [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          storedScores = parsed.filter((entry) => {
            if (!entry || typeof entry !== "object") return false;
            if (entry.id && String(entry.id).startsWith("score-def-")) return false;
            if (entry.name && DUMMY_NAMES.includes(String(entry.name).toLowerCase())) return false;
            if (!Number.isFinite(entry.score) || entry.score <= 0 || entry.score > MAX_ALLOWED_SCORE) return false;
            // Verify checksum signature if present
            if (entry.sig) {
              const expectedSig = computeHash(`${entry.id}:${entry.name}:${entry.score}`);
              if (entry.sig !== expectedSig) {
                console.warn("[Security] LocalStorage score tampering detected for ID:", entry.id);
                return false;
              }
            }
            return true;
          });
        }
      }
    } catch {
      // Fallback
    }

    const activeName = (this.playerName || "").toLowerCase();
    const scoreMap = new Map();

    storedScores.forEach((entry) => {
      const key = entry.name.toLowerCase();
      const existing = scoreMap.get(key);
      if (!existing || entry.score >= existing.score) {
        scoreMap.set(key, entry);
      }
    });

    const merged = Array.from(scoreMap.values());
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, 50).map((entry) => ({
      ...entry,
      isCurrentUser: Boolean(activeName && entry.name.toLowerCase() === activeName),
    }));
  }

  saveScores() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.scores));
    } catch {
      // Storage unavailable
    }
  }

  submitScore(score, customName = null) {
    const name = (customName || this.playerName || "Anonymous").trim().slice(0, 15);
    const rounded = Math.round(score);
    if (!Number.isFinite(rounded) || rounded <= 0 || rounded > MAX_ALLOWED_SCORE) {
      console.warn("[Security] Invalid score submission rejected:", score);
      return this.scores;
    }

    const today = new Date().toISOString().split("T")[0];
    const newId = `score-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const existingIndex = this.scores.findIndex(
      (entry) => entry.name.toLowerCase() === name.toLowerCase(),
    );

    if (existingIndex >= 0) {
      const existingId = this.scores[existingIndex].id || newId;
      const targetScore = Math.max(rounded, this.scores[existingIndex].score);
      this.scores[existingIndex] = {
        ...this.scores[existingIndex],
        id: existingId,
        name,
        score: targetScore,
        date: today,
        sig: computeHash(`${existingId}:${name}:${targetScore}`),
      };
    } else {
      const newEntry = {
        id: newId,
        name,
        score: rounded,
        date: today,
        sig: computeHash(`${newId}:${name}:${rounded}`),
      };
      this.scores.push(newEntry);
    }

    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 50);

    this.updateCurrentUserFlags();
    this.saveScores();
    return this.scores;
  }

  async fetchGlobalScores() {
    const activeName = (this.playerName || "").trim();
    if (activeName) {
      const localEntry = this.scores.find(
        (s) => s.name && s.name.toLowerCase() === activeName.toLowerCase()
      );
      if (localEntry && localEntry.score > 0) {
        await this.submitGlobalScore(localEntry.score, activeName);
      }
    }

    let fetchedScores = null;

    // 1. Try local serverless endpoint ./api/leaderboard first
    try {
      const res = await fetch("./api/leaderboard", {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.scores)) {
          fetchedScores = data.scores;
        }
      }
    } catch {
      // API endpoint unreachable
    }

    // 2. Direct fallback to Dreamlo global cloud backend if ./api/leaderboard failed / returned 404
    if (!fetchedScores) {
      try {
        const dreamloRes = await fetch(`https://dreamlo.com/lb/${DREAMLO_PUBLIC_KEY}/json`, {
          headers: { Accept: "application/json" },
        });
        if (dreamloRes.ok) {
          const data = await dreamloRes.json();
          const rawEntries = data?.dreamlo?.leaderboard?.entry;
          let entries = [];
          if (Array.isArray(rawEntries)) {
            entries = rawEntries;
          } else if (rawEntries && typeof rawEntries === "object") {
            entries = [rawEntries];
          }
          fetchedScores = entries.map((item) => ({
            id: `dreamlo-${item.name}`,
            name: (item.name || "").trim(),
            score: parseInt(item.score, 10) || 0,
            date: item.date || new Date().toISOString().split("T")[0],
          })).filter((e) => e.name && e.score > 0 && e.score <= MAX_ALLOWED_SCORE);
        }
      } catch {
        // Offline fallback
      }
    }

    if (fetchedScores && Array.isArray(fetchedScores)) {
      this.mergeGlobalScores(fetchedScores);
    }

    return this.scores;
  }

  async submitGlobalScore(score, customName = null) {
    const name = (customName || this.playerName || "Anonymous").trim().slice(0, 15);
    const rounded = Math.round(score);
    if (!Number.isFinite(rounded) || rounded <= 0 || rounded > MAX_ALLOWED_SCORE) {
      return this.scores;
    }

    // Update local state immediately
    this.submitScore(rounded, name);

    let success = false;

    // 1. Try local serverless endpoint ./api/leaderboard first
    try {
      const res = await fetch("./api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, score: rounded }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.scores)) {
          this.mergeGlobalScores(data.scores);
          success = true;
        }
      }
    } catch {
      // API endpoint unreachable
    }

    // 2. Direct fallback to Dreamlo global cloud backend if ./api/leaderboard failed / returned 404
    if (!success) {
      try {
        const sanitizedName = encodeURIComponent(name);
        const url = `https://dreamlo.com/lb/${DREAMLO_PRIVATE_KEY}/add-json/${sanitizedName}/${rounded}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const rawEntries = data?.dreamlo?.leaderboard?.entry;
          let entries = [];
          if (Array.isArray(rawEntries)) {
            entries = rawEntries;
          } else if (rawEntries && typeof rawEntries === "object") {
            entries = [rawEntries];
          }
          const remoteScores = entries.map((item) => ({
            id: `dreamlo-${item.name}`,
            name: (item.name || "").trim(),
            score: parseInt(item.score, 10) || 0,
            date: item.date || new Date().toISOString().split("T")[0],
          })).filter((e) => e.name && e.score > 0 && e.score <= MAX_ALLOWED_SCORE);

          this.mergeGlobalScores(remoteScores);
        }
      } catch {
        // Offline fallback
      }
    }

    return this.scores;
  }

  mergeGlobalScores(remoteScores) {
    const activeName = (this.playerName || "").toLowerCase();
    const scoreMap = new Map();

    // Fill with current local scores first
    this.scores.forEach((entry) => {
      if (entry.id && String(entry.id).startsWith("score-def-")) return;
      if (entry.name && DUMMY_NAMES.includes(String(entry.name).toLowerCase())) return;
      scoreMap.set(entry.name.toLowerCase(), { ...entry });
    });

    // Merge remote scores (taking higher score per name)
    remoteScores.forEach((entry) => {
      if (!entry || !entry.name || !Number.isFinite(entry.score)) return;
      if (entry.id && String(entry.id).startsWith("score-def-")) return;
      if (DUMMY_NAMES.includes(String(entry.name).toLowerCase())) return;
      const key = entry.name.toLowerCase();
      const existing = scoreMap.get(key);
      if (!existing || entry.score >= existing.score) {
        scoreMap.set(key, {
          id: entry.id || `global-${key}`,
          name: entry.name,
          score: entry.score,
          date: entry.date || new Date().toISOString().split("T")[0],
          sig: computeHash(`${entry.id || key}:${entry.name}:${entry.score}`),
        });
      }
    });

    const merged = Array.from(scoreMap.values());
    merged.sort((a, b) => b.score - a.score);
    this.scores = merged.slice(0, 50).map((entry) => ({
      ...entry,
      isCurrentUser: Boolean(activeName && entry.name.toLowerCase() === activeName),
    }));

    this.saveScores();
  }

  getTopScores(limit = 20) {
    return this.scores.slice(0, limit);
  }

  getPlayerRank(score) {
    const all = [...this.scores];
    const activeName = (this.playerName || "").toLowerCase();
    if (score > 0 && score <= MAX_ALLOWED_SCORE && !all.some((s) => (s.isCurrentUser || (s.name && s.name.toLowerCase() === activeName)) && s.score >= score)) {
      all.push({ name: this.playerName || "YOU", score, isCurrentUser: true });
    }
    all.sort((a, b) => b.score - a.score);
    const rank = all.findIndex(
      (s) => s.isCurrentUser || (s.name && s.name.toLowerCase() === activeName),
    );
    return rank >= 0 ? rank + 1 : null;
  }
}

export const leaderboardManager = new LeaderboardManager();

