import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://schema-flo.vercel.app",
];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// AI proxy — принимает массив messages + системный контекст
// Когда придёт ключ: заменить тело на вызов Anthropic SDK
app.post("/api/chat", (req, res) => {
  const { messages, context } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }

  console.log("Получено сообщений:", messages.length, "| контекст:", context?.length ?? 0, "симв.");

  // TODO: заменить на вызов Anthropic API
  // const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
  // const response = await anthropic.messages.create({ ... });
  // return res.json({ reply: response.content[0].text });

  res.json({ reply: "Я пока заглушка, но очень хочу тебе помочь 🤖" });
});

app.listen(PORT, () => {
  console.log(`Backend запущен на http://localhost:${PORT}`);
});
