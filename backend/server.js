import express from "express";//создает веб-сервер
import cors from "cors";//контроль кто может обращаться к серверу
import dotenv from "dotenv"; //читает секреты из файла env
import pool from "../src/services/db";//менеджер подклю к бд
dotenv.config(); //загружает секреты из файла

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [//адреса которым разрешено обращаться к серверу
  "http://localhost:5173",
  "https://schema-flo.vercel.app",
];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json()); //говорим серверу делать автораспаковку в json 


//здоровье
app.get("/health", async (_req, res) => {
  try{//пробуй сделать это. основной план.
    await pool.query('SELECT NOW()') 
    res.json({ status: "ok", db: "connected" });//отправляем ответ что все ок
 }   catch (err) {//если что-то пошло не так - вот инструк
  res.status(500).json({ status: "error", message: err.message });
 }
});

//сохранение сообщений в базу
app.post("/api/chat", (req, res) => { //реагируем на запрос
  const { messages, context } = req.body;//данные от пользака которые пришли в двух полях

  if (!Array.isArray(messages)) {//проверяем сообщение, если это не массив, ответ ошибкой 400
    return res.status(400).json({ error: "messages must be an array" });
    }
      
  try {
    const lastMessage = messages[messages.length - 1];// берем последнее сообщение из массива -1
    await pool.query(//отправляем запрос в бд
      "INSERT INTO chat_history (role, content) VALUES ($1, $2)", //добавляем заппись в ччат
      [lastMessage.role, lastMessage.content]
    );

    console.log("Сообщение сохранено в бд");

    //заглушка для ии
    
    res.json({ reply: "Я пока заглушка, но очень хочу тебе помочь 🤖" });
  
  } catch (err) {
    console.error("Ошибка БД:", err.message);
    res.status(500).json({ error: "Не удалось сохранить в базу данных" });

  }
  });

app.listen(PORT, () => {//запускаем сервер и он начинает слушать входящие запросы
  console.log(`Backend запущен на http://localhost:${PORT}`);
});
