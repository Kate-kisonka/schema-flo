import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors({ origin: ["http://localhost:5173", "https://schema-flo.vercel.app"], }));
app.use(express.json());

app.post("/api/chat", (req, res) => {
  const { message, context } = req.body;
  console.log("Получено:", message?.length);
  res.json({ reply: "Я пока заглушка 🤖" });
});

app.listen(PORT, () => {
  console.log(`Backend запущен на http://localhost:${PORT}`);
});