import sdk from "@playabl/sdk";
import { inject } from "@vercel/analytics";
import { createGame } from "./game/game.js";
import tweaksManifest from "./tweaks.json";
import assetsManifest from "./assets.json";
import "./styles.css";

inject({ mode: 'auto', debug: import.meta.env.DEV });

const app = document.querySelector("#app");
const ready = await sdk.ready();
const tweaks = await sdk.tweaks.init(tweaksManifest);
const assets = Object.keys(assetsManifest).length > 0
  ? await sdk.assets.register(assetsManifest)
  : undefined;

// Keep bootstrap boring; build the actual game in src/game/game.js.
const game = createGame({ mount: app, sdk, ready, tweaks, assets });
game.start();
