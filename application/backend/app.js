import express from "express";
import cors from "cors";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createAuthRouter } from "./routes/auth.js";
import { createCompanionRouter } from "./routes/companion.js";
import { createDiaryRouter } from "./routes/diary.js";
import { createImportRouter } from "./routes/import.js";
import { createTrackingRouter } from "./routes/tracking.js";

export function createApp({
  pool,
  query,
  jwtSecret,
  allowedOrigins,
  frontendUrl,
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  companionService,
}) {
  const app = express();

  // За backend в цепочке 2 прокси (Traefik → Caddy), поэтому req.ip должен браться
  // из 2-го X-Forwarded-For справа. trust proxy: true доверяет ЛЮБОМУ значению из
  // заголовка (клиент может подделать), а число хопов — доверяет ровно нашей топологии.
  app.set("trust proxy", 2);

  // credentials: true нужен для будущих cookie-based flow
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", async (_req, res) => {
    try {
      await query("SELECT NOW()");
      res.json({ status: "ok", db: "connected" });
    } catch (err) {
      console.error("health check error:", err.message);
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  const auth = createAuthMiddleware(jwtSecret);
  app.use("/api/auth", createAuthRouter({
    auth,
    pool,
    query,
    jwtSecret,
    frontendUrl,
    googleClientId,
    googleClientSecret,
    googleRedirectUri,
  }));
  app.use("/api/diary", createDiaryRouter({ auth, query }));
  app.use("/api", createTrackingRouter({ auth, query }));
  app.use("/api/import", createImportRouter({ auth, pool }));
  app.use("/api/companion", createCompanionRouter({
    auth,
    companionService,
    pool,
    query,
  }));

  return app;
}
