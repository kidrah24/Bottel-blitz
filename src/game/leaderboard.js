const LOCAL_STORAGE_KEY = "bottle_blitz_leaderboard_v1";
const PLAYER_NAME_KEY = "bottle_blitz_player_name";
const SECRET_SALT = "BB_v1_S3cr3t_S@lt_2026";
const MAX_ALLOWED_SCORE = 5000;

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
    return trimmed;
  }

  getPlayerName() {
    return this.playerName;
  }

  hasPlayerName() {
    return Boolean(this.playerName && this.playerName.trim().length >= 2);
  }

  loadScores() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((entry) => {
            if (!entry || typeof entry !== "object") return false;
            if (entry.id?.startsWith("def-")) return false;
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
    return [];
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
    const newEntry = {
      id: newId,
      name,
      score: rounded,
      date: today,
      isCurrentUser: true,
      sig: computeHash(`${newId}:${name}:${rounded}`),
    };

    const existingIndex = this.scores.findIndex(
      (entry) => entry.name.toLowerCase() === name.toLowerCase(),
    );

    if (existingIndex >= 0) {
      if (rounded > this.scores[existingIndex].score) {
        const existingId = this.scores[existingIndex].id || newId;
        this.scores[existingIndex] = {
          ...this.scores[existingIndex],
          id: existingId,
          score: rounded,
          date: today,
          isCurrentUser: true,
          sig: computeHash(`${existingId}:${name}:${rounded}`),
        };
      }
    } else {
      this.scores.push(newEntry);
    }

    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 50);

    this.saveScores();
    return this.scores;
  }

  getTopScores(limit = 20) {
    return this.scores.slice(0, limit);
  }

  getPlayerRank(score) {
    const all = [...this.scores];
    if (score > 0 && score <= MAX_ALLOWED_SCORE && !all.some((s) => s.isCurrentUser && s.score >= score)) {
      all.push({ name: this.playerName || "YOU", score, isCurrentUser: true });
    }
    all.sort((a, b) => b.score - a.score);
    const rank = all.findIndex(
      (s) => s.isCurrentUser || (s.name && s.name.toLowerCase() === (this.playerName || "").toLowerCase()),
    );
    return rank >= 0 ? rank + 1 : null;
  }
}

export const leaderboardManager = new LeaderboardManager();
