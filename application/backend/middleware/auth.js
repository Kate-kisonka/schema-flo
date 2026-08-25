import jwt from "jsonwebtoken";

export function createAuthMiddleware(jwtSecret) {
  return function auth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = { id: payload.sub, email: payload.email };
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}
