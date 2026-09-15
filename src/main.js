import sdk from "@playabl/sdk";
import { inject } from "@vercel/analytics";
import { createGame } from "./game/game.js";
import tweaksManifest from "./tweaks.json";
import assetsManifest from "./assets.json";
import "./styles.css";

try {
  inject({ mode: 'auto', debug: import.meta.env.DEV });
} catch {
  // Analytics fallback
}

const app = document.querySelector("#app");

let tweaks = {
  get: (key) => tweaksManifest[key]?.value ?? tweaksManifest[key]?.default,
  subscribe: () => () => {},
};
let assets;

function withTimeout(promise, ms = 1000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`SDK operation timed out after ${ms}ms`)), ms);
    }),
  ]);
}

try {
  await withTimeout(sdk.ready(), 1200);
  const sdkTweaks = await withTimeout(sdk.tweaks.init(tweaksManifest), 1000).catch(() => null);
  if (sdkTweaks) tweaks = sdkTweaks;
  assets = Object.keys(assetsManifest).length > 0
    ? await withTimeout(sdk.assets.register(assetsManifest), 1000).catch(() => undefined)
    : undefined;
} catch (err) {
  console.warn("[Playabl SDK] Deferred runtime loading or iframe fallback active:", err);
}

// Keep bootstrap boring; build the actual game in src/game/game.js.
const game = createGame({ mount: app, sdk, tweaks, assets });
game.start();
