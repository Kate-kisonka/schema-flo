const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/chat", (req, res) => {
  const { message } = req.body;

  console.log("Получено:", message);

  res.json({
    reply: "Я пока заглушка 🤖"
  });
});

app.listen(3001, () => {
  console.log("Backend запущен на http://localhost:3001");
});