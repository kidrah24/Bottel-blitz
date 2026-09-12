const LOCAL_STORAGE_KEY = "bottle_blitz_leaderboard_v1";
const PLAYER_NAME_KEY = "bottle_blitz_player_name";
const SECRET_SALT = "BB_v1_S3cr3t_S@lt_2026";
const MAX_ALLOWED_SCORE = 5000;

const DEFAULT_SCORES = [
  { id: "score-def-1", name: "BladeMaster", score: 1850, date: "2026-08-10" },
  { id: "score-def-2", name: "ViperSlice", score: 1620, date: "2026-08-12" },
  { id: "score-def-3", name: "NinjaCombo", score: 1450, date: "2026-08-15" },
  { id: "score-def-4", name: "BottleKing", score: 1280, date: "2026-08-18" },
  { id: "score-def-5", name: "SmashQueen", score: 1100, date: "2026-08-20" },
  { id: "score-def-6", name: "GlassCutter", score: 950, date: "2026-08-25" },
  { id: "score-def-7", name: "RushMaster", score: 820, date: "2026-09-01" },
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

export class LeaderboardManager {
  constructor() {
    this.playerName = this.loadPlayerName();
    this.scores = this.loadScores();
  }

  loadPlayerName() {
    try {
      return localStorage.getItem(PLAYER_NAME_KEY) || "";
    } catch {
      return "";
    }
  }

  setPlayerName(name) {
    const trimmed = (name || "").trim().slice(0, 15);
    this.playerName = trimmed;
    try {
      localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    } catch {
      // Storage unavailable
    }
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

    DEFAULT_SCORES.forEach((def) => {
      scoreMap.set(def.name.toLowerCase(), {
        ...def,
        sig: computeHash(`${def.id}:${def.name}:${def.score}`),
      });
    });

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
