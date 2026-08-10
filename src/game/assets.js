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

export async function loadGameAssets(assets) {
  const get = (key) => resolveAssetUrl(assets?.get(key));
  const [background, bottles, powerBottles, extraPowerBottles, shards, shatter, bottleFrames, powerBottleFrames, extraPowerBottleFrames, shardFrames, shatterFrames] = await Promise.all([
    loadImage(get("BAR_BG")),
    loadImage(get("BOTTLE_ATLAS")),
    loadImage(get("POWER_BOTTLE_ATLAS")),
    loadImage(get("EXTRA_POWER_BOTTLE_ATLAS")),
    loadImage(get("SHARD_ATLAS")),
    loadImage(get("SHATTER_SHEET")),
    loadFrames(FRAME_URLS.bottles),
    loadFrames(FRAME_URLS.powerBottles),
    loadFrames(FRAME_URLS.extraPowerBottles),
    loadFrames(FRAME_URLS.shards),
    loadFrames(FRAME_URLS.shatter),
  ]);

  return {
    background,
    bottles,
    powerBottles,
    extraPowerBottles,
    shards,
    shatter,
    bottleFrames: bottleFrames.frames,
    powerBottleFrames: powerBottleFrames.frames,
    extraPowerBottleFrames: extraPowerBottleFrames.frames,
    shardFrames: shardFrames.frames,
    shatterFrames: shatterFrames.frames,
  };
}
