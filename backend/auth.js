import { Router } from "express";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import pool from "./db.js";
import { verifyToken } from "./middleware/verifyToken.js";

const router = Router();

// Создать таблицу users если её нет
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
  )
`);

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

async function makeToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());
}

// POST /auth/register
router.post("/register", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Некорректный email" });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Пароль должен быть минимум 6 символов" });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Пользователь с таким email уже существует" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    const token = await makeToken({ id: user.id, email: user.email });

    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("register error:", err.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const token = await makeToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("login error:", err.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /auth/me  — требует токен
router.get("/me", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ user });
  } catch (err) {
    console.error("me error:", err.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
