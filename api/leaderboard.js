const DREAMLO_PRIVATE_KEY = "fNj18yEImEWEw2cXfmdoLQROnPmX7pN0WHj4Nrlk-NWw";
const DREAMLO_PUBLIC_KEY = "6aa67aaa8f40bb15a879a651";

const DUMMY_NAMES = [
  "blademaster",
  "viperslice",
  "ninjacombo",
  "bottleking",
  "smashqueen",
  "glasscutter",
  "rushmaster",
];

let inMemoryCache = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 5000;

async function fetchFromDreamlo() {
  const url = `https://dreamlo.com/lb/${DREAMLO_PUBLIC_KEY}/json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Dreamlo HTTP error ${res.status}`);
  const data = await res.json();
  const rawEntries = data?.dreamlo?.leaderboard?.entry;

  let entries = [];
  if (Array.isArray(rawEntries)) {
    entries = rawEntries;
  } else if (rawEntries && typeof rawEntries === "object") {
    entries = [rawEntries];
  }

  const scoreMap = new Map();

  entries.forEach((item) => {
    const rawName = (item.name || "").trim();
    const rawScore = parseInt(item.score, 10);
    if (
      rawName &&
      !DUMMY_NAMES.includes(rawName.toLowerCase()) &&
      Number.isFinite(rawScore) &&
      rawScore > 0 &&
      rawScore <= 5000
    ) {
      const key = rawName.toLowerCase();
      const existing = scoreMap.get(key);
      if (!existing || rawScore >= existing.score) {
        scoreMap.set(key, {
          id: `dreamlo-${key}`,
          name: rawName,
          score: rawScore,
          date: item.date || new Date().toISOString().split("T")[0],
        });
      }
    }
  });

  const merged = Array.from(scoreMap.values());
  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, 50);
}

async function submitToDreamlo(name, score) {
  const sanitizedName = encodeURIComponent(name.trim().slice(0, 15));
  const sanitizedScore = Math.min(5000, Math.max(1, Math.round(score)));
  const url = `https://dreamlo.com/lb/${DREAMLO_PRIVATE_KEY}/add-json/${sanitizedName}/${sanitizedScore}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dreamlo submit error ${res.status}`);
  return fetchFromDreamlo();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const now = Date.now();
      if (inMemoryCache.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
        return res.status(200).json({ success: true, scores: inMemoryCache, cached: true });
      }
      const scores = await fetchFromDreamlo();
      inMemoryCache = scores;
      lastFetchTime = now;
      return res.status(200).json({ success: true, scores });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { name, score } = body || {};

      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ success: false, error: "Invalid name (must be 2-15 characters)" });
      }
      const numScore = Number(score);
      if (!Number.isFinite(numScore) || numScore <= 0 || numScore > 5000) {
        return res.status(400).json({ success: false, error: "Invalid score" });
      }

      const updatedScores = await submitToDreamlo(name, numScore);
      inMemoryCache = updatedScores;
      lastFetchTime = Date.now();
      return res.status(200).json({ success: true, scores: updatedScores });
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  } catch (err) {
    console.error("[Leaderboard API Error]", err);
    if (inMemoryCache.length > 0) {
      return res.status(200).json({ success: true, scores: inMemoryCache, fallback: true });
    }
    return res.status(200).json({ success: true, scores: [], fallback: true });
  }
}
