import { jwtVerify } from "jose";

export async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }

  const token = header.slice(7);
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    req.user = payload; // { id, email }
    next();
  } catch {
    return res.status(401).json({ error: "Токен недействителен или истёк" });
  }
}
