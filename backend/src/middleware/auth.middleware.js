import { verifyJwtToken } from "../utils/jwt.js";
import { normalizeRole, roleAtLeast, roles } from "../utils/roles.js";

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function attachUserFromToken(req, token) {
  const decoded = verifyJwtToken(token);
  req.user = {
    id: Number(decoded.sub),
    email: decoded.email,
    name: decoded.name,
    role: normalizeRole(decoded.role)
  };
}

export function optionalAuth(req, _res, next) {
  const token = readBearerToken(req);

  if (!token) {
    return next();
  }

  try {
    attachUserFromToken(req, token);
  } catch (_error) {
    req.user = null;
  }

  return next();
}

export function requireAuth(req, res, next) {
  const token = readBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Authorization header must be in the format: Bearer <token>"
    });
  }

  try {
    attachUserFromToken(req, token);
    return next();
  } catch (_error) {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

export function requireRole(requiredRole) {
  return (req, res, next) => {
    const role = req.user?.role || roles.PLAYER;

    if (!roleAtLeast(role, requiredRole)) {
      return res.status(403).json({
        error: `This route requires ${requiredRole} access.`
      });
    }

    return next();
  };
}
