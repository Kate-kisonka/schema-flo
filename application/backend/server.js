import { createApp } from "./app.js";
import { readConfigValue } from "./config.js";
import { pool, query } from "./db.js";
import { createCompanionService, startCompanionCleanup } from "./services/companion.js";

function readBoundedEnvInt(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

const port = process.env.PORT || 3001; //
const jwtSecret = readConfigValue("JWT_SECRET", { required: true });
const googleClientId = readConfigValue("GOOGLE_CLIENT_ID");
const googleRedirectUri = readConfigValue("GOOGLE_REDIRECT_URI");
const googleOAuthEnabled = Boolean(googleClientId && googleRedirectUri);
const googleClientSecret = googleOAuthEnabled
  ? readConfigValue("GOOGLE_CLIENT_SECRET", { required: true })
  : undefined;
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5173,https://schema-flo.vercel.app"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const companionService = createCompanionService({
  pool,
  query,
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "qwen2.5:3b-instruct",
  retentionDays: readBoundedEnvInt("COMPANION_RETENTION_DAYS", 30, 1, 3650),
  numPredict: readBoundedEnvInt("COMPANION_NUM_PREDICT", 384, 64, 1024),
  maxReplyLength: readBoundedEnvInt("COMPANION_MAX_REPLY_LENGTH", 4000, 500, 12000),
});

const app = createApp({
  pool,
  query,
  jwtSecret,
  allowedOrigins,
  frontendUrl,
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  companionService,
});

startCompanionCleanup(
  companionService.runGlobalCleanup,
  readBoundedEnvInt("COMPANION_CLEANUP_INTERVAL_HOURS", 1, 1, 24)
);

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
