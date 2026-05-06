import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "../src/services/db";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://schema-flo.vercel.app",
];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());
//здоровье
app.get("/health", (_req, res) => {
  try{
    await pool.query('SELECT NOW()')
    res.json({ status: "ok", db: "connected" });
 }   catch (err) {
  res.status(500).json({ status: "error", message: err.message });
 }
});

//сохранение сообщений в базу
app.post("/api/chat", (req, res) => {
  const { messages, context } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
    }
      
  try {
    const lastMessage = messages[messages.length - 1];
    await pool.query(
      "INSERT INTO chat_history (role, content) VALUES ($1, $2)",
      [lastMessage.role, lastMessage.conten]
    );

    console.log("Сообщение сохранено в бд");

    //заглушка для ии
    
    res.json({ reply: "Я пока заглушка, но очень хочу тебе помочь 🤖" });
  
  } catch (err) {
    console.error("Ошибка БД:", err.message);
    res.status(500).json({ error: "Не удалось сохранить в базу данных" });

  }
  });

app.listen(PORT, () => {
  console.log(`Backend запущен на http://localhost:${PORT}`);
});
