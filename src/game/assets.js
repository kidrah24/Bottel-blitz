import assetsManifest from "../assets.json";

const BASE = import.meta.env.BASE_URL || "./";

function resolveAssetUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url.slice(1) : url;
  return `${BASE}${cleanPath}`;
}

const FRAME_URLS = {
  bottles: resolveAssetUrl("generated-assets/bottle_atlas-transparent.frames.json"),
  powerBottles: resolveAssetUrl("generated-assets/power_bottle_atlas-transparent.frames.json"),
  extraPowerBottles: resolveAssetUrl("generated-assets/extra_power_bottle_atlas-transparent.frames.json"),
  shards: resolveAssetUrl("generated-assets/shard_atlas-transparent.frames.json"),
  shatter: resolveAssetUrl("generated-assets/shatter_sheet-transparent.frames.json"),
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

async function loadFrames(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load frame data: ${url}`);
  return response.json();
}

export async function loadGameAssets(assets, onProgress = () => {}) {
  const get = (key) => resolveAssetUrl(assets?.get(key) || assetsManifest[key]);

  const items = [
    { name: "BACKGROUND", load: () => loadImage(get("BAR_BG")) },
    { name: "BOTTLE ATLAS", load: () => loadImage(get("BOTTLE_ATLAS")) },
    { name: "POWER BOTTLES", load: () => loadImage(get("POWER_BOTTLE_ATLAS")) },
    { name: "EXTRA POWERS", load: () => loadImage(get("EXTRA_POWER_BOTTLE_ATLAS")) },
    { name: "SHARDS", load: () => loadImage(get("SHARD_ATLAS")) },
    { name: "SHATTER EFFECT", load: () => loadImage(get("SHATTER_SHEET")) },
    { name: "BOTTLE DATA", load: () => loadFrames(FRAME_URLS.bottles) },
    { name: "POWER DATA", load: () => loadFrames(FRAME_URLS.powerBottles) },
    { name: "EXTRA POWER DATA", load: () => loadFrames(FRAME_URLS.extraPowerBottles) },
    { name: "SHARD DATA", load: () => loadFrames(FRAME_URLS.shards) },
    { name: "SHATTER DATA", load: () => loadFrames(FRAME_URLS.shatter) },
  ];

  let completed = 0;
  onProgress(0.1, "PREPARING ARENA...");

  const results = await Promise.all(
    items.map(async (item, idx) => {
      try {
        await new Promise((r) => setTimeout(r, (idx + 1) * 90));
        const result = await item.load();
        completed += 1;
        onProgress(0.1 + (completed / items.length) * 0.85, `LOADING ${item.name}...`);
        return result;
      } catch (err) {
        console.error(`Error loading asset ${item.name}:`, err);
        throw err;
      }
    })
  );

  return {
    background: results[0],
    bottles: results[1],
    powerBottles: results[2],
    extraPowerBottles: results[3],
    shards: results[4],
    shatter: results[5],
    bottleFrames: results[6].frames,
    powerBottleFrames: results[7].frames,
    extraPowerBottleFrames: results[8].frames,
    shardFrames: results[9].frames,
    shatterFrames: results[10].frames,
  };
}
