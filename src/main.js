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

try {
  await sdk.ready();
  const sdkTweaks = await sdk.tweaks.init(tweaksManifest);
  if (sdkTweaks) tweaks = sdkTweaks;
  assets = Object.keys(assetsManifest).length > 0
    ? await sdk.assets.register(assetsManifest)
    : undefined;
} catch (err) {
  console.warn("[Playabl SDK] Deferred runtime loading or iframe fallback active:", err);
}

// Keep bootstrap boring; build the actual game in src/game/game.js.
const game = createGame({ mount: app, sdk, tweaks, assets });
game.start();
