const LOCAL_STORAGE_KEY = "bottle_blitz_leaderboard_v1";
const PLAYER_NAME_KEY = "bottle_blitz_player_name";

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
          return parsed.filter((entry) => entry && !entry.id?.startsWith("def-"));
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
    if (!Number.isFinite(score) || score <= 0) return this.scores;

    const today = new Date().toISOString().split("T")[0];
    const newEntry = {
      id: `score-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      score: Math.round(score),
      date: today,
      isCurrentUser: true,
    };

    const existingIndex = this.scores.findIndex(
      (entry) => entry.name.toLowerCase() === name.toLowerCase(),
    );

    if (existingIndex >= 0) {
      if (score > this.scores[existingIndex].score) {
        this.scores[existingIndex] = {
          ...this.scores[existingIndex],
          score: Math.round(score),
          date: today,
          isCurrentUser: true,
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
    if (score > 0 && !all.some((s) => s.isCurrentUser && s.score >= score)) {
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
