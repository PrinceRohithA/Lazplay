import { verifyJwtToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Authorization header must be in the format: Bearer <token>"
    });
  }

  try {
    const decoded = verifyJwtToken(token);
    req.user = {
      id: Number(decoded.sub),
      email: decoded.email,
      name: decoded.name
    };
    return next();
  } catch (_error) {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}
