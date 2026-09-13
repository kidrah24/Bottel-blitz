import { defineConfig } from "vite";
import leaderboardHandler from "./api/leaderboard.js";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "leaderboard-api-middleware",
      configureServer(server) {
        server.middlewares.use("/api/leaderboard", async (req, res) => {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", async () => {
            req.body = body;
            // Provide simple helper for res.status().json()
            res.status = (statusCode) => {
              res.statusCode = statusCode;
              return {
                json: (payload) => {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify(payload));
                },
                end: () => res.end(),
              };
            };
            try {
              await leaderboardHandler(req, res);
            } catch (err) {
              console.error("[Vite Dev Leaderboard Middleware Error]", err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        });
      },
    },
  ],
});

